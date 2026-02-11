import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, AlertCircle, Eye, EyeOff, UserPlus, Building2, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function WorkerLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerData, setRegisterData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'worker' // worker or tenant
  });
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setIsRegistering(true);

    try {
      if (registerData.role === 'worker') {
        // Create worker with admin role (no tenant)
        const newWorker = await base44.entities.Worker.create({
          full_name: registerData.full_name,
          email: registerData.email,
          password: registerData.password,
          role: 'admin',
          status: 'active',
          tenant_id: 'shidurit-internal'
        });

        // Log them in
        localStorage.setItem('shidurit_worker', JSON.stringify({
          id: newWorker.id,
          email: newWorker.email,
          full_name: newWorker.full_name,
          role: newWorker.role,
          tenant_id: newWorker.tenant_id
        }));

        await base44.entities.Worker.update(newWorker.id, { is_online: true });
        navigate(createPageUrl('Home'));
      } else {
        // Create tenant
        const slug = registerData.full_name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
        const newTenant = await base44.entities.Tenant.create({
          company_name: registerData.full_name,
          slug: slug,
          theme_color: '#6366f1',
          ai_persona_name: 'נועה',
          welcome_message: 'שלום! איך אוכל לעזור לך היום?',
          is_active: true,
          onboarding_complete: false
        });

        // Create worker for this tenant
        const newWorker = await base44.entities.Worker.create({
          tenant_id: newTenant.id,
          full_name: registerData.full_name,
          email: registerData.email,
          password: registerData.password,
          role: 'admin',
          status: 'active'
        });

        // Log them in
        localStorage.setItem('shidurit_worker', JSON.stringify({
          id: newWorker.id,
          email: newWorker.email,
          full_name: newWorker.full_name,
          role: newWorker.role,
          tenant_id: newWorker.tenant_id
        }));

        await base44.entities.Worker.update(newWorker.id, { is_online: true });
        navigate(createPageUrl('TenantDashboard') + `?id=${newTenant.id}`);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setRegisterError('שגיאה ברישום. ייתכן שהאימייל כבר קיים במערכת.');
    } finally {
      setIsRegistering(false);
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
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

              <div className="text-center mt-4">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setShowRegisterModal(true)}
                  className="text-indigo-600"
                >
                  <UserPlus className="w-4 h-4 ml-2" />
                  הרשמה למערכת
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Registration Modal */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>הרשמה למערכת</DialogTitle>
            <DialogDescription>בחר את סוג החשבון שברצונך ליצור</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4 mt-4">
            {registerError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{registerError}</AlertDescription>
              </Alert>
            )}

            <RadioGroup value={registerData.role} onValueChange={(value) => setRegisterData({ ...registerData, role: value })}>
              <div className="flex items-center space-x-2 space-x-reverse p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="tenant" id="tenant" />
                <Label htmlFor="tenant" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="font-medium">בעל עסק / לקוח</p>
                    <p className="text-xs text-slate-500">יצירת עסק חדש במערכת</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse p-4 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="worker" id="worker" />
                <Label htmlFor="worker" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Briefcase className="w-5 h-5 text-violet-600" />
                  <div>
                    <p className="font-medium">עובד שידורית</p>
                    <p className="text-xs text-slate-500">הצטרפות לצוות שידורית AI</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="reg_name">שם מלא {registerData.role === 'tenant' && '/ שם העסק'}</Label>
              <Input
                id="reg_name"
                value={registerData.full_name}
                onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                placeholder={registerData.role === 'tenant' ? 'שם העסק שלך' : 'שם מלא'}
                required
                disabled={isRegistering}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg_email">אימייל</Label>
              <Input
                id="reg_email"
                type="email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                placeholder="your@email.com"
                required
                disabled={isRegistering}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg_password">סיסמה</Label>
              <Input
                id="reg_password"
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                placeholder="••••••••"
                required
                disabled={isRegistering}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
              disabled={isRegistering}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  נרשם...
                </>
              ) : (
                'הירשם'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}