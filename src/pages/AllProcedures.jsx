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
  Stethoscope, Search, ArrowRight, Loader2, Users, 
  SortAsc, SortDesc, Filter, LayoutGrid, List, ChevronLeft
} from "lucide-react";
import { motion } from "framer-motion";

// Map procedures to medical categories
const CATEGORY_MAP = {
  'כירורגיה': ['ניתוח', 'כריתת', 'עקירות', 'השתלות', 'ביופסי'],
  'אבחון ובדיקות': ['בדיקת', 'בדיקות', 'אבחון', 'מיפוי', 'EMG', 'EEG', 'IgE'],
  'טיפולים': ['טיפול', 'הזרקות', 'אימונותרפיה', 'PRP', 'גירוי', 'הלבנת', 'ציפוי'],
  'מעקב ומניעה': ['מעקב', 'חיסונים', 'תוכניות מניעה', 'ייעוץ', 'הפניות'],
  'שיקום': ['שיקום'],
};

function categorize(procedureName) {
  const lower = procedureName;
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => lower.includes(k))) return category;
  }
  return 'כללי';
}

export default function AllProcedures() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc'); // asc or desc
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [selectedLetter, setSelectedLetter] = useState(null);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['all-doctors-for-procedures'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 500)
  });

  // Extract unique procedures with doctor count and specialty
  const proceduresData = useMemo(() => {
    const map = new Map();
    doctors.forEach(doc => {
      (doc.procedures || []).forEach(proc => {
        if (!map.has(proc)) {
          map.set(proc, { name: proc, doctorCount: 0, specialties: new Set(), category: categorize(proc) });
        }
        const entry = map.get(proc);
        entry.doctorCount++;
        if (doc.specialty) entry.specialties.add(doc.specialty);
      });
    });
    return Array.from(map.values()).map(p => ({
      ...p,
      specialties: Array.from(p.specialties)
    }));
  }, [doctors]);

  // Get all categories
  const categories = useMemo(() => {
    const cats = new Set(proceduresData.map(p => p.category));
    return ['all', ...Array.from(cats).sort()];
  }, [proceduresData]);

  // Get all specialties
  const allSpecialties = useMemo(() => {
    const specs = new Set();
    proceduresData.forEach(p => p.specialties.forEach(s => specs.add(s)));
    return ['all', ...Array.from(specs).sort((a, b) => a.localeCompare(b, 'he'))];
  }, [proceduresData]);

  // Hebrew alphabet for filtering
  const hebrewLetters = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

  // Filter and sort
  const filteredProcedures = useMemo(() => {
    let result = [...proceduresData];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.specialties.some(s => s.toLowerCase().includes(q)));
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Specialty filter
    if (selectedSpecialty !== 'all') {
      result = result.filter(p => p.specialties.includes(selectedSpecialty));
    }

    // Letter filter
    if (selectedLetter) {
      result = result.filter(p => p.name.startsWith(selectedLetter));
    }

    // Sort
    result.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'he');
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [proceduresData, searchQuery, selectedCategory, selectedSpecialty, sortOrder, selectedLetter]);

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
      <div className="relative h-44 md:h-56 bg-gradient-to-l from-indigo-600 to-violet-600">
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
              <h1 className="text-2xl md:text-4xl font-bold text-white">כל הטיפולים והפרוצדורות</h1>
              <p className="text-white/70 text-sm mt-1">
                {proceduresData.length} טיפולים זמינים
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Search & Controls */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חיפוש טיפול או התמחות..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10 h-12 text-base bg-white shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category pills */}
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              >
                {cat === 'all' ? 'הכל' : cat}
              </Button>
            ))}

            {/* Specialty pills */}
            <div className="flex flex-wrap items-center gap-2 w-full">
              <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {allSpecialties.map(spec => (
                  <Button
                    key={spec}
                    variant={selectedSpecialty === spec ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSpecialty(spec)}
                    className={`text-xs h-7 ${selectedSpecialty === spec ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                  >
                    {spec === 'all' ? 'כל ההתמחויות' : spec}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mr-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'א-ת' : 'ת-א'}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-slate-100' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${viewMode === 'list' ? 'bg-slate-100' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Alphabetical bar */}
          <div className="flex flex-wrap gap-1">
            <Button
              variant={selectedLetter === null ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 w-7 p-0 text-xs ${selectedLetter === null ? 'bg-indigo-600' : ''}`}
              onClick={() => setSelectedLetter(null)}
            >
              הכל
            </Button>
            {hebrewLetters.map(letter => {
              const hasItems = proceduresData.some(p => p.name.startsWith(letter));
              return (
                <Button
                  key={letter}
                  variant={selectedLetter === letter ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 w-7 p-0 text-xs ${selectedLetter === letter ? 'bg-indigo-600' : ''} ${!hasItems ? 'opacity-30 pointer-events-none' : ''}`}
                  onClick={() => setSelectedLetter(letter)}
                  disabled={!hasItems}
                >
                  {letter}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-500 mb-4">
          {filteredProcedures.length} תוצאות
          {selectedCategory !== 'all' && ` בקטגוריית "${selectedCategory}"`}
          {selectedSpecialty !== 'all' && ` בהתמחות "${selectedSpecialty}"`}
          {selectedLetter && ` באות "${selectedLetter}"`}
        </p>

        {/* Procedures Grid/List */}
        {filteredProcedures.length === 0 ? (
          <div className="text-center py-16">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">לא נמצאו טיפולים</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProcedures.map((proc, i) => (
              <motion.div
                key={proc.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Link to={createPageUrl('ProcedurePage') + `?name=${encodeURIComponent(proc.name)}`}>
                  <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-bold text-slate-800">{proc.name}</h3>
                        <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                      </div>
                      <Badge variant="outline" className="text-xs mb-3">{proc.category}</Badge>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {proc.doctorCount} רופאים
                        </span>
                      </div>
                      {proc.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {proc.specialties.slice(0, 2).map(s => (
                            <Badge key={s} className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0">{s}</Badge>
                          ))}
                          {proc.specialties.length > 2 && (
                            <Badge className="text-[10px] bg-slate-100 text-slate-500 border-0">+{proc.specialties.length - 2}</Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProcedures.map((proc, i) => (
              <motion.div
                key={proc.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
              >
                <Link to={createPageUrl('ProcedurePage') + `?name=${encodeURIComponent(proc.name)}`}>
                  <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-indigo-100">
                    <div className="p-2 rounded-lg bg-indigo-50 shrink-0">
                      <Stethoscope className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{proc.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{proc.category}</Badge>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {proc.doctorCount} רופאים
                        </span>
                        {proc.specialties.length > 0 && (
                          <span className="truncate">{proc.specialties.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}