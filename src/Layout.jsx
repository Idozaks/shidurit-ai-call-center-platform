import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Building2, LayoutDashboard, MessageSquare, BookOpen, 
  Settings, LogOut, Menu, X, Sparkles, Users, GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [currentWorker, setCurrentWorker] = React.useState(null);
  const navigate = useNavigate();

  const publicPages = ['PublicChat', 'WorkerLogin', 'DoctorProfile', 'ProcedurePage'];
  const isPublicPage = publicPages.includes(currentPageName);

  // Check if worker is logged in (only for non-public pages)
    React.useEffect(() => {
      if (isPublicPage) return;
      const workerData = localStorage.getItem('shidurit_worker');
      if (workerData) {
        setCurrentWorker(JSON.parse(workerData));
      } else {
        navigate(createPageUrl('WorkerLogin'));
      }
    }, [currentPageName, isPublicPage]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: 'Home', label: 'בית', icon: LayoutDashboard },
    { name: 'CreateTenant', label: 'עסק חדש', icon: Building2 },
    { name: 'DoctorsCatalog', label: 'קטלוג רופאים', icon: Users },

  ];

  const handleLogout = async () => {
    // Clear session first to ensure logout always works
    localStorage.removeItem('shidurit_worker');
    // Try to update online status, but don't block logout
    try {
      if (currentWorker) {
        const { base44 } = await import('@/api/base44Client');
        await base44.entities.Worker.update(currentWorker.id, { is_online: false });
      }
    } catch (e) {
      console.error('Logout status update error:', e);
    }
    navigate(createPageUrl('WorkerLogin'));
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20" dir="rtl">
        {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-l from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              שידורית AI
            </span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-64 bg-white dark:bg-slate-900 z-50 shadow-xl lg:hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-lg">שידורית AI</span>
                </div>
              </div>
              <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      currentPageName === item.name
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}

                {/* Logout inside nav list */}
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                  {currentWorker && (
                    <div className="px-3 py-2 mb-2 text-sm">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{currentWorker.full_name}</p>
                      <p className="text-xs text-slate-500">{currentWorker.email}</p>
                    </div>
                  )}
                  <Link
                    to={createPageUrl('WorkerLogin')}
                    onClick={(e) => {
                      e.preventDefault();
                      setSidebarOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>התנתק</span>
                  </Link>
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:w-64 lg:flex lg:flex-col lg:bg-white/80 lg:dark:bg-slate-900/80 lg:backdrop-blur-lg lg:border-l lg:border-slate-200 lg:dark:border-slate-800 lg:z-40">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-l from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              שידורית AI
            </span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={createPageUrl(item.name)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentPageName === item.name
                  ? 'bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          {currentWorker && (
            <div className="px-4 py-2 mb-2 text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-100">{currentWorker.full_name}</p>
              <p className="text-xs text-slate-500">{currentWorker.email}</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                התנתק
              </Button>
            </TooltipTrigger>
            <TooltipContent>יציאה מהמערכת</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:mr-64">
        {children}
      </main>
      </div>
      </TooltipProvider>
      );
      }