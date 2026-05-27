/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Briefcase, Plus, Wrench, ShieldAlert, MapPin } from 'lucide-react';
import { Button, Card, Input, Badge } from './ui';
import { useAuth } from '../App';
import { useModals } from '../context/ModalContext';
import { dbService } from '../services/dbService';
import { WORKER_CATEGORIES } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export function AddListingModal() {
  const { user, role } = useAuth();
  const { isAddListingOpen, closeAddListing } = useModals();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employer Form Fields
  const [jobTitle, setJobTitle] = useState('');
  const [jobSkill, setJobSkill] = useState(WORKER_CATEGORIES[0]);
  const [jobWage, setJobWage] = useState('');
  const [jobDuration, setJobDuration] = useState('1 Day');
  const [jobDescription, setJobDescription] = useState('');
  const [jobArea, setJobArea] = useState('');
  const [jobCity, setJobCity] = useState('Bengaluru');
  const [jobLandmark, setJobLandmark] = useState('');

  // Worker Form Fields
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [workerExp, setWorkerExp] = useState('');
  const [workerWage, setWorkerWage] = useState('');
  const [workerArea, setWorkerArea] = useState('');
  const [workerCity, setWorkerCity] = useState('Bengaluru');

  // Load existing profile if worker to pre-populate
  useEffect(() => {
    if (user && role === 'worker' && isAddListingOpen) {
      dbService.getUserProfile(user.uid).then(profile => {
        if (profile) {
          setSelectedSkills(profile.skills || []);
          setWorkerExp(String(profile.experience || ''));
          setWorkerWage(String(profile.dailyWage || ''));
          setWorkerArea(profile.area || '');
          setWorkerCity(profile.city || 'Bengaluru');
        }
      });
    } else if (user && role === 'employer' && isAddListingOpen) {
      dbService.getUserProfile(user.uid).then(profile => {
        if (profile) {
          setJobArea(profile.area || '');
          setJobCity(profile.city || 'Bengaluru');
        }
      });
    }
  }, [user, role, isAddListingOpen]);

  if (!isAddListingOpen) return null;

  const handleEmployerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!jobTitle || !jobWage || !jobDescription || !jobArea) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.postJob({
        employerId: user.uid,
        title: jobTitle,
        skillRequired: jobSkill,
        description: jobDescription,
        wage: parseFloat(jobWage),
        duration: jobDuration,
        date: new Date().toISOString().split('T')[0],
        location: {
          area: jobArea,
          city: jobCity,
          landmark: jobLandmark,
          lat: 12.9352 + (Math.random() - 0.5) * 0.03, // Slight offset around Koramangala
          lng: 77.6245 + (Math.random() - 0.5) * 0.03
        }
      });

      toast.success('Job Vacancy Posted Successfully!', {
        description: `Your listing for a "${jobSkill}" is now live on the proximity map.`
      });
      
      // Reset form
      setJobTitle('');
      setJobWage('');
      setJobDescription('');
      setJobLandmark('');
      closeAddListing();

      // Dispatch global event or reload dashboard silently
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      toast.error('Failed to post job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedSkills.length === 0 || !workerExp || !workerWage || !workerArea) {
      toast.error('Please select at least one skill and fill all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.updateProfile(user.uid, {
        skills: selectedSkills,
        experience: parseInt(workerExp),
        dailyWage: parseFloat(workerWage),
        area: workerArea,
        city: workerCity,
        location: {
          area: workerArea,
          city: workerCity,
          lat: 12.9352 + (Math.random() - 0.5) * 0.03,
          lng: 77.6245 + (Math.random() - 0.5) * 0.03
        }
      });

      toast.success('Trade Specialty Listed Successfully!', {
        description: 'You are now listed in active local searches and proximity map.'
      });

      closeAddListing();
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      toast.error('Failed to update listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAddListing}
          className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        />

        {/* Modal Drawer content */}
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl relative z-10 border border-stone-200/50 dark:border-stone-850 max-h-[85vh] flex flex-col font-sans"
        >
          {/* Header */}
          <header className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                {role === 'worker' ? <Wrench size={20} /> : <Briefcase size={20} />}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-stone-900 dark:text-white leading-tight">
                  {role === 'worker' ? 'List My Trade Specialty' : 'Post a Job Vacancy'}
                </h2>
                <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mt-0.5">
                  {role === 'worker' ? 'Declare your skills for hire' : 'Connect with nearby experts'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={closeAddListing} className="rounded-full h-10 w-10">
              <X size={18} />
            </Button>
          </header>

          {/* Form wrapper */}
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            {role === 'worker' ? (
              /* Worker Listing Form */
              <form onSubmit={handleWorkerSubmit} className="space-y-5 text-left">
                {/* Skills Multi-Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Select Your Specialties (Choose multiple)</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-100 dark:border-stone-800 no-scrollbar">
                    {WORKER_CATEGORIES.map(cat => {
                      const isSelected = selectedSkills.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleSkill(cat)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                            isSelected 
                              ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                              : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-orange-400'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Experience */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Years of Experience</label>
                    <Input
                      type="number"
                      placeholder="e.g. 5"
                      value={workerExp}
                      onChange={e => setWorkerExp(e.target.value)}
                      required
                      min={0}
                    />
                  </div>

                  {/* Daily Wage */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Expected Wage (₹ / Day)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 600"
                      value={workerWage}
                      onChange={e => setWorkerWage(e.target.value)}
                      required
                      min={100}
                    />
                  </div>
                </div>

                {/* Location preferences */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Your Work Area</label>
                    <Input
                      placeholder="e.g. Koramangala"
                      value={workerArea}
                      onChange={e => setWorkerArea(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">City</label>
                    <Input
                      value={workerCity}
                      onChange={e => setWorkerCity(e.target.value)}
                      required
                      disabled
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl text-lg font-bold gap-2">
                    {isSubmitting ? 'Updating Listing...' : 'Update & List My Trade Pro'}
                  </Button>
                </div>
              </form>
            ) : (
              /* Employer Listing Form */
              <form onSubmit={handleEmployerSubmit} className="space-y-5 text-left">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Job Vacancy Title</label>
                  <Input
                    placeholder="e.g. Toilet Flush Leakage & Tap Fix"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Skill Category</label>
                    <select
                      value={jobSkill}
                      onChange={e => setJobSkill(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:bg-stone-800/50 dark:border-stone-700 dark:text-stone-200 font-bold"
                    >
                      {WORKER_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Job Duration</label>
                    <select
                      value={jobDuration}
                      onChange={e => setJobDuration(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:bg-stone-800/50 dark:border-stone-700 dark:text-stone-200 font-bold"
                    >
                      <option value="Half Day">Half Day</option>
                      <option value="1 Day">1 Day</option>
                      <option value="2-3 Days">2-3 Days</option>
                      <option value="1 Week">1 Week</option>
                    </select>
                  </div>
                </div>

                {/* Wage Offer */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Daily Wage Offer (₹ / Day)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 750"
                    value={jobWage}
                    onChange={e => setJobWage(e.target.value)}
                    required
                    min={100}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Detailed Job Description</label>
                  <textarea
                    placeholder="Specify the problem details, tools required, and timing preferences..."
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    required
                    rows={3}
                    className="flex w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:border-orange-300 transition-all font-medium dark:bg-stone-800/50 dark:border-stone-700 dark:text-stone-200"
                  />
                </div>

                {/* Proximity Location Coordinates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Area / Neighborhood</label>
                    <Input
                      placeholder="e.g. Koramangala 4th Block"
                      value={jobArea}
                      onChange={e => setJobArea(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Landmark (Optional)</label>
                    <Input
                      placeholder="e.g. Near Empire Restaurant"
                      value={jobLandmark}
                      onChange={e => setJobLandmark(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl text-lg font-bold gap-2">
                    {isSubmitting ? 'Posting Job Post...' : 'Post Job Vacancy & Load Escrow'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
