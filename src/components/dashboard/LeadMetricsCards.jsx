import React from 'react';
import { Flame, TrendingUp, Clock, AlertTriangle, Shield, Calendar } from 'lucide-react';
import moment from 'moment';

const MetricCard = ({ icon: Icon, label, value, color, bgColor, subText }) => (
  <div className={`${bgColor} rounded-xl p-3 flex flex-col items-center gap-1 min-w-0`}>
    <Icon className={`w-5 h-5 ${color}`} />
    <span className="text-[11px] text-slate-500 text-center leading-tight">{label}</span>
    <span className={`text-lg font-bold ${color} leading-none`}>{value}</span>
    {subText && <span className="text-[10px] text-slate-400 text-center leading-tight">{subText}</span>}
  </div>
);

export default function LeadMetricsCards({ lead, messagesCount }) {
  const intentScore = lead?.intent_score ?? 0;
  const urgency = lead?.urgency_level || 'low';
  const priority = lead?.priority || 'normal';
  const competitor = lead?.competitor_detected || false;
  const createdDate = lead?.created_date;

  // Intent color
  const intentColor = intentScore >= 70 ? 'text-green-600' : intentScore >= 40 ? 'text-amber-600' : 'text-slate-500';
  const intentBg = intentScore >= 70 ? 'bg-green-50' : intentScore >= 40 ? 'bg-amber-50' : 'bg-slate-50';
  const intentLabel = intentScore >= 70 ? 'גבוה' : intentScore >= 40 ? 'בינוני' : 'נמוך';

  // Urgency
  const urgencyConfig = {
    low: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'נמוכה' },
    medium: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'בינונית' },
    high: { color: 'text-red-600', bg: 'bg-red-50', label: 'גבוהה' }
  };
  const urg = urgencyConfig[urgency] || urgencyConfig.low;

  // Priority
  const priorityConfig = {
    low: { color: 'text-slate-500', bg: 'bg-slate-50', label: 'נמוכה' },
    normal: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'רגילה' },
    high: { color: 'text-purple-600', bg: 'bg-purple-50', label: 'גבוהה' }
  };
  const pri = priorityConfig[priority] || priorityConfig.normal;

  // Days since creation
  const daysSince = createdDate ? moment().diff(moment(createdDate), 'days') : 0;
  const daysLabel = daysSince === 0 ? 'היום' : `${daysSince} ימים`;

  return (
    <div className="grid grid-cols-3 gap-2">
      <MetricCard
        icon={TrendingUp}
        label="ציון כוונה"
        value={intentScore}
        color={intentColor}
        bgColor={intentBg}
        subText={intentLabel}
      />
      <MetricCard
        icon={Flame}
        label="דחיפות"
        value={urg.label}
        color={urg.color}
        bgColor={urg.bg}
      />
      <MetricCard
        icon={Shield}
        label="עדיפות"
        value={pri.label}
        color={pri.color}
        bgColor={pri.bg}
      />
      <MetricCard
        icon={Clock}
        label="גיל הליד"
        value={daysLabel}
        color="text-indigo-600"
        bgColor="bg-indigo-50"
      />
      <MetricCard
        icon={AlertTriangle}
        label="מתחרים"
        value={competitor ? 'כן' : 'לא'}
        color={competitor ? 'text-red-600' : 'text-green-600'}
        bgColor={competitor ? 'bg-red-50' : 'bg-green-50'}
      />
      <MetricCard
        icon={Calendar}
        label="הודעות"
        value={messagesCount ?? 0}
        color="text-violet-600"
        bgColor="bg-violet-50"
      />
    </div>
  );
}