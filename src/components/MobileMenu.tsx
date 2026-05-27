import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Home, Map, AlertTriangle, User, Plus, Heart, Settings, LogOut, Info } from 'lucide-react';
import { Button } from './ui';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { useModals } from '../context/ModalContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openAddListing, openSOS } = useModals();

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Map, label: 'Explore Map', path: '/explore' },
    { icon: AlertTriangle, label: 'SOS Request', action: openSOS, color: 'text-red-600' },
    { icon: Heart, label: 'Saved Listings', path: '/saved' },
    { icon: User, label: 'My Profile', path: '/profile' },
  ];

  const secondaryItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: Info, label: 'About LOKLINK', path: '/settings' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[200]"
            onClick={onClose}
          />
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-full bg-white z-[201] flex flex-col shadow-2xl"
          >
            <div className="p-6 flex items-center justify-between border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-200">L</div>
                <h1 className="text-2xl font-black tracking-tight text-stone-900">LOKLINK</h1>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-stone-100" onClick={onClose}>
                <X size={24} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {user && (
                <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-[32px] border border-stone-100">
                  <div className="h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xl shadow-inner">
                    {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-stone-900 text-lg leading-tight">{user.displayName || 'LOKLINK User'}</p>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-0.5">Community Member</p>
                  </div>
                </div>
              )}

              <nav className="space-y-2">
                <p className="px-4 py-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">Main Menu</p>
                {menuItems.map((item) => (
                  item.path ? (
                    <Link 
                      key={item.path} 
                      to={item.path}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all active:scale-95",
                        location.pathname === item.path ? "bg-orange-50 text-orange-600 shadow-sm" : "text-stone-500 hover:bg-stone-50"
                      )}
                      onClick={onClose}
                    >
                      <item.icon size={24} className={cn(location.pathname === item.path ? "text-orange-600" : "text-stone-400")} />
                      <span className="text-lg">{item.label}</span>
                    </Link>
                  ) : (
                    <button 
                      key={item.label}
                      onClick={() => { item.action?.(); onClose(); }}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <item.icon size={24} className={cn("text-stone-400", item.color)} />
                      <span className="text-lg">{item.label}</span>
                    </button>
                  )
                ))}
              </nav>

              <nav className="space-y-2">
                <p className="px-4 py-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">Support & Settings</p>
                {secondaryItems.map((item) => (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    className="flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 transition-all active:scale-95"
                    onClick={onClose}
                  >
                    <item.icon size={24} className="text-stone-400" />
                    <span className="text-lg">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="p-6 border-t border-stone-100 space-y-4">
              <Button 
                className="w-full h-16 rounded-3xl bg-orange-600 hover:bg-orange-700 gap-3 text-xl font-black shadow-xl shadow-orange-100"
                onClick={() => { openAddListing(); onClose(); }}
              >
                <Plus size={24} />
                <span>Add Listing</span>
              </Button>
              
              {user && (
                <Button 
                  variant="ghost" 
                  className="w-full h-14 rounded-2xl text-stone-400 font-bold gap-2 hover:text-red-600 hover:bg-red-50"
                  onClick={() => { signOut(); onClose(); }}
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
