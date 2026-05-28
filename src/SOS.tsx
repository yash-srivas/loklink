/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, MapPin, Send, CheckCircle2, Users, Clock, MessageCircle, Share2, Filter, Search, Check, Plus } from 'lucide-react';
import { Button, Card, Input, Badge } from './components/ui';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { toast } from 'sonner';
import { useModals } from './context/ModalContext';
import { dbService, SOSCrises } from './services/dbService';
import { useAuth } from './App';

export default function SOS() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const { openSOS } = useModals();
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sosRequests, setSosRequests] = useState<SOSCrises[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSOS();
  }, []);

  const loadSOS = async () => {
    setIsLoading(true);
    try {
      const list = await dbService.getSOSRequests();
      setSosRequests(list);
    } catch (e) {
      toast.error('Failed to load emergency SOS list');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return sosRequests
      .filter(req => 
        req.status === activeTab &&
        (req.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
         req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
         req.location.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [sosRequests, activeTab, searchQuery]);

  const handleHelp = async (id: string) => {
    try {
      if (user) {
        // Accept the SOS and transition to "helping"
        await dbService.acceptSOSRequest(id, user.uid);
        toast.success("SOS Rescue Claimed Successfully!", {
          description: "Mission registered on your Dashboard active tasks. Payout incentive credited on resolution."
        });
      } else {
        await dbService.incrementSOSHelp(id);
        await dbService.resolveSOSRequest(id);
        toast.success("Thank you for helping!", { description: "We've notified the user." });
      }
      loadSOS();
    } catch (e) {
      toast.error('Failed to register help response');
    }
  };

  const handleKnowSomeone = (id: string) => {
    navigator.clipboard.writeText(`https://loklink.app/sos#${id}`);
    toast.info("SOS Request Link Copied!", { description: "Share this link with any worker who can resolve it." });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="relative">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-orange-500/20 border-t-orange-600" />
          <div className="absolute inset-0 h-10 w-10 rounded-full animate-ping opacity-20 bg-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 lg:pb-0 flex flex-col page-enter">
      
      {/* Header SOS Banners */}
      <header className="sticky top-0 z-30 bg-white/72 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800 px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-10 w-10">
              <ArrowLeft size={20} />
            </Button>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight leading-none font-display">SOS Board</h1>
              <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-650 dot-pulse" />
                Live Urgent Requests
              </p>
            </div>
          </div>
          <Button 
            className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm gap-2 shadow-lg shadow-red-500/10 h-11 px-5 border-none"
            onClick={openSOS}
          >
            <AlertTriangle size={16} />
            <span>Post SOS</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-8">
          
          {/* Search & Tabs */}
          <div className="space-y-6">
            <div className="relative">
              <Input 
                placeholder="Search emergency posts by keyword..." 
                className="pl-12 pr-4 h-14 rounded-3xl bg-white dark:bg-stone-900 focus:ring-4 focus:ring-red-500/5 focus-visible:border-red-500/30"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            </div>

            <div className="flex p-1.5 bg-stone-100/50 dark:bg-stone-900/30 border border-stone-200/40 dark:border-stone-800/40 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveTab('active')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                  activeTab === 'active' ? "bg-white dark:bg-stone-800 text-red-600 dark:text-red-400 shadow-sm" : "text-stone-400 dark:text-stone-500"
                )}
              >
                Active ({sosRequests.filter(r => r.status === 'active').length})
              </button>
              <button 
                onClick={() => setActiveTab('resolved')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                  activeTab === 'resolved' ? "bg-white dark:bg-stone-800 text-green-600 dark:text-green-400 shadow-sm" : "text-stone-400 dark:text-stone-500"
                )}
              >
                Resolved ({sosRequests.filter(r => r.status === 'resolved').length})
              </button>
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <motion.div 
                    key={req.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className={cn(
                      "p-6 rounded-[32px] border-2 transition-all relative overflow-hidden bg-white dark:bg-stone-900 shadow-sm hover:shadow-md",
                      req.status === 'resolved' ? "border-green-100 dark:border-green-950/20 bg-green-50/20 dark:bg-green-950/10" : 
                      req.urgency === 'critical' ? "border-red-100 dark:border-red-950/20 bg-red-50/20 dark:bg-red-950/10 shadow-xl shadow-red-500/5 animate-shimmer" : "border-stone-100 dark:border-stone-850"
                    )}>
                      {/* Urgency Indicator bar */}
                      <div className={cn(
                        "absolute top-0 left-0 w-1.5 h-full",
                        req.status === 'resolved' ? "bg-green-500" :
                        req.urgency === 'critical' ? "bg-red-600 animate-pulse" :
                        req.urgency === 'high' ? "bg-orange-500" : "bg-blue-500"
                      )} />

                      <div className="space-y-6 pl-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <img src={req.avatar} alt={req.name} className="h-10 w-10 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700" />
                            <div>
                              <h4 className="font-black text-stone-900 dark:text-white leading-none leading-tight">{req.name}</h4>
                              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">
                                Posted {new Date(req.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            req.status === 'resolved' ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400" :
                            req.urgency === 'critical' ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 animate-pulse" :
                            req.urgency === 'high' ? "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400" : "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                          )}>
                            {req.status === 'resolved' ? 'Resolved' : req.urgency}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-orange-650">
                            <AlertTriangle size={16} />
                            <span className="text-xs font-black uppercase tracking-widest font-display">Need: {req.category}</span>
                          </div>
                          <p className="text-stone-600 dark:text-stone-300 font-medium leading-relaxed">{req.description}</p>
                        </div>

                        <div className="flex items-center gap-4 text-stone-400 text-xs font-bold border-t border-stone-50 dark:border-stone-850 pt-4">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-orange-500" />
                            <span>{req.location}</span>
                          </div>
                        </div>

                        {req.status === 'active' ? (
                          <div className="flex gap-3 pt-2">
                            <Button 
                              className="flex-1 h-12 rounded-2xl bg-stone-900 dark:bg-stone-850 hover:bg-stone-800 text-white font-black text-xs uppercase tracking-widest gap-2"
                              onClick={() => handleHelp(req.id)}
                            >
                              <CheckCircle2 size={16} />
                              <span>Answer Emergency</span>
                            </Button>
                            <Button 
                              variant="outline"
                              className="flex-1 h-12 rounded-2xl border-stone-200 dark:border-stone-700 font-black text-xs uppercase tracking-widest gap-2 text-stone-500 hover:text-stone-800"
                              onClick={() => handleKnowSomeone(req.id)}
                            >
                              <Share2 size={16} />
                              <span>Copy Request Link</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 p-3.5 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-950/40 rounded-2xl text-green-700 dark:text-green-400">
                            <Check size={16} className="shrink-0" />
                            <p className="text-xs font-bold leading-normal">This emergency has been successfully resolved. Helpful community points resolved.</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center space-y-6 bg-white dark:bg-stone-900 rounded-[40px] border border-stone-100 dark:border-stone-800 shadow-inner">
                  <div className="h-32 w-32 bg-stone-50 dark:bg-stone-800 rounded-[48px] flex items-center justify-center mx-auto text-stone-200">
                    <AlertTriangle size={48} />
                  </div>
                  <div className="space-y-2 max-w-xs mx-auto">
                    <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">No active posts</h3>
                    <p className="text-stone-500 dark:text-stone-400 font-medium leading-relaxed">
                      Everything seems quiet in this sector. Clear skies ahead.
                    </p>
                  </div>
                  <Button 
                    className="rounded-2xl h-14 px-8 bg-red-600 hover:bg-red-750 gap-2 border-none"
                    onClick={openSOS}
                  >
                    <Plus size={20} />
                    <span>Post SOS Emergency</span>
                  </Button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Floating Action Button - Mobile */}
      <div className="lg:hidden fixed bottom-24 right-6 z-40">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={openSOS}
          className="h-16 w-16 rounded-[24px] bg-red-650 text-white shadow-2xl shadow-red-500/20 flex items-center justify-center cursor-pointer border-none"
        >
          <AlertTriangle size={28} />
        </motion.button>
      </div>
    </div>
  );
}
