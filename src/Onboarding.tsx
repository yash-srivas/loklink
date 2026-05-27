/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Check, Sparkles, MapPin, Briefcase, IndianRupee, Layers } from 'lucide-react';
import { Button, Card, Input } from './components/ui';
import { useAuth } from './App';
import { WORKER_CATEGORIES, LANGUAGES } from './types';
import { LocationPicker } from './components/LocationPicker';
import { useTranslation } from './lib/i18n';

interface OnboardingProps {
  onComplete: (data: any) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { role } = useAuth();
  const [step, setStep] = useState(1);
  const { t } = useTranslation();

  // Unified State for Onboarding Data
  const [formData, setFormData] = useState({
    name: '',
    city: 'Bengaluru',
    area: 'Koramangala',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    
    // Worker specific
    skills: [] as string[],
    experience: 2,
    dailyWage: 500,

    // Employer specific
    companyName: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Worker steps: 1: Name -> 2: Skills -> 3: Location -> 4: Wage
  // Employer steps: 1: Name -> 2: Company -> 3: Location
  const totalSteps = role === 'worker' ? 4 : 3;

  const validateStep = () => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!formData.name.trim()) errs.name = 'Name is required';
    } else if (role === 'worker' && step === 2) {
      if (formData.skills.length === 0) errs.skills = 'Select at least one skill';
    } else if (role === 'employer' && step === 2) {
      if (!formData.companyName.trim()) errs.companyName = 'Company name or Type is required';
    } else if (step === 3) {
      if (!formData.area.trim()) errs.area = 'Area location is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < totalSteps) {
        setStep(s => s + 1);
      } else {
        onComplete(formData);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans dark:bg-stone-900">
      {/* Onboarding Progress Header */}
      <header className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="text-orange-600 animate-pulse" size={24} />
          <h2 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">
            LOKLINK {role === 'worker' ? 'Worker Setup' : 'Employer Setup'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
            Step {step} of {totalSteps}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 overflow-hidden">
        <motion.div 
          className="h-full bg-orange-600" 
          initial={{ width: 0 }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar p-8 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Shared Name Setup */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">What is your name?</h1>
                    <p className="text-stone-400 text-sm font-medium">Use your real name so community members can identify you.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider ml-1">Full Name</label>
                    <Input 
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.name}</p>}
                  </div>
                </div>
              )}

              {/* Step 2 (Worker Only): Skills Selector */}
              {role === 'worker' && step === 2 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">Select Your Skills</h1>
                    <p className="text-stone-400 text-sm font-medium">What kind of helper/trade jobs do you offer? Select all that apply.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1 pr-2 no-scrollbar">
                      {WORKER_CATEGORIES.map(cat => {
                        const active = formData.skills.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleSkill(cat)}
                            className={`p-3 rounded-2xl border-2 font-bold text-xs text-left transition-all active:scale-95 flex items-center justify-between ${
                              active 
                                ? 'border-orange-600 bg-orange-50 text-orange-950 shadow-sm' 
                                : 'border-stone-100 hover:border-stone-200 bg-stone-50 text-stone-700'
                            }`}
                          >
                            <span>{cat}</span>
                            {active ? <Check size={14} className="text-orange-600" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    {errors.skills && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.skills}</p>}
                  </div>
                </div>
              )}

              {/* Step 2 (Employer Only): Company or House Designation */}
              {role === 'employer' && step === 2 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">Organization / Type</h1>
                    <p className="text-stone-400 text-sm font-medium">Are you hiring as a homeowner, residential complex, or enterprise business?</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider ml-1">Company or Hiring Purpose</label>
                    <Input 
                      placeholder="e.g. Homeowner, Khanna Apartments, Swiggy"
                      value={formData.companyName}
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      className={errors.companyName ? 'border-red-500' : ''}
                    />
                    {errors.companyName && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.companyName}</p>}
                  </div>
                </div>
              )}

              {/* Step 3: Shared Location Map Picker */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">Pinpoint Location</h1>
                    <p className="text-stone-400 text-sm font-medium">Where are you located? Pinpoint your area coordinates on the map.</p>
                  </div>
                  <div className="space-y-4">
                    <LocationPicker
                      value={{
                        lat: formData.lat,
                        lng: formData.lng,
                        area: formData.area
                      }}
                      onChange={data => setFormData(prev => ({
                        ...prev,
                        lat: data.lat,
                        lng: data.lng,
                        area: data.area || prev.area
                      }))}
                    />
                    {errors.area && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.area}</p>}
                  </div>
                </div>
              )}

              {/* Step 4 (Worker Only): Daily Wage expectation & experience */}
              {role === 'worker' && step === 4 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">Expected Wage & Experience</h1>
                    <p className="text-stone-400 text-sm font-medium">Tell employers about your daily salary expectation and experience years.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider ml-1">Daily Wage (₹)</label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          placeholder="e.g. 500"
                          value={formData.dailyWage}
                          onChange={e => setFormData({ ...formData, dailyWage: parseInt(e.target.value) || 0 })}
                          className="pl-10"
                        />
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider ml-1">Experience (Years)</label>
                      <Input 
                        type="number" 
                        placeholder="e.g. 5"
                        value={formData.experience}
                        onChange={e => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Wizard Action Footer */}
      <footer className="p-6 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
        {step > 1 ? (
          <Button variant="outline" className="rounded-xl h-12 px-6 gap-2 border-stone-200" onClick={handleBack}>
            <ArrowLeft size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Back</span>
          </Button>
        ) : <div />}

        <Button className="rounded-xl h-12 px-8 gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold" onClick={handleNext}>
          <span className="text-xs font-black uppercase tracking-widest">
            {step === totalSteps ? 'Finish Setup' : 'Next Step'}
          </span>
          {step === totalSteps ? <Check size={18} /> : <ArrowRight size={18} />}
        </Button>
      </footer>
    </div>
  );
}
