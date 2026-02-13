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
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Search, Phone, Mail, ArrowUpDown,
  AlertCircle, CheckCircle, XCircle, User, FileSpreadsheet, Loader2, RefreshCw
} from "lucide-react";
import { format } from 'date-fns';
import LeadDetailDialog from './LeadDetailDialog';
import { toast } from "sonner";

export default function LeadsTable({ tenantId, tenant, leads = [], sessions = [], knowledge = [], onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortField, setSortField] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const queryClient = useQueryClient();

  const handleExportToSheets = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportLeadsToSheet', {
        tenant_id: tenantId,
        leads: filteredLeads
      });
      const { spreadsheetUrl } = response.data;
      window.open(spreadsheetUrl, '_blank');
      toast.success('הלידים יוצאו בהצלחה ל-Google Sheets');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('שגיאה בייצוא לידים');
    } finally {
      setExporting(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] });
    }
  });

  const statusOrder = { new: 0, contacted: 1, converted: 2, lost: 3 };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.customer_phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let valA, valB;
    switch (sortField) {
      case 'customer_name':
        valA = (a.customer_name || '').toLowerCase();
        valB = (b.customer_name || '').toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB, 'he') : valB.localeCompare(valA, 'he');
      case 'status':
        valA = statusOrder[a.status] ?? 99;
        valB = statusOrder[b.status] ?? 99;
        break;
      case 'intent_score':
        valA = a.intent_score ?? -1;
        valB = b.intent_score ?? -1;
        break;
      case 'created_date':
      default:
        valA = a.created_date ? new Date(a.created_date).getTime() : 0;
        valB = b.created_date ? new Date(b.created_date).getTime() : 0;
        break;
    }
    if (sortField !== 'customer_name') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
    return 0;
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
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={isRefreshing}
              onClick={async () => {
                setIsRefreshing(true);
                await onRefresh?.();
                setTimeout(() => setIsRefreshing(false), 800);
              }} 
              className="gap-1"
            >
              <RefreshCw className={`w-4 h-4 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
              רענן
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToSheets}
              disabled={exporting || filteredLeads.length === 0}
              className="gap-2"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-green-600" />}
              ייצוא ל-Sheets
            </Button>
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
            <Select value={`${sortField}::${sortDirection}`} onValueChange={(val) => {
              const lastSep = val.lastIndexOf('::');
              setSortField(val.substring(0, lastSep));
              setSortDirection(val.substring(lastSep + 2));
            }}>
              <SelectTrigger className="w-40 gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <SelectValue placeholder="מיון" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date::desc">תאריך - חדש לישן</SelectItem>
                <SelectItem value="created_date::asc">תאריך - ישן לחדש</SelectItem>
                <SelectItem value="customer_name::asc">שם - א-ת</SelectItem>
                <SelectItem value="customer_name::desc">שם - ת-א</SelectItem>
                <SelectItem value="intent_score::desc">ציון כוונה - גבוה</SelectItem>
                <SelectItem value="intent_score::asc">ציון כוונה - נמוך</SelectItem>
                <SelectItem value="status::asc">סטטוס - חדש קודם</SelectItem>
                <SelectItem value="status::desc">סטטוס - אבוד קודם</SelectItem>
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
          <>
            {/* Mobile card layout */}
            <div className="lg:hidden space-y-2">
              {filteredLeads.map((lead) => (
                <Dialog key={lead.id}>
                  <DialogTrigger asChild>
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="w-full text-right p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm truncate">{lead.customer_name}</span>
                          {getStatusBadge(lead.status)}
                        </div>
                        {lead.intent_score !== undefined && (
                          <span className="text-xs font-medium flex-shrink-0" style={{ color: lead.intent_score >= 70 ? '#22c55e' : lead.intent_score >= 40 ? '#f59e0b' : '#ef4444' }}>
                            {lead.intent_score}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        {lead.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.customer_phone}
                          </span>
                        )}
                        {lead.inquiry_reason && (
                          <span className="truncate">· {lead.inquiry_reason}</span>
                        )}
                      </div>
                    </button>
                  </DialogTrigger>
                  {selectedLead && selectedLead.id === lead.id && (
                    <LeadDetailDialog lead={selectedLead} tenantId={tenantId} tenant={tenant} leads={leads} sessions={sessions} knowledge={knowledge} onClose={() => setSelectedLead(null)} />
                  )}
                </Dialog>
              ))}
            </div>

            {/* Desktop table layout */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם</TableHead>
                    <TableHead>פרטי קשר</TableHead>
                    <TableHead>סיבת פנייה</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dashed border-slate-400">ציון כוונה</span>
                        </TooltipTrigger>
                        <TooltipContent>ציון מ-0 עד 100 שמעריך את רמת הכוונה של הליד לרכישה, על בסיס ניתוח AI של השיחה</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead>תאריך</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <Dialog key={lead.id}>
                      <DialogTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => setSelectedLead(lead)}>
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
                        </TableRow>
                      </DialogTrigger>
                      {selectedLead && selectedLead.id === lead.id && (
                        <LeadDetailDialog lead={selectedLead} tenantId={tenantId} tenant={tenant} leads={leads} sessions={sessions} knowledge={knowledge} onClose={() => setSelectedLead(null)} />
                      )}
                    </Dialog>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}