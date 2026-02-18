import React, { useState } from 'react';
import { 
  Menu, X, Stethoscope, Users, ClipboardList, Building2, 
  MessageCircle, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';

const menuItems = [
  { label: 'כל ההתמחויות', icon: Stethoscope, page: 'AllSpecialties' },
  { label: 'כל הטיפולים', icon: ClipboardList, page: 'AllProcedures' },
  { label: 'קטלוג רופאים', icon: Users, page: 'DoctorsCatalog' },
];

export default function PublicChatMenu({ tenant, themeColor }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-white/80 hover:text-white hover:bg-white/20"
        onClick={() => setOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[100]" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-72 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-white/30" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
            {/* Header */}
            <div className="p-4 border-b border-white/30 flex items-center justify-between" style={{ background: 'rgba(0,153,204,0.08)' }}>
              <div className="flex items-center gap-2">
                {tenant?.logo_url ? (
                  <img src={tenant.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: themeColor }}>
                    <Building2 className="w-4 h-4" />
                  </div>
                )}
                <span className="font-bold text-slate-800">{tenant?.company_name || 'תפריט'}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Navigation items - placeholder for future menu items */}
            <nav className="flex-1 p-3 space-y-1">
            </nav>

            {/* Footer */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>מופעל ע״י שידורית AI</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}