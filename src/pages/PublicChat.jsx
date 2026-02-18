import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, Loader2, Phone, Sparkles, Building2, MessageCircle,
  User, Keyboard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import VoiceChat from '../components/chat/VoiceChat';
import SuggestionChips from '../components/chat/SuggestionChips';
import PublicChatMenu from '../components/chat/PublicChatMenu';
import DetailsInputModal from '../components/chat/DetailsInputModal';
import RofimDoctorCards from '../components/chat/RofimDoctorCards';
import ROFIM_SPECIALTIES from '../components/data/rofimSpecialties';

// Helper to call the public backend function (supports both auth and non-auth)
const publicApi = async (payload) => {
  try {
    // Try SDK first (works when user is authenticated)
    const { base44 } = await import('@/api/base44Client');
    const response = await base44.functions.invoke('publicChat', payload);
    return response.data;
  } catch (sdkErr) {
    console.warn('SDK invoke failed, trying direct fetch:', sdkErr.message);
    // Fallback: direct HTTP call for unauthenticated users
    const res = await fetch(`/functions/publicChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
};

export default function PublicChat() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const leadIdRef = useRef(null);
  const [chatMode, setChatMode] = useState('voice'); // 'text' or 'voice'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsSubmitted, setDetailsSubmitted] = useState(false);
  const messagesEndRef = useRef(null);
  const [sessionStatus, setSessionStatus] = useState('active');
  const [collectedDetails, setCollectedDetails] = useState({});
  const [knowledgeBase, setKnowledgeBase] = useState('');

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['publicTenant', slug],
    queryFn: async () => {
      const res = await publicApi({ action: 'getTenant', slug });
      return res.tenant;
    },
    enabled: !!slug
  });

  // Store rofim doctor results per message
  const [rofimDoctorsByMsgId, setRofimDoctorsByMsgId] = useState({});

  // Fetch knowledge base once tenant is loaded
  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      const res = await publicApi({ action: 'getKnowledge', tenant_id: tenant.id });
      const entries = res.entries || [];
      const kb = entries.map(e => `[${e.category || 'general'}] ${e.title}:\n${e.content}`).join('\n\n');
      setKnowledgeBase(kb);
    })();
  }, [tenant?.id]);

  const createSessionMutation = useMutation({
    mutationFn: async ({ name }) => {
      const res = await publicApi({
        action: 'createSession',
        tenant_id: tenant.id,
        customer_name: name,
        mode: chatMode === 'voice' ? 'voice' : 'text'
      });
      return res.session;
    },
    onSuccess: (session) => {
      setSessionId(session.id);
      setSessionStatus(session.status || 'active');
      setShowNameInput(false);
      if (tenant?.welcome_message) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: tenant.welcome_message
        }]);
      }
    }
  });

  // Poll session status & new worker messages when session exists
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      const sessionRes = await publicApi({ action: 'getSession', session_id: sessionId });
      const s = sessionRes.session;
      if (s) {
        setSessionStatus(s.status);
      }
      // Fetch any worker messages not yet shown
      const msgsRes = await publicApi({ action: 'getMessages', session_id: sessionId });
      const allMsgs = msgsRes.messages || [];
      const workerMsgs = allMsgs.filter(m => m.role === 'worker');
      if (workerMsgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newWorkerMsgs = workerMsgs.filter(m => !existingIds.has(m.id));
          if (newWorkerMsgs.length === 0) return prev;
          return [...prev, ...newWorkerMsgs.map(m => ({
            id: m.id,
            role: 'assistant', // Show worker messages as assistant to customer
            content: m.content
          }))];
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }) => {
      // Save user message
      await publicApi({ action: 'sendMessage', session_id: sessionId, role: 'user', content });

      // If a worker has taken control, don't generate AI response
      if (sessionStatus === 'agent_active') {
        return null;
      }

      // Use LLM to extract doctor search params from the ENTIRE conversation + current message
      let rofimResults = [];
      const medicalRegex = /רופא|רופאה|ד"ר|דר'|דר |פרופ'|פרופ |דוקטור|התמחות|מומחה|ניתוח|טיפול|בדיקה|אורולוג|קרדיולוג|אורתופד|גינקולוג|עור|עיניים|אף אוזן|נוירולוג|פנימי|ילדים|משפחה|קופת חולים|מכבי|כללית|מאוחדת|לאומית/;
      const conversationText = messages.map(m => m.content).join(' ');
      const isMedicalRelated = medicalRegex.test(content) || medicalRegex.test(conversationText);
      
      if (isMedicalRelated) {
        try {
          const conversationSoFar = messages.map(m => `${m.role === 'user' ? 'לקוח' : 'נציג'}: ${m.content}`).join('\n');
          
          const specialtiesList = ROFIM_SPECIALTIES.join(', ');
          
          // Build a summary of previously extracted fields to help the LLM retain context
          const prevDetailsParts = [];
          if (collectedDetails.specialty) prevDetailsParts.push(`התמחות: ${collectedDetails.specialty}`);
          if (collectedDetails.city) prevDetailsParts.push(`עיר: ${collectedDetails.city}`);
          const prevDetailsStr = prevDetailsParts.length > 0 ? prevDetailsParts.join(', ') : 'אין';
          
          const extractRes = await publicApi({
            action: 'invokeLLM',
            prompt: `You are extracting doctor search parameters from a Hebrew medical chat conversation.

=== FULL CONVERSATION ===
${conversationSoFar}
לקוח: ${content}

=== PREVIOUSLY IDENTIFIED FIELDS ===
${prevDetailsStr}

=== AVAILABLE MEDICAL SPECIALTIES (use exact names) ===
${specialtiesList}

=== TASK ===
Extract these 3 fields by scanning the ENTIRE conversation history above:

1. medicalSearchTerm - MUST be one of the exact specialty names from the list above. Map user's words to the closest match: "אורולוג"→"אורולוגיה", "עיניים"→"עיניים", "לב"→"קרדיולוגיה", "עור"→"עור ומין", "אורתופד"→"אורתופדיה". If user mentions a doctor name, use it as-is.
2. location - Israeli city/area (e.g. "חיפה", "תל אביב", "ירושלים")
3. kupatHolim - health fund: "כללית", "מכבי", "מאוחדת", "לאומית", or "פרטי"

CRITICAL RULES:
- Fields mentioned ANYWHERE in the conversation are valid — not just the last message
- If a field was identified in "PREVIOUSLY IDENTIFIED FIELDS" and the user did NOT explicitly change it, KEEP the previous value
- If the user provides a NEW value for a field (e.g. changes city from חיפה to תל אביב), use the NEW value
- ready_to_search = true ONLY when all 3 fields have non-empty real values
- missing_fields should list only truly missing fields (empty strings = missing)`,
            response_json_schema: {
              type: "object",
              properties: {
                ready_to_search: { type: "boolean", description: "True only if all 3 mandatory fields are present" },
                medicalSearchTerm: { type: "string", description: "Clean medical search term in Hebrew, empty if not found" },
                location: { type: "string", description: "City/area in Israel, empty if not found" },
                kupatHolim: { type: "string", description: "Health fund name, empty if not found" },
                missing_fields: { type: "array", items: { type: "string" }, description: "List of missing fields in Hebrew, e.g. ['עיר', 'קופת חולים']" }
              }
            }
          });

          const searchParams = extractRes.result;
          console.log('[Rofim Search] LLM extracted params:', JSON.stringify(searchParams));

          // Don't trust ready_to_search from LLM — check actual field values
          const hasAllFields = searchParams.medicalSearchTerm?.trim() && searchParams.location?.trim() && searchParams.kupatHolim?.trim();
          if (hasAllFields) {
            console.log(`[Rofim Search] Querying handler with: term="${searchParams.medicalSearchTerm}", location="${searchParams.location}", kupatHolim="${searchParams.kupatHolim}"`);
            rofimResults = await searchRofimDoctors(searchParams.medicalSearchTerm, searchParams.location, searchParams.kupatHolim);
            console.log(`[Rofim Search] Got ${rofimResults.length} results`);
          } else {
            console.log(`[Rofim Search] Not ready - missing: ${(searchParams.missing_fields || []).join(', ')}`);
          }
        } catch (e) {
          console.warn('Rofim search failed:', e.message);
          rofimResults = [];
        }
      }

      // Get AI response with Rofim results injected into prompt
      const searchWasAttempted = isMedicalRelated && rofimResults !== undefined;
      const llmRes = await publicApi({ action: 'invokeLLM', prompt: buildPrompt(content, rofimResults, searchWasAttempted), response_json_schema: null });
      const aiResponse = llmRes.result;

      // Save AI response
      await publicApi({ action: 'sendMessage', session_id: sessionId, role: 'assistant', content: aiResponse });

      // Update usage
      if (tenant) {
        await publicApi({ action: 'updateTenantUsage', tenant_id: tenant.id, usage_count: (tenant.usage_count || 0) + 1 });
      }

      return { aiResponse, rofimResults };
    },
    onSuccess: (result) => {
      // Run lead intelligence in background after each message exchange
      if (result !== null) {
        extractAndStoreDetails();
        analyzeAndManageLead();
      }
    }
  });

  // Immediately parse details from modal submission text (synchronous, no LLM needed)
  const parseAndStoreDetailsFromText = (text) => {
    const merged = { ...collectedDetails };
    // Parse known patterns from the modal: "שמי X, מספר הטלפון שלי Y, שעה נוחה: Z, עיר: W, התמחות רפואית: V"
    const nameMatch = text.match(/שמי\s+([^,]+)/);
    if (nameMatch) merged.full_name = nameMatch[1].trim();
    const phoneMatch = text.match(/מספר הטלפון שלי\s+([^,]+)/);
    if (phoneMatch) merged.phone = phoneMatch[1].trim();
    const timeMatch = text.match(/שעה נוחה:\s+([^,]+)/);
    if (timeMatch) merged.preferred_time = timeMatch[1].trim();
    const cityMatch = text.match(/עיר:\s+([^,]+)/);
    if (cityMatch) merged.city = cityMatch[1].trim();
    const specialtyMatch = text.match(/התמחות רפואית:\s+([^,]+)/);
    if (specialtyMatch) merged.specialty = specialtyMatch[1].trim();
    setCollectedDetails(merged);
  };

  const extractAndStoreDetails = async () => {
    const allMessages = messages.map(m => 
      `${m.role === 'user' ? 'לקוח' : 'נציג'}: ${m.content}`
    ).join('\n');

    const llmRes = await publicApi({
      action: 'invokeLLM',
      prompt: `Extract customer contact details from this conversation. Only extract details the CUSTOMER explicitly shared (not the bot asking for them).

Conversation:
${allMessages}

Customer name given at start: ${customerName}

Currently stored details: ${JSON.stringify(collectedDetails)}

Extract any NEW details found. If a field was already collected and hasn't changed, keep the old value. Return null for fields not yet provided.`,
      response_json_schema: {
        type: "object",
        properties: {
          full_name: { type: "string", description: "Customer's full name if shared" },
          phone: { type: "string", description: "Phone number if shared" },
          email: { type: "string", description: "Email if shared" },
          preferred_time: { type: "string", description: "Preferred meeting/call time if mentioned" },
          city: { type: "string", description: "City/location if shared" },
          specialty: { type: "string", description: "Medical specialty or area of interest if mentioned" },
          notes: { type: "string", description: "Any other personal details shared" }
        }
      }
    });

    const extracted = llmRes.result;
    // Merge: keep old values, override with new non-null values
    const merged = { ...collectedDetails };
    for (const [key, val] of Object.entries(extracted)) {
      if (val && val !== 'null' && val.trim() !== '') {
        merged[key] = val;
      }
    }

    // Only update if something new was found
    if (JSON.stringify(merged) !== JSON.stringify(collectedDetails)) {
      setCollectedDetails(merged);
      // Persist to session
      if (sessionId) {
        await publicApi({ action: 'updateSession', session_id: sessionId, data: { collected_details: merged, customer_phone: merged.phone || undefined } });
      }
      // Also update lead if exists
      const currentLeadId = leadIdRef.current;
      if (currentLeadId) {
        const leadUpdate = {};
        if (merged.phone) leadUpdate.customer_phone = merged.phone;
        if (merged.email) leadUpdate.customer_email = merged.email;
        if (Object.keys(leadUpdate).length > 0) {
          await publicApi({ action: 'updateLead', lead_id: currentLeadId, data: leadUpdate });
        }
      }
    }
  };

  const analyzeAndManageLead = async () => {
    const allMessages = messages.map(m => 
      `${m.role === 'user' ? 'לקוח' : 'נציג'}: ${m.content}`
    ).join('\n');

    const currentLeadId = leadIdRef.current;

    const businessType = tenant?.system_prompt || '';
    const businessName = tenant?.company_name || 'העסק';

    const llmAnalysis = await publicApi({
      action: 'invokeLLM',
      prompt: `You are a lead detection engine. Analyze this customer service conversation and decide if the person qualifies as a lead.

Business name: ${businessName}
Business context/category: ${businessType}
Customer name: ${customerName}

Conversation:
${allMessages}

=== LEAD DETECTION CRITERIA ===
A person becomes a lead when ANY of these conditions are met:
- intent_score reaches 40 or above
- They shared ANY personal details (name beyond greeting, phone, email, address, even small details)
- They asked about pricing, costs, or fees
- They asked about specific services, products, or treatments the business offers
- They showed interest in scheduling, booking, or making an appointment
- They expressed desire to contact or speak with the business owner/staff
- They asked about availability, opening hours with intent to visit
- They compared options or mentioned competitors (signals active shopping)

A person is NOT a lead if they:
- Only said hello/greeting without substance
- Asked something completely unrelated to the business
- Are clearly a bot or spam

IMPORTANT: Adapt your judgment to the business category. For example:
- Medical/clinic: asking about symptoms, treatments, doctors = lead
- Restaurant: asking about menu, reservations, catering = lead  
- Legal: asking about case types, consultation = lead
- E-commerce: asking about products, shipping, returns = lead
- Services: asking about availability, pricing, process = lead

=== ANALYSIS FIELDS ===
1. is_lead: boolean based on criteria above
2. intent_score (0-100): 0=no intent, 20=slightly curious, 40=interested (LEAD THRESHOLD), 60=seriously considering, 80=ready to act, 95+=urgent need
3. sentiment: "positive", "neutral", or "negative"
4. inquiry_reason: Short Hebrew description of what they want
5. urgency_level: "low", "medium", or "high"
6. priority: "low", "normal", or "high" based on intent + urgency combined
7. summary: Brief Hebrew summary of conversation (1-2 sentences)
8. ai_suggested_action: Short Hebrew next-step suggestion for the business owner
9. competitor_detected: boolean
10. status: "new" if just started showing interest, "contacted" if actively engaged`,
      response_json_schema: {
        type: "object",
        properties: {
          is_lead: { type: "boolean" },
          intent_score: { type: "number" },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          inquiry_reason: { type: "string" },
          urgency_level: { type: "string", enum: ["low", "medium", "high"] },
          priority: { type: "string", enum: ["low", "normal", "high"] },
          summary: { type: "string" },
          ai_suggested_action: { type: "string" },
          competitor_detected: { type: "boolean" },
          status: { type: "string", enum: ["new", "contacted"] }
        },
        required: ["is_lead", "intent_score", "sentiment", "inquiry_reason", "urgency_level", "priority", "summary", "ai_suggested_action", "competitor_detected", "status"]
      }
    });
    const analysis = llmAnalysis.result;

    if (!analysis.is_lead) return;

    const leadData = {
      intent_score: analysis.intent_score,
      sentiment: analysis.sentiment,
      inquiry_reason: analysis.inquiry_reason,
      urgency_level: analysis.urgency_level,
      priority: analysis.priority,
      summary: analysis.summary,
      ai_suggested_action: analysis.ai_suggested_action,
      competitor_detected: analysis.competitor_detected,
      status: analysis.status,
      last_analysis_at: new Date().toISOString()
    };

    if (currentLeadId) {
      // Lead exists — update it with fresh intelligence
      await publicApi({ action: 'updateLead', lead_id: currentLeadId, data: leadData });
    } else {
      // Create lead for the first time
      const leadRes = await publicApi({
        action: 'createLead',
        leadData: {
          tenant_id: tenant.id,
          customer_name: customerName,
          ...leadData
        }
      });
      const newLead = leadRes.lead;
      leadIdRef.current = newLead.id;
      setLeadId(newLead.id);
      // Link session to lead
      if (sessionId) {
        await publicApi({ action: 'updateSession', session_id: sessionId, data: { lead_id: newLead.id } });
      }
    }
  };

  // Search Rofim API for doctors (via backend proxy to avoid CORS)
  const searchRofimDoctors = async (searchTerm, location, kupatHolim) => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const payload = { action: 'searchRofim', term: searchTerm };
    if (location) payload.location = location;
    if (kupatHolim) payload.kupatHolim = kupatHolim;
    console.log('[Rofim Search] Sending to backend:', JSON.stringify(payload));
    const res = await publicApi(payload);
    if (res._debug) {
      console.log('[Rofim Search] Actual Rofim URL hit:', res._debug.actualRofimUrl);
      console.log('[Rofim Search] Debug info:', JSON.stringify(res._debug));
    }
    return res.doctors || [];
  };

  // Extract doctor names mentioned in AI response and search them on Rofim
  const findAndAttachRofimDoctors = async (aiResponse, msgId) => {
    // Use LLM to extract doctor names from the AI response
    const extractRes = await publicApi({
      action: 'invokeLLM',
      prompt: `Extract all doctor names mentioned in this Hebrew text. Return ONLY the names as an array.
If no doctors are mentioned, return an empty array.

Text:
${aiResponse}`,
      response_json_schema: {
        type: "object",
        properties: {
          doctor_names: {
            type: "array",
            items: { type: "string" },
            description: "Array of doctor names found in the text"
          }
        }
      }
    });

    const names = extractRes.result?.doctor_names || [];
    if (names.length === 0) return;

    // Search each name on Rofim (via backend proxy)
    const allFoundDoctors = [];
    const seen = new Set();
    for (const name of names.slice(0, 5)) {
      let cleanName = name.replace(/^(ד"ר|דר'|דר|פרופ'|פרופ)\s*/i, '').trim();
      if (cleanName.length < 2) continue;
      try {
        const results = await searchRofimDoctors(cleanName);
        for (const doc of results) {
          if (!seen.has(doc.name)) {
            seen.add(doc.name);
            allFoundDoctors.push(doc);
          }
        }
      } catch (e) {
        console.warn('Rofim search failed for', cleanName, e.message);
      }
    }

    if (allFoundDoctors.length > 0) {
      setRofimDoctorsByMsgId(prev => ({ ...prev, [msgId]: allFoundDoctors }));
    }
  };

  const buildPrompt = (userMessage, rofimSearchResults, searchWasAttempted = false) => {
    const history = messages.map(m => `${m.role === 'user' ? 'לקוח' : tenant?.ai_persona_name || 'נועה'}: ${m.content}`).join('\n');
    const isFirstMessage = messages.filter(m => m.role === 'user').length === 0;
    
    // Build collected details context
    const detailsParts = [];
    if (collectedDetails.full_name) detailsParts.push(`שם: ${collectedDetails.full_name}`);
    if (collectedDetails.phone) detailsParts.push(`טלפון: ${collectedDetails.phone}`);
    if (collectedDetails.email) detailsParts.push(`אימייל: ${collectedDetails.email}`);
    if (collectedDetails.preferred_time) detailsParts.push(`זמן מועדף: ${collectedDetails.preferred_time}`);
    if (collectedDetails.city) detailsParts.push(`עיר: ${collectedDetails.city}`);
    if (collectedDetails.specialty) detailsParts.push(`התמחות רפואית: ${collectedDetails.specialty}`);
    if (collectedDetails.notes) detailsParts.push(`הערות: ${collectedDetails.notes}`);
    const detailsContext = detailsParts.length > 0 
      ? `\n\nפרטים שהלקוח כבר מסר (אל תבקש אותם שוב!):\n${detailsParts.join('\n')}` 
      : '';

    // Build Rofim search results context
    let rofimContext = '';
    if (rofimSearchResults && rofimSearchResults.length > 0) {
      rofimContext = `\n\n=== תוצאות חיפוש רופאים (ממאגר rofim.org.il) - נמצאו ${rofimSearchResults.length} רופאים ===\nהכרטיסיות של הרופאים מוצגות אוטומטית מתחת להודעה שלך. אל תפרט את שמותיהם.`;
    } else {
      rofimContext = `\n\n=== חיפוש רופאים: לא בוצע חיפוש או לא נמצאו תוצאות ===\nCRITICAL: אל תטען שמצאת רופאים אם אין תוצאות חיפוש כאן! אם הלקוח מבקש רופא ועדיין חסרים פרטים - בקש אותם.`;
    }

    // Build clinic-specific rules
    const isClinic = tenant?.business_type === 'clinic';
    const clinicRules = isClinic ? `
=== כללים ספציפיים למרפאות ===
- CRITICAL: אין לך יכולת לקבוע תורים בפועל! אל תתנהג כאילו אתה קובע תור ואל תציע תאריכים או שעות ספציפיים.
- כשלקוח מבקש רופא, אסוף ממנו: עיר/אזור, תחום רפואי, וקופת חולים. לאחר מכן בקש פרטי קשר כדי שנציג יחזור אליו.
- אסור לתת אבחנות רפואיות או להמליץ על תרופות ספציפיות.
- CRITICAL מצב חירום: אם מישהו מתאר כאב חזה חריף, קוצר נשימה חמור, דימום חמור, חום מעל 40, אובדן הכרה, או כל מצב מסכן חיים - הפנה מיד למיון או חייג 101 (מד"א). אל תנסה לעזור רפואית.
` : '';

    return `אתה ${tenant?.ai_persona_name || 'נועה'}, נציג/ת שירות לקוחות של ${tenant?.company_name || 'העסק'}.

=== הנחיות העסק ===
${tenant?.system_prompt || 'אין הנחיות מיוחדות.'}

=== מאגר הידע של העסק ===
${knowledgeBase || 'אין מידע נוסף.'}
${rofimContext}
${detailsContext}
${clinicRules}

=== היסטוריית השיחה ===
${history}

לקוח: ${userMessage}

=== כללי חיפוש רופאים ===
- כדי לחפש רופא, חייבים 3 פרטים: (1) תחום רפואי/התמחות, (2) עיר/אזור, (3) קופת חולים (כללית/מכבי/מאוחדת/לאומית/פרטי).
- CRITICAL: אם הלקוח מבקש רופא אבל חסר אחד או יותר מ-3 הפרטים האלה - שאל אותו בנימוס את מה שחסר. אל תחפש בלי כל 3 הפרטים!
- CRITICAL: כשיש תוצאות חיפוש רופאים למעלה - אל תפרט את שמות הרופאים בטקסט! הכרטיסיות של הרופאים מוצגות אוטומטית מתחת להודעה שלך. במקום זה, כתוב משפט קצר כמו "מצאתי עבורך מספר רופאים בתחום [התמחות] באזור [עיר]. תוכל לעיין בכרטיסיות למטה." ואז הוסף: "אם תרצה, השאר פרטי קשר ונציג מהצוות שלנו יחזור אליך לתיאום תור."
- CRITICAL: אל תמציא שמות רופאים! אל תציין שמות רופאים בטקסט כלל - הכרטיסיות מטפלות בזה.
- אם אין תוצאות חיפוש רופאים בנתונים למעלה ואכן כל 3 הפרטים סופקו, אמור ללקוח שלא נמצאו רופאים מתאימים והצע לנסות התמחות או אזור אחר.

=== כללים קריטיים ===
- CRITICAL: You MUST respond ONLY in Hebrew. Do NOT use any other language. Not even a single word in English, Italian, Arabic, or any other language. Every single word must be Hebrew.
- ענה בעברית בלבד בצורה ידידותית ומקצועית. היה תמציתי וענייני.
- כאשר הלקוח מוסר פרטי קשר, אשר בצורה ברורה ונכונה דקדוקית.
- ${isFirstMessage ? 'זו ההודעה הראשונה של הלקוח - הצג את עצמך כ"רותם מפורטל Rofim" (לא "רופאים", לא "rofim.org.il", בדיוק: "רותם מפורטל Rofim"). הצג את עצמך פעם אחת בלבד.' : 'זו שיחה מתמשכת - אל תציג את עצמך שוב, אל תגיד שלום שוב, אל תחזור על שמך. פשוט המשך את השיחה ישירות וענה לשאלה.'}
- אל תחזור על מידע שכבר אמרת בהיסטוריית השיחה.
- CRITICAL: אם הלקוח כבר מסר פרטים - אל תבקש אותם שוב!

=== ZERO HALLUCINATION POLICY ===
- ABSOLUTE RULE: You are STRICTLY FORBIDDEN from inventing ANY information not in the data above.
- DO NOT invent prices, services, policies, doctor names, or any factual claim.
- If asked about anything not covered above: "אין לי מידע מדויק על כך. אשמח להעביר את הפנייה לצוות שלנו."
- This applies to EVERYTHING: prices, services, hours, locations, staff names, procedures, policies.`;
  };

  const handleStartChat = (e) => {
    e.preventDefault();
    if (customerName.trim()) {
      createSessionMutation.mutate({ name: customerName });
    }
  };

  const sendChat = async (text) => {
    if (!text.trim() || isTyping) return;
    const userMessage = text.trim();
    setInputValue('');
    
    // Add user message
    const newUserMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const result = await sendMessageMutation.mutateAsync({ content: userMessage });
      
      // Add AI response (only if bot responded, not when worker is active)
      if (result) {
        const aiMsgId = Date.now() + 1;
        setMessages(prev => [...prev, {
          id: aiMsgId,
          role: 'assistant',
          content: result.aiResponse
        }]);

        // If we got Rofim doctor results from the search, attach them to this message
        if (result.rofimResults && result.rofimResults.length > 0) {
          setRofimDoctorsByMsgId(prev => ({ ...prev, [aiMsgId]: result.rofimResults }));
        }
        // Removed findAndAttachRofimDoctors fallback - it was searching for hallucinated doctor names
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'מצטער, נתקלתי בבעיה. אנא נסה שוב.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendChat(inputValue);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900" dir="rtl">
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600">לא נמצא עסק</p>
        </Card>
      </div>
    );
  }

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900" dir="rtl">
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600">העסק אינו זמין</p>
        </Card>
      </div>
    );
  }

  const themeColor = tenant.theme_color || '#6366f1';

  return (
    <div 
      className="h-[100dvh] flex flex-col overflow-hidden"
      dir="rtl"
      style={{ 
        background: `linear-gradient(160deg, #e8f4f8 0%, #f0f7ff 25%, #ffffff 50%, #f5faff 75%, #eaf6fb 100%)` 
      }}
    >
      {/* Header */}
      <header 
        className="sticky top-0 z-10 border-b border-white/30"
        style={{ 
          background: `linear-gradient(135deg, #0099cc, #0077b3, #005f8f)`,
          boxShadow: '0 4px 30px rgba(0, 119, 179, 0.15)'
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-4">
          <div 
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/30 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
          >
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg tracking-tight">{tenant.company_name}</h1>
            <p className="text-white/70 text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {tenant.ai_persona_name || 'נועה'} - עוזרת וירטואלית
            </p>
          </div>
          <PublicChatMenu tenant={tenant} themeColor={themeColor} />
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-4 py-6">
        {showNameInput ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center h-full"
          >
            <div className="p-8 w-full max-w-md shadow-2xl border border-white/40 rounded-3xl"
                  style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                  <div className="text-center mb-6">
                    <div 
                      className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl"
                      style={{ background: 'linear-gradient(135deg, #0099cc, #0077b3)' }}
                    >
                      <MessageCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-slate-800">שלום! 👋</h2>
                    <p className="text-slate-500">
                      אני {tenant.ai_persona_name || 'נועה'}, העוזרת הוירטואלית של {tenant.company_name}
                    </p>
                  </div>
                  <form onSubmit={handleStartChat} className="space-y-4">
                    <div>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="מה השם שלך?"
                        className="text-center text-lg h-12 rounded-xl border-slate-200/60 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-sky-300"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1 h-12 text-lg rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
                        style={{ background: 'linear-gradient(135deg, #0099cc, #0077b3)' }}
                        disabled={createSessionMutation.isPending}
                        onClick={() => setChatMode('text')}
                      >
                        {createSessionMutation.isPending && chatMode === 'text' ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <><Keyboard className="w-5 h-5 ml-2" /> צ'אט</>
                        )}
                      </Button>
                      <Button 
                        type="submit"
                        className="flex-1 h-12 text-lg rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
                        style={{ background: 'linear-gradient(135deg, #0099cc, #0077b3)' }}
                        disabled={createSessionMutation.isPending}
                        onClick={() => setChatMode('voice')}
                      >
                        {createSessionMutation.isPending && chatMode === 'voice' ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <><Phone className="w-5 h-5 ml-2" /> שיחה קולית</>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
          </motion.div>
        ) : chatMode === 'voice' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-6">
            <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #0099cc, #0077b3)' }}
                >
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <Sparkles className="w-12 h-12" />
              )}
            </div>
            <h2 className="text-xl font-bold">{tenant.ai_persona_name || 'נועה'}</h2>
            
            {/* Voice transcripts */}
            {messages.length > 0 && (
              <div className="w-full max-w-md space-y-2 mb-4">
                {messages.slice(-4).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm px-3 py-2 rounded-xl ${
                      msg.role === 'user' ? 'bg-slate-200 mr-auto text-right' : 'bg-white border ml-auto text-right'
                    } max-w-[85%]`}
                  >
                    {msg.content}
                  </motion.div>
                ))}
              </div>
            )}

            <VoiceChat 
              tenant={tenant} 
              themeColor={themeColor}
              onTranscript={(role, text) => {
                if (role === 'user_transcript' || role === 'assistant_transcript') {
                  setMessages(prev => {
                    const displayRole = role === 'user_transcript' ? 'user' : 'assistant';
                    // Append to last message of same role, or create new
                    if (prev.length > 0 && prev[prev.length - 1].role === displayRole) {
                      const updated = [...prev];
                      updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        content: updated[updated.length - 1].content + text
                      };
                      return updated;
                    }
                    return [...prev, { id: Date.now(), role: displayRole, content: text }];
                  });
                }
              }}
            />
            
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500"
              onClick={() => setChatMode('text')}
            >
              <Keyboard className="w-4 h-4 ml-1" /> עבור לצ'אט טקסט
            </Button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="space-y-4 pb-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback 
                        style={{ 
                          background: message.role === 'user' ? 'linear-gradient(135deg, #e0f0f8, #cce6f0)' : 'linear-gradient(135deg, #0099cc, #0077b3)',
                          color: message.role === 'user' ? '#0077b3' : 'white'
                        }}
                      >
                        {message.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[80%] ${message.role === 'user' ? '' : ''}`}>
                      <div 
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === 'user' 
                            ? 'rounded-tr-sm text-white shadow-lg' 
                            : 'rounded-tl-sm border border-white/50 shadow-md'
                        }`}
                        style={message.role === 'user' 
                          ? { background: 'linear-gradient(135deg, #0099cc, #0077b3)' }
                          : { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
                        }
                      >
                        <ReactMarkdown className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : ''}`}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      {message.role === 'assistant' && rofimDoctorsByMsgId[message.id] && (
                        <RofimDoctorCards
                          rofimDoctors={rofimDoctorsByMsgId[message.id]}
                          themeColor={themeColor}
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback style={{ background: 'linear-gradient(135deg, #0099cc, #0077b3)', color: 'white' }}>
                      <Sparkles className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-white/50" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      <DetailsInputModal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onSubmit={(text) => {
          setDetailsSubmitted(true);
          // Immediately parse and store the details from the modal text
          parseAndStoreDetailsFromText(text);
          sendChat(text);
        }}
        themeColor={themeColor}
      />

      {/* Input */}
      {!showNameInput && chatMode === 'text' && (
        <div className="flex-shrink-0 border-t border-white/40 px-4 pt-2 pb-4" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <div className="max-w-3xl mx-auto">
            <SuggestionChips
                  tenantId={tenant?.id}
                  messages={messages}
                  onSelect={(text) => sendChat(text)}
                  themeColor={themeColor}
                  disabled={isTyping}
                  onOpenDetailsModal={() => setShowDetailsModal(true)}
                  detailsSubmitted={detailsSubmitted}
                />
          </div>
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="הקלד הודעה..."
              className="flex-1 h-12 rounded-xl border-slate-200/60 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-sky-300"
              disabled={isTyping}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-12 w-12 rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #0099cc, #0077b3)' }}
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}