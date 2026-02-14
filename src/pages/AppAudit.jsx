import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileText, Download } from "lucide-react";
import { toast } from "sonner";

const AUDIT_TEXT = `
================================================================================
              שידורית AI — COMPREHENSIVE APP AUDIT & CHANGELOG
                        Generated: February 2026
================================================================================

TABLE OF CONTENTS
=================
1.  Platform Overview
2.  Complete Entity Schema Reference (10 Entities)
3.  All Pages (13 Pages)
4.  All Components (40+ Components)
5.  Backend Functions (3 Functions)
6.  Integrations & Connectors
7.  Layout & Navigation
8.  Detailed Feature List
9.  All Changes Made During Development Sessions
10. Current Known Limitations & Technical Debt
11. Suggested Next Steps

================================================================================
1. PLATFORM OVERVIEW
================================================================================

App Name: שידורית AI (Shidurit AI)
Type: Multi-tenant SaaS — Autonomous Hebrew-speaking AI Customer Service Platform
Language: Hebrew (RTL), all UI in Hebrew
Tech Stack: React 18, Tailwind CSS, shadcn/ui, Framer Motion, React Query
Backend: Base44 BaaS (entities, functions, integrations)
AI Models: Base44 InvokeLLM + Google Gemini 2.5 Flash (voice)
OAuth: Google Sheets connector (authorized)
Secrets: GOOGLE_AI_API_KEY

Core Value: Businesses deploy AI chat agents for customer service. The platform
automatically captures leads, scores them with AI, provides voice chat via 
Gemini, and offers a full management dashboard with 10+ AI tools.

================================================================================
2. COMPLETE ENTITY SCHEMA REFERENCE (10 Entities)
================================================================================

--- TENANT (Multi-tenant core) ---
Fields: company_name*, slug*, business_type (business/clinic/other), 
theme_color, logo_url, ai_persona_name, ai_voice, system_prompt, 
welcome_message, usage_count, usage_limit, is_active, onboarding_complete, 
closer_mode_enabled, gemini_api_key

--- DOCTOR (Medical professionals) ---
Fields: tenant_id*, name*, specialty*, procedures[], clinic_location, 
availability, phone, email, bio, years_experience, image_url, is_available

--- PROCEDURE_INFO (Medical procedure details) ---
Fields: name*, description, suitable_for, process, duration, recovery, benefits[]

--- KNOWLEDGE_ENTRY (Business knowledge base) ---
Fields: tenant_id*, title*, category, content*, file_url, file_name, is_active

--- LEAD (AI-detected customer leads) ---
Fields: tenant_id*, customer_name*, customer_phone, customer_email, 
inquiry_reason, status (new/contacted/converted/lost), priority (low/normal/high),
notes, sentiment (positive/neutral/negative), summary, ai_suggested_action, 
intent_score (0-100), urgency_level, competitor_detected, facts_json, 
last_analysis_at

--- CHAT_SESSION (Conversation sessions) ---
Fields: tenant_id*, lead_id, customer_name, customer_phone, customer_email,
inquiry_reason, mode (text/voice), status (active/waiting_for_agent/agent_active/closed),
assigned_worker_id, unread_count_worker, collected_details (object with 
full_name/phone/email/preferred_time/notes)

--- CHAT_MESSAGE (Individual messages) ---
Fields: session_id*, role* (user/assistant/system/worker), content*, 
action_type, action_status (pending/completed/failed), action_data

--- WORKER (Staff/admin accounts) ---
Fields: tenant_id*, full_name*, email, password, role (representative/manager/admin),
is_super_admin, status (active/inactive), is_online

--- SYNTHETIC_CONVERSATION (Training data) ---
Fields: tenant_id*, worker_id, topic*, transcript[] (role+content), 
analysis (summary, key_takeaways[], difficulty_level, recommended_approach)

--- CHAT_USER (Public chat users) ---
Fields: email*, first_name, last_name, profile_image_url

================================================================================
3. ALL PAGES (13 Pages)
================================================================================

PAGE 1: Home
- Dashboard with tenant overview cards
- Stats: total tenants, active tenants, leads, sessions
- Search tenants by name/slug
- Quick links to tenant dashboard and public chat
- "Build with Architect" button for AI-guided setup
- Architect overlay for first-time users (no tenants)
- Super admin sees all tenants; regular workers see only their tenant

PAGE 2: WorkerLogin
- Custom email/password authentication (NOT Base44 auth)
- Login form with show/hide password toggle
- Registration modal with two account types:
  * "Tenant" — creates new business + admin worker
  * "Worker" — creates worker for Shidurit team
- Auto-redirect if already logged in
- Error handling for invalid credentials

PAGE 3: CreateTenant
- Manual business creation wizard
- Fields: company name, slug (auto-generated), business type, theme color
- AI settings: bot name, welcome message, system prompt, usage limit
- Active toggle
- Color picker for brand theming

PAGE 4: TenantDashboard
- 11 tabs: Overview, Leads, Sessions, Tools, Performance, Settings, API, 
  Doctors, Compass, Info, Profile
- Overview: recent leads, AI persona info
- Stats: new leads, hot leads, total leads, active sessions, usage
- Real-time subscriptions for Lead, ChatSession, ChatMessage changes
- Architect Drawer for AI-guided tenant editing
- Back navigation to Home

PAGE 5: PublicChat
- Customer-facing AI chat widget accessed via ?slug={slug}
- Entry: name input → choose text or voice mode
- Text mode: full chat with markdown rendering, typing indicator
- Voice mode: Gemini 2.5 Flash native audio via WebSocket
- Smart suggestion chips (initial + contextual follow-ups)
- Details input modal for structured lead capture
- Doctor cards shown inline when doctors mentioned
- AI prompt with: persona, system prompt, knowledge base, doctor data,
  collected details, conversation history
- Zero-hallucination policy enforced in prompt
- Clinic-specific rules (no scheduling, emergency detection)
- Lead analysis runs after every message exchange
- Session polling for worker messages
- Doctor matching by keywords, symptoms, location

PAGE 6: DoctorsCatalog
- Searchable/filterable doctor directory
- Search: name, specialty, location, procedures
- Specialty filter dropdown (alphabetically sorted, with Lucide icons)
- Availability filter (all/available/unavailable)
- Grid layout with doctor cards
- Each card: avatar, name, specialty badge, tenant name, location, 
  availability, experience, procedures, profile link, phone, email
- Links to DoctorProfile, SpecialtyPage, ProcedurePage

PAGE 7: DoctorProfile
- Individual doctor detail page (public, no auth required)
- Hero banner with tenant theme color
- Profile card with avatar, name, specialty, availability badge
- Bio section, procedures/services grid, experience section
- Contact sidebar: location, hours, phone button, email button
- Quick stats: experience, specialty, procedure count
- Links to SpecialtyPage and ProcedurePage for each procedure

PAGE 8: AllProcedures
- Full procedure catalog extracted from all doctor data
- Search bar for procedures
- Category filter (אבחון ובדיקות, טיפולים, כירורגיה, כללי, מעקב ומניעה)
- Specialty filter (all specialties from doctors)
- Sort options, view mode switcher (grid/list)
- Alphabetical navigation bar (Hebrew letters)
- Each procedure links to ProcedurePage
- Shows doctor count per procedure

PAGE 9: AllSpecialties
- Specialty catalog aggregated from doctor data
- Search by specialty name or procedure
- Grid of specialty cards with icons (from SpecialtyIcon mapping)
- Each card: icon, color, name, doctor count, procedure count
- Modal (SpecialtyDoctorsModal) shows doctors for selected specialty
- Links to SpecialtyPage for each specialty

PAGE 10: ProcedurePage
- Individual procedure detail page
- AI-generated content: description, suitable for, process, duration, 
  recovery, benefits
- Content cached in ProcedureInfo entity for future visits
- Related doctors section with cards
- Loading state while AI generates content

PAGE 11: SpecialtyPage
- Individual specialty page with doctor list
- Hero banner with teal gradient
- AI-generated specialty description (via LLM)
- Filtered doctors grid (only available doctors in that specialty)
- Doctor cards with full details, procedures, contact buttons

PAGE 12: ConversationView
- Detailed conversation viewer for a specific chat session
- Message bubbles: user (dark), assistant (white), worker (green)
- Timestamps on each message
- Session status selector dropdown
- Worker takeover bar: "Take control" / "Release to bot"
- Worker message input when in agent_active mode
- Real-time subscription for new messages
- Auto-scroll to latest message

PAGE 13: ShiduritSystemPrompt
- Full system prompt reference document
- Copy to clipboard button
- Download as TXT file
- Monospace code display
- 870+ lines of comprehensive documentation

================================================================================
4. ALL COMPONENTS (40+ Components)
================================================================================

--- CHAT COMPONENTS ---
components/chat/VoiceChat — Gemini Live Audio voice chat (WebSocket, mic capture,
  audio playback, transcription, mute, speaking indicator)
components/chat/SuggestionChips — Smart contextual suggestion chips (initial 
  topics, follow-ups, details prompt, collapsible list)
components/chat/DoctorCards — In-chat doctor mention detection and display 
  (mini cards + detail modal)
components/chat/DetailsInputModal — Structured contact details collection 
  (name, phone, time, city, specialty)
components/chat/PublicChatMenu — Hamburger menu for public chat (back to site, 
  refresh, etc.)

--- DASHBOARD COMPONENTS ---
components/dashboard/LeadsTable — Full leads management table (search, filter, 
  sort, status badges, sentiment badges, Google Sheets export, responsive 
  mobile/desktop layouts)
components/dashboard/LeadDetailDialog — Detailed lead view with AI tools 
  (status change, notes, contact info, AI analysis, follow-up generation)
components/dashboard/LeadMetricsCards — Lead stats cards
components/dashboard/SessionsList — Chat sessions list (search, filter, 
  analyze & convert to lead, view conversation)
components/dashboard/KnowledgeManager — Knowledge base CRUD (search, create, 
  edit, delete, category badges, toggle active)
components/dashboard/DoctorsManager — Doctor CRUD (add, edit, delete, search, 
  availability toggle)
components/dashboard/TenantSettings — Tenant configuration (company name, slug, 
  theme color, AI persona, welcome message, system prompt, usage limit, 
  active toggle, delete tenant)
components/dashboard/AIToolbox — 10 AI tools (Lead Scorer, Smart Follow-up, 
  Closer Mode, Competitor Clash, Bot Health, Revenue Leak, Knowledge Gaps, 
  Customer Segments, Conversion Forecast, Hallucination Detector)
components/dashboard/AIResultDisplay — Formatted AI tool results display
components/dashboard/PerformanceDashboard — Business intelligence (avg intent, 
  total leads, hot leads %, hours saved, conversion funnel, lead breakdown, 
  ROI analysis)
components/dashboard/CompassChat — "Knowledge Compass" AI business consultant 
  (persistent chat history in localStorage, dynamic suggestion chips, 
  dark theme UI, multi-conversation support)
components/dashboard/GeminiKeySection — Per-tenant Gemini API key management
components/dashboard/GenerateConversationsDialog — AI-generated synthetic 
  training conversations
components/dashboard/ConvertToLeadsButton — Bulk session-to-lead conversion
components/dashboard/DeleteTenantDialog — Tenant deletion confirmation

--- ARCHITECT COMPONENTS ---
components/architect/ArchitectOverlay — Full-screen AI business builder entry
components/architect/ArchitectChat — AI-guided conversation for building bots
components/architect/ArchitectDrawer — Side drawer for editing existing tenants
components/architect/ConfigEditorModal — Manual config editing before creation
components/architect/ConfirmationModal — Pre-creation review modal

--- SPECIALTY COMPONENTS ---
components/specialties/SpecialtyIcon — Icon + color mapping for 20+ medical 
  specialties (Heart, Brain, Bone, Eye, Baby, Scissors, etc.)
components/specialties/SpecialtyDoctorsModal — Modal showing doctors per specialty

--- UTILITY COMPONENTS ---
components/utils/doctorAvatar — DiceBear avatar URL generator for doctors
components/utils/doctorMatcher — Keyword-based doctor filtering for AI context
  (maps Hebrew symptoms/keywords to specialties, pre-filters doctors to reduce 
  LLM prompt size)
components/UserNotRegisteredError — Error display for unregistered users

--- UI COMPONENTS (shadcn/ui - all installed) ---
button, card, input, badge, avatar, select, dialog, table, tabs, switch, 
label, textarea, separator, tooltip, progress, alert, dropdown-menu, 
scroll-area, sheet, drawer, popover, checkbox, calendar, accordion, 
toggle, toggle-group, command, hover-card, menubar, navigation-menu, 
radio-group, pagination, form, breadcrumb, carousel, aspect-ratio, 
collapsible, context-menu, input-otp, skeleton, slider, sidebar, 
resizable, alert-dialog, chart, sonner, toast, toaster

================================================================================
5. BACKEND FUNCTIONS (3 Functions)
================================================================================

FUNCTION 1: publicChat
- Multi-action API for unauthenticated public users
- Uses service role (asServiceRole) for all operations
- Actions:
  * getTenant — Find tenant by slug
  * createSession — Create new chat session
  * sendMessage — Save chat message
  * getMessages — Retrieve session messages
  * getSession — Get session details
  * updateSession — Update session data
  * updateTenantUsage — Increment usage counter
  * createLead — Create new lead
  * updateLead — Update existing lead
  * getKnowledge — Fetch active knowledge entries
  * getDoctor — Get single doctor by ID
  * getDoctors — Get available doctors for tenant
  * getTenantById — Get tenant by ID
  * invokeLLM — Proxy LLM calls through service role

FUNCTION 2: exportLeadsToSheet
- Google Sheets lead export via OAuth connector
- Requires authenticated user (base44.auth.me())
- Creates new spreadsheet with Hebrew title + date
- RTL sheet, Hebrew headers (12 columns)
- Maps status/priority/sentiment/urgency to Hebrew labels
- Formats header row (blue background, white bold)
- Auto-resizes columns
- Returns spreadsheetUrl

FUNCTION 3: getGeminiToken
- Returns Gemini API credentials for voice chat
- Reads GOOGLE_AI_API_KEY from environment
- Returns: apiKey, model name, system_prompt, persona_name, company_name

================================================================================
6. INTEGRATIONS & CONNECTORS
================================================================================

BUILT-IN (Base44 Core):
- InvokeLLM — Used extensively for: chat responses, lead analysis, suggestion 
  chips, AI toolbox (10 tools), ROI analysis, procedure descriptions, 
  specialty descriptions, compass chat, doctor matching
- SendEmail — Available but not actively used
- UploadFile — Used in Architect for file uploads
- GenerateImage — Available
- ExtractDataFromUploadedFile — Available

OAUTH CONNECTORS:
- Google Sheets (authorized) — Scopes: spreadsheets, drive.file, email
  Used by: exportLeadsToSheet function

EXTERNAL APIs:
- Google Generative AI (Gemini) — WebSocket for voice chat
  Key: GOOGLE_AI_API_KEY secret
  Model: gemini-2.5-flash-native-audio-preview-12-2025

================================================================================
7. LAYOUT & NAVIGATION
================================================================================

Layout (Layout.js):
- RTL Hebrew layout
- Desktop: Fixed right sidebar (264px)
- Mobile: Hamburger menu with slide-over sidebar
- Navigation items: Home, Create Tenant, Doctors Catalog, All Procedures, 
  All Specialties
- User info display (name, email) in sidebar footer
- Logout button with online status update
- Public pages bypass layout: PublicChat, WorkerLogin, DoctorProfile, 
  ProcedurePage, SpecialtyPage, AllProcedures, AllSpecialties
- Gradient branding: indigo-to-violet

================================================================================
8. DETAILED FEATURE LIST
================================================================================

MULTI-TENANCY:
✅ Create unlimited businesses with unique slugs
✅ Per-tenant branding (color, logo, AI name)
✅ Per-tenant knowledge base
✅ Per-tenant doctors/specialists
✅ Per-tenant usage limits
✅ Super admin cross-tenant access
✅ Regular workers see only their tenant

AI CHAT (Text):
✅ Full conversational AI in Hebrew
✅ Markdown rendering in responses
✅ Typing indicator animation
✅ Smart suggestion chips (initial + contextual)
✅ Details collection modal (name, phone, time, city, specialty)
✅ Doctor recommendation inline
✅ Symptom-to-specialty mapping
✅ Location-based doctor filtering in chat
✅ Zero-hallucination policy enforcement
✅ Clinic-specific rules (no scheduling, emergency detection)
✅ Worker message polling
✅ Session status tracking

AI CHAT (Voice):
✅ Real-time voice via Gemini WebSocket
✅ Microphone capture (16kHz, mono, echo cancellation)
✅ AI audio playback (24kHz)
✅ Speaking indicator animation
✅ Input/output transcription
✅ Mute/unmute toggle
✅ Switch between voice and text modes

LEAD INTELLIGENCE:
✅ Automatic lead detection from conversations
✅ Intent scoring (0-100)
✅ Sentiment analysis (positive/neutral/negative)
✅ Urgency level detection
✅ Priority assignment
✅ Inquiry reason extraction
✅ AI-generated summaries
✅ AI-suggested next actions
✅ Competitor detection
✅ Business-type adaptive analysis
✅ Real-time lead updates as conversation progresses
✅ Session-to-lead linking

AI TOOLBOX (10 Tools):
✅ Lead Scorer — Bulk or individual lead scoring
✅ Smart Follow-up — WhatsApp message generation
✅ Closer Mode — Toggle aggressive sales mode
✅ Competitor Clash — Competitor analysis + USPs
✅ Bot Health — Mystery shopper test scenarios
✅ Revenue Leak — Drop-off and missed opportunity analysis
✅ Knowledge Gaps — Identify unanswered questions
✅ Customer Segments — AI-powered customer segmentation
✅ Conversion Forecast — Predict which leads will convert
✅ Hallucination Detector — Verify bot responses against knowledge base

KNOWLEDGE COMPASS (מצפן הידע):
✅ AI business consultant chat interface
✅ Analyzes all leads and sessions data
✅ Persistent chat history (localStorage)
✅ Multi-conversation support with history panel
✅ Dynamic follow-up suggestion chips
✅ Dark theme professional UI
✅ Structured output: bottom line → insights → action items

DOCTOR/MEDICAL CATALOG:
✅ Full doctor directory with search
✅ Specialty filtering (alphabetically sorted, with icons)
✅ Availability filtering
✅ Individual doctor profiles
✅ All procedures page with category/specialty filters
✅ Alphabetical procedure navigation
✅ All specialties page with aggregated data
✅ AI-generated procedure descriptions (cached)
✅ AI-generated specialty descriptions
✅ Doctor-to-procedure and procedure-to-doctor linking
✅ DiceBear avatar generation for doctors

HUMAN AGENT HANDOFF:
✅ Worker can take control of conversations
✅ Worker message input in ConversationView
✅ Session status management (active/waiting/agent_active/closed)
✅ Bot disabled when worker is active
✅ Release back to bot functionality
✅ Real-time message subscription

DASHBOARD & ANALYTICS:
✅ Home dashboard with tenant overview
✅ Tenant dashboard with 11 tabs
✅ Performance dashboard (intent avg, leads, hot %, hours saved)
✅ Conversion funnel visualization
✅ Lead breakdown by status and sentiment
✅ AI ROI analysis generation
✅ Real-time data subscriptions

DATA EXPORT:
✅ Google Sheets lead export (OAuth)
✅ RTL spreadsheet with Hebrew headers
✅ Formatted header row
✅ System prompt download as TXT
✅ System prompt copy to clipboard

ARCHITECT (AI Business Builder):
✅ Full-screen AI-guided onboarding
✅ Conversational business setup
✅ Auto-creates tenant + knowledge base
✅ File upload support for business documents
✅ Config review and manual editing before creation
✅ Architect drawer for editing existing tenants

AUTHENTICATION:
✅ Custom worker login system
✅ Registration with two account types
✅ Super admin support
✅ Online status tracking
✅ Session management via localStorage
✅ Auto-redirect for unauthenticated users

================================================================================
9. ALL CHANGES MADE DURING DEVELOPMENT SESSIONS
================================================================================

Note: This is reconstructed from the codebase state and conversation history.
Changes are grouped by feature area.

--- ENTITY CREATION ---
1. Created Tenant entity with full multi-tenant schema
2. Created Doctor entity for medical professionals
3. Created ProcedureInfo entity for cached procedure data
4. Created KnowledgeEntry entity for business knowledge
5. Created Lead entity with AI analysis fields
6. Created ChatSession entity with status tracking
7. Created ChatMessage entity with role-based messages
8. Created Worker entity with custom auth fields
9. Created SyntheticConversation entity for training
10. Created ChatUser entity for public users
11. Added business_type field to Tenant (business/clinic/other)
12. Added closer_mode_enabled to Tenant
13. Added gemini_api_key to Tenant for per-tenant billing
14. Added collected_details object to ChatSession
15. Added file_url and file_name to KnowledgeEntry
16. Added is_super_admin to Worker entity
17. Added facts_json and last_analysis_at to Lead

--- PUBLIC CHAT DEVELOPMENT ---
18. Built PublicChat page with text chat mode
19. Added voice chat mode with Gemini Live Audio WebSocket
20. Implemented suggestion chips engine (initial + contextual)
21. Built details input modal for structured lead capture
22. Added doctor cards inline in chat messages
23. Implemented doctor mention detection in messages
24. Built doctorMatcher utility for keyword-based filtering
25. Implemented AI prompt construction with comprehensive rules
26. Added zero-hallucination policy to AI prompt
27. Added clinic-specific rules (no scheduling, emergency detection)
28. Implemented collected details tracking (no re-asking)
29. Added location-based doctor filtering in chat
30. Added symptom-to-specialty mapping in chat
31. Implemented session polling for worker messages
32. Added mode switching between text and voice
33. Built VoiceChat component with WebSocket, mic, audio playback
34. Added mute/unmute and speaking indicator
35. Added voice transcription display

--- LEAD INTELLIGENCE ---
36. Implemented automatic lead detection from conversations
37. Built comprehensive lead scoring criteria
38. Added business-type adaptive analysis
39. Implemented intent scoring (0-100)
40. Added sentiment analysis
41. Added urgency level detection
42. Added competitor detection
43. Implemented AI-generated summaries and suggested actions
44. Added lead creation and update flow
45. Linked sessions to leads via lead_id
46. Added detail extraction from conversations (phone, email, etc.)
47. Implemented immediate detail parsing from modal submissions

--- DASHBOARD ---
48. Built Home page with tenant grid and stats
49. Implemented search and filtering on Home
50. Added skeleton loading states
51. Built TenantDashboard with tabbed layout
52. Created overview tab with recent leads and AI persona
53. Added 5-stat cards (new leads, hot leads, total, active sessions, usage)
54. Implemented real-time subscriptions for live updates
55. Added data refresh button
56. Changed dashboard tab bar to orange gradient styling

--- LEADS TABLE ---
57. Built LeadsTable with search, filter, sort
58. Added status badges (new/contacted/converted/lost)
59. Added sentiment badges with emojis
60. Added intent score progress bars
61. Implemented Google Sheets export button
62. Added mobile responsive card layout
63. Added desktop table layout
64. Implemented sort by date, name, intent, status
65. Added refresh button

--- LEAD DETAIL ---
66. Built LeadDetailDialog with full lead info
67. Added status change dropdown
68. Added inline AI tools (scorer, follow-up, competitor, revenue)
69. Added contact info display
70. Added conversation session linking

--- SESSIONS ---
71. Built SessionsList component
72. Added search and status filter
73. Implemented "Analyze & Convert to Lead" per session
74. Added session detail navigation
75. Built ConversationView page
76. Added message bubbles with role-based styling
77. Added timestamps per message
78. Implemented worker takeover mechanism
79. Added worker message input when in control
80. Added real-time message subscription
81. Added session status dropdown

--- AI TOOLBOX ---
82. Built AIToolbox with initial 6 tools
83. Added Lead Scorer with individual scoring
84. Added Smart Follow-up (WhatsApp message generator)
85. Added Closer Mode toggle
86. Added Competitor Clash analysis
87. Added Bot Health (mystery shopper scenarios)
88. Added Revenue Leak analysis
89. Added Knowledge Gaps tool (identifies unanswered questions)
90. Added Customer Segments tool (AI-powered segmentation)
91. Added Conversion Forecast tool (predict conversions)
92. Added Hallucination Detector (verify bot responses vs knowledge)
93. Implemented multi-lead selection for batch analysis
94. Added "analyze all" vs "select specific" modes
95. Built AIResultDisplay for formatted results

--- KNOWLEDGE COMPASS ---
96. Built CompassChat component (dark theme AI consultant)
97. Implemented persistent chat history in localStorage
98. Added multi-conversation support with history panel
99. Added create/delete conversations
100. Implemented dynamic suggestion chips after each response
101. Added context building from leads and sessions data
102. Added business intelligence system prompt

--- KNOWLEDGE BASE ---
103. Built KnowledgeManager with CRUD operations
104. Added category system (15 categories)
105. Added search across titles and content
106. Added active/inactive toggle per entry
107. Added date display

--- DOCTORS MANAGEMENT ---
108. Built DoctorsManager with full CRUD
109. Added search by name and specialty
110. Added availability toggle
111. Built DoctorsCatalog page
112. Added specialty filter dropdown
113. Sorted specialties alphabetically (Hebrew)
114. Added Lucide icons to specialty dropdown items
115. Added availability filter
116. Added search by name, specialty, location, procedures
117. Built DoctorProfile page with hero banner
118. Added bio, procedures, experience sections
119. Added contact sidebar with phone/email buttons
120. Built doctorAvatar utility (DiceBear)

--- PROCEDURES ---
121. Built AllProcedures page
122. Extracted procedures from doctor data
123. Added category filter with Hebrew keyword mapping
124. Added specialty filter alongside categories
125. Added alphabetical navigation (Hebrew letters)
126. Added grid/list view toggle
127. Added sort controls
128. Built ProcedurePage with AI-generated content
129. Implemented ProcedureInfo caching for repeat visits
130. Added related doctors section

--- SPECIALTIES ---
131. Built AllSpecialties page
132. Aggregated specialties from doctor data
133. Added search functionality
134. Added specialty cards with icons and colors
135. Built SpecialtyDoctorsModal
136. Built SpecialtyPage with AI-generated descriptions
137. Built SpecialtyIcon component (20+ specialty mappings)
138. Added getSpecialtyColor for deterministic colors

--- ARCHITECT ---
139. Built ArchitectOverlay (full-screen entry)
140. Built ArchitectChat (AI-guided conversation)
141. Built ConfirmationModal (pre-creation review)
142. Built ConfigEditorModal (manual editing)
143. Built ArchitectDrawer (edit existing tenants)
144. Implemented auto-creation of tenant + knowledge base
145. Added file upload support for business documents

--- AUTHENTICATION ---
146. Built WorkerLogin page
147. Implemented custom email/password auth
148. Added registration modal with two account types
149. Implemented super admin access
150. Added online status tracking
151. Added session management via localStorage
152. Added auto-redirect for authenticated users

--- LAYOUT & NAVIGATION ---
153. Built Layout with RTL sidebar
154. Added mobile hamburger menu
155. Added responsive sidebar (desktop fixed, mobile overlay)
156. Added navigation: Home, Create Tenant, Doctors Catalog
157. Added "All Procedures" to navigation
158. Added "All Specialties" to navigation
159. Added user info display in sidebar
160. Added logout with online status update
161. Fixed mobile logout button (touch events)

--- TENANT SETTINGS ---
162. Built TenantSettings component
163. Added company name, slug, theme color editing
164. Added AI persona settings (name, welcome, system prompt)
165. Added usage limit configuration
166. Added active/inactive toggle
167. Built DeleteTenantDialog

--- PERFORMANCE ---
168. Built PerformanceDashboard
169. Added conversion funnel visualization
170. Added lead breakdown by status and sentiment
171. Added ROI analysis with AI insights
172. Added hours saved calculation
173. Added hot leads percentage

--- DATA EXPORT ---
174. Built exportLeadsToSheet backend function
175. Authorized Google Sheets OAuth connector
176. Implemented RTL spreadsheet creation
177. Added formatted headers and auto-resize
178. Built ShiduritSystemPrompt page (copy/download)

--- MISC ---
179. Added real-time entity subscriptions throughout
180. Implemented responsive design across all pages
181. Added framer-motion animations throughout
182. Added toast notifications (sonner)
183. Added tooltip helpers on key actions
184. Built ConvertToLeadsButton for bulk conversion
185. Built GenerateConversationsDialog for synthetic training
186. Built GeminiKeySection for per-tenant API key management
187. Added glassmorphism design system (backdrop-blur, white/70)

================================================================================
10. CURRENT KNOWN LIMITATIONS & TECHNICAL DEBT
================================================================================

SECURITY:
⚠️ Worker passwords stored in PLAIN TEXT (should hash with bcrypt)
⚠️ Tenant Gemini API keys stored in entity (should encrypt)
⚠️ No rate limiting on public chat endpoints
⚠️ Custom auth via localStorage (not HTTP-only cookies)
⚠️ publicChat function uses service role for ALL actions (no granular auth)

SCALABILITY:
⚠️ Doctor catalog fetches ALL doctors (no pagination)
⚠️ Lead analysis runs after EVERY message (expensive)
⚠️ Knowledge base loaded fully into AI prompt (token limit risk)
⚠️ CompassChat loads all leads/sessions into context
⚠️ Session polling every 3 seconds (not WebSocket)

MISSING FEATURES:
⚠️ No appointment booking system
⚠️ No email notifications for new leads
⚠️ No contact form on doctor profiles
⚠️ No analytics tracking (base44.analytics.track)
⚠️ No webhook integration (Zapier, etc.)
⚠️ No multi-language support (Hebrew only)
⚠️ No file sharing in chat
⚠️ No chat widget embeddable snippet for external sites
⚠️ No user invitation system
⚠️ No audit log for admin actions

UX:
⚠️ No pagination on leads/sessions tables
⚠️ No dark mode toggle (only light mode with dark accents)
⚠️ No data visualization charts (Recharts not used)
⚠️ No onboarding tutorial for new users
⚠️ AllProcedures/AllSpecialties accessible without auth (public pages)

================================================================================
11. SUGGESTED NEXT STEPS
================================================================================

HIGH PRIORITY:
1. Hash worker passwords (security)
2. Add rate limiting to publicChat function
3. Implement pagination for large data sets
4. Add email notifications for new hot leads
5. Build embeddable chat widget snippet for external websites

MEDIUM PRIORITY:
6. Add Recharts visualizations to PerformanceDashboard
7. Implement WhatsApp integration (send follow-ups directly)
8. Add appointment scheduling system
9. Build contact form for doctor profiles
10. Add analytics tracking events

LOW PRIORITY:
11. Add dark mode toggle
12. Build onboarding tutorial
13. Add multi-language support
14. Implement webhook integrations
15. Add audit logging

================================================================================
END OF AUDIT
================================================================================
`;

export default function AppAudit() {
  const handleCopy = () => {
    navigator.clipboard.writeText(AUDIT_TEXT.trim());
    toast.success('הועתק ללוח!');
  };

  const handleDownload = () => {
    const blob = new Blob([AUDIT_TEXT.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shidurit-ai-full-audit.txt';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    toast.success('הקובץ הורד בהצלחה');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <FileText className="w-6 h-6 text-indigo-600" />
              Comprehensive App Audit — שידורית AI
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              ביקורת מלאה של האפליקציה: כל הישויות, הדפים, הקומפוננטות, הפונקציות, והשינויים שנעשו. ניתן להעתיק או להוריד כקובץ טקסט ולהשתמש בו עם AI אחר.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleCopy} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Copy className="w-4 h-4" />
                העתק הכל
              </Button>
              <Button onClick={handleDownload} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                הורד כ-TXT
              </Button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-6 rounded-xl overflow-auto max-h-[70vh] text-xs leading-relaxed font-mono whitespace-pre-wrap" dir="ltr">
              {AUDIT_TEXT.trim()}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}