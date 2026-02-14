import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

export default function DeleteTenantDialog({ open, onClose, onConfirmDelete, tenantSlug, isDeleting }) {
  const [step, setStep] = useState(1);
  const [typedSlug, setTypedSlug] = useState('');

  const handleClose = () => {
    setStep(1);
    setTypedSlug('');
    onClose();
  };

  const handleFinalDelete = () => {
    if (typedSlug === tenantSlug) {
      onConfirmDelete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                מחיקת עסק
              </DialogTitle>
              <DialogDescription className="text-right">
                האם אתה בטוח שברצונך למחוק את העסק? פעולה זו תמחק את כל הנתונים הקשורים לעסק לצמיתות.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button variant="outline" onClick={handleClose}>ביטול</Button>
              <Button variant="destructive" onClick={() => setStep(2)}>
                כן, המשך למחיקה
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                אזהרה אחרונה
              </DialogTitle>
              <DialogDescription className="text-right">
                <span className="font-semibold text-red-600">שים לב!</span> מחיקת העסק תגרום לאובדן מוחלט של כל המידע: לידים, שיחות, הגדרות, מאגר ידע ורופאים. 
                <br /><br />
                לא ניתן לשחזר את המידע לאחר המחיקה. האם אתה בטוח שברצונך להמשיך?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button variant="outline" onClick={handleClose}>ביטול</Button>
              <Button variant="destructive" onClick={() => setStep(3)}>
                כן, אני מבין. המשך
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                אישור סופי
              </DialogTitle>
              <DialogDescription className="text-right">
                כדי לאשר את המחיקה, הקלד את שם המערכת של העסק:
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <span className="font-mono font-bold text-red-700 text-lg select-all">{tenantSlug}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-600">הקלד כאן את שם המערכת:</Label>
                <Input
                  value={typedSlug}
                  onChange={(e) => setTypedSlug(e.target.value)}
                  placeholder={tenantSlug}
                  className="font-mono text-center"
                  dir="ltr"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button variant="outline" onClick={handleClose}>ביטול</Button>
              <Button
                variant="destructive"
                onClick={handleFinalDelete}
                disabled={typedSlug !== tenantSlug || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Trash2 className="w-4 h-4 ml-2" />
                )}
                מחק לצמיתות
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}