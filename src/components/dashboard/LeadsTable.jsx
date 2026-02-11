import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, Filter, Eye, Phone, Mail, TrendingUp, 
  AlertCircle, Clock, CheckCircle, XCircle, User
} from "lucide-react";
import { format } from 'date-fns';

export default function LeadsTable({ tenantId, leads = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] });
    }
  });

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.customer_phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const config = {
      new: { label: 'חדש', variant: 'default', icon: AlertCircle },
      contacted: { label: 'נוצר קשר', variant: 'secondary', icon: Phone },
      converted: { label: 'הומר', variant: 'default', icon: CheckCircle },
      lost: { label: 'אבוד', variant: 'destructive', icon: XCircle }
    };
    const { label, variant, icon: Icon } = config[status] || config.new;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment === 'positive') return 'text-green-600';
    if (sentiment === 'negative') return 'text-red-600';
    return 'text-slate-600';
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            ניהול לידים
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="new">חדש</SelectItem>
                <SelectItem value="contacted">נוצר קשר</SelectItem>
                <SelectItem value="converted">הומר</SelectItem>
                <SelectItem value="lost">אבוד</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>אין לידים להצגה</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>פרטי קשר</TableHead>
                  <TableHead>סיבת פנייה</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>ציון כוונה</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.customer_name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.customer_phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{lead.customer_phone}</span>
                          </div>
                        )}
                        {lead.customer_email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{lead.customer_email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {lead.inquiry_reason || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>
                      {lead.intent_score !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${lead.intent_score}%`,
                                backgroundColor: lead.intent_score >= 70 ? '#22c55e' : lead.intent_score >= 40 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span className="text-sm">{lead.intent_score}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {lead.created_date ? format(new Date(lead.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>הצג פרטי ליד</TooltipContent>
                        </Tooltip>
                        <DialogContent className="max-w-lg" dir="rtl">
                          <DialogHeader>
                            <DialogTitle>פרטי ליד</DialogTitle>
                          </DialogHeader>
                          {selectedLead && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-slate-500">שם</p>
                                  <p className="font-medium">{selectedLead.customer_name}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-500">סטטוס</p>
                                  <Select
                                    value={selectedLead.status}
                                    onValueChange={(value) => {
                                      updateMutation.mutate({ id: selectedLead.id, data: { status: value } });
                                      setSelectedLead({ ...selectedLead, status: value });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="new">חדש</SelectItem>
                                      <SelectItem value="contacted">נוצר קשר</SelectItem>
                                      <SelectItem value="converted">הומר</SelectItem>
                                      <SelectItem value="lost">אבוד</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {selectedLead.summary && (
                                <div>
                                  <p className="text-sm text-slate-500 mb-1">סיכום שיחה</p>
                                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedLead.summary}</p>
                                </div>
                              )}
                              {selectedLead.ai_suggested_action && (
                                <div>
                                  <p className="text-sm text-slate-500 mb-1">פעולה מומלצת</p>
                                  <p className="text-sm bg-indigo-50 text-indigo-700 p-3 rounded-lg">
                                    {selectedLead.ai_suggested_action}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm text-slate-500 mb-1">הערות</p>
                                <Textarea
                                  value={selectedLead.notes || ''}
                                  onChange={(e) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
                                  onBlur={() => updateMutation.mutate({ id: selectedLead.id, data: { notes: selectedLead.notes } })}
                                  placeholder="הוסף הערות..."
                                />
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}