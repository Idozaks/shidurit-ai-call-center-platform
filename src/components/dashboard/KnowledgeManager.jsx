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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, BookOpen, Edit, Trash2, Search, FileText, 
  Globe, Image, Loader2, Upload, Paperclip, X, File
} from "lucide-react";
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'general', label: 'כללי' },
  { value: 'services', label: 'שירותים' },
  { value: 'products', label: 'מוצרים' },
  { value: 'faq', label: 'שאלות נפוצות' },
  { value: 'pricing', label: 'מחירים' },
  { value: 'contact', label: 'יצירת קשר' },
  { value: 'hours', label: 'שעות פעילות' },
  { value: 'about', label: 'אודות' },
  { value: 'team', label: 'צוות' },
  { value: 'policies', label: 'מדיניות' },
  { value: 'locations', label: 'מיקומים' },
  { value: 'other', label: 'אחר' }
];

export default function KnowledgeManager({ tenantId, knowledge = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    is_active: true,
    file_url: '',
    file_name: ''
  });
  const [customCategory, setCustomCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const queryClient = useQueryClient();

  const entries = knowledge;
  const isLoading = false;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeEntry.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', tenantId] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KnowledgeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', tenantId] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgeEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', tenantId] });
    }
  });

  const resetForm = () => {
    setFormData({ title: '', content: '', category: 'general', is_active: true, file_url: '', file_name: '' });
    setCustomCategory('');
    setEditingEntry(null);
    setIsDialogOpen(false);
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, file_url, file_name: file.name }));
    setUploading(false);
  };

  const handleBulkFileUpload = async (files) => {
    setBulkUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "A short descriptive title for this document" },
            content: { type: "string", description: "The full text content of the document" },
            category: { type: "string", description: "One of: general, services, products, faq, pricing, contact, hours, about, team, policies, locations" }
          },
          required: ["title", "content"]
        }
      });
      if (result.status === 'success' && result.output) {
        const extracted = Array.isArray(result.output) ? result.output[0] : result.output;
        await base44.entities.KnowledgeEntry.create({
          tenant_id: tenantId,
          title: extracted.title || file.name,
          content: extracted.content || '',
          category: extracted.category || 'general',
          file_url,
          file_name: file.name,
          is_active: true
        });
      } else {
        await base44.entities.KnowledgeEntry.create({
          tenant_id: tenantId,
          title: file.name,
          content: `קובץ מצורף: ${file.name}`,
          category: 'general',
          file_url,
          file_name: file.name,
          is_active: true
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['knowledge', tenantId] });
    setBulkUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      category: formData.category === 'other' ? (customCategory.trim() || 'other') : formData.category
    };
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    const isPrebuilt = CATEGORIES.some(c => c.value === entry.category && c.value !== 'other');
    setFormData({
      title: entry.title,
      content: entry.content,
      category: isPrebuilt ? (entry.category || 'general') : 'other',
      is_active: entry.is_active !== false,
      file_url: entry.file_url || '',
      file_name: entry.file_name || ''
    });
    setCustomCategory(isPrebuilt ? '' : (entry.category || ''));
    setIsDialogOpen(true);
  };

  const filteredEntries = entries.filter(entry =>
    entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category) => {
    if (category === 'website') return <Globe className="w-4 h-4" />;
    if (category === 'document') return <FileText className="w-4 h-4" />;
    if (category === 'image') return <Image className="w-4 h-4" />;
    return <BookOpen className="w-4 h-4" />;
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            בסיס ידע
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
              <div className="relative">
                <input
                  type="file"
                  id="bulk-file-upload"
                  className="hidden"
                  multiple
                  accept=".pdf,.csv,.xlsx,.json,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files?.length) handleBulkFileUpload(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
                <Button variant="outline" className="gap-2" disabled={bulkUploading} onClick={() => document.getElementById('bulk-file-upload').click()}>
                  {bulkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {bulkUploading ? 'מעלה קבצים...' : 'העלאת קבצים'}
                </Button>
              </div>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                הוסף פריט
              </Button>
              <DialogContent className="max-w-lg" dir="rtl">
                <DialogHeader>
                  <DialogTitle>{editingEntry ? 'עריכת פריט' : 'הוספת פריט חדש'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>כותרת</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>קטגוריה</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => {
                        setFormData({ ...formData, category: value });
                        if (value !== 'other') setCustomCategory('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.category === 'other' && (
                      <Input
                        placeholder="הקלד שם קטגוריה..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        required
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>תוכן</Label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={6}
                      required
                    />
                  </div>
                  {/* File attachment */}
                  <div className="space-y-2">
                    <Label>קובץ מצורף</Label>
                    {formData.file_url ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border">
                        <File className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <a href={formData.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate flex-1">
                          {formData.file_name || 'קובץ'}
                        </a>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFormData(prev => ({ ...prev, file_url: '', file_name: '' }))}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          id="single-file-upload"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                            e.target.value = '';
                          }}
                        />
                        <Button type="button" variant="outline" className="w-full gap-2" disabled={uploading} onClick={() => document.getElementById('single-file-upload').click()}>
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                          {uploading ? 'מעלה...' : 'צרף קובץ'}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>פעיל</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
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
                      editingEntry ? 'עדכן' : 'הוסף'
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
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>אין פריטים בבסיס הידע</p>
            <p className="text-sm mt-1">הוסף מידע כדי שהבוט יוכל לענות על שאלות</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredEntries.map((entry) => (
              <div 
                key={entry.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getCategoryIcon(entry.category)}
                      <h3 className="font-medium truncate">{entry.title}</h3>
                      {!entry.is_active && (
                        <Badge variant="secondary">מושבת</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{entry.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <Badge variant="outline">
                        {CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                      </Badge>
                      {entry.created_date && (
                        <span>{format(new Date(entry.created_date), 'dd/MM/yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>ערוך פריט</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteMutation.mutate(entry.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>מחק פריט</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}