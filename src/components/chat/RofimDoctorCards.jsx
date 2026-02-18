import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Stethoscope, ChevronLeft, ExternalLink, User, MapPin, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BLANK_FACE = 'https://www.rofim.org.il/FilesManagers/Doctors/ZZ_blank_face.gif';

function isBlankImage(url) {
  return !url || url.includes('ZZ_blank_face');
}

/**
 * Displays Rofim doctor cards below an AI message.
 * rofimDoctors: array of { name, specialty, image, query }
 */
export default function RofimDoctorCards({ rofimDoctors, themeColor }) {
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  if (!rofimDoctors || rofimDoctors.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto py-2 px-1 -mx-1" style={{ scrollbarWidth: 'thin' }}>
        {rofimDoctors.map((doctor, idx) => (
          <RofimMiniCard
            key={idx}
            doctor={doctor}
            themeColor={themeColor}
            onClick={() => setSelectedDoctor(doctor)}
          />
        ))}
      </div>
      <RofimDetailModal
        doctor={selectedDoctor}
        open={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        themeColor={themeColor}
      />
    </>
  );
}

function RofimMiniCard({ doctor, themeColor, onClick }) {
  const hasImage = !isBlankImage(doctor.image);
  
  return (
    <Card
      className="flex-shrink-0 w-52 cursor-pointer hover:shadow-md transition-shadow border bg-white/90 backdrop-blur-sm overflow-hidden"
      onClick={onClick}
    >
      <div className="p-3 flex items-center gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          {hasImage ? (
            <AvatarImage src={doctor.image} />
          ) : null}
          <AvatarFallback
            className="text-white font-bold text-sm"
            style={{ backgroundColor: themeColor }}
          >
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-800 truncate">{doctor.name}</p>
          <p className="text-xs text-slate-500 truncate">{doctor.specialty}</p>
          {doctor.cities && (
            <p className="text-[10px] text-slate-400 truncate flex items-center gap-0.5 mt-0.5">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              {doctor.cities}
            </p>
          )}
        </div>
      </div>
      <div className="px-3 pb-2.5 flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600 gap-0.5">
          <Stethoscope className="w-2.5 h-2.5" />
          rofim.org.il
        </Badge>
        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
          פרטים
          <ChevronLeft className="w-3 h-3" />
        </span>
      </div>
    </Card>
  );
}

function RofimDetailModal({ doctor, open, onClose, themeColor }) {
  if (!doctor) return null;

  const hasImage = !isBlankImage(doctor.image);
  const rofimUrl = doctor.doctor_url 
    || (doctor.query ? `https://www.rofim.org.il/minisite/${doctor.query}` : 'https://www.rofim.org.il');

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
              {hasImage ? (
                <AvatarImage src={doctor.image} />
              ) : null}
              <AvatarFallback
                className="text-white font-bold text-xl"
                style={{ backgroundColor: themeColor }}
              >
                <User className="w-8 h-8" />
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

          <Separator />

          <div className="text-sm text-slate-600 space-y-2">
            <p>
              <span className="font-medium text-slate-700">התמחות:</span> {doctor.specialty}
            </p>
            {doctor.cities && (
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-700">מיקום:</span> {doctor.cities}
              </p>
            )}
            {doctor.kupot && (
              <div>
                <p className="flex items-center gap-1.5 mb-1.5">
                  <Heart className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">קופות חולים:</span>
                </p>
                <div className="flex flex-wrap gap-1 mr-5">
                  {doctor.kupot.split(',').map((kupa, i) => (
                    <Badge key={i} variant="outline" className="text-xs px-2 py-0.5 border-indigo-200 text-indigo-600">
                      {kupa.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400">
              מידע נוסף על הרופא/ה זמין באתר rofim.org.il
            </p>
          </div>

          <Button
            className="w-full gap-2 text-white"
            style={{ backgroundColor: themeColor }}
            onClick={() => window.open(rofimUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
            צפה בפרופיל באתר רופאים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}