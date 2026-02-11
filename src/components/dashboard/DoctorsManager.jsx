import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, UserPlus, Edit, Trash2, Search, Phone, Mail, 
  MapPin, Loader2, Users
} from "lucide-react";

export default function DoctorsManager({ tenantId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    procedures: [],
    clinic_location: '',
    availability: '',
    phone: '',
    email: '',
    bio: '',
    years_experience: null,
    is_available: true
  });
  const queryClient = useQueryClient();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', tenantId],
    queryFn: () => base44.entities.Doctor.filter({ tenant_id: tenantId }),
    enabled: !!tenantId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Doctor.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', tenantId] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Doctor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', tenantId] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Doctor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors', tenantId] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      specialty: '',
      procedures: [],
      clinic_location: '',
      availability: '',
      phone: '',
      email: '',
      bio: '',
      years_experience: null,
      is_available: true
    });
    setEditingDoctor(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      procedures: typeof formData.procedures === 'string' 
        ? formData.procedures.split(',').map(p => p.trim()).filter(Boolean)
        : formData.procedures,
      years_experience: formData.years_experience ? parseInt(formData.years_experience) : null
    };
    
    if (editingDoctor) {
      updateMutation.mutate({ id: editingDoctor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialty: doctor.specialty,
      procedures: doctor.procedures?.join(', ') || '',
      clinic_location: doctor.clinic_location || '',
      availability: doctor.availability || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      bio: doctor.bio || '',
      years_experience: doctor.years_experience || '',
      is_available: doctor.is_available !== false
    });
    setIsDialogOpen(true);
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            ניהול מומחים
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4" />
                      הוסף מומחה
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>הוסף מומחה חדש</TooltipContent>
                </Tooltip>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>{editingDoctor ? 'עריכת מומחה' : 'הוספת מומחה חדש'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>שם</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>התמחות</Label>
                      <Input
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>פרוצדורות (מופרדות בפסיקים)</Label>
                    <Input
                      value={formData.procedures}
                      onChange={(e) => setFormData({ ...formData, procedures: e.target.value })}
                      placeholder="טיפול שורש, עקירה, הלבנה"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>טלפון</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>אימייל</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>מיקום מרפאה</Label>
                    <Input
                      value={formData.clinic_location}
                      onChange={(e) => setFormData({ ...formData, clinic_location: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>זמינות</Label>
                      <Input
                        value={formData.availability}
                        onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                        placeholder="א'-ה' 9:00-17:00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>שנות ניסיון</Label>
                      <Input
                        type="number"
                        value={formData.years_experience}
                        onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>אודות</Label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>זמין לפגישות</Label>
                    <Switch
                      checked={formData.is_available}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      editingDoctor ? 'עדכן' : 'הוסף'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>אין מומחים</p>
            <p className="text-sm mt-1">הוסף מומחים כדי לאפשר קביעת תורים</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map((doctor) => (
              <div 
                key={doctor.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={doctor.image_url} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600">
                      {doctor.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">{doctor.name}</h3>
                      {!doctor.is_available && (
                        <Badge variant="secondary" className="text-xs">לא זמין</Badge>
                      )}
                    </div>
                    <p className="text-sm text-indigo-600">{doctor.specialty}</p>
                    {doctor.clinic_location && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{doctor.clinic_location}</span>
                      </div>
                    )}
                    {doctor.procedures?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doctor.procedures.slice(0, 3).map((proc, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {proc}
                          </Badge>
                        ))}
                        {doctor.procedures.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{doctor.procedures.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(doctor)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>ערוך מומחה</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(doctor.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>מחק מומחה</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}