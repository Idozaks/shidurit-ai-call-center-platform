import React from 'react';

const KUPA_LOGOS = {
  'מכבי': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698cadde18b03e4491bf6a96/1e31f1d74_maccabi.png',
  'כללית': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698cadde18b03e4491bf6a96/66bc6eaef_clalit.png',
  'מאוחדת': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698cadde18b03e4491bf6a96/957418194_meuhedet.png',
  'לאומית': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698cadde18b03e4491bf6a96/053ba574b_leumit.png',
  'פרטי': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698cadde18b03e4491bf6a96/80896b0c2_private.png',
  'ביטוח': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698cadde18b03e4491bf6a96/e7db24f47_insurance.png',
};

const KUPA_KEYWORDS = Object.keys(KUPA_LOGOS);

export function getKupaLogo(kupaName) {
  if (!kupaName) return null;
  const normalized = kupaName.trim();
  for (const keyword of KUPA_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return KUPA_LOGOS[keyword];
    }
  }
  return null;
}

export default function KupaLogo({ name, className = "h-5" }) {
  const logo = getKupaLogo(name);
  if (!logo) {
    return <span className="text-xs text-indigo-600 font-medium">{name}</span>;
  }
  return (
    <img
      src={logo}
      alt={name}
      title={name}
      className={`${className} object-contain`}
    />
  );
}