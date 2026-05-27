/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search as SearchIcon, SlidersHorizontal, User as UserIcon, Star, ArrowLeft } from 'lucide-react';
import { Button, Card, Input } from './components/ui';
import { User, WORKER_CATEGORIES } from './types';
import { dbService } from './services/dbService';
import { WorkerCard } from './components/WorkerCard';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Search() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [maxWageFilter, setMaxWageFilter] = useState<string>('');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'wage-asc' | 'wage-desc' | 'experience'>('rating');

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setIsLoading(true);
    try {
      const allWorkers = await dbService.getWorkers();
      setWorkers(allWorkers);
    } catch (err) {
      toast.error('Failed to load workers list');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    const list = workers.filter(w => {
      if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedCategory !== 'All' && !w.skills?.includes(selectedCategory)) return false;
      if (onlyAvailable && !w.isAvailable) return false;
      if (maxWageFilter && (w.dailyWage || 500) > parseInt(maxWageFilter)) return false;
      if (minRatingFilter > 0 && (w.rating || 0) < minRatingFilter) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'wage-asc') return (a.dailyWage || 500) - (b.dailyWage || 500);
      if (sortBy === 'wage-desc') return (b.dailyWage || 500) - (a.dailyWage || 500);
      if (sortBy === 'experience') return (b.experience || 0) - (a.experience || 0);
      return 0;
    });
  }, [workers, searchQuery, selectedCategory, onlyAvailable, maxWageFilter, minRatingFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 lg:pb-8 p-6 page-enter">
      
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-stone-100" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">Specialist Finder</h1>
          <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Search available local physical and trade helpers</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Search Input and Filters toggle */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Input 
              placeholder="Search specialists by name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-stone-200"
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className={`h-14 rounded-2xl gap-2 border-stone-200 dark:border-stone-700 font-bold px-5 ${
                showFilters ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-850' : ''
              }`}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
            </Button>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="h-14 border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-stone-600 dark:text-stone-300 focus-visible:outline-none"
            >
              <option value="All">All Categories</option>
              {WORKER_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="h-14 border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-stone-600 dark:text-stone-300 focus-visible:outline-none"
            >
              <option value="rating">Sort: Top Rated</option>
              <option value="wage-asc">Sort: Price (Low to High)</option>
              <option value="wage-desc">Sort: Price (High to Low)</option>
              <option value="experience">Sort: Experience</option>
            </select>
          </div>
        </div>

        {/* Expandable Filter Box */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="p-6 bg-stone-50 border border-stone-200 rounded-3xl grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Max Daily Wage (₹)</label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 800"
                    value={maxWageFilter}
                    onChange={e => setMaxWageFilter(e.target.value)}
                    className="h-11 rounded-xl bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Minimum Star Rating</label>
                  <select
                    value={minRatingFilter}
                    onChange={e => setMinRatingFilter(parseFloat(e.target.value) || 0)}
                    className="h-11 border border-stone-200 bg-white px-3 w-full rounded-xl font-bold text-xs uppercase tracking-wider text-stone-600 focus-visible:outline-none"
                  >
                    <option value="0">Show All Ratings</option>
                    <option value="4.5">4.5+ Stars</option>
                    <option value="4.0">4.0+ Stars</option>
                    <option value="3.5">3.5+ Stars</option>
                  </select>
                </div>

                <div className="space-y-2 flex flex-col justify-end pb-1.5">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={e => setOnlyAvailable(e.target.checked)}
                      className="h-5 w-5 rounded border-stone-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-xs font-black uppercase text-stone-600">Available Today Only</span>
                  </label>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results grid */}
        {filteredWorkers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
            {filteredWorkers.map(worker => (
              <WorkerCard 
                key={worker.id}
                worker={worker}
                onSendRequest={() => navigate(`/profile/${worker.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-4 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-inner">
            <div className="h-20 w-20 bg-stone-50 dark:bg-stone-800 rounded-3xl flex items-center justify-center mx-auto text-stone-300">
              <UserIcon size={32} />
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <h3 className="text-lg font-black text-stone-900 dark:text-white">No Specialists Match</h3>
              <p className="text-xs text-stone-400 font-medium leading-relaxed">Adjust your filters to see more physical trade helpers in your town.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
