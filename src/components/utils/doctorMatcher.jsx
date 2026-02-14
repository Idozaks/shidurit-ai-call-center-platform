/**
 * Pre-filters doctors based on user message keywords.
 * Matches against specialty, procedures, bio, and name.
 * Returns only relevant doctors to keep LLM prompts small.
 */

// Common keyword mappings: what users say → what to search for in doctor data
// IMPORTANT: triggers use stem/root so they match inflected forms (e.g. אורתופדים contains אורתופד)
const KEYWORD_MAP = {
  'שיניים': ['שיניים', 'שינ', 'דנטל', 'dental', 'dent'],
  'דנטיסט': ['שיניים', 'שינ', 'דנטל', 'dental', 'dent'],
  'עיניים': ['עיניים', 'עין', 'אופטלמולוגיה', 'ophthalmol', 'eye'],
  'משפחה': ['משפחה', 'כללי', 'family', 'general'],
  'כללי': ['משפחה', 'כללי', 'פנימית', 'general', 'internal'],
  'ילדים': ['ילדים', 'pediatr', 'ילד'],
  'עור': ['עור', 'דרמטולוגיה', 'dermat', 'skin'],
  'לב': ['לב', 'קרדיולוגיה', 'cardio', 'heart'],
  'נשים': ['נשים', 'גינקולוגיה', 'gynec', 'נשי'],
  'אורתופד': ['אורתופד', 'עצמות', 'orthop', 'ortho', 'אורטופד'],
  'אורטופד': ['אורתופד', 'עצמות', 'orthop', 'ortho', 'אורטופד'],
  'עצמות': ['אורתופד', 'עצמות', 'orthop', 'ortho', 'אורטופד'],
  'אף אוזן גרון': ['אף', 'אוזן', 'גרון', 'אאג', 'ent'],
  'אאג': ['אף', 'אוזן', 'גרון', 'אאג', 'ent'],
  'אא"ג': ['אף', 'אוזן', 'גרון', 'אאג', 'ent'],
  'א.א.ג': ['אף', 'אוזן', 'גרון', 'אאג', 'ent'],
  'פסיכיאטר': ['פסיכיאטריה', 'פסיכיאטר', 'psychiatr', 'נפש'],
  'נפש': ['פסיכיאטריה', 'נפש', 'psychiatr'],
  'ספורט': ['ספורט', 'sport'],
  'אלרגיה': ['אלרגיה', 'אלרגולוגיה', 'allerg', 'אימונולוגיה'],
  'נוירולוג': ['נוירולוגיה', 'נוירולוג', 'neurol', 'עצב'],
  'מוח': ['נוירולוגיה', 'נוירוכירורגיה', 'neurol', 'מוח'],
  'כליות': ['נפרולוגיה', 'כליות', 'nephro', 'כליה'],
  'ראומטולוג': ['ראומטולוגיה', 'ראומטולוג', 'rheumat'],
  'מפרקים': ['ראומטולוגיה', 'מפרקים', 'rheumat'],
  'פלסטיקה': ['פלסטי', 'plastic', 'אסתטי'],
  'אורולוג': ['אורולוג', 'urolog', 'שתן'],
  'ריאות': ['ריאות', 'pulmon', 'ריאה'],
  'גסטרו': ['גסטרו', 'gastro', 'עיכול', 'מעיים'],
};

function extractSearchTerms(userMessage) {
  const msg = userMessage.toLowerCase();
  const terms = new Set();

  // Check keyword map
  for (const [trigger, searchTerms] of Object.entries(KEYWORD_MAP)) {
    if (msg.includes(trigger)) {
      searchTerms.forEach(t => terms.add(t));
    }
  }

  // Also extract raw words (3+ chars) as fallback search terms
  const words = msg.split(/[\s,.:;!?]+/).filter(w => w.length >= 3);
  words.forEach(w => terms.add(w));

  return [...terms];
}

function doctorMatchesTerms(doctor, terms) {
  // Build a searchable text from all doctor fields
  const searchText = [
    doctor.name || '',
    doctor.specialty || '',
    (doctor.procedures || []).join(' '),
    doctor.bio || '',
    doctor.clinic_location || ''
  ].join(' ').toLowerCase();

  return terms.some(term => searchText.includes(term.toLowerCase()));
}

/**
 * Filters doctors relevant to the user's message.
 * @param {string} userMessage - The user's chat message
 * @param {Array} allDoctors - All available doctors for the tenant
 * @param {number} maxResults - Maximum doctors to return (default 10)
 * @returns {Array} Filtered doctors relevant to the query
 */
export function filterDoctorsForQuery(userMessage, allDoctors, maxResults = 10) {
  if (!userMessage || !allDoctors?.length) return [];

  const terms = extractSearchTerms(userMessage);
  if (terms.length === 0) return [];

  const matched = allDoctors.filter(d => doctorMatchesTerms(d, terms));
  return matched.slice(0, maxResults);
}

/**
 * Formats filtered doctors into a compact string for the LLM prompt.
 */
export function formatDoctorsForPrompt(doctors) {
  if (!doctors || doctors.length === 0) return '';
  return doctors.map(d => {
    const parts = [`- ${d.name}: ${d.specialty}`];
    if (d.procedures?.length) parts.push(`  טיפולים: ${d.procedures.join(', ')}`);
    if (d.clinic_location) parts.push(`  מיקום: ${d.clinic_location}`);
    if (d.availability) parts.push(`  זמינות: ${d.availability}`);
    if (d.years_experience) parts.push(`  ניסיון: ${d.years_experience} שנים`);
    if (d.bio) parts.push(`  אודות: ${d.bio}`);
    if (d.phone) parts.push(`  טלפון: ${d.phone}`);
    if (d.email) parts.push(`  אימייל: ${d.email}`);
    return parts.join('\n');
  }).join('\n\n');
}