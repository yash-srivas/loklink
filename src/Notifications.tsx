/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageCircle, Heart, Star, AlertTriangle, CheckCircle2, Trash2, X } from 'lucide-react';
import { Button, Card } from './components/ui';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { toast } from 'sonner';
import { useAuth } from './App';
import { dbService } from './services/dbService';
import { Notification as DbNotification } from './types';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const unsub = dbService.subscribeToNotifications(user.uid, (data) => {
        setNotifications(data);
        setIsLoading(false);
      });
      return () => unsub();
    }
  }, [user]);

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => filter === 'all' || !n.isRead)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await dbService.markNotificationRead(id);
    } catch (err) {
      console.warn('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n => dbService.markNotificationRead(n.id)));
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const getIcon = (type: DbNotification['type']) => {
    switch (type) {
      case 'new_request': return <MessageCircle size={18} className="text-blue-500" />;
      case 'request_accepted': return <CheckCircle2 size={18} className="text-green-500" />;
      case 'request_rejected': return <X size={18} className="text-red-500" />;
      case 'new_review': return <Star size={18} className="text-orange-500" />;
      case 'system': return <AlertTriangle size={18} className="text-amber-500" />;
      default: return <Bell size={18} className="text-stone-500" />;
    }
  };

  const getTitle = (type: DbNotification['type']) => {
    switch (type) {
      case 'new_request': return 'New Hire Invitation';
      case 'request_accepted': return 'Offer Accepted!';
      case 'request_rejected': return 'Offer Rejected';
      case 'new_review': return 'New Rating Received';
      case 'system': return 'System Alert';
      default: return 'Notification';
    }
  };

  const formatTime = (time: number) => {
    const diff = Date.now() - time;
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleNotifClick = (notif: DbNotification) => {
    handleMarkRead(notif.id);
    // Dynamic navigation based on notification target
    if (notif.type === 'new_request') {
      navigate('/worker/dashboard');
    } else if (notif.type === 'request_accepted' || notif.type === 'request_rejected') {
      navigate('/employer/dashboard');
    } else {
      navigate('/profile');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24 lg:pb-0 flex flex-col">
      <header className="bg-white border-b border-stone-100 px-6 py-4 sticky top-0 z-30 dark:bg-stone-900 dark:border-stone-850">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft size={24} />
            </Button>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight leading-none">Notifications</h1>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-1">
                {unreadCount > 0 ? `${unreadCount} Unread Alerts` : 'No new notifications'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:bg-orange-50"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Filters */}
          <div className="flex p-1.5 bg-stone-100 rounded-2xl w-fit dark:bg-stone-850">
            <button 
              onClick={() => setFilter('all')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                filter === 'all' ? "bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-white" : "text-stone-400 hover:text-stone-600"
              )}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('unread')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                filter === 'unread' ? "bg-white text-orange-600 shadow-sm dark:bg-stone-900" : "text-stone-400 hover:text-stone-600"
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-orange-600 text-white text-[8px] rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => (
                  <motion.div 
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="group"
                  >
                    <Card 
                      className={cn(
                        "p-4 rounded-3xl border-stone-100 dark:border-stone-850 transition-all cursor-pointer relative overflow-hidden dark:bg-stone-900",
                        !notif.isRead ? "bg-white shadow-md border-l-4 border-l-orange-500" : "bg-stone-50/50 opacity-80"
                      )}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0 relative">
                          {getIcon(notif.type)}
                          {!notif.isRead && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-600 border-2 border-white rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={cn(
                              "text-sm font-black tracking-tight truncate",
                              !notif.isRead ? "text-stone-900 dark:text-white" : "text-stone-500"
                            )}>
                              {getTitle(notif.type)}
                            </h4>
                            <span className="text-[10px] font-bold text-stone-400 whitespace-nowrap">
                              {formatTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center space-y-6 bg-white dark:bg-stone-900 rounded-[40px] border border-stone-100 dark:border-stone-800 shadow-inner">
                  <div className="h-32 w-32 bg-stone-50 dark:bg-stone-800 rounded-[48px] flex items-center justify-center mx-auto text-stone-250">
                    <Bell size={48} />
                  </div>
                  <div className="space-y-2 max-w-xs mx-auto">
                    <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">All caught up!</h3>
                    <p className="text-stone-500 font-medium leading-relaxed">
                      You have no {filter === 'unread' ? 'unread' : ''} alerts at the moment.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
