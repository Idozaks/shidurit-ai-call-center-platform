/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AllProcedures from './pages/AllProcedures';
import AllSpecialties from './pages/AllSpecialties';
import ConversationView from './pages/ConversationView';
import CreateTenant from './pages/CreateTenant';
import DoctorProfile from './pages/DoctorProfile';
import DoctorsCatalog from './pages/DoctorsCatalog';
import Home from './pages/Home';
import ProcedurePage from './pages/ProcedurePage';
import PublicChat from './pages/PublicChat';
import ShiduritSystemPrompt from './pages/ShiduritSystemPrompt';
import SpecialtyPage from './pages/SpecialtyPage';
import TenantDashboard from './pages/TenantDashboard';
import WorkerLogin from './pages/WorkerLogin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AllProcedures": AllProcedures,
    "AllSpecialties": AllSpecialties,
    "ConversationView": ConversationView,
    "CreateTenant": CreateTenant,
    "DoctorProfile": DoctorProfile,
    "DoctorsCatalog": DoctorsCatalog,
    "Home": Home,
    "ProcedurePage": ProcedurePage,
    "PublicChat": PublicChat,
    "ShiduritSystemPrompt": ShiduritSystemPrompt,
    "SpecialtyPage": SpecialtyPage,
    "TenantDashboard": TenantDashboard,
    "WorkerLogin": WorkerLogin,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};