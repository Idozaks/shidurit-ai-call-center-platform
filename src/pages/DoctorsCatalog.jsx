import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Phone, Mail, MapPin, Clock, Stethoscope, 
  Loader2, CheckCircle2, XCircle, Filter, ExternalLink
} from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from "framer-motion";

export default function DoctorsCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['all-doctors'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 200)
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list()
  });

  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

  const specialties = [...new Set(doctors.map(d => d.specialty).filter(Boolean))];

  const filteredDoctors = doctors.filter(d => {
    const matchSearch = !searchQuery || 
      d.name?.includes(searchQuery) || 
      d.specialty?.includes(searchQuery) ||
      d.clinic_location?.includes(searchQuery) ||
      d.procedures?.some(p => p.includes(searchQuery));
    const matchSpecialty = specialtyFilter === 'all' || d.specialty === specialtyFilter;
    const matchAvailability = availabilityFilter === 'all' || 
      (availabilityFilter === 'available' && d.is_available !== false) ||
      (availabilityFilter === 'unavailable' && d.is_available === false);
    return matchSearch && matchSpecialty && matchAvailability;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" dir="rtl">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-l from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                קטלוג רופאים
              </h1>
              <p className="text-slate-500 mt-1">
                {filteredDoctors.length} רופאים מתוך {doctors.length}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חיפוש לפי שם, התמחות, מיקום, פרוצדורה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-white/70 backdrop-blur-sm border-slate-200 h-11"
            />
          </div>
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/70 h-11">
              <Filter className="w-4 h-4 ml-2 text-slate-400" />
              <SelectValue placeholder="התמחות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל ההתמחויות</SelectItem>
              {specialties.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white/70 h-11">
              <SelectValue placeholder="זמינות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="available">זמינים</SelectItem>
              <SelectItem value="unavailable">לא זמינים</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Doctors Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/70">
            <CardContent className="p-12 text-center">
              <Stethoscope className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">לא נמצאו רופאים</h3>
              <p className="text-slate-400 mt-1">נסה לשנות את הסינון או החיפוש</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            <AnimatePresence>
              {filteredDoctors.map((doctor, i) => {
                const tenant = tenantMap[doctor.tenant_id];
                return (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  >
                    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden h-full">
                      <div 
                        className="h-1.5 w-full"
                        style={{ backgroundColor: tenant?.theme_color || '#6366f1' }}
                      />
                      <CardContent className="p-5">
                        {/* Doctor Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="w-14 h-14 ring-2 ring-white shadow-md">
                            <AvatarImage src={doctor.image_url} />
                            <AvatarFallback 
                              className="text-white font-bold text-lg"
                              style={{ backgroundColor: tenant?.theme_color || '#6366f1' }}
                            >
                              {doctor.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg truncate">{doctor.name}</h3>
                              {doctor.is_available !== false ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                              )}
                            </div>
                            <Badge 
                              className="mt-1 text-white"
                              style={{ backgroundColor: tenant?.theme_color || '#6366f1' }}
                            >
                              {doctor.specialty}
                            </Badge>
                            {tenant && (
                              <p className="text-xs text-slate-400 mt-1">{tenant.company_name}</p>
                            )}
                          </div>
                        </div>

                        {/* Info */}
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

                        {/* Procedures */}
                        {doctor.procedures?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {doctor.procedures.map((proc, j) => (
                              <Badge key={j} variant="outline" className="text-xs font-normal">
                                {proc}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Contact */}
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          {doctor.phone && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 gap-1.5 text-xs"
                              asChild
                            >
                              <a href={`tel:${doctor.phone}`}>
                                <Phone className="w-3.5 h-3.5" />
                                {doctor.phone}
                              </a>
                            </Button>
                          )}
                          {doctor.email && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 gap-1.5 text-xs"
                              asChild
                            >
                              <a href={`mailto:${doctor.email}`}>
                                <Mail className="w-3.5 h-3.5" />
                                אימייל
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}