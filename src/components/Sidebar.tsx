import React from 'react';
import { Home, Search, Plus, User, Settings, HelpCircle, Map, LogOut, Bookmark, Bell, AlertTriangle, Shield, Briefcase, Wrench } from 'lucide-react';
import { Button } from './ui';
import { useAuth } from '../App';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useModals } from '../context/ModalContext';
import { useTranslation } from '../lib/i18n';

export const Sidebar = () => {
  const { user, role, signOut } = useAuth() as any;
  const { openAddListing } = useModals();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Dynamic Navigation based on active role with dynamic translation keys
  const workerNavItems = [
    { icon: Home, label: 'Worker Dashboard', key: 'workerDashboard', path: '/' },
    { icon: Map, label: 'Find Jobs Proximity', key: 'findJobs', path: '/explore' },
    { icon: Shield, label: 'AI Legal Help', key: 'legalHelp', path: '/worker/legal' },
    { icon: AlertTriangle, label: 'SOS Emergency Board', key: 'sosBoard', path: '/sos' },
    { icon: Bell, label: 'Job Requests Inbox', key: 'requestsInbox', path: '/notifications' },
    { icon: User, label: 'My Trade Profile', key: 'tradeProfile', path: '/profile' },
  ];

  const employerNavItems = [
    { icon: Home, label: 'Employer Workspace', key: 'employerWorkspace', path: '/' },
    { icon: Search, label: 'Find Workers Grid', key: 'findWorkersGrid', path: '/search' },
    { icon: Map, label: 'Worker Proximity Map', key: 'workerProximityMap', path: '/explore' },
    { icon: AlertTriangle, label: 'SOS Emergency Board', key: 'sosBoard', path: '/sos' },
    { icon: Bookmark, label: 'Bookmarked Workers', key: 'bookmarkedWorkers', path: '/saved' },
    { icon: User, label: 'Employer Profile', key: 'employerProfile', path: '/profile' },
  ];

  const activeNavItems = role === 'worker' ? workerNavItems : employerNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white dark:bg-stone-900 border-r border-stone-100 dark:border-stone-800 p-6 transition-colors shrink-0">
      <div className="flex items-center gap-3 mb-10">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-500/20">L</div>
        <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">LOKLINK</h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
        {activeNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 group relative",
                isActive 
                  ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 shadow-sm" 
                  : "text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white"
              )}
            >
              {/* Active indicator pill */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full" />
              )}
              <item.icon size={20} className={cn(
                "transition-colors duration-200",
                isActive ? "text-orange-600 dark:text-orange-400" : "text-stone-400 dark:text-stone-500 group-hover:text-stone-900 dark:group-hover:text-white"
              )} />
              <span className="text-xs font-black uppercase tracking-wider">{t(item.key) || item.label}</span>
            </Link>
          );
        })}
        
        <button 
          onClick={openAddListing}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white transition-all duration-200 group cursor-pointer"
        >
          <div className="h-6 w-6 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={16} />
          </div>
          <span className="text-xs font-black uppercase tracking-wider">
            {role === 'worker' ? (t('listMySpecialty') || 'List My Specialty') : (t('postJobVacancy') || 'Post Job Vacancy')}
          </span>
        </button>
      </nav>

      <div className="pt-6 border-t border-stone-100 dark:border-stone-800 space-y-1 shrink-0">
        <Link to="/settings" className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 group",
          location.pathname === '/settings' 
            ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 shadow-sm" 
            : "text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white"
        )}>
          <Settings size={18} className={cn(
            "transition-colors",
            location.pathname === '/settings' ? "text-orange-600 dark:text-orange-400" : "text-stone-400 dark:text-stone-500 group-hover:text-stone-900 dark:group-hover:text-white"
          )} />
          <span className="text-xs font-black uppercase tracking-wider">{t('settings') || 'Settings'}</span>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white px-4 border-none"
          onClick={() => {
            navigate('/settings');
            toast.success('Help Center active! Scroll down to find the FAQs and ticket forms.');
          }}
        >
          <HelpCircle size={18} />
          <span className="text-xs font-black uppercase tracking-wider">{t('helpCenter') || 'Help Center'}</span>
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-4 mt-4 border-none"
          onClick={signOut}
        >
          <LogOut size={18} />
          <span className="text-xs font-black uppercase tracking-wider">{t('signOut') || 'Sign Out'}</span>
        </Button>
      </div>

      {user && (
        <div className="mt-6 p-4 bg-stone-50 dark:bg-stone-850 rounded-2xl flex items-center gap-3 border border-stone-100 dark:border-stone-800 shrink-0">
          <img 
            src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
            alt={user.displayName || 'User'} 
            className="h-10 w-10 rounded-full border-2 border-white dark:border-stone-700 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-black text-stone-900 dark:text-white truncate leading-tight">{user.displayName}</p>
            <p className="text-[9px] text-stone-400 uppercase tracking-widest font-black mt-0.5 capitalize">{role} Account</p>
          </div>
        </div>
      )}
    </aside>
  );
};
