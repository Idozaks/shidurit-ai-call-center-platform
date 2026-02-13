import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Stethoscope, MapPin, Phone, Mail, Clock, Award, 
  CheckCircle2, ExternalLink, ChevronLeft, ChevronRight
} from "lucide-react";
import { createPageUrl } from '@/utils';

const DOCTOR_PREFIXES = ["דר'", 'ד"ר', "דר", "פרופ'", "פרופ"];

function detectDoctorNames(text, doctors) {
  if (!text || !doctors?.length) return [];
  const matched = new Set();
  const results = [];

  for (const doctor of doctors) {
    if (matched.has(doctor.id)) continue;
    const name = doctor.name || '';
    // Check if any prefix + part of name appears in text
    for (const prefix of DOCTOR_PREFIXES) {
      if (text.includes(prefix) && nameAppearsNear(text, prefix, name)) {
        matched.add(doctor.id);
        results.push(doctor);
        break;
      }
    }
    // Also check plain name match (at least last name)
    if (!matched.has(doctor.id)) {
      const parts = name.split(' ').filter(p => p.length > 2);
      // Need at least a meaningful part of the name to appear
      for (const part of parts) {
        if (part.length >= 3 && text.includes(part)) {
          // Verify it's near a prefix or that the full name appears
          const fullNameInText = parts.every(p => text.includes(p));
          if (fullNameInText) {
            matched.add(doctor.id);
            results.push(doctor);
            break;
          }
        }
      }
    }
  }
  return results;
}

function nameAppearsNear(text, prefix, fullName) {
  const parts = fullName.split(' ').filter(p => p.length > 1);
  // Check if any significant part of the name appears near (within 50 chars) of the prefix
  const prefixIdx = text.indexOf(prefix);
  if (prefixIdx === -1) return false;
  const vicinity = text.substring(prefixIdx, prefixIdx + 60);
  return parts.some(part => part.length >= 2 && vicinity.includes(part));
}

export function useTenantDoctors(tenantId) {
  return useQuery({
    queryKey: ['public-doctors', tenantId],
    queryFn: async () => {
      const { base44 } = await import('@/api/base44Client');
      const all = await base44.entities.Doctor.filter({ tenant_id: tenantId });
      return all.filter(d => d.is_available !== false);
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });
}

const scrollbarStyle = `
.styled-scrollbar::-webkit-scrollbar { height: 6px; }
.styled-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
.styled-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.styled-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.styled-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
`;

export default function DoctorCards({ messageContent, doctors, themeColor }) {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  const matchedDoctors = detectDoctorNames(messageContent, doctors);
  
  if (matchedDoctors.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto py-2 px-1 -mx-1 styled-scrollbar">
        {matchedDoctors.map((doctor) => (
          <DoctorMiniCard
            key={doctor.id}
            doctor={doctor}
            themeColor={themeColor}
            onClick={() => setSelectedDoctor(doctor)}
          />
        ))}
      </div>

      <DoctorDetailModal
        doctor={selectedDoctor}
        open={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        themeColor={themeColor}
      />
    </>
  );
}

function DoctorMiniCard({ doctor, themeColor, onClick }) {
  return (
    <Card
      className="flex-shrink-0 w-52 cursor-pointer hover:shadow-md transition-shadow border bg-white/90 backdrop-blur-sm overflow-hidden"
      onClick={onClick}
    >
      <div className="p-3 flex items-center gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={doctor.image_url} />
          <AvatarFallback
            className="text-white font-bold text-sm"
            style={{ backgroundColor: themeColor }}
          >
            {doctor.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-800 truncate">{doctor.name}</p>
          <p className="text-xs text-slate-500 truncate">{doctor.specialty}</p>
        </div>
      </div>
      <div className="px-3 pb-2.5 flex items-center justify-between">
        {doctor.is_available !== false ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-200 text-green-600 gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" />
            זמין
          </Badge>
        ) : <span />}
        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
          פרטים
          <ChevronLeft className="w-3 h-3" />
        </span>
      </div>
    </Card>
  );
}

function DoctorDetailModal({ doctor, open, onClose, themeColor }) {
  if (!doctor) return null;

  const profileUrl = createPageUrl('DoctorProfile') + `?id=${doctor.id}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden" dir="rtl">
        {/* Header banner */}
        <div
          className="h-20 relative"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}
        >
          <div className="absolute -bottom-8 right-6">
            <Avatar className="w-16 h-16 ring-4 ring-white shadow-lg">
              <AvatarImage src={doctor.image_url} />
              <AvatarFallback
                className="text-white font-bold text-xl"
                style={{ backgroundColor: themeColor }}
              >
                {doctor.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="px-6 pt-10 pb-6 space-y-4">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl">{doctor.name}</DialogTitle>
            <Badge className="w-fit text-white mt-1" style={{ backgroundColor: themeColor }}>
              {doctor.specialty}
            </Badge>
          </DialogHeader>

          {doctor.bio && (
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">{doctor.bio}</p>
          )}

          {doctor.years_experience && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              <Award className="w-4 h-4" />
              <span className="font-medium">{doctor.years_experience} שנות ניסיון</span>
            </div>
          )}

          {doctor.procedures?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" />
                טיפולים
              </p>
              <div className="flex flex-wrap gap-1">
                {doctor.procedures.slice(0, 6).map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                ))}
                {doctor.procedures.length > 6 && (
                  <Badge variant="outline" className="text-xs">+{doctor.procedures.length - 6}</Badge>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2 text-sm">
            {doctor.clinic_location && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
                <span>{doctor.clinic_location}</span>
              </div>
            )}
            {doctor.availability && (
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
                <span>{doctor.availability}</span>
              </div>
            )}
            {doctor.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
                <a href={`tel:${doctor.phone}`} className="hover:underline">{doctor.phone}</a>
              </div>
            )}
            {doctor.email && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
                <a href={`mailto:${doctor.email}`} className="hover:underline">{doctor.email}</a>
              </div>
            )}
          </div>

          <Button
            className="w-full gap-2 text-white"
            style={{ backgroundColor: themeColor }}
            onClick={() => window.open(profileUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
            צפה בעמוד הרופא
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}