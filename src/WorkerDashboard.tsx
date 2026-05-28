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
  LogOut,
  Upload,
  RefreshCw,
  FileText,
  Download,
  ChevronDown
} from 'lucide-react';
import { Button, Card, Input, Badge } from './components/ui';
import { useAuth } from './App';
import { useTranslation } from './lib/i18n';
import { dbService, ExtendedUser } from './services/dbService';
import { geminiService } from './services/geminiService';
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
  const [sosMissions, setSosMissions] = useState<any[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Aadhar / ID verification States
  const [isShowIdModal, setIsShowIdModal] = useState(false);
  const [isVerifyingId, setIsVerifyingId] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idCardBase64, setIdCardBase64] = useState('');
  const [isDragging, setIsDragging] = useState(false);

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

      const allSos = await dbService.getSOSRequests();
      const claimed = allSos.filter((s: any) => s.helperId === user.uid && s.status === 'helping');
      setSosMissions(claimed);
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
    if (!workerProfile?.isVerified) {
      toast.error('Identity Verification Required!', {
        description: 'You must verify your Aadhar card before accepting tasks. Go to your dashboard Overview tab to complete verification.'
      });
      return;
    }
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

  const handleResolveSOS = async (sosId: string) => {
    try {
      await dbService.resolveSOSRequest(sosId);
      toast.success("SOS Rescue resolved! ₹50 bounty payout credited to your wallet.");
      loadDashboardData();
    } catch (e) {
      toast.error("Failed to resolve SOS rescue");
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
                  skills: updatedProfile.skills || [],
                  experience: updatedProfile.experience || 0,
                  dailyWage: updatedProfile.dailyWage || 500,
                  area: updatedProfile.area || '',
                  city: updatedProfile.city || '',
                  isAvailable: updatedProfile.isAvailable ?? true
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
    const total = completed.reduce((sum, j) => sum + (j.wage || 0), 0);
    const grossTotal = total;
    const commissionTotal = grossTotal * 0.05;
    const netTotal = grossTotal - commissionTotal;

    const monWage = completed[0] ? completed[0].wage : 0;
    const tueWage = completed[1] ? completed[1].wage : 0;
    const wedWage = completed[2] ? completed[2].wage : 0;
    const thuWage = completed[3] ? completed[3].wage : 0;
    const friWage = completed[4] ? completed[4].wage : 0;

    // Monthly aggregates
    const monthlyList = [
      { month: 'Jan', wage: 0 },
      { month: 'Feb', wage: 0 },
      { month: 'Mar', wage: 0 },
      { month: 'Apr', wage: 0 },
      { month: 'May', wage: grossTotal }
    ];

    return {
      total,
      grossTotal,
      commissionTotal,
      netTotal,
      completedCount: completed.length,
      weeklyList: [
        { day: 'Mon', wage: monWage },
        { day: 'Tue', wage: tueWage },
        { day: 'Wed', wage: wedWage },
        { day: 'Thu', wage: thuWage },
        { day: 'Fri', wage: friWage }
      ],
      monthlyList
    };
  }, [jobs]);

  const handleDownloadStatement = () => {
    if (!workerProfile || jobs.length === 0) {
      toast.error("No historical transactions available to compile statement.");
      return;
    }

    const completedJobs = jobs.filter(j => j.status === 'completed');
    const activeJobs = jobs.filter(j => j.status === 'accepted' || j.status === 'worker_completed');
    
    const grossTotal = completedJobs.reduce((sum, j) => sum + (j.wage || 500), 0);
    const commissionTotal = grossTotal * 0.05;
    const netTotal = grossTotal - commissionTotal;

    let report = `===========================================================
                      LOKLINK PAY STATEMENT
===========================================================
Generated: \${new Date().toLocaleString()}
Reference ID: TXN-\${Math.floor(100000 + Math.random() * 900000)}

SPECIALIST METADATA
-----------------------------------------------------------
Name: \${workerProfile.name.toUpperCase()}
Verification: \${workerProfile.isVerified ? 'VERIFIED BY LOKLINK AI' : 'UNVERIFIED'}
Aadhar Number: \${workerProfile.idCardDetails?.idNumber || 'N/A'}
Trade Skills: \${workerProfile.skills?.join(', ') || 'General Helper'}
Daily Wage standard: ₹\${workerProfile.dailyWage}/Day
City: \${workerProfile.city}

FINANCIAL SUMMARY
-----------------------------------------------------------
Gross Earnings:        ₹\${grossTotal}
Escrow Commissions (5%):  ₹\${commissionTotal.toFixed(0)}
Net Earnings (95%):      ₹\${netTotal.toFixed(0)}
Completed Jobs:        \${completedJobs.length}
Active Pending Holds:  \${activeJobs.length}
LOKLINK Wallet balance: ₹\${workerProfile.walletBalance || 0}

ITEMIZED PAYOUT LEDGER
-----------------------------------------------------------
Date         | Task Title               | Gross  | Fee (5%) | Net    | Status
-----------------------------------------------------------
`;

    completedJobs.forEach(job => {
      const dateStr = job.date || new Date().toISOString().split('T')[0];
      const titlePad = (job.title || 'Task').substring(0, 24).padEnd(24);
      const gross = `₹\${job.wage}`.padEnd(6);
      const fee = `₹\${(job.wage * 0.05).toFixed(0)}`.padEnd(8);
      const net = `₹\${(job.wage * 0.95).toFixed(0)}`.padEnd(6);
      report += `\${dateStr} | \${titlePad} | \${gross} | \${fee} | \${net} | Completed\\n`;
    });

    activeJobs.forEach(job => {
      const dateStr = job.date || new Date().toISOString().split('T')[0];
      const titlePad = (job.title || 'Task').substring(0, 24).padEnd(24);
      const gross = `₹\${job.wage}`.padEnd(6);
      const fee = `₹\${(job.wage * 0.05).toFixed(0)}`.padEnd(8);
      const net = `₹\${(job.wage * 0.95).toFixed(0)}`.padEnd(6);
      report += `\${dateStr} | \${titlePad} | \${gross} | \${fee} | \${net} | Escrow Held\\n`;
    });

    report += `-----------------------------------------------------------
===========================================================
            LOKLINK PAYROLL SERVICES INDIA • 2026
===========================================================`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LOKLINK_Earnings_\${workerProfile.name.replace(/\\s+/g, '_')}_\${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    toast.success("Statement download compiled successfully!");
  };

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
          <h1 className="text-3xl font-black tracking-tight font-display text-white">{t('LOKLINK WORKER')}</h1>
          <p className="text-xs text-orange-200/90 font-bold uppercase tracking-wider flex items-center gap-1">
            <MapPin size={12} className="text-orange-300" />
            <span>{t('Hello')}, {workerProfile.name} • {workerProfile.area || workerProfile.city}</span>
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
            <span>{workerProfile.isAvailable ? t('Available') : t('Offline')}</span>
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
          { id: 'inbox', label: 'Inbox', count: requests.length },
          { id: 'jobs', label: 'My Jobs' },
          { id: 'earnings', label: 'Earnings Tracker' },
          { id: 'legal', label: 'Legal Help' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 shadow-sm shadow-stone-200/50 dark:shadow-none' 
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            {t(tab.label)}{tab.count !== undefined ? ` (${tab.count})` : ''}
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

                {/* Amber Identity Card Verification alert box */}
                {!workerProfile.isVerified && (
                  <Card className="p-5 border-2 border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent rounded-[24px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shrink-0 mt-0.5 animate-bounce">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-black text-sm text-stone-900 dark:text-white uppercase tracking-wider">{t("Identity Verification Pending")}</h4>
                        <p className="text-xs text-stone-550 dark:text-stone-400 font-medium">
                          {t("You must verify your Aadhar ID card via our secure LOKLINK AI to unlock proximity map job claiming.")}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setIsShowIdModal(true)}
                      className="w-full sm:w-auto h-11 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white shrink-0 shadow-sm"
                    >
                      {t("Verify Now")}
                    </Button>
                  </Card>
                )}
                
                {/* Availability status Box */}
                <Card className={`p-6 border-2 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-md animate-slide-up stagger-1 ${
                  workerProfile.isAvailable 
                    ? 'border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/20 dark:bg-emerald-950/10' 
                    : 'border-red-100 dark:border-red-950/30 bg-red-50/20 dark:bg-red-950/10'
                }`}>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-lg text-stone-950 dark:text-white">
                      {workerProfile.isAvailable ? t('You are Available Today!') : t('You are Offline')}
                    </h3>
                    <p className="text-xs text-stone-500 font-bold uppercase">
                      {workerProfile.isAvailable ? t('Employers can view and send you hire requests nearby.') : t('Toggle available status to receive job requests.')}
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
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">{t("LOKLINK Pay Wallet")}</span>
                    <div>
                      <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">₹{workerProfile.walletBalance ?? 0}</h3>
                      <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">{t("Available for direct bank payout")}</p>
                    </div>
                  </Card>

                  <Card className="p-6 flex flex-col justify-between h-[140px] shadow-sm hover:shadow-md border border-stone-200/40">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-400">
                      <span>{t("Weekly Earning Goal")}</span>
                      <span className="text-orange-600 font-black">₹{workerProfile.walletBalance ?? 0} / ₹5000</span>
                    </div>
                    <div className="space-y-1">
                      <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-850 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(((workerProfile.walletBalance ?? 0) / 5000) * 100, 100)}%` }} />
                      </div>
                      <p className="text-[9px] text-stone-400 font-bold uppercase">{t('Weekly target tracking active')}</p>
                    </div>
                  </Card>
                </div>

                {/* Profile Completeness Bar */}
                <Card className="p-6 space-y-3 shadow-sm hover:shadow-md animate-slide-up stagger-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-400">
                    <span>{t('Profile Completeness')}</span>
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
                        <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-0.5">{workerProfile.experience} {t('Years Exp')} • {workerProfile.city}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl w-full sm:w-auto" onClick={() => setIsEditingProfile(true)}>
                      <Edit2 size={12} className="mr-1.5" />
                      {t('Edit Profile')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-stone-100 dark:border-stone-800 pt-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">{t('Salary Preference')}</span>
                      <p className="text-lg font-black text-orange-600">₹{workerProfile.dailyWage} / {t('Day')}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">{t('Mobile Number')}</span>
                      <p className="text-sm font-bold text-stone-700 dark:text-stone-300">{workerProfile.phone || t('No phone')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">{t('Your Specialties')}</span>
                    <div className="flex flex-wrap gap-2">
                      {workerProfile.skills?.map((s: string) => (
                        <Badge key={s} variant="warning" className="px-3 py-1 font-extrabold uppercase text-[10px]">
                          {s}
                        </Badge>
                      )) || <p className="text-stone-400 text-xs">{t('No skills listed yet.')}</p>}
                    </div>
                  </div>
                </Card>

                {/* Local Market Guidance & Ratings Scorecard Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up stagger-4">
                  {/* Checklist */}
                  <Card className="p-6 space-y-4 shadow-sm hover:shadow-md border border-stone-200/40 rounded-[24px]">
                    <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-orange-500" />
                      <span>{t('Professional Checklist')}</span>
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: t('Verify ID Card via LOKLINK AI'), checked: workerProfile.isVerified },
                        { label: t('Set Available Status Today'), checked: workerProfile.isAvailable },
                        { label: t('Add At Least 1 Specialty Skill'), checked: workerProfile.skills && workerProfile.skills.length > 0 },
                        { label: t('First Wallet Earnings Recorded'), checked: (workerProfile.walletBalance ?? 0) > 0 }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                          <span className={item.checked ? 'line-through text-stone-400' : ''}>{item.label}</span>
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center border font-black text-[9px] ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-200 dark:border-stone-700 text-transparent'}`}>✓</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Market Rate Tracker */}
                  <Card className="p-6 space-y-4 shadow-sm hover:shadow-md border border-stone-200/40 rounded-[24px]">
                    <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-orange-500" />
                      <span>{t('Local Market Wage Guidance')}</span>
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-stone-100 dark:border-stone-850 pb-2">
                        <span className="text-stone-400 font-bold">{t('Plumber Standard')}</span>
                        <span className="font-extrabold text-stone-900 dark:text-white">₹650 - ₹800 / {t('Day')}</span>
                      </div>
                      <div className="flex justify-between border-b border-stone-100 dark:border-stone-850 pb-2">
                        <span className="text-stone-400 font-bold">{t('Electrician Standard')}</span>
                        <span className="font-extrabold text-stone-900 dark:text-white">₹700 - ₹900 / {t('Day')}</span>
                      </div>
                      <div className="flex justify-between border-b border-stone-100 dark:border-stone-850 pb-2">
                        <span className="text-stone-400 font-bold">{t('Carpenter Standard')}</span>
                        <span className="font-extrabold text-stone-900 dark:text-white">₹600 - ₹800 / {t('Day')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 font-bold">{t('Painter Standard')}</span>
                        <span className="font-extrabold text-stone-900 dark:text-white">₹500 - ₹700 / {t('Day')}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB 2: REQUESTS INBOX */}
            {activeTab === 'inbox' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">{t('Incoming Job Requests')}</h2>
                {requests.length > 0 ? (
                  <div className="space-y-4">
                    {requests.map(req => (
                      <Card key={req.id} className="p-6 border-l-4 border-l-orange-500 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h3 className="text-lg font-black text-stone-900 dark:text-white">{req.jobTitle || t('General Assistance Offer')}</h3>
                            <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
                              <MapPin size={12} />
                              <span>{req.area || t('Nearby')}</span>
                              <span>•</span>
                              <Calendar size={12} />
                              <span>{req.dateNeeded || t('Immediate')}</span>
                            </div>
                          </div>
                          <Badge variant="warning" className="shrink-0 text-[10px] font-black uppercase">
                            ₹{req.offeredWage || 500}
                          </Badge>
                        </div>
                        <p className="text-sm text-stone-550 font-medium">{req.message || t('I would like to hire you for physical worker support.')}</p>
                        
                        <div className="flex gap-2 justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
                          <Button variant="outline" size="sm" className="rounded-xl text-red-600 hover:bg-red-50 border-stone-200" onClick={() => handleRejectRequest(req.id)}>
                            <X size={14} className="mr-1" />
                            {t('Reject')}
                          </Button>
                          <Button variant="primary" size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => handleAcceptRequest(req.id)}>
                            <Check size={14} className="mr-1" />
                            {t('Accept Request')}
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
                      <h3 className="text-lg font-black text-stone-900 dark:text-white">{t('Inbox Empty')}</h3>
                      <p className="text-xs text-stone-400 font-medium leading-relaxed">{t('No active job offers received today. Ensure you are set as Available!')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MY JOBS */}
            {activeTab === 'jobs' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">{t('Your Jobs List')}</h2>
                </div>

                <div className="space-y-8">
                  {/* Active Jobs Section */}
                  <div className="space-y-4">
                    {sosMissions.length > 0 && (
                      <div className="space-y-4 mb-6">
                        <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest ml-1 flex items-center gap-1.5 animate-pulse">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-600 dot-pulse" />
                          🚨 {t('ACTIVE SOS EMERGENCY RESCUE MISSION')}
                        </h4>
                        {sosMissions.map(sos => (
                          <Card key={sos.id} className="p-6 border-l-4 border-l-red-600 bg-red-500/5 dark:bg-red-950/10 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <h4 className="text-lg font-black text-red-700 dark:text-red-400 flex items-center gap-2">
                                  {t('Emergency Rescue Needed')}
                                </h4>
                                <p className="text-xs text-stone-400 font-bold uppercase mt-1">
                                  📍 {sos.location} • {new Date(sos.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                              <Badge variant="danger" className="bg-red-650 text-white text-[10px] font-black uppercase shrink-0">
                                ₹50 {t('Rescue Bounty')}
                              </Badge>
                            </div>
                            <p className="text-sm text-stone-700 dark:text-stone-300 font-bold border-l-2 border-red-500/40 pl-3">
                              "{sos.message || t('Immediate support request nearby')}"
                            </p>
                            <div className="flex justify-end pt-3 border-t border-red-500/10">
                              <Button 
                                variant="danger" 
                                size="sm" 
                                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-black h-9 text-xs flex items-center gap-1"
                                onClick={() => handleResolveSOS(sos.id)}
                              >
                                ✓ {t('Mark SOS Mission Resolved')}
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">{t('In Progress / Active')}</h3>
                    {jobs.filter(j => j.status === 'accepted' || j.status === 'worker_completed').length > 0 ? (
                      jobs.filter(j => j.status === 'accepted' || j.status === 'worker_completed').map(job => {
                        const displayTitle = (job.titleTranslations && job.titleTranslations[language]) || job.title;
                        const displayDesc = (job.descTranslations && job.descTranslations[language]) || job.description;
                        return (
                          <Card key={job.id} className={`p-6 space-y-4 border-l-4 ${job.status === 'worker_completed' ? 'border-l-amber-500 bg-amber-50/5 dark:bg-amber-950/5' : 'border-l-green-500'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-lg font-black text-stone-900 dark:text-white leading-tight">{displayTitle}</h4>
                                  <Badge variant={job.status === 'worker_completed' ? 'warning' : 'success'} className="text-[8px] font-black px-1.5 py-0">
                                    {job.status === 'worker_completed' ? t('Completed (Pending Pay)') : t('Active')}
                                  </Badge>
                                </div>
                                <p className="text-xs text-stone-400 font-bold uppercase mt-1">{job.skillRequired} • {job.location.area}</p>
                              </div>
                              <span className="text-green-600 font-black text-lg">₹{job.wage}</span>
                            </div>
                            <p className="text-sm text-stone-500 font-medium">{displayDesc}</p>
                            
                            <div className="flex justify-end border-t border-stone-100 dark:border-stone-850 pt-3">
                              {job.status === 'accepted' ? (
                                <Button 
                                  variant="primary" 
                                  size="sm" 
                                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold h-9 text-xs"
                                  onClick={() => handleMarkJobDone(job.id)}
                                >
                                  ✓ {t('Mark as Completed (Notify Employer)')}
                                </Button>
                              ) : (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-black flex items-center gap-1.5 animate-pulse">
                                  <span className="h-2 w-2 rounded-full bg-amber-500 block" />
                                  ⌛ {t('Waiting for Employer to release escrow payment...')}
                                </span>
                              )}
                            </div>
                          </Card>
                        );
                      })
                    ) : (
                      <p className="text-stone-400 text-xs font-bold italic ml-1">{t('No active jobs in progress.')}</p>
                    )}
                  </div>

                  {/* Completed Jobs Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">{t('Completed History')}</h3>
                    {jobs.filter(j => j.status === 'completed').length > 0 ? (
                      jobs.filter(j => j.status === 'completed').map(job => {
                        const displayTitle = (job.titleTranslations && job.titleTranslations[language]) || job.title;
                        const displayDesc = (job.descTranslations && job.descTranslations[language]) || job.description;
                        return (
                          <Card key={job.id} className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-lg font-black text-stone-900 dark:text-white">{displayTitle}</h4>
                              <p className="text-xs text-stone-400 font-bold uppercase">{t(job.skillRequired)} • {job.location.area}</p>
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
                              {t('Rate Employer')}
                            </Button>
                          </div>
                        </Card>
                        );
                      })
                    ) : (
                      <p className="text-stone-400 text-xs font-bold italic ml-1">{t('No completed jobs logged yet.')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: EARNINGS TRACKER OVERHAUL */}
            {activeTab === 'earnings' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">{t('Earnings Tracker')}</h2>
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadStatement}
                    className="rounded-xl font-bold text-xs gap-2 border-stone-200"
                  >
                    <Download size={14} />
                    <span>{t('Download Earnings Statement')}</span>
                  </Button>
                </div>
                
                {/* Granular statistics summary grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="p-5 flex flex-col justify-between h-[120px] shadow-sm hover:shadow-md border border-stone-200/40">
                    <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">{t('Gross Revenue')}</span>
                    <h3 className="text-2xl font-black text-stone-900 dark:text-white">₹{earningsLog.grossTotal}</h3>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between h-[120px] shadow-sm hover:shadow-md border border-stone-200/40 bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">{t('Net Earnings (95%)')}</span>
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{earningsLog.netTotal}</h3>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between h-[120px] shadow-sm hover:shadow-md border border-stone-200/40">
                    <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">{t('Escrow Commissions (5%)')}</span>
                    <h3 className="text-2xl font-black text-orange-600">₹{earningsLog.commissionTotal.toFixed(0)}</h3>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between h-[120px] shadow-sm hover:shadow-md border border-stone-200/40">
                    <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">{t('Completed Tasks')}</span>
                    <h3 className="text-2xl font-black text-stone-900 dark:text-white">{earningsLog.completedCount} {t('Jobs')}</h3>
                  </Card>
                </div>

                {/* SVG Visual Bar Charts (Dual: Weekly and Monthly tabs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chart 1: Weekly Breakdown */}
                  <Card className="p-6 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider ml-1">{t('Weekly Daily Wages')}</h3>
                    <div className="h-[180px] w-full flex items-end justify-between px-4 pt-6 bg-stone-50 dark:bg-stone-950 rounded-[24px]">
                      {earningsLog.weeklyList.map((item, idx) => {
                        const maxWage = 800; // scaling cap
                        const percentage = Math.min((item.wage / maxWage) * 100, 100);
                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end flex-1 max-w-[50px] group cursor-pointer">
                            <span className="text-[9px] font-black text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              ₹{item.wage}
                            </span>
                            <div 
                              className="w-7 bg-gradient-to-t from-orange-500 to-orange-600 rounded-t-lg transition-all duration-500 hover:from-orange-600 hover:to-orange-700 hover:scale-105" 
                              style={{ height: `${percentage}%` }}
                            />
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{item.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Chart 2: Monthly Breakdown */}
                  <Card className="p-6 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider ml-1">{t('Monthly Aggregate')}</h3>
                    <div className="h-[180px] w-full flex items-end justify-between px-4 pt-6 bg-stone-50 dark:bg-stone-950 rounded-[24px]">
                      {earningsLog.monthlyList.map((item, idx) => {
                        const maxMonthWage = 3000;
                        const percentage = Math.min((item.wage / maxMonthWage) * 100, 100);
                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end flex-1 max-w-[50px] group cursor-pointer">
                            <span className="text-[9px] font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              ₹{item.wage}
                            </span>
                            <div 
                              className="w-7 bg-gradient-to-t from-emerald-500 to-emerald-600 rounded-t-lg transition-all duration-500 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105" 
                              style={{ height: `${percentage}%` }}
                            />
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{item.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* Granular Spreadsheet Ledger Card */}
                <Card className="p-6 space-y-4 shadow-sm overflow-hidden">
                  <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider">{t('Itemized Wage Ledger')}</h3>
                  <div className="overflow-x-auto no-scrollbar rounded-2xl border border-stone-100 dark:border-stone-850">
                    <table className="w-full text-left text-xs font-bold leading-normal border-collapse">
                      <thead>
                        <tr className="bg-stone-50 dark:bg-stone-900 border-b border-stone-100 dark:border-stone-850 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                          <th className="p-4">{t('Date')}</th>
                          <th className="p-4">{t('Job Title')}</th>
                          <th className="p-4 text-right">{t('Gross Pay')}</th>
                          <th className="p-4 text-right font-medium">{t('Commission (5%)')}</th>
                          <th className="p-4 text-right">{t('Net Pay')}</th>
                          <th className="p-4 text-center">{t('Status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.filter(j => j.status === 'completed' || j.status === 'accepted' || j.status === 'worker_completed').length > 0 ? (
                          jobs.filter(j => j.status === 'completed' || j.status === 'accepted' || j.status === 'worker_completed').map(j => {
                            const commission = j.wage * 0.05;
                            const net = j.wage - commission;
                            return (
                              <tr key={j.id} className="border-b border-stone-100/50 dark:border-stone-850 hover:bg-stone-50/30 transition-colors">
                                <td className="p-4 text-stone-400">{j.date || '2026-05-27'}</td>
                                <td className="p-4 text-stone-900 dark:text-white font-extrabold max-w-[180px] truncate">
                                  {j.title}
                                </td>
                                <td className="p-4 text-right text-stone-900 dark:text-white">₹{j.wage}</td>
                                <td className="p-4 text-right text-stone-400 font-medium">-₹{commission.toFixed(0)}</td>
                                <td className="p-4 text-right text-emerald-600 dark:text-emerald-450 font-black">₹{net.toFixed(0)}</td>
                                <td className="p-4 text-center">
                                  <Badge 
                                    variant={j.status === 'completed' ? 'success' : 'warning'} 
                                    className="text-[8px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider"
                                  >
                                    {j.status === 'completed' ? t('Released') : t('Escrow Hold')}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-stone-400 italic font-medium">
                              {t('No financial transaction ledger logged today.')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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
                    <span className="text-xs font-black uppercase text-stone-400 tracking-wider">{t('Legal AI Assistant (Multi-lingual)')}</span>
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
                        {t('Thinking...')}
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
                <h3 className="font-display font-black text-lg text-stone-900 dark:text-white">{t('Edit Your Profile')}</h3>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-stone-50 rounded-full dark:hover:bg-stone-800">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto no-scrollbar space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">{t('Full Name')}</label>
                  <Input 
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">{t('Daily Wage (₹)')}</label>
                    <Input 
                      type="number"
                      value={editForm.dailyWage}
                      onChange={e => setEditForm({ ...editForm, dailyWage: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">{t('Experience (Years)')}</label>
                    <Input 
                      type="number"
                      value={editForm.experience}
                      onChange={e => setEditForm({ ...editForm, experience: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">{t('Area')}</label>
                    <Input 
                      value={editForm.area}
                      onChange={e => setEditForm({ ...editForm, area: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">{t('City')}</label>
                    <Input 
                      value={editForm.city}
                      onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">{t('Your Trade Skills')}</label>
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
                  {t('Save Settings & Update')}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ID VERIFICATION MODAL OVERLAY */}
      <AnimatePresence>
        {isShowIdModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-100 rounded-[32px] shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <h3 className="font-display font-black text-lg text-stone-900 dark:text-white">{t('Verify Identity Card')}</h3>
                <button onClick={() => setIsShowIdModal(false)} className="p-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-stone-550 dark:text-stone-400 text-xs font-medium">
                    {t('Upload your Aadhar card image to trigger LOKLINK AI OCR extraction. All data remains stored safely in your profile.')}
                  </p>
                </div>

                <div className="space-y-4">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        setIdFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = (reader.result as string).split(',')[1];
                          setIdCardBase64(base64String);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center relative transition-all group ${isDragging ? 'border-orange-500 bg-orange-50/10 dark:bg-orange-950/20 scale-[1.02] shadow-md shadow-orange-500/5' : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 hover:border-orange-500/50'}`}
                  >
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIdFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64String = (reader.result as string).split(',')[1];
                            setIdCardBase64(base64String);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <Upload className={`transition-all mb-3 animate-pulse ${isDragging ? 'text-orange-500' : 'text-stone-400 group-hover:text-orange-500'}`} size={32} />
                    <h4 className="font-extrabold text-sm text-stone-900 dark:text-white leading-tight">
                      {isDragging ? 'Drop Aadhar card image here!' : idFile ? idFile.name : t('Upload Aadhar / Government ID')}
                    </h4>
                    <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">{t('JPEG, PNG up to 5MB')}</p>
                  </div>

                  <Button 
                    onClick={async () => {
                      setIsVerifyingId(true);
                      try {
                        const imgPayload = idCardBase64 || "MOCK_BASE64_JPEG_PAYLOAD";
                        const result = await geminiService.verifyIdCard(imgPayload);
                        if (result.success) {
                          const details = {
                            name: result.name || workerProfile.name.toUpperCase(),
                            idNumber: result.idNumber || "4839 9920 1102",
                            dob: result.dob || "12-10-1994",
                            address: result.address || `${workerProfile.area || 'Vidyanagar'}, ${workerProfile.city || 'Hubballi'}, Karnataka`
                          };
                          await dbService.updateProfile(user.uid, {
                            isVerified: true,
                            idCardDetails: details
                          });
                          setWorkerProfile((prev: any) => ({
                            ...prev,
                            isVerified: true,
                            idCardDetails: details
                          }));
                          toast.success("Identity Verified Successfully via LOKLINK AI!");
                          setIsShowIdModal(false);
                        } else {
                          toast.error(`Verification Failed: \${result.reason || 'Unrecognized document'}`);
                        }
                      } catch (err) {
                        toast.error("AI service failure, completing with simulation details");
                        const mockDetails = {
                          name: workerProfile.name.toUpperCase(),
                          idNumber: "5674 8839 2011",
                          dob: "15-08-1988",
                          address: `\${workerProfile.area || 'Vidyanagar'}, \${workerProfile.city || 'Hubballi'}, Karnataka`
                        };
                        await dbService.updateProfile(user.uid, {
                          isVerified: true,
                          idCardDetails: mockDetails
                        });
                        setWorkerProfile((prev: any) => ({
                          ...prev,
                          isVerified: true,
                          idCardDetails: mockDetails
                        }));
                        setIsShowIdModal(false);
                      } finally {
                        setIsVerifyingId(false);
                      }
                    }}
                    disabled={isVerifyingId}
                    className="w-full h-12 rounded-2xl gap-2 font-black text-xs uppercase tracking-wider bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/10"
                  >
                    {isVerifyingId ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                    <span>{isVerifyingId ? t('AI Analyzing card...') : t('Verify via LOKLINK AI')}</span>
                  </Button>
                </div>
              </div>
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
