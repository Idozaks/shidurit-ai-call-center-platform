import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function AIResultDisplay({ toolResult, selectedTool, scoreDetails, onReset }) {
  if (!toolResult) return null;

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className={`rounded-2xl p-5 ${selectedTool?.bgColor || 'bg-slate-50'} border relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-24 h-24 opacity-10">
          {selectedTool && <selectedTool.icon className="w-24 h-24" />}
        </div>
        <div className="flex items-center gap-3 relative z-10">
          {selectedTool && (
            <div className={`w-10 h-10 rounded-xl ${selectedTool?.bgColor} border flex items-center justify-center`}>
              <selectedTool.icon className={`w-5 h-5 ${selectedTool?.color}`} />
            </div>
          )}
          <div>
            <h3 className="font-bold text-base text-slate-900">{toolResult.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{selectedTool?.name} • {selectedTool?.nameEn}</p>
          </div>
        </div>
      </div>

      {/* Score details for lead_scorer */}
      {scoreDetails && (
        <div className="bg-gradient-to-l from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Badge className={`rounded-full px-3 py-1 ${scoreDetails.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : scoreDetails.sentiment === 'negative' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {scoreDetails.sentiment === 'positive' ? '😊 חיובי' : scoreDetails.sentiment === 'negative' ? '😞 שלילי' : '😐 ניטרלי'}
            </Badge>
            <div className="flex items-center gap-3">
              <Badge className={`rounded-full px-3 py-1 ${scoreDetails.urgency_level === 'high' ? 'bg-red-100 text-red-700' : scoreDetails.urgency_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {scoreDetails.urgency_level === 'high' ? '🔥 דחיפות גבוהה' : scoreDetails.urgency_level === 'medium' ? '⚡ דחיפות בינונית' : '💤 דחיפות נמוכה'}
              </Badge>
              <div className="text-center bg-white rounded-xl px-4 py-2 border shadow-sm">
                <span className="text-3xl font-black text-indigo-600">{scoreDetails.intent_score}</span>
                <span className="text-xs text-slate-400 mr-0.5">/100</span>
              </div>
            </div>
          </div>
          {scoreDetails.conversation_description && (
            <p className="text-sm text-slate-600 leading-relaxed mt-2">{scoreDetails.conversation_description}</p>
          )}
        </div>
      )}

      {/* Main content - styled markdown */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-5 text-sm prose prose-sm prose-slate max-w-none leading-relaxed
          [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
          [&_h1]:text-lg [&_h1]:font-black [&_h1]:text-slate-900 [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-slate-100
          [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2
          [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-700 [&_h3]:mt-4 [&_h3]:mb-1.5
          [&_p]:my-2 [&_p]:text-slate-600 [&_p]:leading-relaxed
          [&_strong]:text-slate-900 [&_strong]:font-semibold
          [&_ul]:my-2 [&_ul]:pr-1
          [&_ol]:my-2 [&_ol]:pr-1
          [&_li]:my-1 [&_li]:text-slate-600 [&_li]:leading-relaxed
          [&_li::marker]:text-slate-400
          [&_blockquote]:border-r-4 [&_blockquote]:border-indigo-300 [&_blockquote]:bg-indigo-50/50 [&_blockquote]:pr-4 [&_blockquote]:py-2 [&_blockquote]:pl-2 [&_blockquote]:rounded-lg [&_blockquote]:my-3 [&_blockquote]:not-italic
          [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-slate-700
          [&_hr]:my-4 [&_hr]:border-slate-100
          [&_table]:border-collapse [&_table]:w-full [&_table]:my-3
          [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-right [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-600 [&_th]:border [&_th]:border-slate-200
          [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:border [&_td]:border-slate-200
        " dir="rtl">
          <ReactMarkdown>{toolResult.content}</ReactMarkdown>
        </div>
      </div>

      {/* Action items */}
      {toolResult.action_items?.length > 0 && (
        <div className="bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-bold text-sm mb-4 flex items-center gap-2 text-amber-800">
            <span className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
              <span className="text-white text-sm">💡</span>
            </span>
            פעולות מומלצות
          </p>
          <div className="space-y-2.5">
            {toolResult.action_items.map((item, i) => (
              <div key={i} className="text-sm flex items-start gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                <span className="bg-gradient-to-br from-amber-400 to-orange-400 text-white rounded-lg w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm">{i + 1}</span>
                <span className="text-slate-700 leading-relaxed">{typeof item === 'object' ? (item.name || item.description || item.recommendation || JSON.stringify(item)) : item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset button */}
      {onReset && (
        <Button variant="outline" className="w-full rounded-xl h-11 text-slate-600 hover:text-slate-900 gap-2" onClick={onReset}>
          🔄 הפעל שוב
        </Button>
      )}
    </div>
  );
}