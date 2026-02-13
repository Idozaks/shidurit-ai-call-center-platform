import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, Mail, MapPin, Clock, Stethoscope, ArrowRight,
  Loader2, CheckCircle2, Award, BookOpen, GraduationCap, Star, ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";
import { getDoctorAvatarUrl } from '../components/utils/doctorAvatar';

async function publicApi(action, data) {
  try {
    const res = await base44.functions.invoke('publicChat', { action, ...data });
    return res.data;
  } catch {
    const res = await fetch(`/api/publicChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    });
    return res.json();
  }
}

export default function DoctorProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const doctorId = urlParams.get('id');

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: async () => {
      const res = await publicApi('getDoctor', { doctor_id: doctorId });
      return res.doctor || null;
    },
    enabled: !!doctorId
  });

  const { data: tenant } = useQuery({
    queryKey: ['doctor-tenant', doctor?.tenant_id],
    queryFn: async () => {
      const res = await publicApi('getTenantById', { tenant_id: doctor.tenant_id });
      return res.tenant || null;
    },
    enabled: !!doctor?.tenant_id
  });

  const themeColor = tenant?.theme_color || '#6366f1';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" dir="rtl">
        <Stethoscope className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-600 mb-2">הרופא לא נמצא</h2>
        <Link to={createPageUrl('DoctorsCatalog')}>
          <Button variant="outline" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            חזרה לקטלוג
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 overflow-auto" dir="rtl">
      {/* Hero Banner */}
      <div 
        className="relative h-32 md:h-40"
        style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="absolute top-4 right-4">
          <Link to={createPageUrl('DoctorsCatalog')}>
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/20 gap-2">
              <ArrowRight className="w-4 h-4" />
              חזרה לקטלוג
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 -mt-12 relative z-10 pb-12">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg -mt-14 sm:-mt-16">
                  <AvatarImage src={getDoctorAvatarUrl(doctor)} />
                  <AvatarFallback 
                    className="text-white font-bold text-3xl"
                    style={{ backgroundColor: themeColor }}
                  >
                    {doctor.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{doctor.name}</h1>
                    {doctor.is_available !== false && (
                      <Badge className="bg-green-100 text-green-700 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        זמין לתורים
                      </Badge>
                    )}
                  </div>
                  <Badge className="mt-2 text-white text-sm" style={{ backgroundColor: themeColor }}>
                    {doctor.specialty}
                  </Badge>
                  {tenant && (
                    <p className="text-sm text-slate-500 mt-2">{tenant.company_name}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
          {/* Main Info Column */}
          <div className="md:col-span-2 space-y-5">
            {/* Bio */}
            {doctor.bio && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-5 h-5" style={{ color: themeColor }} />
                      <h2 className="text-lg font-bold text-slate-800">אודות</h2>
                    </div>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{doctor.bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Procedures / Services */}
            {doctor.procedures?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Stethoscope className="w-5 h-5" style={{ color: themeColor }} />
                      <h2 className="text-lg font-bold text-slate-800">שירותים וטיפולים</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {doctor.procedures.map((proc, i) => (
                        <Link key={i} to={createPageUrl(`ProcedurePage?name=${encodeURIComponent(proc)}`)}>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:shadow-sm transition-all cursor-pointer">
                            <div 
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: themeColor }}
                            />
                            <span className="text-sm text-slate-700">{proc}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-300 mr-auto" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Experience & Education */}
            {doctor.years_experience && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap className="w-5 h-5" style={{ color: themeColor }} />
                      <h2 className="text-lg font-bold text-slate-800">ניסיון והשכלה</h2>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-l from-amber-50 to-orange-50">
                      <Award className="w-8 h-8 text-amber-500" />
                      <div>
                        <p className="font-bold text-slate-800">{doctor.years_experience} שנות ניסיון</p>
                        <p className="text-sm text-slate-500">ב{doctor.specialty}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Contact Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-bold text-slate-800">פרטי התקשרות</h2>
                  
                  {doctor.clinic_location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: themeColor }} />
                      <span className="text-sm text-slate-600">{doctor.clinic_location}</span>
                    </div>
                  )}
                  {doctor.availability && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: themeColor }} />
                      <span className="text-sm text-slate-600">{doctor.availability}</span>
                    </div>
                  )}

                  <Separator />

                  {doctor.phone && (
                    <Button 
                      className="w-full gap-2 text-white"
                      style={{ backgroundColor: themeColor }}
                      asChild
                    >
                      <a href={`tel:${doctor.phone}`}>
                        <Phone className="w-4 h-4" />
                        {doctor.phone}
                      </a>
                    </Button>
                  )}
                  {doctor.email && (
                    <Button 
                      variant="outline"
                      className="w-full gap-2"
                      asChild
                    >
                      <a href={`mailto:${doctor.email}`}>
                        <Mail className="w-4 h-4" />
                        שלח אימייל
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 space-y-3">
                  {doctor.years_experience && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">שנות ניסיון</span>
                      <span className="font-bold" style={{ color: themeColor }}>{doctor.years_experience}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">התמחות</span>
                    <span className="font-bold text-slate-700 text-sm">{doctor.specialty}</span>
                  </div>
                  {doctor.procedures?.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">טיפולים</span>
                      <span className="font-bold" style={{ color: themeColor }}>{doctor.procedures.length}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}