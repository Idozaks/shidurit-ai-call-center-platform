import {
  Heart, Brain, Bone, Eye, Baby, Scissors, Pill, Activity,
  Stethoscope, Syringe, Microscope, ShieldCheck, Smile, Ear,
  Flower2, Dumbbell, Droplets, Scan, Zap, Wind
} from "lucide-react";

const ICON_MAP = {
  'קרדיולוגיה': Heart,
  'לב': Heart,
  'נוירולוגיה': Brain,
  'מוח': Brain,
  'נוירוכירורגיה': Brain,
  'אורתופדיה': Bone,
  'עצמות': Bone,
  'עיניים': Eye,
  'רפואת עיניים': Eye,
  'ילדים': Baby,
  'רפואת ילדים': Baby,
  'כירורגיה': Scissors,
  'כירורגיה כללית': Scissors,
  'כירורגית כלי דם': Scissors,
  'רפואה פנימית': Activity,
  'רפואת משפחה': Stethoscope,
  'אורולוגיה': Droplets,
  'נפרולוגיה': Droplets,
  'גסטרואנטרולוגיה': Pill,
  'גסטרו': Pill,
  'אלרגולוגיה': ShieldCheck,
  'אלרגולוגיה ואימונולוגיה': ShieldCheck,
  'אימונולוגיה': ShieldCheck,
  'ראומטולוגיה': Zap,
  'רפואת שיניים': Smile,
  'אף אוזן גרון': Ear,
  'עור': Flower2,
  'דרמטולוגיה': Flower2,
  'רפואת ספורט': Dumbbell,
  'אונקולוגיה': Microscope,
  'ריאות': Wind,
  'רפואת ריאות': Wind,
  'הזרקות': Syringe,
  'רדיולוגיה': Scan,
};

export function getSpecialtyIcon(specialty) {
  const lower = specialty?.toLowerCase() || '';
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return Icon;
  }
  return Stethoscope;
}

// Color palette for specialties
const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#0ea5e9', '#a855f7', '#d946ef', '#10b981',
];

export function getSpecialtyColor(specialty, index = 0) {
  // Deterministic color based on specialty string
  let hash = 0;
  for (let i = 0; i < (specialty?.length || 0); i++) {
    hash = specialty.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}