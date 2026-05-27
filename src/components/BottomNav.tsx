import React from 'react';
import { Home, Search, Plus, User, Map, Bookmark, Bell, Shield, Briefcase, Wrench } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useModals } from '../context/ModalContext';
import { useAuth } from '../App';
import { useTranslation } from '../lib/i18n';

export const BottomNav = () => {
  const location = useLocation();
  const { role } = useAuth() as any;
  const { openAddListing } = useModals();
  const { t } = useTranslation();

  const workerNavItems = [
    { icon: Home, label: 'Home', key: 'home', path: '/' },
    { icon: Map, label: 'Explore', key: 'explore', path: '/explore' },
    { icon: Plus, label: 'List Pro', key: 'listPro', onClick: openAddListing },
    { icon: Bell, label: 'Requests', key: 'requests', path: '/notifications' },
    { icon: User, label: 'Profile', key: 'profile', path: '/profile' },
  ];

  const employerNavItems = [
    { icon: Home, label: 'Home', key: 'home', path: '/' },
    { icon: Search, label: 'Find Pro', key: 'findPro', path: '/search' },
    { icon: Plus, label: 'Post Job', key: 'postJob', onClick: openAddListing },
    { icon: Map, label: 'Map', key: 'explore', path: '/explore' },
    { icon: User, label: 'Profile', key: 'profile', path: '/profile' },
  ];

  const navItems = role === 'worker' ? workerNavItems : employerNavItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-strong px-2 py-2 z-50 flex items-center justify-around safe-area-bottom shadow-[0_-2px_24px_rgba(0,0,0,0.06)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        if (item.onClick) {
          return (
            <button 
              key={item.key || item.label}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all duration-200 active:scale-90 cursor-pointer"
            >
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-b from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 -translate-y-4 border-[3px] border-white dark:border-stone-900 transition-transform duration-200 hover:scale-105">
                <Icon size={20} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 -mt-3">{t(item.key) || item.label}</span>
            </button>
          );
        }

        return (
          <Link 
            key={item.key || item.label} 
            to={item.path || '/'}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all duration-200 active:scale-95 relative",
              isActive ? "text-orange-600 dark:text-orange-400" : "text-stone-400"
            )}
          >
            <Icon size={18} className={cn(
              "transition-all duration-200",
              isActive ? "text-orange-600 dark:text-orange-400 scale-110" : "text-stone-400"
            )} />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-wider transition-colors",
              isActive ? "text-orange-600 dark:text-orange-400" : "text-stone-400"
            )}>
              {t(item.key) || item.label}
            </span>
            {/* Active indicator dot */}
            {isActive && (
              <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-orange-500 dark:bg-orange-400" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
