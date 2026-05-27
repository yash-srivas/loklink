/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, AlertTriangle, MapPin, Send, CheckCircle2, Users } from 'lucide-react';
import { Button, Card, Input } from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { dbService } from '../services/dbService';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SOSModal({ isOpen, onClose, onSuccess }: SOSModalProps) {
  const { user } = useAuth() as any;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    need: '',
    area: '',
    urgency: 'high' as 'medium' | 'high' | 'critical',
  });

  const handleSubmit = async () => {
    try {
      await dbService.postSOSRequest({
        userId: user?.uid || 'mock-emp-1',
        name: user?.displayName || 'Community Member',
        avatar: user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
        category: formData.need.split(' ')[0] || 'Plumber',
        description: formData.need,
        location: formData.area,
        urgency: formData.urgency
      });
      setStep(2);
      toast.success('SOS request broadcasted!');
      if (onSuccess) onSuccess();
    } catch (e) {
      toast.error('Failed to post SOS request');
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({ need: '', area: '', urgency: 'high' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-red-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white dark:bg-stone-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-200/20 dark:border-stone-850"
      >
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-650 flex items-center justify-center shadow-inner">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-black text-red-900 dark:text-red-400 tracking-tight font-display">Urgent SOS</h2>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" onClick={handleClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="p-8 space-y-8">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest ml-1">What do you need help with?</label>
                <textarea 
                  className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px] text-stone-900 dark:text-stone-100 font-medium"
                  placeholder="e.g. Plumber for leaking pipe, Electrician for short circuit..."
                  value={formData.need}
                  onChange={e => setFormData({ ...formData, need: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest ml-1">Your Area</label>
                <Input 
                  placeholder="e.g. Koramangala 4th Block" 
                  value={formData.area}
                  onChange={e => setFormData({ ...formData, area: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest ml-1">Urgency Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['medium', 'high', 'critical'] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => setFormData({ ...formData, urgency: level })}
                      className={`py-3 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${
                        formData.urgency === level 
                          ? "border-red-600 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400" 
                          : "border-stone-100 dark:border-stone-850 bg-stone-50 dark:bg-stone-800 text-stone-400 dark:text-stone-500 hover:border-stone-200"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-lg gap-3 shadow-xl shadow-red-500/10"
                onClick={handleSubmit}
                disabled={!formData.need || !formData.area}
              >
                <Send size={20} />
                <span>Broadcast Request</span>
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6 py-4">
              <div className="h-24 w-24 bg-green-100 dark:bg-emerald-950/30 text-green-600 dark:text-emerald-400 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={48} className="animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">Request Broadcasted!</h3>
                <p className="text-stone-500 dark:text-stone-400 text-sm font-medium leading-relaxed">
                  Your urgent SOS broadcast is now live on the local emergency feed.
                </p>
              </div>
              
              <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-700 flex items-center justify-center gap-3">
                <Users size={20} className="text-orange-600 dark:text-orange-400" />
                <span className="font-black text-stone-900 dark:text-stone-200 text-sm uppercase tracking-widest">3 Workers Notified</span>
              </div>

              <Button variant="outline" className="w-full h-12 rounded-2xl font-bold border-stone-200" onClick={handleClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
