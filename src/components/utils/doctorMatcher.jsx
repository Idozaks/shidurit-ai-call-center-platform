/**
 * Pre-filters doctors based on user message keywords.
 * Matches against specialty, procedures, bio, and name.
 * Returns only relevant doctors to keep LLM prompts small.
 */

// Common keyword mappings: what users say → what to search for in doctor data
const KEYWORD_MAP = {
  'שיניים': ['שיניים', 'דנטל', 'dental'],
  'דנטיסט': ['שיניים', 'דנטל', 'dental'],
  'עיניים': ['עיניים', 'אופטלמולוגיה', 'ophthalmology'],
  'משפחה': ['משפחה', 'כללי'],
  'כללי': ['משפחה', 'כללי', 'פנימית'],
  'ילדים': ['ילדים', 'pediatr'],
  'עור': ['עור', 'דרמטולוגיה', 'dermat'],
  'לב': ['לב', 'קרדיולוגיה', 'cardio'],
  'נשים': ['נשים', 'גינקולוגיה', 'gynec'],
  'אורתופד': ['אורתופד', 'עצמות', 'orthop'],
  'עצמות': ['אורתופד', 'עצמות', 'orthop'],
  'אף אוזן גרון': ['אף', 'אוזן', 'גרון', 'אאג'],
  'אאג': ['אף', 'אוזן', 'גרון', 'אאג'],
  'אא"ג': ['אף', 'אוזן', 'גרון', 'אאג'],
  'א.א.ג': ['אף', 'אוזן', 'גרון', 'אאג'],
  'פסיכיאטר': ['פסיכיאטריה', 'פסיכיאטר', 'psychiatr'],
  'נפש': ['פסיכיאטריה', 'נפש', 'psychiatr'],
  'ספורט': ['ספורט', 'sport'],
  'אלרגיה': ['אלרגיה', 'אלרגולוגיה', 'allerg', 'אימונולוגיה'],
  'נוירולוג': ['נוירולוגיה', 'נוירולוג', 'neurol'],
  'מוח': ['נוירולוגיה', 'נוירוכירורגיה', 'neurol'],
  'כליות': ['נפרולוגיה', 'כליות', 'nephro'],
  'ראומטולוג': ['ראומטולוגיה', 'ראומטולוג', 'rheumat'],
  'מפרקים': ['ראומטולוגיה', 'מפרקים', 'rheumat'],
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
  return doctors.map(d => 
    `- ${d.name}: ${d.specialty}${d.procedures?.length ? ', טיפולים: ' + d.procedures.join(', ') : ''}${d.clinic_location ? ', מיקום: ' + d.clinic_location : ''}${d.availability ? ', זמינות: ' + d.availability : ''}`
  ).join('\n');
}