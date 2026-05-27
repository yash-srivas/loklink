/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Briefcase, 
  IndianRupee, 
  ThumbsUp, 
  UserCheck, 
  Calendar, 
  Languages, 
  ChevronRight, 
  Check, 
  X, 
  TrendingUp, 
  Send,
  HelpCircle,
  MessageCircle,
  Activity,
  Edit2,
  LogOut
} from 'lucide-react';
import { Button, Card, Input, Badge } from './components/ui';
import { useAuth } from './App';
import { useTranslation } from './lib/i18n';
import { dbService } from './services/dbService';
import { WORKER_CATEGORIES, Job, JobRequest } from './types';
import { RatingModal } from './components/RatingModal';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";

export default function WorkerDashboard({ initialTab }: { initialTab?: string } = {}) {
  const { user, signOut } = useAuth();
  const { t, language } = useTranslation();
  
  // Tab states: 'overview' | 'inbox' | 'jobs' | 'earnings' | 'legal'
  const [activeTab, setActiveTab] = useState<'overview' | 'inbox' | 'jobs' | 'earnings' | 'legal'>(
    (initialTab as 'overview' | 'inbox' | 'jobs' | 'earnings' | 'legal') || 'overview'
  );
  
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    name: '',
    dailyWage: 500,
    experience: 2,
    skills: [] as string[],
    isAvailable: true,
    area: '',
    city: ''
  });

  // Ratings modal trigger
  const [ratingTarget, setRatingTarget] = useState<{ jobId: string; employerId: string } | null>(null);

  // AI Chat Bot State
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: 'Hello! I am your AI Legal Assistant. You can ask me any question about your employment rights, minimum wages, or workplace issues in any language.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      // Subscribe to requests real-time
      const unsubRequests = dbService.subscribeToWorkerRequests(user.uid, (data) => {
        setRequests(data);
      });

      const handleUpdate = () => {
        loadDashboardData();
      };
      window.addEventListener('loklink-db-updated', handleUpdate);

      return () => {
        unsubRequests();
        window.removeEventListener('loklink-db-updated', handleUpdate);
      };
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const profile = await dbService.getUserProfile(user.uid);
      if (profile) {
        setWorkerProfile(profile);
        setEditForm({
          name: profile.name,
          dailyWage: profile.dailyWage || 500,
          experience: profile.experience || 2,
          skills: profile.skills || [],
          isAvailable: profile.isAvailable ?? true,
          area: profile.area || '',
          city: profile.city || ''
        });
      }

      const allJobs = await dbService.getJobs({ workerId: user.uid });
      setJobs(allJobs);
    } catch (e) {
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle availability green/red state saving instantly
  const handleToggleAvailability = async () => {
    if (!user || !workerProfile) return;
    const nextState = !workerProfile.isAvailable;
    try {
      await dbService.updateProfile(user.uid, { isAvailable: nextState });
      setWorkerProfile((prev: any) => ({ ...prev, isAvailable: nextState }));
      setEditForm(prev => ({ ...prev, isAvailable: nextState }));
      toast.success(nextState ? 'Status set to AVAILABLE' : 'Status set to UNAVAILABLE');
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  // Accept job offer request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      await dbService.updateRequestStatus(requestId, 'accepted');
      toast.success('Job request accepted successfully!');
      loadDashboardData();
    } catch (e) {
      toast.error('Failed to accept request');
    }
  };

  const handleMarkJobDone = async (jobId: string) => {
    try {
      await dbService.updateJobStatus(jobId, 'worker_completed');
      toast.success('Work marked as COMPLETED! Escrow payout is pending employer release.');
      loadDashboardData();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  // Reject job offer request
  const handleRejectRequest = async (requestId: string) => {
    try {
      await dbService.updateRequestStatus(requestId, 'rejected');
      toast.success('Job offer dismissed');
      loadDashboardData();
    } catch (e) {
      toast.error('Failed to reject request');
    }
  };

  // Save profile edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await dbService.updateProfile(user.uid, editForm);
      setWorkerProfile(prev => ({ ...prev, ...editForm }));
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
    } catch (e) {
      toast.error('Failed to save profile updates');
    }
  };

  // Toggle skills selections in edit profile
  const toggleSkill = (skill: string) => {
    setEditForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  // AI legal help submission
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiLoading) return;

    const userMsg = chatInput.trim();
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{
              text: `You are "Bharat", a wise, warm, highly compassionate and dedicated labor rights legal AI assistant and profile coordinator on LOKLINK.
              Your job is to advise Indian blue-collar daily workers, trade specialists (e.g. plumbers, electricians, maids, loaders, driver, cooks), and helpers about their legal rights, wages, safety, and workplace respect in India.
              
              Active Action Instructions:
              1. If the worker asks to update, list, edit, or customize their profile trade credentials (e.g. "I am a skilled painter, list me for ₹750 per day with 5 years experience"), you must formulate and append a JSON block exactly as formatted below to save their info:
                 \`\`\`json
                 {
                   "action": "update_profile",
                   "name": "Ramesh Painter",
                   "skills": ["Painter"],
                   "experience": 5,
                   "dailyWage": 750
                 }
                 \`\`\`
                 Note: The category must be one of: 'Electrician', 'Plumber', 'Mason', 'Carpenter', 'Painter', 'Domestic Help', 'Cook', 'Caretaker', 'Driver', 'Loader', 'Mover', 'Tailor', 'Dhobi', 'Cobbler', 'Labourer', 'Pest Control', 'Repair'.
              2. Keep your text answer highly practical, brief, warm, and empathetic. Mix simple Hinglish/regional words (e.g., "Arre Ji", "Bilkul", "Namaste") where helpful.
              3. Educate them about Indian acts:
                 - Payment of Wages Act, 1936 (Wages must be paid in full & on time).
                 - Workmen Compensation Act, 1923 (Employer must pay medical costs for workplace injuries).
                 - Minimum Wages Act, 1948.
                 - Right to Refuse Unsafe Work (Safety gear like helmets, gloves is a legal right).
              4. Encourage them to use LOKLINK's safe escrow payout wallet and community mediation rather than fighting.
              5. If their query is in another language (Hindi/Kannada/etc.), answer them in their language or simple Hinglish!
              
              Here is the conversation so far:
              ${updatedMessages.map(m => `${m.role === 'user' ? 'Worker' : 'Bharat'}: ${m.content}`).join('\n')}
              
              Give your next advice response:`
            }]
          }
        ]
      });

      const aiText = response.text || "Arre Ji, I couldn't connect to my database right now. Let's try again in a bit! Don't worry, LOKLINK is here for you.";
      
      // Attempt profile auto-update parsing
      let cleanedText = aiText;
      if (aiText.includes('```json') || aiText.includes('{')) {
        try {
          const jsonStart = aiText.indexOf('{');
          const jsonEnd = aiText.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const jsonStr = aiText.substring(jsonStart, jsonEnd);
            const parsed = JSON.parse(jsonStr);
            if (parsed.action === 'update_profile') {
              const updates: Partial<ExtendedUser> = {};
              if (parsed.name) updates.name = parsed.name;
              if (parsed.skills) updates.skills = parsed.skills;
              if (parsed.experience) updates.experience = Number(parsed.experience);
              if (parsed.dailyWage) updates.dailyWage = Number(parsed.dailyWage);
              
              await dbService.updateProfile(user.uid, updates);
              
              // Refresh profile state
              const updatedProfile = await dbService.getUserProfile(user.uid);
              if (updatedProfile) {
                setWorkerProfile(updatedProfile);
                setEditForm({
                  name: updatedProfile.name,
                  phone: updatedProfile.phone,
                  skills: updatedProfile.skills || [],
                  experience: updatedProfile.experience || 0,
                  dailyWage: updatedProfile.dailyWage || 500,
                  area: updatedProfile.area || '',
                });
              }
              toast.success("Shabaash! Profile listed and updated by LOKLINK AI!");
              
              // Clean up the raw JSON block from the user-visible message
              cleanedText = aiText.substring(0, aiText.indexOf('```json')).trim();
              if (!cleanedText) {
                cleanedText = `Shabaash! I have updated your professional profile listing directly! Your daily wage is now ₹${parsed.dailyWage || 500} and experience is set to ${parsed.experience || 0} years. You are live on the LOKLINK map!`;
              }
            }
          }
        } catch (jsonErr) {
          console.warn("AI JSON parsing failed:", jsonErr);
        }
      }

      setChatMessages(prev => [...prev, { role: 'ai', content: cleanedText }]);
    } catch (err) {
      console.error("Chatbot Gemini API error:", err);
      // Premium fallback in case of API limits or offline
      let fallbackText = "Under the Payment of Wages Act, you have the right to receive wages within 7 days of completing your job. If an employer is withholding payments, you can submit a complaint to the Local Labour Officer or request community mediation on LOKLINK.";
      if (userMsg.toLowerCase().includes('accident') || userMsg.toLowerCase().includes('injury') || userMsg.toLowerCase().includes('hurt')) {
        fallbackText = "If you are injured at work, the Workmen Compensation Act mandates that the employer pays for all medical treatments and provides paid recovery leave. Please document the incident and contact a local legal aid coordinator.";
      } else if (userMsg.toLowerCase().includes('unsafe') || userMsg.toLowerCase().includes('safety') || userMsg.toLowerCase().includes('danger')) {
        fallbackText = "You have the legal Right to Refuse Unsafe Work under Indian labor laws. No employer can force you to perform physical labor without appropriate safety gear (harnesses, gloves, boots).";
      }
      setChatMessages(prev => [...prev, { role: 'ai', content: fallbackText }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Profile completeness score calculator
  const profileCompleteness = useMemo(() => {
    if (!workerProfile) return 0;
    let score = 20; // base signup
    if (workerProfile.name) score += 20;
    if (workerProfile.skills && workerProfile.skills.length > 0) score += 25;
    if (workerProfile.phone) score += 15;
    if (workerProfile.area) score += 10;
    if (workerProfile.dailyWage) score += 10;
    return score;
  }, [workerProfile]);

  // Earnings aggregation for logs and SVG graphs
  const earningsLog = useMemo(() => {
    const completed = jobs.filter(j => j.status === 'completed');
    const total = completed.reduce((sum, j) => sum + (j.wage || 500), 0);
    return {
      total,
      completedCount: completed.length,
      weeklyList: [
        { day: 'Mon', wage: completed[0] ? completed[0].wage : 400 },
        { day: 'Tue', wage: completed[1] ? completed[1].wage : 500 },
        { day: 'Wed', wage: completed[2] ? completed[2].wage : 600 },
        { day: 'Thu', wage: 0 },
        { day: 'Fri', wage: completed[3] ? completed[3].wage : 450 }
      ]
    };
  }, [jobs]);

  if (isLoading || !workerProfile) {
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
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 lg:pb-0 flex flex-col relative page-enter">
      
      {/* Header Banner - Upgraded to Premium Orange Mesh/Gradient */}
      <header className="relative bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700 text-white px-6 py-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 overflow-hidden rounded-b-[32px] shadow-lg shadow-orange-600/10">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-orange-500/30 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <h1 className="text-3xl font-black tracking-tight font-display text-white">LOKLINK WORKER</h1>
          <p className="text-xs text-orange-200/90 font-bold uppercase tracking-wider flex items-center gap-1">
            <MapPin size={12} className="text-orange-300" />
            <span>Hello, {workerProfile.name} • {workerProfile.area || workerProfile.city}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto justify-between sm:justify-end border-t border-white/10 sm:border-0 pt-4 sm:pt-0">
          {/* Quick Green/Red Availability Toggle */}
          <button 
            onClick={handleToggleAvailability}
            className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer ${
              workerProfile.isAvailable 
                ? 'bg-white text-orange-700 hover:bg-orange-50 shadow-white/10' 
                : 'bg-red-500 text-white hover:bg-red-650 shadow-red-500/20'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${workerProfile.isAvailable ? 'bg-emerald-500 dot-pulse' : 'bg-white'}`} />
            <span>{workerProfile.isAvailable ? 'Available' : 'Offline'}</span>
          </button>
          
          <Button variant="outline" size="icon" className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 h-10 w-10" onClick={signOut}>
            <LogOut size={16} />
          </Button>
        </div>
      </header>

      {/* Nav Tab bar segments */}
      <nav className="flex overflow-x-auto bg-stone-100/50 dark:bg-stone-900/30 p-2 mx-6 mt-6 rounded-2xl no-scrollbar gap-1 border border-stone-200/40 dark:border-stone-800/30">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'inbox', label: `Inbox (${requests.length})` },
          { id: 'jobs', label: 'My Jobs' },
          { id: 'earnings', label: 'Earnings Tracker' },
          { id: 'legal', label: 'Legal Help' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeTab === t.id 
                ? 'bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 shadow-sm shadow-stone-200/50 dark:shadow-none' 
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Main Tab content container */}
      <main className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Availability status Box */}
                <Card className={`p-6 border-2 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-md animate-slide-up stagger-1 ${
                  workerProfile.isAvailable 
                    ? 'border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/20 dark:bg-emerald-950/10' 
                    : 'border-red-100 dark:border-red-950/30 bg-red-50/20 dark:bg-red-950/10'
                }`}>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-lg text-stone-950 dark:text-white">
                      {workerProfile.isAvailable ? 'You are Available Today!' : 'You are Offline'}
                    </h3>
                    <p className="text-xs text-stone-500 font-bold uppercase">
                      {workerProfile.isAvailable ? 'Employers can view and send you hire requests nearby.' : 'Toggle available status to receive job requests.'}
                    </p>
                  </div>
                  <button 
                    onClick={handleToggleAvailability}
                    className={`h-12 w-12 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-300 active:scale-90 hover:scale-105 cursor-pointer ${
                      workerProfile.isAvailable ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-650 hover:bg-red-700'
                    }`}
                  >
                    <CheckCircle2 size={24} />
                  </button>
                </Card>

                {/* Wallet Balance & Earning Target Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up stagger-2">
                  <Card className="p-6 flex flex-col justify-between h-[140px] shadow-sm hover:shadow-md border border-stone-200/40 bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">LOKLINK Pay Wallet</span>
                    <div>
                      <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">₹{workerProfile.walletBalance ?? 0}</h3>
                      <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Available for direct bank payout</p>
                    </div>
                  </Card>

                  <Card className="p-6 flex flex-col justify-between h-[140px] shadow-sm hover:shadow-md border border-stone-200/40">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-400">
                      <span>Weekly Earning Goal</span>
                      <span className="text-orange-600 font-black">₹{workerProfile.walletBalance ?? 0} / ₹5000</span>
                    </div>
                    <div className="space-y-1">
                      <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-850 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(((workerProfile.walletBalance ?? 0) / 5000) * 100, 100)}%` }} />
                      </div>
                      <p className="text-[9px] text-stone-400 font-bold uppercase">Weekly target tracking active</p>
                    </div>
                  </Card>
                </div>

                {/* Profile Completeness Bar */}
                <Card className="p-6 space-y-3 shadow-sm hover:shadow-md animate-slide-up stagger-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-400">
                    <span>Profile Completeness</span>
                    <span className="text-orange-600 dark:text-orange-400 font-extrabold">{profileCompleteness}%</span>
                  </div>
                  <div className="w-full h-3 bg-stone-100 dark:bg-stone-850 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-orange-650 rounded-full transition-all duration-500" style={{ width: `${profileCompleteness}%` }}></div>
                  </div>
                </Card>

                {/* Worker Profile Info Card */}
                <Card className="p-6 space-y-6 shadow-sm hover:shadow-md animate-slide-up stagger-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shrink-0 shadow-sm relative">
                        <img src={workerProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                        <div className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-stone-900 ${workerProfile.isAvailable ? 'bg-emerald-500 dot-pulse' : 'bg-red-500'}`} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-stone-900 dark:text-white leading-tight">{workerProfile.name}</h2>
                        <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-0.5">{workerProfile.experience} Years Exp • {workerProfile.city}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl w-full sm:w-auto" onClick={() => setIsEditingProfile(true)}>
                      <Edit2 size={12} className="mr-1.5" />
                      Edit Profile
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-stone-100 dark:border-stone-800 pt-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Salary Preference</span>
                      <p className="text-lg font-black text-orange-600">₹{workerProfile.dailyWage} / Day</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Mobile Number</span>
                      <p className="text-sm font-bold text-stone-700 dark:text-stone-300">{workerProfile.phone || 'No phone'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Your Specialties</span>
                    <div className="flex flex-wrap gap-2">
                      {workerProfile.skills?.map((s: string) => (
                        <Badge key={s} variant="warning" className="px-3 py-1 font-extrabold uppercase text-[10px]">
                          {s}
                        </Badge>
                      )) || <p className="text-stone-400 text-xs">No skills listed yet.</p>}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 2: REQUESTS INBOX */}
            {activeTab === 'inbox' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Incoming Job Requests</h2>
                {requests.length > 0 ? (
                  <div className="space-y-4">
                    {requests.map(req => (
                      <Card key={req.id} className="p-6 border-l-4 border-l-orange-500 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h3 className="text-lg font-black text-stone-900 dark:text-white">{req.jobTitle || 'General Assistance Offer'}</h3>
                            <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
                              <MapPin size={12} />
                              <span>{req.area || 'Nearby'}</span>
                              <span>•</span>
                              <Calendar size={12} />
                              <span>{req.dateNeeded || 'Immediate'}</span>
                            </div>
                          </div>
                          <Badge variant="warning" className="shrink-0 text-[10px] font-black uppercase">
                            ₹{req.offeredWage || 500}
                          </Badge>
                        </div>
                        <p className="text-sm text-stone-500 font-medium">{req.message || 'I would like to hire you for physical worker support.'}</p>
                        
                        <div className="flex gap-2 justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
                          <Button variant="outline" size="sm" className="rounded-xl text-red-600 hover:bg-red-50 border-stone-200" onClick={() => handleRejectRequest(req.id)}>
                            <X size={14} className="mr-1" />
                            Reject
                          </Button>
                          <Button variant="primary" size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => handleAcceptRequest(req.id)}>
                            <Check size={14} className="mr-1" />
                            Accept Request
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-4 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-inner">
                    <div className="h-20 w-20 bg-stone-50 dark:bg-stone-800 rounded-3xl flex items-center justify-center mx-auto text-stone-300">
                      <Briefcase size={32} />
                    </div>
                    <div className="space-y-1 max-w-xs mx-auto">
                      <h3 className="text-lg font-black text-stone-900 dark:text-white">Inbox Empty</h3>
                      <p className="text-xs text-stone-400 font-medium leading-relaxed">No active job offers received today. Ensure you are set as Available!</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MY JOBS */}
            {activeTab === 'jobs' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Your Jobs List</h2>
                </div>

                <div className="space-y-8">
                  {/* Active Jobs Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">In Progress / Active</h3>
                    {jobs.filter(j => j.status === 'accepted' || j.status === 'worker_completed').length > 0 ? (
                      jobs.filter(j => j.status === 'accepted' || j.status === 'worker_completed').map(job => (
                        <Card key={job.id} className={`p-6 space-y-4 border-l-4 ${job.status === 'worker_completed' ? 'border-l-amber-500 bg-amber-50/5 dark:bg-amber-950/5' : 'border-l-green-500'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-black text-stone-900 dark:text-white leading-tight">{job.title}</h4>
                                <Badge variant={job.status === 'worker_completed' ? 'warning' : 'success'} className="text-[8px] font-black px-1.5 py-0">
                                  {job.status === 'worker_completed' ? 'Completed (Pending Pay)' : 'Active'}
                                </Badge>
                              </div>
                              <p className="text-xs text-stone-400 font-bold uppercase mt-1">{job.skillRequired} • {job.location.area}</p>
                            </div>
                            <span className="text-green-600 font-black text-lg">₹{job.wage}</span>
                          </div>
                          <p className="text-sm text-stone-500 font-medium">{job.description}</p>
                          
                          <div className="flex justify-end border-t border-stone-100 dark:border-stone-850 pt-3">
                            {job.status === 'accepted' ? (
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold h-9 text-xs"
                                onClick={() => handleMarkJobDone(job.id)}
                              >
                                ✓ Mark as Completed (Notify Employer)
                              </Button>
                            ) : (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-black flex items-center gap-1.5 animate-pulse">
                                <span className="h-2 w-2 rounded-full bg-amber-500 block" />
                                ⌛ Waiting for Employer to release escrow payment...
                              </span>
                            )}
                          </div>
                        </Card>
                      ))
                    ) : (
                      <p className="text-stone-400 text-xs font-bold italic ml-1">No active jobs in progress.</p>
                    )}
                  </div>

                  {/* Completed Jobs Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Completed History</h3>
                    {jobs.filter(j => j.status === 'completed').length > 0 ? (
                      jobs.filter(j => j.status === 'completed').map(job => (
                        <Card key={job.id} className="p-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-black text-stone-900 dark:text-white">{job.title}</h4>
                              <p className="text-xs text-stone-400 font-bold uppercase">{job.skillRequired} • {job.location.area}</p>
                            </div>
                            <span className="text-stone-700 dark:text-stone-300 font-black text-lg">₹{job.wage}</span>
                          </div>
                          <div className="flex justify-end border-t border-stone-100 dark:border-stone-800 pt-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl border-orange-200 hover:bg-orange-50 text-orange-600 font-bold"
                              onClick={() => setRatingTarget({ jobId: job.id, employerId: job.employerId })}
                            >
                              Rate Employer
                            </Button>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <p className="text-stone-400 text-xs font-bold italic ml-1">No completed jobs logged yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: EARNINGS TRACKER */}
            {activeTab === 'earnings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Earnings Tracker</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-6 flex flex-col justify-between h-[150px]">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Total Cumulative Earnings</span>
                    <div>
                      <h3 className="text-4xl font-black text-orange-600">₹{earningsLog.total}</h3>
                      <p className="text-xs text-stone-400 font-bold uppercase mt-1">From {earningsLog.completedCount} completed jobs</p>
                    </div>
                  </Card>

                  <Card className="p-6 flex flex-col justify-between h-[150px]">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Weekly Performance Log</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-green-600 animate-pulse" size={24} />
                      <div>
                        <h4 className="font-black text-stone-900 dark:text-white leading-tight">Consistent Income</h4>
                        <p className="text-xs text-stone-400">Your average rating is helping secure new offers.</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* SVG Visual Bar Chart */}
                <Card className="p-6 space-y-4">
                  <h3 className="text-sm font-black uppercase text-stone-400 tracking-wider ml-1">Earnings Chart (Weekly)</h3>
                  <div className="h-[200px] w-full flex items-end justify-between px-6 pt-6 bg-stone-50 dark:bg-stone-950 rounded-[24px]">
                    {earningsLog.weeklyList.map((item, idx) => {
                      const maxWage = 800; // scaling cap
                      const percentage = Math.min((item.wage / maxWage) * 100, 100);
                      return (
                        <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end flex-1 max-w-[50px] group cursor-pointer">
                          <span className="text-[9px] font-black text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            ₹{item.wage}
                          </span>
                          <div 
                            className="w-8 bg-gradient-to-t from-orange-500 to-orange-600 rounded-t-lg transition-all duration-500 hover:from-orange-600 hover:to-orange-700 hover:scale-105" 
                            style={{ height: `${percentage}%` }}
                          />
                          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{item.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 5: LEGAL AWARENESS */}
            {activeTab === 'legal' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">{t('legalRightsTitle')}</h2>
                  <p className="text-sm text-stone-400 font-bold uppercase">{t('legalRightsDesc')}</p>
                </div>

                {/* Legal FAQ Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { q: t('legalRightsFAQ1'), ans: t('legalRightsFAQ1Ans') },
                    { q: t('legalRightsFAQ2'), ans: t('legalRightsFAQ2Ans') },
                    { q: t('legalRightsFAQ3'), ans: t('legalRightsFAQ3Ans') }
                  ].map((faq, idx) => (
                    <Card key={idx} className="p-5 flex flex-col justify-between hover:border-orange-200 transition-colors cursor-pointer" onClick={() => setChatInput(faq.q)}>
                      <h4 className="font-display font-black text-stone-900 dark:text-white leading-snug">{faq.q}</h4>
                      <p className="text-xs text-stone-400 mt-3 leading-relaxed line-clamp-3">{faq.ans}</p>
                    </Card>
                  ))}
                </div>

                {/* Legal Assistant Chat Widget utilizing Gemini API */}
                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                    <Sparkles className="text-orange-500 animate-pulse" size={18} />
                    <span className="text-xs font-black uppercase text-stone-400 tracking-wider">Legal AI Assistant (Multi-lingual)</span>
                  </div>

                  <div className="h-[250px] overflow-y-auto space-y-3 p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl no-scrollbar flex flex-col">
                    {chatMessages.map((m, i) => (
                      <div 
                        key={i} 
                        className={`p-3 max-w-[85%] rounded-2xl text-xs leading-relaxed ${
                          m.role === 'ai' 
                            ? 'bg-white border border-stone-100 text-stone-700 self-start dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300' 
                            : 'bg-orange-600 text-white self-end'
                        }`}
                      >
                        {m.content}
                      </div>
                    ))}
                    {isAiLoading && (
                      <div className="p-3 bg-white border border-stone-100 text-stone-400 rounded-2xl text-xs self-start animate-pulse dark:bg-stone-900 dark:border-stone-800">
                        Thinking...
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendChatMessage} className="flex gap-2">
                    <Input 
                      placeholder={t('legalBotPlaceholder')} 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="rounded-2xl h-12"
                    />
                    <Button type="submit" size="icon" className="h-12 w-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white shrink-0">
                      <Send size={18} />
                    </Button>
                  </form>
                </Card>
              </div>
            )}
            
          </motion.div>
        </AnimatePresence>
      </main>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-100 rounded-[32px] shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <h3 className="font-display font-black text-lg text-stone-900 dark:text-white">Edit Your Profile</h3>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-stone-50 rounded-full dark:hover:bg-stone-800">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto no-scrollbar space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Full Name</label>
                  <Input 
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Daily Wage (₹)</label>
                    <Input 
                      type="number"
                      value={editForm.dailyWage}
                      onChange={e => setEditForm({ ...editForm, dailyWage: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Experience (Years)</label>
                    <Input 
                      type="number"
                      value={editForm.experience}
                      onChange={e => setEditForm({ ...editForm, experience: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Area</label>
                    <Input 
                      value={editForm.area}
                      onChange={e => setEditForm({ ...editForm, area: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">City</label>
                    <Input 
                      value={editForm.city}
                      onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">Your Trade Skills</label>
                  <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-1 border border-stone-100 rounded-2xl no-scrollbar bg-stone-50">
                    {WORKER_CATEGORIES.map(skill => {
                      const active = editForm.skills.includes(skill);
                      return (
                        <button
                          type="button"
                          key={skill}
                          onClick={() => toggleSkill(skill)}
                          className={`p-2.5 rounded-xl border font-bold text-xs text-left transition-all ${
                            active 
                              ? 'border-orange-500 bg-orange-50 text-orange-950' 
                              : 'border-stone-200 bg-white text-stone-600'
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold">
                  Save Settings & Update
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RATING MODAL TRIGGER */}
      <AnimatePresence>
        {ratingTarget && (
          <RatingModal
            isOpen={!!ratingTarget}
            onClose={() => setRatingTarget(null)}
            jobId={ratingTarget.jobId}
            reviewerId={user.uid}
            revieweeId={ratingTarget.employerId}
            type="employer_review"
            onSuccess={loadDashboardData}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
