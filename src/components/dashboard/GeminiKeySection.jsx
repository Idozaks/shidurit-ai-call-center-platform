import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Save, Loader2, Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

export default function GeminiKeySection({ tenant, tenantId }) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (tenant?.gemini_api_key) {
      setApiKey(tenant.gemini_api_key);
    }
  }, [tenant]);

  const saveMutation = useMutation({
    mutationFn: (key) => base44.entities.Tenant.update(tenant.id, { gemini_api_key: key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: () => base44.entities.Tenant.update(tenant.id, { gemini_api_key: '' }),
    onSuccess: () => {
      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    }
  });

  const hasKey = !!tenant?.gemini_api_key;
  const maskedKey = apiKey ? apiKey.slice(0, 6) + '••••••••••••' + apiKey.slice(-4) : '';

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            מפתח Gemini API
          </CardTitle>
          <CardDescription>
            מפתח ה-API של Google Gemini עבור העסק — כאשר מוגדר, השימושים יחויבו ישירות בחשבון Google של העסק
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            {hasKey ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">מפתח מוגדר</p>
                  <p className="text-xs text-slate-500">השימוש בבינה מלאכותית יחויב בחשבון Google של העסק</p>
                </div>
                <Badge className="mr-auto bg-green-100 text-green-700 border-0">פעיל</Badge>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">לא מוגדר מפתח</p>
                  <p className="text-xs text-slate-500">השימוש נספר מתוך מכסת השימושים של הפלטפורמה ({tenant?.usage_count || 0}/{tenant?.usage_limit || 100})</p>
                </div>
              </>
            )}
          </div>

          {/* Key Input */}
          <div className="space-y-2">
            <Label>מפתח Gemini API</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                onClick={() => saveMutation.mutate(apiKey)}
                disabled={!apiKey || saveMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              ניתן ליצור מפתח ב-{' '}
              <a 
                href="https://aistudio.google.com/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                Google AI Studio
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Remove Key */}
          {hasKey && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : null}
              הסר מפתח
            </Button>
          )}

          {/* Info */}
          <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-sm space-y-2">
            <p className="font-medium text-indigo-700 dark:text-indigo-300">איך זה עובד?</p>
            <ul className="text-indigo-600 dark:text-indigo-400 space-y-1 list-disc list-inside text-xs">
              <li>כאשר מפתח מוגדר — כל שיחת AI תשתמש במפתח של העסק ותחויב ישירות בחשבון Google שלו</li>
              <li>כאשר אין מפתח — השימוש ייספר מתוך המכסה הכללית של הפלטפורמה</li>
              <li>מומלץ להגדיר מפתח כדי לקבל שימוש ללא הגבלה ושליטה מלאה על החיוב</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}