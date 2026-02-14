import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Stethoscope, Loader2, CheckCircle2, XCircle, ArrowRight,
  MapPin, Clock, Phone, Mail, ExternalLink, Sparkles
} from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from "framer-motion";
import { getDoctorAvatarUrl } from '../components/utils/doctorAvatar';
import ReactMarkdown from 'react-markdown';

const publicApi = async (payload) => {
  try {
    const response = await base44.functions.invoke('publicChat', payload);
    return response.data;
  } catch {
    const res = await fetch(`/functions/publicChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};

export default function SpecialtyPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const specialty = urlParams.get('name');

  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['all-doctors'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 200)
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list()
  });

  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

  const filteredDoctors = doctors.filter(d => d.specialty === specialty && d.is_available !== false);

  // Generate AI description in background
  useEffect(() => {
    if (!specialty) return;
    setAiLoading(true);
    publicApi({
      action: 'invokeLLM',
      prompt: `כתוב תיאור קצר בעברית (3-4 משפטים) על ההתמחות הרפואית "${specialty}". התיאור צריך להיות ידידותי ולהסביר בקצרה מה התחום כולל ומתי כדאי לפנות לרופא בתחום זה. אל תכלול מידע שגוי.`,
      response_json_schema: null
    }).then(res => {
      setAiDescription(res.result || '');
    }).catch(() => {
      setAiDescription('');
    }).finally(() => {
      setAiLoading(false);
    });
  }, [specialty]);

  if (!specialty) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" dir="rtl">
        <Stethoscope className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-600 mb-2">לא נבחרה התמחות</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 overflow-auto" dir="rtl">
      {/* Hero */}
      <div className="relative bg-gradient-to-l from-cyan-600 to-teal-600 py-12 px-4">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Link to={createPageUrl('DoctorsCatalog')}>
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/20 gap-2">
                <ArrowRight className="w-4 h-4" />
                חזרה לקטלוג
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">{specialty}</h1>
              <p className="text-white/80 mt-1">{filteredDoctors.length} רופאים זמינים</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* AI Description */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span className="text-sm font-medium text-cyan-700">אודות ההתמחות</span>
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>טוען מידע...</span>
                </div>
              ) : aiDescription ? (
                <div className="text-slate-600 text-sm leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>{aiDescription}</ReactMarkdown>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        {/* Doctors List */}
        {doctorsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-600" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/70">
            <CardContent className="p-12 text-center">
              <Stethoscope className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">לא נמצאו רופאים בהתמחות זו</h3>
              <p className="text-slate-400 mt-1">נסה להחזיר לקטלוג המלא</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence>
              {filteredDoctors.map((doctor, i) => {
                const tenant = tenantMap[doctor.tenant_id];
                const themeColor = tenant?.theme_color || '#0891b2';
                return (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  >
                    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden h-full">
                      <div className="h-1.5 w-full" style={{ backgroundColor: themeColor }} />
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="w-14 h-14 ring-2 ring-white shadow-md">
                            <AvatarImage src={getDoctorAvatarUrl(doctor)} />
                            <AvatarFallback className="text-white font-bold text-lg" style={{ backgroundColor: themeColor }}>
                              {doctor.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg truncate">{doctor.name}</h3>
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            </div>
                            <Badge className="mt-1 text-white" style={{ backgroundColor: themeColor }}>
                              {doctor.specialty}
                            </Badge>
                            {tenant && <p className="text-xs text-slate-400 mt-1">{tenant.company_name}</p>}
                          </div>
                        </div>

                        <div className="space-y-2 text-sm mb-4">
                          {doctor.clinic_location && (
                            <div className="flex items-start gap-2 text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <span>{doctor.clinic_location}</span>
                            </div>
                          )}
                          {doctor.availability && (
                            <div className="flex items-start gap-2 text-slate-600">
                              <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <span>{doctor.availability}</span>
                            </div>
                          )}
                          {doctor.years_experience && (
                            <p className="text-slate-500 text-xs">{doctor.years_experience} שנות ניסיון</p>
                          )}
                        </div>

                        {doctor.procedures?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {doctor.procedures.map((proc, j) => (
                              <Link key={j} to={createPageUrl(`ProcedurePage?name=${encodeURIComponent(proc)}`)}>
                                <Badge variant="outline" className="text-xs font-normal cursor-pointer hover:bg-cyan-50 hover:border-cyan-300 transition-colors">
                                  {proc}
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                          <Link to={createPageUrl(`DoctorProfile?id=${doctor.id}`)}>
                            <Button size="sm" className="w-full gap-1.5 text-xs text-white" style={{ backgroundColor: themeColor }}>
                              <ExternalLink className="w-3.5 h-3.5" />
                              צפה בפרופיל המלא
                            </Button>
                          </Link>
                          <div className="flex gap-2">
                            {doctor.phone && (
                              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" asChild>
                                <a href={`tel:${doctor.phone}`}>
                                  <Phone className="w-3.5 h-3.5" />
                                  {doctor.phone}
                                </a>
                              </Button>
                            )}
                            {doctor.email && (
                              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" asChild>
                                <a href={`mailto:${doctor.email}`}>
                                  <Mail className="w-3.5 h-3.5" />
                                  אימייל
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}