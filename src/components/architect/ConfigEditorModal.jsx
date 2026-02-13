import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Rocket, ArrowRight, Plus, Trash2, BookOpen } from "lucide-react";

export default function ConfigEditorModal({ open, onOpenChange, config, onConfirm, isCreating }) {
  const [tenantConfig, setTenantConfig] = useState(config?.tenant_config || {});
  const [knowledgeBase, setKnowledgeBase] = useState(config?.knowledge_base || []);

  React.useEffect(() => {
    if (config) {
      setTenantConfig(config.tenant_config || {});
      setKnowledgeBase(config.knowledge_base || []);
    }
  }, [config]);

  const updateTenant = (field, value) => {
    setTenantConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateKnowledge = (index, field, value) => {
    setKnowledgeBase(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeKnowledge = (index) => {
    setKnowledgeBase(prev => prev.filter((_, i) => i !== index));
  };

  const addKnowledge = () => {
    setKnowledgeBase(prev => [...prev, { title: '', content: '', category: 'general' }]);
  };

  const handleConfirm = () => {
    onConfirm({
      ready_to_build: true,
      tenant_config: tenantConfig,
      knowledge_base: knowledgeBase
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            ✏️ עריכת הגדרות הבוט
          </DialogTitle>
          <DialogDescription>
            ערוך את הפרטים לפני ההקמה
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label>שם העסק</Label>
              <Input
                value={tenantConfig.company_name || ''}
                onChange={(e) => updateTenant('company_name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>שם הבוט</Label>
                <Input
                  value={tenantConfig.ai_persona_name || ''}
                  onChange={(e) => updateTenant('ai_persona_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>צבע מותג</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tenantConfig.theme_color || '#6366f1'}
                    onChange={(e) => updateTenant('theme_color', e.target.value)}
                    className="w-9 h-9 rounded border cursor-pointer"
                  />
                  <Input
                    value={tenantConfig.theme_color || '#6366f1'}
                    onChange={(e) => updateTenant('theme_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Slug (כתובת URL)</Label>
              <Input
                value={tenantConfig.slug || ''}
                onChange={(e) => updateTenant('slug', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>הודעת פתיחה</Label>
              <Textarea
                value={tenantConfig.welcome_message || ''}
                onChange={(e) => updateTenant('welcome_message', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>הנחיות מערכת (System Prompt)</Label>
              <Textarea
                value={tenantConfig.system_prompt || ''}
                onChange={(e) => updateTenant('system_prompt', e.target.value)}
                rows={5}
                className="text-xs"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  בסיס ידע ({knowledgeBase.length} פריטים)
                </Label>
                <Button variant="outline" size="sm" onClick={addKnowledge} className="gap-1">
                  <Plus className="w-3 h-3" />
                  הוסף
                </Button>
              </div>

              {knowledgeBase.map((entry, i) => (
                <div key={i} className="p-3 rounded-lg border bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Input
                      value={entry.title || ''}
                      onChange={(e) => updateKnowledge(i, 'title', e.target.value)}
                      placeholder="כותרת"
                      className="flex-1 text-sm font-medium bg-white"
                    />
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700 mr-2" onClick={() => removeKnowledge(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={entry.content || ''}
                    onChange={(e) => updateKnowledge(i, 'content', e.target.value)}
                    placeholder="תוכן..."
                    rows={2}
                    className="text-xs bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            <ArrowRight className="w-4 h-4" />
            חזרה
          </Button>
          <Button
            className="flex-1 gap-2 bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            onClick={handleConfirm}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <span className="animate-spin">⏳</span>
                מקים...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                הקם את הבוט שלי!
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}