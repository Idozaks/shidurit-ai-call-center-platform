import React, { useState, useEffect } from 'react';
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
  Stethoscope, ArrowRight, Loader2, CheckCircle2, XCircle,
  MapPin, Clock, Phone, Mail, ExternalLink, BookOpen, 
  AlertCircle, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { getDoctorAvatarUrl } from '../components/utils/doctorAvatar';
import ReactMarkdown from 'react-markdown';

export default function ProcedurePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const procedureName = urlParams.get('name') || '';
  const [aiInfo, setAiInfo] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['all-doctors-procedures'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 200)
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list()
  });

  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

  const relatedDoctors = doctors.filter(d =>
    d.procedures?.some(p => p === procedureName) ||
    d.specialty?.includes(procedureName)
  );

  // Generate AI info about the procedure
  useEffect(() => {
    if (!procedureName) return;
    setAiLoading(true);
    setAiInfo(null);

    base44.integrations.Core.InvokeLLM({
      prompt: `תן מידע רפואי כללי על הפרוצדורה/טיפול: "${procedureName}".
כתוב בעברית, בצורה ברורה ונגישה ללקוח שאינו רופא.

כלול את הסעיפים הבאים בפורמט markdown:
## תיאור כללי
מהו הטיפול ומה מטרתו

## למי זה מתאים
אינדיקציות עיקריות

## מהלך הטיפול
מה קורה בזמן הטיפול

## משך הטיפול
כמה זמן לוקח בממוצע

## תקופת החלמה
מה צפוי אחרי

## יתרונות עיקריים
רשימה של יתרונות

חשוב: זהו מידע כללי בלבד ואינו מהווה ייעוץ רפואי.`
    }).then(res => {
      setAiInfo(typeof res === 'string' ? res : (res?.text || res?.content || JSON.stringify(res)));
      setAiLoading(false);
    }).catch((err) => {
      console.error("AI procedure info error:", err);
      setAiLoading(false);
    });
  }, [procedureName]);

  if (!procedureName) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" dir="rtl">
        <Stethoscope className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-600 mb-2">לא צוין שם טיפול</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" dir="rtl">
      {/* Hero */}
      <div className="relative h-40 md:h-52 bg-gradient-to-l from-indigo-600 to-violet-600">
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
        <div className="absolute bottom-6 right-6 md:right-12 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white">{procedureName}</h1>
            <p className="text-white/70 text-sm mt-1">
              {relatedDoctors.length} רופאים מבצעים טיפול זה
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* AI-Generated Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-slate-800">מידע על הטיפול</h2>
                    <Badge variant="outline" className="text-xs mr-auto">נוצר ע״י AI</Badge>
                  </div>

                  {aiLoading ? (
                    <div className="flex flex-col items-center py-10 text-slate-400 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <span className="text-sm">מייצר מידע על {procedureName}...</span>
                    </div>
                  ) : aiInfo ? (
                    <div className="space-y-5">
                      <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{aiInfo}</ReactMarkdown>
                      </div>

                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mt-4">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                          מידע זה נוצר באמצעות AI ומיועד למטרות מידע כלליות בלבד. אינו מהווה ייעוץ רפואי. יש להתייעץ עם רופא מומחה.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 py-8">לא הצלחנו לטעון מידע על הטיפול</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Related Doctors */}
          <div className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    רופאים המבצעים {procedureName}
                  </h2>

                  {doctorsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                  ) : relatedDoctors.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">לא נמצאו רופאים לטיפול זה</p>
                  ) : (
                    <div className="space-y-3">
                      {relatedDoctors.map((doctor) => {
                        const tenant = tenantMap[doctor.tenant_id];
                        return (
                          <Link
                            key={doctor.id}
                            to={createPageUrl('DoctorProfile') + `?id=${doctor.id}`}
                            className="block"
                          >
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-indigo-50 transition-colors cursor-pointer">
                              <Avatar className="w-10 h-10 ring-2 ring-white shadow-sm">
                                <AvatarImage src={getDoctorAvatarUrl(doctor)} />
                                <AvatarFallback
                                  className="text-white font-bold text-sm"
                                  style={{ backgroundColor: tenant?.theme_color || '#6366f1' }}
                                >
                                  {doctor.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium text-sm truncate">{doctor.name}</p>
                                  {doctor.is_available !== false ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">{doctor.specialty}</p>
                                {doctor.clinic_location && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs text-slate-400 truncate">{doctor.clinic_location}</span>
                                  </div>
                                )}
                              </div>
                              <ExternalLink className="w-4 h-4 text-slate-300 shrink-0" />
                            </div>
                          </Link>
                        );
                      })}
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