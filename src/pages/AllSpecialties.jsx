import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Stethoscope, Search, ArrowRight, Loader2, Users, ChevronLeft 
} from "lucide-react";
import { motion } from "framer-motion";
import { getSpecialtyIcon, getSpecialtyColor } from '../components/specialties/SpecialtyIcon';
import SpecialtyDoctorsModal from '../components/specialties/SpecialtyDoctorsModal';

export default function AllSpecialties() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['all-doctors-specialties'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 500)
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants-specialties'],
    queryFn: () => base44.entities.Tenant.list()
  });

  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

  // Build specialty data
  const specialtiesData = useMemo(() => {
    const map = new Map();
    doctors.forEach(doc => {
      if (!doc.specialty) return;
      if (!map.has(doc.specialty)) {
        map.set(doc.specialty, { name: doc.specialty, doctors: [], procedures: new Set() });
      }
      const entry = map.get(doc.specialty);
      entry.doctors.push(doc);
      (doc.procedures || []).forEach(p => entry.procedures.add(p));
    });
    return Array.from(map.values())
      .map(s => ({ ...s, procedures: Array.from(s.procedures) }))
      .sort((a, b) => b.doctors.length - a.doctors.length);
  }, [doctors]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return specialtiesData;
    const q = searchQuery.trim().toLowerCase();
    return specialtiesData.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.procedures.some(p => p.toLowerCase().includes(q))
    );
  }, [specialtiesData, searchQuery]);

  const selectedData = selectedSpecialty 
    ? specialtiesData.find(s => s.name === selectedSpecialty)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" dir="rtl">
      {/* Hero */}
      <div className="relative h-44 md:h-56 bg-gradient-to-l from-teal-600 to-cyan-600">
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
        <div className="absolute bottom-6 right-6 md:right-12">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-white">כל ההתמחויות הרפואיות</h1>
              <p className="text-white/70 text-sm mt-1">
                {specialtiesData.length} תחומים רפואיים
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="חיפוש התמחות או טיפול..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-10 h-12 text-base bg-white shadow-sm"
          />
        </div>

        <p className="text-sm text-slate-500 mb-4">{filtered.length} תחומים</p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">לא נמצאו התמחויות</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((spec, i) => {
              const Icon = getSpecialtyIcon(spec.name);
              const color = getSpecialtyColor(spec.name);
              return (
                <motion.div
                  key={spec.name}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                >
                  <Card 
                    className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer h-full group"
                    onClick={() => setSelectedSpecialty(spec.name)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div 
                          className="p-3 rounded-xl text-white shrink-0 group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-slate-800 text-lg">{spec.name}</h3>
                            <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {spec.doctors.length} רופאים
                            </span>
                            <span>{spec.procedures.length} טיפולים</span>
                          </div>
                          {spec.procedures.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {spec.procedures.slice(0, 3).map(p => (
                                <Badge key={p} className="text-[10px] border-0" style={{ backgroundColor: `${color}15`, color }}>
                                  {p}
                                </Badge>
                              ))}
                              {spec.procedures.length > 3 && (
                                <Badge className="text-[10px] bg-slate-100 text-slate-500 border-0">+{spec.procedures.length - 3}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedData && (
        <SpecialtyDoctorsModal
          open={!!selectedSpecialty}
          onClose={() => setSelectedSpecialty(null)}
          specialty={selectedData.name}
          doctors={selectedData.doctors}
          tenantMap={tenantMap}
        />
      )}
    </div>
  );
}