import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ChevronDown, X, Stethoscope } from "lucide-react";
import ROFIM_SPECIALTIES from '../data/rofimSpecialties';
import SPECIALTY_ICON_MAP from '../chat/SpecialtyIconMap';
import ISRAEL_CITIES from '../data/israelCities';
import { getKupaLogo } from '../chat/KupaLogo';

const KUPOT = ['כללית', 'מכבי', 'מאוחדת', 'לאומית', 'פרטי'];

function SpecialtyDropdown({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return ROFIM_SPECIALTIES;
    return ROFIM_SPECIALTIES.filter(s => s.includes(search));
  }, [search]);

  const Icon = value ? (SPECIALTY_ICON_MAP[value] || Stethoscope) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full h-10 px-3 rounded-lg border text-right flex items-center gap-2 text-sm transition-colors ${
          disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white hover:border-sky-300 cursor-pointer'
        } ${open ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200'}`}
      >
        {Icon && <Icon className="w-4 h-4 text-sky-600 shrink-0" />}
        <span className={`flex-1 truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || 'בחר תחום רפואי...'}
        </span>
        {value && !disabled ? (
          <X className="w-4 h-4 text-slate-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); onChange(''); setSearch(''); }} />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש התמחות..."
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.map(specialty => {
              const SIcon = SPECIALTY_ICON_MAP[specialty] || Stethoscope;
              return (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => { onChange(specialty); setOpen(false); setSearch(''); }}
                  className={`w-full px-3 py-2 text-right text-sm flex items-center gap-2 hover:bg-sky-50 transition-colors ${
                    value === specialty ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  <SIcon className="w-4 h-4 text-sky-500 shrink-0" />
                  {specialty}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-slate-400">לא נמצאו תוצאות</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CityAutocomplete({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setSearch(value || ''); }, [value]);

  const filtered = useMemo(() => {
    if (!search) return ISRAEL_CITIES.slice(0, 30);
    return ISRAEL_CITIES.filter(c => c.includes(search)).slice(0, 30);
  }, [search]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange('');
          }}
          onFocus={() => setOpen(true)}
          placeholder="הקלד שם עיר..."
          className="h-10 text-sm pr-3 pl-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); onChange(''); }}
            className="absolute left-2 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map(city => (
            <button
              key={city}
              type="button"
              onClick={() => { onChange(city); setSearch(city); setOpen(false); }}
              className={`w-full px-3 py-2 text-right text-sm hover:bg-sky-50 transition-colors ${
                value === city ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-700'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KupaDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLogo = value ? getKupaLogo(value) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full h-10 px-3 rounded-lg border text-right flex items-center gap-2 text-sm bg-white hover:border-sky-300 cursor-pointer transition-colors ${
          open ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200'
        }`}
      >
        {selectedLogo && <img src={selectedLogo} alt="" className="h-5 object-contain shrink-0" />}
        <span className={`flex-1 truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || 'בחר קופת חולים...'}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          <div className="grid grid-cols-3 gap-1 p-2">
            {KUPOT.map(kupa => {
              const logo = getKupaLogo(kupa);
              return (
                <button
                  key={kupa}
                  type="button"
                  onClick={() => { onChange(kupa); setOpen(false); }}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-xs hover:bg-sky-50 transition-colors ${
                    value === kupa ? 'bg-sky-50 text-sky-700 font-medium ring-1 ring-sky-300' : 'text-slate-700'
                  }`}
                >
                  {logo ? <img src={logo} alt={kupa} className="h-7 object-contain" /> : <span>{kupa}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Preload kupa logos
const KUPA_LOGO_URLS = KUPOT.map(k => getKupaLogo(k)).filter(Boolean);

export default function DoctorSearchModal({ open, onClose, onSubmit }) {
  useEffect(() => {
    if (open) {
      KUPA_LOGO_URLS.forEach(url => { const img = new Image(); img.src = url; });
    }
  }, [open]);
  const [specialty, setSpecialty] = useState('');
  const [procedure, setProcedure] = useState('');
  const [city, setCity] = useState('');
  const [kupa, setKupa] = useState('');

  const handleSpecialtyChange = (val) => {
    setSpecialty(val);
    if (val) setProcedure('');
  };

  const handleProcedureChange = (val) => {
    setProcedure(val);
    if (val) setSpecialty('');
  };

  const hasMedicalField = specialty || procedure.trim();
  const canSubmit = hasMedicalField && city && kupa;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const medicalTerm = specialty || procedure.trim();
    const text = `אני מחפש/ת ${specialty ? `רופא ${specialty}` : medicalTerm} ב${city}, קופת חולים: ${kupa}`;
    onSubmit(text);
    // Reset
    setSpecialty('');
    setProcedure('');
    setCity('');
    setKupa('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
            <Search className="w-5 h-5 text-sky-600" />
            חיפוש רופא
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Field 1: Specialty dropdown */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">תחום רפואי</Label>
            <SpecialtyDropdown
              value={specialty}
              onChange={handleSpecialtyChange}
              disabled={!!procedure.trim()}
            />
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">או</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Field 2: Procedure free text */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">פרוצדורה רפואית</Label>
            <Input
              value={procedure}
              onChange={(e) => handleProcedureChange(e.target.value)}
              placeholder="למשל: החלפת מפרק ברך, הסרת שומות..."
              className="h-10 text-sm"
              disabled={!!specialty}
            />
          </div>

          {/* Field 3: City autocomplete */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">עיר</Label>
            <CityAutocomplete value={city} onChange={setCity} />
          </div>

          {/* Field 4: Kupa dropdown */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">קופת חולים</Label>
            <KupaDropdown value={kupa} onChange={setKupa} />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-11 text-white font-medium rounded-xl mt-2"
            style={{ background: canSubmit ? 'linear-gradient(135deg, #0099cc, #0077b3)' : undefined }}
          >
            <Search className="w-4 h-4 ml-2" />
            חפש רופא
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}