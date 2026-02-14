import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, Sparkles, Palette, MessageSquare, 
  Save, Loader2, AlertTriangle, Trash2
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DeleteTenantDialog from './DeleteTenantDialog';

export default function TenantSettings({ tenant }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    company_name: '',
    slug: '',
    theme_color: '#6366f1',
    logo_url: '',
    ai_persona_name: 'נועה',
    welcome_message: '',
    system_prompt: '',
    usage_limit: 100,
    is_active: true,
    closer_mode_enabled: false,
    gemini_api_key: ''
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        company_name: tenant.company_name || '',
        slug: tenant.slug || '',
        theme_color: tenant.theme_color || '#6366f1',
        logo_url: tenant.logo_url || '',
        ai_persona_name: tenant.ai_persona_name || 'נועה',
        welcome_message: tenant.welcome_message || '',
        system_prompt: tenant.system_prompt || '',
        usage_limit: tenant.usage_limit || 100,
        is_active: tenant.is_active !== false,
        closer_mode_enabled: tenant.closer_mode_enabled || false,
        gemini_api_key: tenant.gemini_api_key || ''
      });
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Tenant.update(tenant.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenant.id] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Tenant.delete(tenant.id),
    onSuccess: () => {
      navigate(createPageUrl('Home'));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את העסק? פעולה זו אינה הפיכה.')) {
      deleteMutation.mutate();
    }
  };

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        {/* General Settings */}
        <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              הגדרות כלליות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שם העסק</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>כתובת URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">/c/</span>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>צבע מותג</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.theme_color}
                    onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0"
                  />
                  <Input
                    value={formData.theme_color}
                    onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>לוגו URL</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div>
                <Label>עסק פעיל</Label>
                <p className="text-sm text-slate-500">כאשר מושבת, הצ׳אט הציבורי לא יהיה זמין</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              הגדרות AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שם הבוט</Label>
                <Input
                  value={formData.ai_persona_name}
                  onChange={(e) => setFormData({ ...formData, ai_persona_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>מגבלת שימושים</Label>
                <Input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 100 })}
                />
                <p className="text-xs text-slate-500">
                  שימוש נוכחי: {tenant.usage_count || 0} / {formData.usage_limit}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>הודעת פתיחה</Label>
              <Textarea
                value={formData.welcome_message}
                onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                rows={2}
                placeholder="שלום! איך אוכל לעזור לך היום?"
              />
            </div>

            <div className="space-y-2">
              <Label>הוראות מערכת</Label>
              <Textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={4}
                placeholder="הוראות מיוחדות לבוט..."
              />
              <p className="text-xs text-slate-500">
                הוראות אלו יתווספו להנחיות הבסיסיות של הבוט
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <div>
                <Label className="text-orange-700 dark:text-orange-300">מצב סגירה</Label>
                <p className="text-sm text-orange-600 dark:text-orange-400">הבוט יהיה אגרסיבי יותר בניסיון להמיר לידים</p>
              </div>
              <Switch
                checked={formData.closer_mode_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, closer_mode_enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              שמור שינויים
            </Button>
          </TooltipTrigger>
          <TooltipContent>שמור את כל השינויים</TooltipContent>
        </Tooltip>
      </form>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800 shadow-lg bg-white/70 dark:bg-slate-800/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            אזור מסוכן
          </CardTitle>
          <CardDescription>פעולות אלו אינן הפיכות</CardDescription>
        </CardHeader>
        <CardContent>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Trash2 className="w-4 h-4 ml-2" />
                )}
                מחק עסק
              </Button>
            </TooltipTrigger>
            <TooltipContent>מחק עסק לצמיתות</TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>
    </div>
  );
}