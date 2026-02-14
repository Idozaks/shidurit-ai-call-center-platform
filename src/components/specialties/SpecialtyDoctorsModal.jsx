import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, Phone, ExternalLink, CheckCircle2, XCircle, 
  Stethoscope, ChevronLeft 
} from "lucide-react";
import { getDoctorAvatarUrl } from '../utils/doctorAvatar';
import { getSpecialtyIcon, getSpecialtyColor } from './SpecialtyIcon';

export default function SpecialtyDoctorsModal({ open, onClose, specialty, doctors, tenantMap }) {
  const Icon = getSpecialtyIcon(specialty);
  const color = getSpecialtyColor(specialty);

  // Get unique procedures from these doctors
  const allProcs = [...new Set(doctors.flatMap(d => d.procedures || []))];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: color }}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">{specialty}</DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">{doctors.length} רופאים</p>
            </div>
          </div>
        </DialogHeader>

        {/* Quick links to procedures */}
        {allProcs.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 mb-2">טיפולים בתחום זה:</p>
            <div className="flex flex-wrap gap-1.5">
              {allProcs.slice(0, 8).map(proc => (
                <Link key={proc} to={createPageUrl('ProcedurePage') + `?name=${encodeURIComponent(proc)}`} onClick={() => onClose(false)}>
                  <Badge variant="outline" className="text-xs cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                    {proc}
                  </Badge>
                </Link>
              ))}
              {allProcs.length > 8 && (
                <Badge variant="outline" className="text-xs text-slate-400">+{allProcs.length - 8}</Badge>
              )}
            </div>
          </div>
        )}

        {/* Doctors List */}
        <div className="space-y-3">
          {doctors.map(doctor => {
            const tenant = tenantMap?.[doctor.tenant_id];
            return (
              <div key={doctor.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <Avatar className="w-11 h-11 ring-2 ring-white shadow-sm shrink-0">
                  <AvatarImage src={getDoctorAvatarUrl(doctor)} />
                  <AvatarFallback className="text-white font-bold" style={{ backgroundColor: color }}>
                    {doctor.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{doctor.name}</p>
                    {doctor.is_available !== false ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                  </div>
                  {doctor.clinic_location && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {doctor.clinic_location}
                    </p>
                  )}
                  {tenant && <p className="text-[10px] text-slate-400 mt-0.5">{tenant.company_name}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {doctor.phone && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`tel:${doctor.phone}`}><Phone className="w-3.5 h-3.5 text-slate-500" /></a>
                    </Button>
                  )}
                  <Link to={createPageUrl('DoctorProfile') + `?id=${doctor.id}`} onClick={() => onClose(false)}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* View full specialty page */}
        <div className="pt-3 border-t mt-2">
          <Link to={createPageUrl('SpecialtyPage') + `?name=${encodeURIComponent(specialty)}`} onClick={() => onClose(false)}>
            <Button variant="outline" className="w-full gap-2">
              <Stethoscope className="w-4 h-4" />
              לדף ההתמחות המלא
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}