import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from '@/api/base44Client';

export default function WorkerLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const workerData = localStorage.getItem('shidurit_worker');
    if (workerData) {
      navigate(createPageUrl('Home'));
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Find worker by email
      const workers = await base44.entities.Worker.filter({ 
        email: formData.email,
        status: 'active'
      });

      if (workers.length === 0) {
        setError('אימייל או סיסמה שגויים');
        setIsLoading(false);
        return;
      }

      const worker = workers[0];

      // Check password (in production, use proper password hashing)
      if (worker.password !== formData.password) {
        setError('אימייל או סיסמה שגויים');
        setIsLoading(false);
        return;
      }

      // Store worker session in localStorage
      localStorage.setItem('shidurit_worker', JSON.stringify({
        id: worker.id,
        email: worker.email,
        full_name: worker.full_name,
        role: worker.role,
        tenant_id: worker.tenant_id
      }));

      // Update online status
      await base44.entities.Worker.update(worker.id, { is_online: true });

      // Redirect to home
      navigate(createPageUrl('Home'));
    } catch (err) {
      console.error('Login error:', err);
      setError('שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-l from-indigo-600 to-violet-600" />
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-l from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              שידורית AI
            </CardTitle>
            <CardDescription className="text-base">התחברות למערכת</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    מתחבר...
                  </>
                ) : (
                  'התחבר'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}