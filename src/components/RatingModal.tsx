/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Star, RefreshCw } from 'lucide-react';
import { Button, Card } from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../services/dbService';
import { toast } from 'sonner';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  type: 'worker_review' | 'employer_review';
  onSuccess?: () => void;
}

export function RatingModal({ isOpen, onClose, jobId, reviewerId, revieweeId, type, onSuccess }: RatingModalProps) {
  // 3 distinct criteria depending on reviewer role
  const [c1, setC1] = useState(5); // Punctuality or Payment
  const [c2, setC2] = useState(5); // Quality or Safety
  const [c3, setC3] = useState(5); // Reliability or Behavior
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const overall = parseFloat(((c1 + c2 + c3) / 3).toFixed(1));
      
      const ratings = type === 'worker_review' 
        ? { punctuality: c1, quality: c2, reliability: c3 }
        : { payment: c1, safety: c2, behavior: c3 };

      await dbService.addReview({
        jobId,
        reviewerId,
        revieweeId,
        type,
        ratings,
        overall
      });

      toast.success('Rating submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (val: number, setter: (v: number) => void) => {
    return (
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setter(s)}
            className="p-1 text-stone-200 hover:text-orange-400 active:scale-90 transition-transform cursor-pointer"
          >
            <Star 
              size={28} 
              className={s <= val ? 'text-orange-500 fill-orange-500' : 'text-stone-200 dark:text-stone-700'} 
            />
          </button>
        ))}
      </div>
    );
  };

  const labels = type === 'worker_review' 
    ? {
        title: 'Rate Worker Punctuality & Performance',
        desc: 'Submit transparent ratings to guide other employers in hiring.',
        l1: 'Punctuality & Timeliness',
        l2: 'Quality of Output Work',
        l3: 'Reliability & Dependability'
      }
    : {
        title: 'Rate Employer Payment & Working Environment',
        desc: 'Help other daily wage workers select respectful and safe employers.',
        l1: 'Fair & Prompt Payment',
        l2: 'Workplace Safety & Comfort',
        l3: 'Respectful Behavior'
      };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-100 rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-display font-black text-stone-900 dark:text-white text-lg leading-tight">{labels.title}</h3>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{labels.desc}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Criteria 1 */}
          <div className="space-y-2 text-center">
            <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">{labels.l1}</label>
            {renderStars(c1, setC1)}
          </div>

          {/* Criteria 2 */}
          <div className="space-y-2 text-center">
            <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">{labels.l2}</label>
            {renderStars(c2, setC2)}
          </div>

          {/* Criteria 3 */}
          <div className="space-y-2 text-center">
            <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">{labels.l3}</label>
            {renderStars(c3, setC3)}
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-stone-50 dark:border-stone-850">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl gap-2 font-bold"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : null}
              <span>Submit Ratings</span>
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
