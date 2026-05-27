/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, Button, Badge } from './ui';
import { Star, MapPin, ShieldCheck, ChevronRight, Phone, Bookmark } from 'lucide-react';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface WorkerCardProps {
  worker: User;
  onSendRequest?: () => void;
  className?: string;
}

export function WorkerCard({ worker, onSendRequest, className }: WorkerCardProps) {
  const navigate = useNavigate();
  const [isBookmarked, setIsBookmarked] = React.useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem('loklink_bookmarks') || '[]');
      return list.includes(worker.id);
    } catch {
      return false;
    }
  });

  const toggleBookmark = (id: string) => {
    try {
      const list = JSON.parse(localStorage.getItem('loklink_bookmarks') || '[]');
      const next = list.includes(id) ? list.filter((x: string) => x !== id) : [...list, id];
      localStorage.setItem('loklink_bookmarks', JSON.stringify(next));
      setIsBookmarked(next.includes(id));
      if (next.includes(id)) {
        toast.success(`Saved ${worker.name} to bookmarks!`);
      } else {
        toast.info(`Removed ${worker.name} from bookmarks.`);
      }
      window.dispatchEvent(new Event('loklink-db-updated'));
    } catch (e) {
      toast.error('Failed to update bookmarks');
    }
  };

  return (
    <Card 
      onClick={() => navigate(`/profile/${worker.id}`)}
      className={cn(
        "p-0 overflow-hidden cursor-pointer border-2 border-transparent group flex flex-col justify-between h-full bg-white dark:bg-stone-900 shadow-sm hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800/40 rounded-2xl transition-all duration-300",
        className
      )}
    >
      <div className="p-5 space-y-4">
        {/* Profile Avatar & Badges Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-stone-50 dark:bg-stone-800 overflow-hidden shrink-0 border border-stone-100 dark:border-stone-700 relative">
              <img 
                src={worker.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${worker.id}`} 
                alt={worker.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Availability Status Dot Indicator */}
              <div 
                className={cn(
                  "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-stone-900",
                  worker.isAvailable ? "bg-emerald-500 dot-pulse" : "bg-red-500"
                )} 
                title={worker.isAvailable ? "Available Today" : "Not Available"}
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-black text-stone-900 dark:text-white leading-tight truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200">
                {worker.name}
              </h3>
              <div className="flex items-center gap-2 text-stone-400 mt-0.5">
                <MapPin size={12} className="text-orange-500 shrink-0" />
                <span className="text-xs font-bold truncate">{worker.area || worker.city}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1 rounded-xl flex items-center gap-1 text-orange-600 dark:text-orange-400 font-black text-xs border border-orange-100/50 dark:border-orange-800/30">
              <Star size={12} fill="currentColor" />
              <span>{worker.rating && worker.rating > 0 ? worker.rating : 'New'}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(worker.id);
              }}
              className="h-7 w-7 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 hover:bg-orange-50 dark:hover:bg-orange-950/20 text-stone-400 hover:text-orange-600 hover:border-orange-200 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm shrink-0"
              title="Bookmark Worker"
            >
              <Bookmark size={12} fill={isBookmarked ? "currentColor" : "none"} className={isBookmarked ? "text-orange-500" : ""} />
            </button>
          </div>
        </div>

        {/* Skill category and tag badge */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {worker.skills?.slice(0, 3).map((skill, idx) => (
            <Badge key={idx} variant="default" className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">
              {skill}
            </Badge>
          )) || (
            <Badge variant="default" className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">
              Community Worker
            </Badge>
          )}
        </div>

        {/* Experience & Experience count details */}
        <div className="flex items-center justify-between text-xs font-bold text-stone-400 border-t border-stone-100 dark:border-stone-800 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-stone-300 dark:text-stone-600">Exp:</span>
            <span className="text-stone-700 dark:text-stone-300">{worker.experience || 0} years</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-stone-300 dark:text-stone-600">Daily:</span>
            <span className="text-orange-600 dark:text-orange-400 font-extrabold">₹{worker.dailyWage || 500}</span>
          </div>
        </div>
      </div>

      {/* Hire & Send request buttons */}
      <div className="p-4 bg-stone-50 dark:bg-stone-800/30 border-t border-stone-100 dark:border-stone-800 flex gap-2">
        <a 
          href={`tel:${worker.phone}`}
          onClick={e => e.stopPropagation()}
          className="h-10 w-10 flex items-center justify-center bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800/40 transition-all duration-200 shrink-0"
        >
          <Phone size={14} />
        </a>
        
        <Button 
          variant={worker.isAvailable ? "primary" : "outline"} 
          size="sm"
          className="flex-1 h-10 rounded-xl text-xs gap-1 font-black uppercase tracking-wider"
          onClick={(e) => {
            e.stopPropagation();
            if (onSendRequest) onSendRequest();
          }}
        >
          <span>Quick Hire</span>
          <ChevronRight size={14} />
        </Button>
      </div>
    </Card>
  );
}
