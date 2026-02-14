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

  // === Symptom-to-specialty mappings ===
  'כואב לי בגב': ['אורתופד', 'עצמות', 'orthop', 'אורטופד', 'גב'],
  'כאב גב': ['אורתופד', 'עצמות', 'orthop', 'אורטופד', 'גב'],
  'כאבי גב': ['אורתופד', 'עצמות', 'orthop', 'אורטופד', 'גב'],
  'כאב ברך': ['אורתופד', 'עצמות', 'orthop', 'אורטופד', 'ברך'],
  'כאבי ברכיים': ['אורתופד', 'עצמות', 'orthop', 'אורטופד', 'ברך'],
  'כאב כתף': ['אורתופד', 'עצמות', 'orthop', 'אורטופד', 'כתף'],
  'כאב ביד': ['אורתופד', 'עצמות', 'orthop', 'אורטופד'],
  'כאב ברגל': ['אורתופד', 'עצמות', 'orthop', 'אורטופד'],
  'כאב בצוואר': ['אורתופד', 'עצמות', 'orthop', 'אורטופד', 'צוואר'],
  'שבר': ['אורתופד', 'עצמות', 'orthop', 'אורטופד'],
  'פריצת דיסק': ['אורתופד', 'עצמות', 'orthop', 'אורטופד', 'עמוד שדרה'],
  'עמוד שדרה': ['אורתופד', 'עצמות', 'orthop', 'אורטופד', 'עמוד שדרה'],
  'כאב ראש': ['נוירולוגיה', 'נוירולוג', 'neurol', 'ראש'],
  'מיגרנה': ['נוירולוגיה', 'נוירולוג', 'neurol'],
  'סחרחורת': ['נוירולוגיה', 'נוירולוג', 'neurol', 'אאג', 'אף', 'אוזן', 'גרון'],
  'כאב בטן': ['גסטרו', 'gastro', 'עיכול', 'מעיים', 'בטן'],
  'כאבי בטן': ['גסטרו', 'gastro', 'עיכול', 'מעיים', 'בטן'],
  'בעיות עיכול': ['גסטרו', 'gastro', 'עיכול', 'מעיים'],
  'צרבת': ['גסטרו', 'gastro', 'עיכול'],
  'כאב חזה': ['קרדיולוגיה', 'לב', 'cardio', 'חזה'],
  'קוצר נשימה': ['ריאות', 'pulmon', 'קרדיולוגיה', 'לב'],
  'אסתמה': ['ריאות', 'pulmon', 'אלרגיה'],
  'פריחה': ['עור', 'דרמטולוגיה', 'dermat'],
  'אקנה': ['עור', 'דרמטולוגיה', 'dermat'],
  'כאב אוזן': ['אאג', 'אף', 'אוזן', 'גרון', 'ent'],
  'כאב גרון': ['אאג', 'אף', 'אוזן', 'גרון', 'ent'],
  'ראייה מטושטשת': ['עיניים', 'עין', 'אופטלמולוגיה', 'ophthalmol'],
  'כאב בעיניים': ['עיניים', 'עין', 'אופטלמולוגיה', 'ophthalmol'],
};

function extractSearchTerms(userMessage) {
  const msg = userMessage.toLowerCase();
  const terms = new Set();

  // Check keyword map - use substring matching so inflected forms work
  // e.g. "אורתופדים" contains "אורתופד", "נוירולוגים" contains "נוירולוג"
  for (const [trigger, searchTerms] of Object.entries(KEYWORD_MAP)) {
    if (msg.includes(trigger)) {
      searchTerms.forEach(t => terms.add(t));
    }
  }

  // Also check if any word in the message STARTS WITH a keyword trigger
  // This catches cases where Hebrew suffixes change the word
  const words = msg.split(/[\s,.:;!?]+/).filter(w => w.length >= 3);
  for (const word of words) {
    for (const [trigger, searchTerms] of Object.entries(KEYWORD_MAP)) {
      if (word.startsWith(trigger) || trigger.startsWith(word)) {
        searchTerms.forEach(t => terms.add(t));
      }
    }
  }

  // Add raw words as fallback search terms
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
 * Filters doctors relevant to the user's CURRENT message only.
 * Conversation history is only used for doctor name lookups (not specialty searches).
 * @param {string} currentMessage - The user's latest chat message
 * @param {Array} allDoctors - All available doctors for the tenant
 * @param {number} maxResults - Maximum doctors to return (default 10)
 * @param {string} conversationHistory - Full conversation text (used only for name matching)
 * @returns {Array} Filtered doctors relevant to the query
 */
export function filterDoctorsForQuery(currentMessage, allDoctors, maxResults = 10, conversationHistory = '') {
  if (!currentMessage || !allDoctors?.length) return [];

  // Extract search terms from CURRENT message only (not history)
  const terms = extractSearchTerms(currentMessage);
  if (terms.length === 0) return [];

  const matched = allDoctors.filter(d => doctorMatchesTerms(d, terms));
  
  // Also check if the current message mentions a specific doctor by name from history
  // (e.g. "מה עם ד"ר גולדשטיין?" — name was mentioned earlier)
  if (conversationHistory) {
    const DOCTOR_PREFIXES = ["דר'", 'ד"ר', "דר", "פרופ'", "פרופ"];
    const msgLower = currentMessage.toLowerCase();
    const matchedIds = new Set(matched.map(d => d.id));
    
    for (const doctor of allDoctors) {
      if (matchedIds.has(doctor.id)) continue;
      const name = doctor.name || '';
      let cleanName = name;
      for (const prefix of DOCTOR_PREFIXES) {
        if (cleanName.startsWith(prefix)) {
          cleanName = cleanName.slice(prefix.length).trim();
          break;
        }
      }
      const nameParts = cleanName.split(' ').filter(p => p.length >= 2);
      // Check if any name part appears in the current message
      const nameInCurrentMsg = nameParts.some(part => msgLower.includes(part.toLowerCase()));
      if (nameInCurrentMsg) {
        matched.push(doctor);
      }
    }
  }
  
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