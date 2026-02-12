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
import ConversationView from './pages/ConversationView';
import CreateTenant from './pages/CreateTenant';
import DoctorsCatalog from './pages/DoctorsCatalog';
import Home from './pages/Home';
import PublicChat from './pages/PublicChat';
import TenantDashboard from './pages/TenantDashboard';
import WorkerLogin from './pages/WorkerLogin';
import DoctorProfile from './pages/DoctorProfile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ConversationView": ConversationView,
    "CreateTenant": CreateTenant,
    "DoctorsCatalog": DoctorsCatalog,
    "Home": Home,
    "PublicChat": PublicChat,
    "TenantDashboard": TenantDashboard,
    "WorkerLogin": WorkerLogin,
    "DoctorProfile": DoctorProfile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};