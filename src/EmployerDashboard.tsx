/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Star, 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Briefcase, 
  IndianRupee, 
  LogOut, 
  X, 
  Send, 
  SlidersHorizontal, 
  Check, 
  Edit2, 
  ArrowRight, 
  User as UserIcon,
  Phone,
  BookOpen,
  Download,
  TrendingUp
} from 'lucide-react';
import { Button, Card, Input, Badge } from './components/ui';
import { useAuth } from './App';
import { useTranslation } from './lib/i18n';
import { dbService } from './services/dbService';
import { WORKER_CATEGORIES, Job, User, JobRequest, Review } from './types';
import { RatingModal } from './components/RatingModal';
import { WorkerCard } from './components/WorkerCard';
import { useModals } from './context/ModalContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';


export default function EmployerDashboard() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const { openAddListing } = useModals();
  
  // Tab states: 'overview' | 'find-workers' | 'post-job' | 'my-posts' | 'ratings' | 'ai-assistant' | 'analytics'
  const [activeTab, setActiveTab] = useState<'overview' | 'find-workers' | 'post-job' | 'my-posts' | 'ratings' | 'ai-assistant' | 'analytics'>('overview');
  
  const [employerProfile, setEmployerProfile] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviewsWritten, setReviewsWritten] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingFunds, setIsLoadingFunds] = useState(false);

  // Cache for worker profile lookups (workerId -> User)
  const [workerCache, setWorkerCache] = useState<Record<string, User>>({});

  const expensesLog = useMemo(() => {
    const completed = jobs.filter(j => j.status === 'completed');
    const active = jobs.filter(j => j.status === 'accepted' || j.status === 'worker_completed');
    const totalExpenditures = completed.reduce((sum, j) => sum + (j.wage || 0), 0);
    const grossTotal = totalExpenditures;
    const commissionTotal = grossTotal * 0.05;
    const netTotal = grossTotal + commissionTotal;

    const monWage = completed[0] ? completed[0].wage : 0;
    const tueWage = completed[1] ? completed[1].wage : 0;
    const wedWage = completed[2] ? completed[2].wage : 0;
    const thuWage = completed[3] ? completed[3].wage : 0;
    const friWage = completed[4] ? completed[4].wage : 0;

    // Weekly and Monthly expenditures
    const weeklyList = [
      { day: 'Mon', wage: monWage },
      { day: 'Tue', wage: tueWage },
      { day: 'Wed', wage: wedWage },
      { day: 'Thu', wage: thuWage },
      { day: 'Fri', wage: friWage }
    ];

    const monthlyList = [
      { month: 'Jan', wage: 0 },
      { month: 'Feb', wage: 0 },
      { month: 'Mar', wage: 0 },
      { month: 'Apr', wage: 0 },
      { month: 'May', wage: grossTotal }
    ];

    return {
      totalExpenditures,
      grossTotal,
      commissionTotal,
      netTotal,
      completedCount: completed.length,
      activeCount: active.length,
      weeklyList,
      monthlyList
    };
  }, [jobs]);

  const handleDownloadExpenseReport = () => {
    if (!employerProfile || jobs.length === 0) {
      toast.error("No historical transactions available to compile report.");
      return;
    }

    const completedJobs = jobs.filter(j => j.status === 'completed');
    const activeJobs = jobs.filter(j => j.status === 'accepted' || j.status === 'worker_completed');
    const openJobs = jobs.filter(j => j.status === 'open');

    const grossTotal = completedJobs.reduce((sum, j) => sum + (j.wage || 500), 0);
    const commissionTotal = grossTotal * 0.05;
    const netTotal = grossTotal + commissionTotal;

    let report = `===========================================================
                      LOKLINK EXPENDITURE STATEMENT
===========================================================
Generated: \${new Date().toLocaleString()}
Reference ID: INV-\${Math.floor(100000 + Math.random() * 900000)}

EMPLOYER METADATA
-----------------------------------------------------------
Name: \${employerProfile.name.toUpperCase()}
Company/Hiring Purpose: \${employerProfile.companyName || 'Residential Hirer'}
City: \${employerProfile.city}
Area Location: \${employerProfile.area}

FINANCIAL SUMMARY
-----------------------------------------------------------
Gross Expenditures:        ₹\${grossTotal}
Escrow Platform Fees (5%): ₹\${commissionTotal.toFixed(0)}
Total Net Cost:            ₹\${netTotal.toFixed(0)}
Completed Campaigns:       \${completedJobs.length}
Active Pending Escrows:    \${activeJobs.length}
Open Search Listings:      \${openJobs.length}
Wallet Balance Remaining:   ₹\${employerProfile.walletBalance || 0}

ITEMIZED EXPENDITURES LEDGER
-----------------------------------------------------------
Date         | Task Title               | Gross  | Fee (5%) | Total  | Hired Specialist
-----------------------------------------------------------
`;

    completedJobs.forEach(job => {
      const dateStr = job.date || new Date().toISOString().split('T')[0];
      const titlePad = (job.title || 'Task').substring(0, 24).padEnd(24);
      const gross = `₹\${job.wage}`.padEnd(6);
      const fee = `₹\${(job.wage * 0.05).toFixed(0)}`.padEnd(8);
      const net = `₹\${(job.wage * 1.05).toFixed(0)}`.padEnd(6);
      const workerName = (job.workerId && workerCache[job.workerId]?.name || 'N/A').substring(0, 16);
      report += `\${dateStr} | \${titlePad} | \${gross} | \${fee} | \${net} | \${workerName}\n`;
    });

    activeJobs.forEach(job => {
      const dateStr = job.date || new Date().toISOString().split('T')[0];
      const titlePad = (job.title || 'Task').substring(0, 24).padEnd(24);
      const gross = `₹\${job.wage}`.padEnd(6);
      const fee = `₹\${(job.wage * 0.05).toFixed(0)}`.padEnd(8);
      const net = `₹\${(job.wage * 1.05).toFixed(0)}`.padEnd(6);
      const workerName = (job.workerId && workerCache[job.workerId]?.name || 'N/A').substring(0, 16);
      report += `\${dateStr} | \${titlePad} | \${gross} | \${fee} | \${net} | \${workerName} (Pending)\n`;
    });

    report += `-----------------------------------------------------------
===========================================================
            LOKLINK PAYROLL SERVICES INDIA • 2026
===========================================================`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LOKLINK_Expenditures_\${employerProfile.name.replace(/\\s+/g, '_')}_\${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    toast.success("Expenditures statement download compiled successfully!");
  };

  // Worker detail modal drawer
  const [selectedWorker, setSelectedWorker] = useState<User | null>(null);
  const [hireJobId, setHireJobId] = useState<string>('direct');
  const [hireWage, setHireWage] = useState<number>(500);
  const [hireTitle, setHireTitle] = useState<string>('');
  const [hireMessage, setHireMessage] = useState<string>('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Ratings modal trigger
  const [ratingTarget, setRatingTarget] = useState<{ jobId: string; workerId: string } | null>(null);

  // Filter States for Finder Seeker
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [maxWageFilter, setMaxWageFilter] = useState<string>('');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  // AI Job Dispatcher / Chatbot State
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string; jobCard?: any }[]>([
    { role: 'ai', content: "Namaste Ji! I am LOKLINK's Generative AI Dispatcher, Sahay. Tell me what issue you are facing or what local trade specialist you need. E.g. 'burst kitchen pipe is flooding, need a plumber for ₹850 immediately' or 'lawn is overgrown, hire a painter' - I can automatically formulate and post a real job listing onto LOKLINK, secure funds, or list available local pros!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAddFunds = async (amount: number) => {
    if (!user) return;
    setIsLoadingFunds(true);
    try {
      const nextBal = await dbService.loadMockFunds(user.uid, amount);
      setEmployerProfile((prev: any) => prev ? { ...prev, walletBalance: nextBal } : null);
      toast.success(`Successfully loaded ₹${amount} into LOKLINK Pay Wallet!`);
    } catch (e) {
      toast.error('Failed to load funds');
    } finally {
      setIsLoadingFunds(false);
    }
  };

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
              text: `You are "Sahay", LOKLINK's Generative AI Job Coordinator and Dispatcher.
              Your job is to assist employers in finding, booking, and auto-posting jobs for daily wage workers and trade specialists (e.g. plumbers, electricians, maids, builders).
              
              Active Action Instructions:
              1. If the employer describes a problem, request, or job they want done (e.g. "my bathroom pipe is burst and flooding, hire a plumber for ₹850 immediately"), you must formulate and append a JSON block exactly as formatted below to post a real job:
                 \`\`\`json
                 {
                   "action": "post_job",
                   "title": "Emergency Plumber needed for burst kitchen pipe",
                   "skillRequired": "Plumber",
                   "wage": 850,
                   "duration": "1 Day",
                   "description": "Bathroom pipe is burst and flooding the floor. Needs urgent repair."
                 }
                 \`\`\`
                 Note: The skillRequired must be one of: 'Electrician', 'Plumber', 'Mason', 'Carpenter', 'Painter', 'Domestic Help', 'Cook', 'Caretaker', 'Driver', 'Loader', 'Mover', 'Tailor', 'Dhobi', 'Cobbler', 'Labourer', 'Pest Control', 'Repair'.
              2. Keep your text answer highly practical, brief, warm, and Hinglish friendly (e.g., "Arre Ji", "Bilkul", "Chinta mat kijiye").
              3. Encourage them that their escrow funds are fully secured in LOKLINK Escrow.
              
              Here is the conversation so far:
              ${updatedMessages.map(m => `${m.role === 'user' ? 'Employer' : 'Sahay'}: ${m.content}`).join('\n')}
              
              Give your next advice response:`
            }]
          }
        ]
      });

      const aiText = response.text || "Arre Ji, I couldn't connect to my AI core right now. Let's try again in a bit!";
      
      let cleanedText = aiText;
      let jobCardData = null;

      // Attempt parsing for auto-posting
      if (aiText.includes('```json') || aiText.includes('{')) {
        try {
          const jsonStart = aiText.indexOf('{');
          const jsonEnd = aiText.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const jsonStr = aiText.substring(jsonStart, jsonEnd);
            const parsed = JSON.parse(jsonStr);
            if (parsed.action === 'post_job') {
              const currentBalance = employerProfile?.walletBalance ?? 0;
              if (currentBalance < parsed.wage) {
                cleanedText = `I formulate the job post: *"${parsed.title}"* at **₹${parsed.wage}**, but your wallet balance is insufficient (current: ₹${currentBalance}). Please load funds of at least ₹${parsed.wage} inside Settings / LOKLINK Pay Wallet to proceed!`;
              } else {
                // Post Job in DB
                const posted = await dbService.postJob({
                  employerId: user.uid,
                  title: parsed.title,
                  skillRequired: parsed.skillRequired,
                  wage: parsed.wage,
                  duration: parsed.duration || '1 Day',
                  date: new Date().toISOString().split('T')[0],
                  description: parsed.description,
                  location: {
                    area: employerProfile.area || 'Koramangala',
                    city: employerProfile.city || 'Bengaluru',
                    lat: 12.9352,
                    lng: 77.6245
                  }
                });

                // Deduct balance locally
                const nextBal = currentBalance - parsed.wage;
                setEmployerProfile((prev: any) => ({ ...prev, walletBalance: nextBal }));
                
                toast.success(`AI Auto-Posted: "${parsed.title}" for ₹${parsed.wage}!`);
                
                // Clean text
                cleanedText = aiText.substring(0, aiText.indexOf('```json')).trim();
                if (!cleanedText) {
                  cleanedText = `Ji Bilkul! LOKLINK AI has automatically created the Job Post for you: *"${parsed.title}"* for **₹${parsed.wage}**. The escrow has been secured, and it is now active!`;
                }
                jobCardData = posted;
              }
            }
          }
        } catch (jsonErr) {
          console.warn("Employer AI JSON parsing failed:", jsonErr);
        }
      }

      setChatMessages(prev => [...prev, { role: 'ai', content: cleanedText, jobCard: jobCardData }]);
    } catch (err) {
      console.error("Employer Chatbot Gemini API error:", err);
      setChatMessages(prev => [...prev, { role: 'ai', content: "Arre Ji, something went wrong with the connection. Let's try again in a bit!" }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Post Job Form State
  const [postForm, setPostForm] = useState({
    title: '',
    skillRequired: 'Labourer',
    wage: 500,
    area: '',
    duration: '1 Day',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      // Subscribe to posted jobs in real-time
      const unsubJobs = dbService.subscribeToEmployerJobs(user.uid, (data) => {
        setJobs(data);
        // Pre-fetch details of hired workers for easy rendering
        data.forEach(job => {
          if (job.workerId && !workerCache[job.workerId]) {
            fetchWorkerDetails(job.workerId);
          }
        });
      });

      const handleUpdate = () => {
        loadDashboardData();
      };
      window.addEventListener('loklink-db-updated', handleUpdate);

      return () => {
        unsubJobs();
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
        setEmployerProfile(profile);
        setPostForm(prev => ({
          ...prev,
          area: profile.area || ''
        }));
      }

      // Fetch workers
      const allWorkers = await dbService.getWorkers();
      setWorkers(allWorkers);
      
      // Store worker mock profiles into cache
      const initialCache: Record<string, User> = {};
      allWorkers.forEach(w => {
        initialCache[w.id] = w;
      });
      setWorkerCache(prev => ({ ...prev, ...initialCache }));

      // Fetch reviews written
      const reviews = await dbService.getReviewsWrittenBy(user.uid);
      setReviewsWritten(reviews);
    } catch (e) {
      toast.error('Failed to retrieve dashboard records');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkerDetails = async (workerId: string) => {
    if (workerCache[workerId]) return;
    try {
      const profile = await dbService.getUserProfile(workerId);
      if (profile) {
        setWorkerCache(prev => ({ ...prev, [workerId]: profile }));
      }
    } catch (e) {
      console.warn('Failed to fetch worker info for ID:', workerId);
    }
  };

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      // Search query (name)
      if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Category skill trade
      if (selectedCategory !== 'All' && !w.skills?.includes(selectedCategory)) {
        return false;
      }
      // Availability toggle
      if (onlyAvailable && !w.isAvailable) {
        return false;
      }
      // Max daily wage limit
      if (maxWageFilter && (w.dailyWage || 500) > parseInt(maxWageFilter)) {
        return false;
      }
      // Minimum rating overall
      if (minRatingFilter > 0 && (w.rating || 0) < minRatingFilter) {
        return false;
      }
      return true;
    });
  }, [workers, searchQuery, selectedCategory, onlyAvailable, maxWageFilter, minRatingFilter]);

  // Open Jobs list for selection dropdown
  const openJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'open');
  }, [jobs]);

  // Quick hire request click handler
  const handleOpenQuickHire = (worker: User) => {
    setSelectedWorker(worker);
    setHireWage(worker.dailyWage || 500);
    setHireTitle(`Hire ${worker.skills?.[0] || 'Worker'}`);
    setHireMessage(`Hi ${worker.name.split(' ')[0]}, I would like to hire you for physical worker support at ₹${worker.dailyWage || 500}/Day. Please accept the request if available.`);
    
    // Auto-select first open job if available
    const firstOpen = jobs.find(j => j.status === 'open' && j.skillRequired === worker.skills?.[0]);
    if (firstOpen) {
      setHireJobId(firstOpen.id);
      setHireWage(firstOpen.wage);
      setHireTitle(firstOpen.title);
    } else {
      setHireJobId('direct');
    }
  };

  // Submit job post form
  const handlePostJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !employerProfile) return;
    if (!postForm.title.trim()) {
      toast.error('Job Title is required');
      return;
    }

    const currentBalance = employerProfile.walletBalance ?? 0;
    if (currentBalance < postForm.wage) {
      toast.error('Insufficient Wallet Balance!', {
        description: `Your balance is ₹${currentBalance}, but this post requires ₹${postForm.wage}. Please load funds inside LOKLINK Pay Wallet first.`
      });
      return;
    }

    setIsPosting(true);
    try {
      await dbService.postJob({
        employerId: user.uid,
        title: postForm.title,
        skillRequired: postForm.skillRequired,
        wage: postForm.wage,
        duration: postForm.duration,
        date: postForm.date,
        description: postForm.description,
        location: {
          area: postForm.area || employerProfile.area || 'Koramangala',
          city: employerProfile.city || 'Bengaluru',
          lat: 12.9352,
          lng: 77.6245
        }
      });

      toast.success('New job posted successfully! Funds held safely in Escrow.');
      // Deduct balance locally
      setEmployerProfile((prev: any) => ({ ...prev, walletBalance: currentBalance - postForm.wage }));
      
      // Reset form
      setPostForm({
        title: '',
        skillRequired: 'Labourer',
        wage: 500,
        area: employerProfile.area || '',
        duration: '1 Day',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
      setActiveTab('my-posts');
    } catch (err) {
      toast.error('Failed to publish job post');
    } finally {
      setIsPosting(false);
    }
  };

  // Submit Hiring invitation request
  const handleSendHiringRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedWorker || isSendingRequest) return;

    const currentBalance = employerProfile.walletBalance ?? 0;
    const requiredWage = hireJobId === 'direct' ? hireWage : (openJobs.find(j => j.id === hireJobId)?.wage || 500);
    
    if (hireJobId === 'direct' && currentBalance < requiredWage) {
      toast.error('Insufficient Wallet Balance!', {
        description: `Your balance is ₹${currentBalance}, but this hire requires ₹${requiredWage}. Please load funds inside LOKLINK Pay Wallet first.`
      });
      return;
    }

    setIsSendingRequest(true);
    try {
      let finalJobId = hireJobId;
      let finalTitle = hireTitle;
      let finalWage = hireWage;

      if (hireJobId === 'direct') {
        // Create a direct open job behind the scenes
        const tempJob = await dbService.postJob({
          employerId: user.uid,
          title: hireTitle || `Direct Hire offer`,
          skillRequired: selectedWorker.skills?.[0] || 'Labourer',
          wage: hireWage,
          duration: '1 Day',
          date: new Date().toISOString().split('T')[0],
          description: hireMessage || 'Direct quick-hire offer.',
          location: {
            area: employerProfile?.area || 'Koramangala',
            city: employerProfile?.city || 'Bengaluru',
            lat: 12.9352,
            lng: 77.6245
          }
        });
        finalJobId = tempJob.id;
        finalTitle = tempJob.title;
        finalWage = tempJob.wage;
      }

      await dbService.sendJobRequest({
        jobId: finalJobId,
        employerId: user.uid,
        workerId: selectedWorker.id,
        message: hireMessage || 'I would like to hire you for physical trade support.',
        jobTitle: finalTitle,
        offeredWage: finalWage,
        dateNeeded: new Date().toISOString().split('T')[0],
        area: employerProfile?.area || 'Koramangala'
      });

      toast.success(`Hiring request sent to ${selectedWorker.name}!`);
      if (hireJobId === 'direct') {
        // Deduct direct wage locally
        setEmployerProfile((prev: any) => ({ ...prev, walletBalance: currentBalance - requiredWage }));
      }
      setSelectedWorker(null);
    } catch (err) {
      toast.error('Failed to transmit invitation request');
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Cancel/Delete open posted job
  const handleCancelJob = async (jobId: string) => {
    try {
      await dbService.updateJobStatus(jobId, 'cancelled');
      toast.success('Job post cancelled');
    } catch (err) {
      toast.error('Failed to cancel job');
    }
  };

  // Complete active accepted job & trigger rating
  const handleCompleteJob = async (jobId: string, workerId: string) => {
    try {
      await dbService.updateJobStatus(jobId, 'completed');
      toast.success('Job marked as Completed!');
      
      // Launch rating modal targeting the hired worker
      setRatingTarget({ jobId, workerId });
    } catch (err) {
      toast.error('Failed to finalize job status');
    }
  };

  if (isLoading || !employerProfile) {
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
          <h1 className="text-3xl font-black tracking-tight font-display text-white">{t('LOKLINK')}</h1>
          <p className="text-xs text-orange-200/90 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={12} className="text-orange-300" />
            <span>{t('Employer Control')} • {employerProfile.name} • {employerProfile.companyName || t('Residential')}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto justify-between sm:justify-end border-t border-white/10 sm:border-0 pt-4 sm:pt-0">
          <Button variant="outline" size="icon" className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 h-10 w-10 ml-auto" onClick={signOut}>
            <LogOut size={16} />
          </Button>
        </div>
      </header>

      {/* Nav Tab bar segments */}
      <nav className="flex overflow-x-auto bg-stone-100/50 dark:bg-stone-900/30 p-2 mx-6 mt-6 rounded-2xl no-scrollbar gap-1 border border-stone-200/40 dark:border-stone-800/30">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'find-workers', label: 'Find Workers' },
          { id: 'post-job', label: 'Post a Job' },
          { id: 'my-posts', label: 'My Posts', count: jobs.length },
          { id: 'ratings', label: 'Ratings Given' },
          { id: 'ai-assistant', label: 'AI Dispatcher' },
          { id: 'analytics', label: 'Expense Analytics' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'post-job') {
                openAddListing();
              } else {
                setActiveTab(tab.id as any);
              }
            }}
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
      <main className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-6">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Highlight Stats Column */}
                <div className="md:col-span-1 space-y-6">
                  <Card className="p-6 text-center space-y-4 shadow-sm hover:shadow-md animate-slide-up stagger-1">
                    <div className="h-20 w-20 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto text-orange-600 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30">
                      <Briefcase size={36} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-stone-900 dark:text-white leading-tight">{t("Active Campaigns")}</h3>
                      <p className="text-4xl font-black text-orange-600 dark:text-orange-400 mt-2">{openJobs.length}</p>
                      <p className="text-xs text-stone-400 font-bold uppercase mt-1">{t("Open job listings")}</p>
                    </div>
                    <Button 
                      className="w-full rounded-2xl h-12 font-bold"
                      onClick={openAddListing}
                    >
                      <Plus size={16} className="mr-1" />
                      {t("Post New Offer")}
                    </Button>
                  </Card>

                  <Card className="p-6 space-y-3 shadow-sm hover:shadow-md animate-slide-up stagger-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-400">
                      <span>{t("Employer Rating")}</span>
                      <span className="text-orange-600 dark:text-orange-400 font-extrabold">{employerProfile.employerRating && employerProfile.employerRating > 0 ? `${employerProfile.employerRating} / 5` : t('New')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={18} 
                          className={star <= (employerProfile.employerRating || 0) ? 'text-orange-550 fill-orange-555' : 'text-stone-200 dark:text-stone-850'} 
                        />
                      ))}
                      <span className="text-xs text-stone-400 font-bold ml-2">({employerProfile.employerReviewsCount || 0} {t("reviews")})</span>
                    </div>
                  </Card>

                  {/* LOKLINK Pay Wallet Balance loader card */}
                  <Card className="p-6 space-y-4 shadow-sm hover:shadow-md animate-slide-up stagger-3 border border-stone-200/40 bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-400">
                      <span>{t("LOKLINK Pay Wallet")}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{employerProfile.walletBalance ?? 0}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleAddFunds(500)}
                        className="flex-1 h-9 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={isLoadingFunds}
                      >
                        + ₹500
                      </Button>
                      <Button 
                        onClick={() => handleAddFunds(1000)}
                        className="flex-1 h-9 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={isLoadingFunds}
                      >
                        + ₹1000
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Quick actions & welcome panel */}
                <div className="md:col-span-2 space-y-6">
                  <Card className="p-8 space-y-6 bg-gradient-to-br from-orange-50/50 via-orange-100/5 to-transparent dark:from-orange-950/20 dark:via-stone-900/10 dark:to-stone-900 border border-orange-100/30 dark:border-stone-800 shadow-sm hover:shadow-md animate-slide-up stagger-3">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-display font-black text-stone-950 leading-tight dark:text-white">
                        {t('Find physical trade workers in minutes!')}
                      </h2>
                      <p className="text-sm text-stone-550 dark:text-stone-400 font-medium leading-relaxed">
                        {t('LOKLINK bridges the gap between individuals seeking local support and skilled physical labor workers (electricians, masons, carpenters, housekeeping) who earn on daily wage standards. Ensure you specify fair salaries and follow environmental safety guidelines.')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        variant="primary" 
                        className="rounded-2xl px-6 h-12 text-xs font-black uppercase tracking-widest gap-2"
                        onClick={() => setActiveTab('find-workers')}
                      >
                        <span>{t('Find Workers Seek board')}</span>
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </Card>

                  {/* Summary of Open Jobs */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider">{t('Your Open Hiring Listings')}</h3>
                    {openJobs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {openJobs.slice(0, 2).map(job => (
                          <Card key={job.id} className="p-6 space-y-3 hover:border-orange-200 transition-colors">
                            <div className="flex justify-between items-start">
                              <Badge variant="warning" className="text-[9px] font-black uppercase px-2 py-0.5">{job.skillRequired}</Badge>
                              <span className="text-orange-600 font-black text-sm">₹{job.wage}/{t('Day')}</span>
                            </div>
                            <h4 className="font-display font-black text-stone-900 dark:text-white truncate">{job.title}</h4>
                            <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold">
                              <MapPin size={10} />
                              <span className="truncate">{job.location.area}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-6 text-center py-10 text-stone-400 italic text-xs">
                        {t('No active jobs published. Click "Post a Job" to get started.')}
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FIND WORKERS BOARD */}
            {activeTab === 'find-workers' && (
              <div className="space-y-6">
                
                {/* Search & Filter Header bar */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Input 
                      placeholder="Search workers by name..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-12 h-14 rounded-2xl border-stone-200"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowFilters(!showFilters)}
                      className={`h-14 rounded-2xl gap-2 border-stone-200 font-bold px-5 ${
                        showFilters ? 'bg-orange-50 text-orange-600 border-orange-200' : ''
                      }`}
                    >
                      <SlidersHorizontal size={16} />
                      <span>Filters</span>
                    </Button>

                    {/* Quick Category filter button dropdown style */}
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="h-14 border border-stone-200 bg-stone-50 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      <option value="All">All Categories</option>
                      {WORKER_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Expandable Filter Panel */}
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

                {/* Workers Seek Grid */}
                {filteredWorkers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredWorkers.map(worker => (
                      <WorkerCard 
                        key={worker.id}
                        worker={worker}
                        onSendRequest={() => handleOpenQuickHire(worker)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-4 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-inner">
                    <div className="h-20 w-20 bg-stone-50 dark:bg-stone-800 rounded-3xl flex items-center justify-center mx-auto text-stone-300">
                      <UserIcon size={32} />
                    </div>
                    <div className="space-y-1 max-w-xs mx-auto">
                      <h3 className="text-lg font-black text-stone-900 dark:text-white">No Workers Found</h3>
                      <p className="text-xs text-stone-400 font-medium leading-relaxed">Try widening your search filters or choosing a different specialty trade.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: POST A JOB FORM */}
            {activeTab === 'post-job' && (
              <Card className="p-8 max-w-2xl mx-auto space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Create a Hiring Post</h2>
                  <p className="text-xs text-stone-400 font-bold uppercase">Reach available physical trade specialists near you.</p>
                </div>

                <form onSubmit={handlePostJobSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Job / Work Title</label>
                    <Input 
                      placeholder="e.g. Living room wall repair & cement plastering"
                      value={postForm.title}
                      onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">Specialty Skill Required</label>
                      <select
                        value={postForm.skillRequired}
                        onChange={e => setPostForm({ ...postForm, skillRequired: e.target.value })}
                        className="h-12 border border-stone-200 bg-stone-50 px-4 w-full rounded-md font-bold text-xs uppercase tracking-wider text-stone-600 focus-visible:outline-none"
                      >
                        {WORKER_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Daily Wage Offered (₹)</label>
                      <div className="relative">
                        <Input 
                          type="number"
                          value={postForm.wage}
                          onChange={e => setPostForm({ ...postForm, wage: parseInt(e.target.value) || 0 })}
                          className="pl-10"
                          required
                        />
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Area / Location</label>
                      <Input 
                        placeholder="e.g. Koramangala block 4"
                        value={postForm.area}
                        onChange={e => setPostForm({ ...postForm, area: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Duration</label>
                      <select
                        value={postForm.duration}
                        onChange={e => setPostForm({ ...postForm, duration: e.target.value })}
                        className="h-12 border border-stone-200 bg-stone-50 px-3 w-full rounded-md font-bold text-xs uppercase tracking-wider text-stone-600 focus-visible:outline-none"
                      >
                        <option value="1 Day">1 Day</option>
                        <option value="Half Day">Half Day</option>
                        <option value="3 Days">3 Days</option>
                        <option value="1 Week">1 Week</option>
                        <option value="2 Weeks">2 Weeks</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Description of Work</label>
                    <textarea 
                      placeholder="Describe the physical work requirements, weight lifting, specific tool skills needed, safety equipment provided..."
                      value={postForm.description}
                      onChange={e => setPostForm({ ...postForm, description: e.target.value })}
                      className="flex min-h-[100px] w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 font-medium"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isPosting}
                    className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl gap-2 font-bold"
                  >
                    <span>Publish Work Listing</span>
                    <Plus size={16} />
                  </Button>
                </form>
              </Card>
            )}

            {/* TAB 4: MY POSTS */}
            {activeTab === 'my-posts' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Your Posted Campaigns</h2>

                <div className="space-y-4">
                  {jobs.length > 0 ? (
                    jobs.map(job => {
                      const worker = job.workerId ? workerCache[job.workerId] : null;
                      return (
                        <Card key={job.id} className="p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-black text-stone-900 dark:text-white">{job.title}</h3>
                                  <Badge 
                                    variant={
                                      job.status === 'open' ? 'warning' :
                                      job.status === 'worker_completed' ? 'warning' :
                                      job.status === 'accepted' ? 'success' :
                                      job.status === 'completed' ? 'default' : 'danger'
                                    } 
                                    className="text-[9px] font-black px-2 py-0.5 uppercase"
                                  >
                                    {job.status === 'worker_completed' ? 'Completed (Pending Pay)' : job.status}
                                  </Badge>
                              </div>
                              <p className="text-xs text-stone-400 font-bold uppercase">{job.skillRequired} • {job.location.area}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black text-orange-600">₹{job.wage}</span>
                              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{job.duration}</p>
                            </div>
                          </div>

                          <p className="text-sm text-stone-500 font-medium">{job.description}</p>

                          {/* Dynamic actions based on hire state */}
                          {job.status === 'open' && (
                            <div className="flex justify-end gap-2 border-t border-stone-100 dark:border-stone-800 pt-3">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-xl border-stone-200 text-stone-500 hover:bg-stone-50"
                                onClick={() => handleCancelJob(job.id)}
                              >
                                Cancel Post
                              </Button>
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                                onClick={() => {
                                  setSelectedCategory(job.skillRequired);
                                  setActiveTab('find-workers');
                                }}
                              >
                                Find Workers Seek
                              </Button>
                            </div>
                          )}

                          {(job.status === 'accepted' || job.status === 'worker_completed') && (
                            <div className="flex flex-col border-t border-stone-100 dark:border-stone-800 pt-4 gap-4">
                              {job.status === 'worker_completed' && (
                                <div className="p-3 bg-green-50/50 dark:bg-green-950/20 border border-green-150 rounded-2xl flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse block" />
                                  <span className="text-xs font-bold text-green-700 dark:text-green-400">
                                    ✓ Specialist marked work task as COMPLETED. Confirm and release pay escrow.
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                {worker ? (
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-stone-50 border border-stone-100 overflow-hidden relative">
                                      <img src={worker.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                      <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Hired Specialist</p>
                                      <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">{worker.name} • {worker.phone}</h4>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-stone-400 font-bold italic">Assigning worker details...</p>
                                )}

                                <div className="flex gap-2 self-stretch sm:self-auto justify-end items-center">
                                  {worker && (
                                    <a 
                                      href={`tel:${worker.phone}`}
                                      className="h-10 w-10 flex items-center justify-center bg-white dark:bg-stone-800 border border-stone-200 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                    >
                                      <Phone size={14} />
                                    </a>
                                  )}
                                  <Button 
                                    variant="primary" 
                                    size="sm" 
                                    className={`rounded-xl font-bold gap-1.5 h-10 ${job.status === 'worker_completed' ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-bounce' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                    onClick={() => handleCompleteJob(job.id, job.workerId!)}
                                  >
                                    <Check size={14} />
                                    <span>{job.status === 'worker_completed' ? '💸 Confirm Payout & Release Escrow' : 'Complete Job & Pay'}</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {job.status === 'completed' && worker && (
                            <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-4 gap-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-stone-50 overflow-hidden">
                                  <img src={worker.avatarUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs font-bold text-stone-500">
                                  Worker {worker.name} successfully resolved this work task.
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 font-bold h-9 text-xs"
                                onClick={() => setRatingTarget({ jobId: job.id, workerId: job.workerId! })}
                              >
                                Rate Worker
                              </Button>
                            </div>
                          )}
                        </Card>
                      );
                    })
                  ) : (
                    <div className="py-20 text-center space-y-4 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-inner">
                      <div className="h-20 w-20 bg-stone-50 dark:bg-stone-800 rounded-3xl flex items-center justify-center mx-auto text-stone-300">
                        <Briefcase size={32} />
                      </div>
                      <div className="space-y-1 max-w-xs mx-auto">
                        <h3 className="text-lg font-black text-stone-900 dark:text-white">No Listings Published</h3>
                        <p className="text-xs text-stone-400 font-medium leading-relaxed">You have not published any job posts. Tap "Post a Job" tab above.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: RATINGS SUBMITTED HISTORY */}
            {activeTab === 'ratings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Your Feedback Audit Trail</h2>
                <p className="text-xs text-stone-400 font-bold uppercase">Chronological list of ratings you submitted to workers.</p>

                <div className="space-y-4">
                  {reviewsWritten.length > 0 ? (
                    reviewsWritten.map(review => (
                      <Card key={review.id} className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-stone-50 overflow-hidden shrink-0 border border-stone-100 relative">
                              <img 
                                src={review.reviewerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${review.revieweeId}`} 
                                alt="" 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-stone-900 dark:text-white leading-tight">Worker rated</h4>
                              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1 rounded-xl flex items-center gap-1 text-orange-600 font-black text-xs">
                            <Star size={12} fill="currentColor" />
                            <span>{review.overall} Stars</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t border-stone-50 dark:border-stone-800 pt-3 text-center text-xs">
                          <div>
                            <span className="text-[9px] font-black uppercase text-stone-300 block">Punctuality</span>
                            <span className="font-extrabold text-stone-700 dark:text-stone-300">
                              {(review.ratings as any).punctuality || 5} / 5
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-stone-300 block">Quality</span>
                            <span className="font-extrabold text-stone-700 dark:text-stone-300">
                              {(review.ratings as any).quality || 5} / 5
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-stone-300 block">Reliability</span>
                            <span className="font-extrabold text-stone-700 dark:text-stone-300">
                              {(review.ratings as any).reliability || 5} / 5
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="py-20 text-center space-y-4 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-inner">
                      <div className="h-20 w-20 bg-stone-50 dark:bg-stone-800 rounded-3xl flex items-center justify-center mx-auto text-stone-300">
                        <BookOpen size={32} />
                      </div>
                      <div className="space-y-1 max-w-xs mx-auto">
                        <h3 className="text-lg font-black text-stone-900 dark:text-white">Audit Trail Clear</h3>
                        <p className="text-xs text-stone-400 font-medium leading-relaxed">No submitted reviews logged in your historical records.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: AI ASSISTANT */}
            {activeTab === 'ai-assistant' && (
              <div className="space-y-6">
                
                {/* Quick Prompts FAQs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { q: "bathroom pipe is burst and flooding, hire a plumber for ₹850 immediately in Koramangala", label: "Emergency Repair Plumber" },
                    { q: "short circuit in main board, need an electrician for ₹700", label: "Electrical Fix wiring" },
                    { q: "lawn is overgrown, list a general gardener helper for ₹500 today", label: "Garden helper" }
                  ].map((s, idx) => (
                    <Card key={idx} className="p-5 flex flex-col justify-between hover:border-orange-200 transition-colors cursor-pointer" onClick={() => setChatInput(s.q)}>
                      <h4 className="font-display font-black text-stone-900 dark:text-white leading-snug">{s.label}</h4>
                      <p className="text-xs text-stone-400 mt-2 leading-relaxed italic">"{s.q}"</p>
                    </Card>
                  ))}
                </div>

                {/* AI Assistant Chat Widget */}
                <Card className="p-6 space-y-4 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-[32px] shadow-sm">
                  <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                    <Sparkles className="text-orange-500 animate-pulse" size={18} />
                    <span className="text-xs font-black uppercase text-stone-400 tracking-wider">LOKLINK AI Dispatcher (Sahay)</span>
                  </div>

                  <div className="h-[320px] overflow-y-auto space-y-3 p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl no-scrollbar flex flex-col">
                    {chatMessages.map((m, i) => (
                      <div key={i} className="space-y-2 flex flex-col">
                        <div 
                          className={`p-3.5 max-w-[85%] rounded-[20px] text-xs leading-relaxed ${
                            m.role === 'ai' 
                              ? 'bg-white border border-stone-100 text-stone-700 self-start dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300' 
                              : 'bg-orange-600 text-white self-end'
                          }`}
                        >
                          {m.content}
                        </div>
                        {m.jobCard && (
                          <div className="self-start max-w-[85%] w-72 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-stone-850 dark:to-stone-900 border border-orange-200/40 p-4 rounded-2xl shadow-sm space-y-3">
                            <Badge variant="warning" className="text-[8px] font-black">{m.jobCard.skillRequired}</Badge>
                            <h4 className="font-display font-black text-sm text-stone-900 dark:text-white leading-snug">{m.jobCard.title}</h4>
                            <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-orange-200/20">
                              <span className="text-stone-400 font-mono text-[9px] uppercase">Job Post Created</span>
                              <span className="text-orange-600">₹{m.jobCard.wage} / Day</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {isAiLoading && (
                      <div className="p-3 bg-white border border-stone-100 text-stone-400 rounded-2xl text-xs self-start animate-pulse dark:bg-stone-900 dark:border-stone-800">
                        Sahay is thinking and formulating...
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendChatMessage} className="flex gap-2">
                    <Input 
                      placeholder="Explain what has happened or who you need..." 
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

            {/* TAB 7: EXPENSE ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-scale-in">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Hiring Expense Analytics</h2>
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadExpenseReport}
                    className="rounded-xl font-bold text-xs gap-2 border-stone-200"
                  >
                    <Download size={14} />
                    <span>Download Expenditures Statement</span>
                  </Button>
                </div>

                {/* Statistics Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="p-5 flex flex-col justify-between h-[120px] shadow-sm hover:shadow-md border border-stone-200/40">
                    <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">Gross Expenditures</span>
                    <h3 className="text-2xl font-black text-stone-900 dark:text-white font-mono">₹{expensesLog.grossTotal}</h3>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between h-[120px] shadow-sm hover:shadow-md border border-stone-200/40 bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">Total Net Cost (Inc Fee)</span>
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-450 font-mono">₹{expensesLog.netTotal.toFixed(0)}</h3>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between h-[120px] shadow-sm hover:shadow-md border border-stone-200/40">
                    <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">LOKLINK Escrow Fee (5%)</span>
                    <h3 className="text-2xl font-black text-orange-600 font-mono">₹{expensesLog.commissionTotal.toFixed(0)}</h3>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between h-[120px] shadow-sm hover:shadow-md border border-stone-200/40">
                    <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">Hired Campaigns</span>
                    <h3 className="text-2xl font-black text-stone-900 dark:text-white font-mono">{expensesLog.completedCount} Resolved</h3>
                  </Card>
                </div>

                {/* SVG Visual Graphs for Expenditures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chart 1: Weekly Breakdown */}
                  <Card className="p-6 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider ml-1">Weekly Expenditures</h3>
                    <div className="h-[180px] w-full flex items-end justify-between px-4 pt-6 bg-stone-50 dark:bg-stone-950 rounded-[24px]">
                      {expensesLog.weeklyList.map((item, idx) => {
                        const maxWage = 800; // scaling cap
                        const percentage = Math.min((item.wage / maxWage) * 100, 100);
                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end flex-1 max-w-[50px] group cursor-pointer">
                            <span className="text-[9px] font-black text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
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
                    <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider ml-1">Monthly Expenditures Summary</h3>
                    <div className="h-[180px] w-full flex items-end justify-between px-4 pt-6 bg-stone-50 dark:bg-stone-950 rounded-[24px]">
                      {expensesLog.monthlyList.map((item, idx) => {
                        const maxMonthWage = 3000;
                        const percentage = Math.min((item.wage / maxMonthWage) * 100, 100);
                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end flex-1 max-w-[50px] group cursor-pointer">
                            <span className="text-[9px] font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
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

                {/* Expenditures spreadsheet Ledger */}
                <Card className="p-6 space-y-4 shadow-sm overflow-hidden">
                  <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider">Itemized Expenditures Ledger</h3>
                  <div className="overflow-x-auto no-scrollbar rounded-2xl border border-stone-100 dark:border-stone-850">
                    <table className="w-full text-left text-xs font-bold leading-normal border-collapse">
                      <thead>
                        <tr className="bg-stone-50 dark:bg-stone-900 border-b border-stone-100 dark:border-stone-850 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                          <th className="p-4">Date</th>
                          <th className="p-4">Work Title</th>
                          <th className="p-4 text-right">Gross Cost</th>
                          <th className="p-4 text-right font-medium">Escrow Fee (5%)</th>
                          <th className="p-4 text-right">Total Net Cost</th>
                          <th className="p-4 text-center">Hired Specialist</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.filter(j => j.status === 'completed' || j.status === 'accepted' || j.status === 'worker_completed').length > 0 ? (
                          jobs.filter(j => j.status === 'completed' || j.status === 'accepted' || j.status === 'worker_completed').map(j => {
                            const commission = j.wage * 0.05;
                            const total = j.wage + commission;
                            const worker = j.workerId ? workerCache[j.workerId] : null;
                            return (
                              <tr key={j.id} className="border-b border-stone-100/50 dark:border-stone-850 hover:bg-stone-50/30 transition-colors">
                                <td className="p-4 text-stone-400">{j.date || '2026-05-27'}</td>
                                <td className="p-4 text-stone-900 dark:text-white font-extrabold max-w-[180px] truncate">
                                  {j.title}
                                </td>
                                <td className="p-4 text-right text-stone-900 dark:text-white">₹{j.wage}</td>
                                <td className="p-4 text-right text-stone-450 font-medium">+₹{commission.toFixed(0)}</td>
                                <td className="p-4 text-right text-emerald-600 dark:text-emerald-450 font-black">₹{total.toFixed(0)}</td>
                                <td className="p-4 text-center">
                                  {worker ? (
                                    <span className="text-xs text-stone-750 dark:text-stone-300 font-extrabold">{worker.name}</span>
                                  ) : (
                                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider font-sans">Awaiting Accept</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-stone-400 italic font-medium">
                              No expenditures transaction ledger logged today.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* QUICK HIRE PREVIEW DRAWER / MODAL */}
      <AnimatePresence>
        {selectedWorker && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-100 rounded-[32px] shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <h3 className="font-display font-black text-lg text-stone-900 dark:text-white">Hire Professional</h3>
                <button onClick={() => setSelectedWorker(null)} className="p-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto no-scrollbar space-y-6 flex-1">
                {/* Worker summary header inside modal */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-stone-100 rounded-2xl border border-stone-200 overflow-hidden relative">
                    <img src={selectedWorker.avatarUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-stone-900 dark:text-white">{selectedWorker.name}</h4>
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">
                      {selectedWorker.experience || 2} Years Exp • {selectedWorker.city}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-orange-600 font-extrabold mt-1">
                      <Star size={12} fill="currentColor" />
                      <span>{selectedWorker.rating || 'New'}</span>
                      <span className="text-stone-300 font-normal">|</span>
                      <span>₹{selectedWorker.dailyWage || 500} / Day</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSendHiringRequestSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider"> HIRE UNDER POSTED JOB OR DIRECT </label>
                    <select
                      value={hireJobId}
                      onChange={e => {
                        const val = e.target.value;
                        setHireJobId(val);
                        if (val !== 'direct') {
                          const matching = openJobs.find(j => j.id === val);
                          if (matching) {
                            setHireWage(matching.wage);
                            setHireTitle(matching.title);
                          }
                        } else {
                          setHireWage(selectedWorker.dailyWage || 500);
                          setHireTitle(`Hire ${selectedWorker.skills?.[0] || 'Worker'}`);
                        }
                      }}
                      className="h-12 border border-stone-200 bg-stone-50 px-4 w-full rounded-md font-bold text-xs uppercase tracking-wider text-stone-600 focus-visible:outline-none"
                    >
                      <option value="direct">Direct Quick-Hire Offer (No post required)</option>
                      {openJobs.map(job => (
                        <option key={job.id} value={job.id}>{job.title} (₹{job.wage})</option>
                      ))}
                    </select>
                  </div>

                  {hireJobId === 'direct' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Offer Title</label>
                      <Input 
                        placeholder="e.g. Garden weeding & leaf sweeping"
                        value={hireTitle}
                        onChange={e => setHireTitle(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Offered Wage (₹ / Day)</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        value={hireWage}
                        onChange={e => setHireWage(parseInt(e.target.value) || 0)}
                        className="pl-10"
                        required
                      />
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Message to Worker</label>
                    <textarea 
                      placeholder="Write job details: location, instructions, tools to bring..."
                      value={hireMessage}
                      onChange={e => setHireMessage(e.target.value)}
                      className="flex min-h-[100px] w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 font-medium"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 rounded-2xl h-12 text-stone-500 border-stone-200"
                      onClick={() => setSelectedWorker(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSendingRequest}
                      className="flex-1 rounded-2xl h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2"
                    >
                      {isSendingRequest ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : <Send size={16} />}
                      <span>Send Hire Request</span>
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MULTI-CRITERIA RATINGS PROMPT FOR EMPLOYERS */}
      <AnimatePresence>
        {ratingTarget && (
          <RatingModal
            isOpen={!!ratingTarget}
            onClose={() => setRatingTarget(null)}
            jobId={ratingTarget.jobId}
            reviewerId={user.uid}
            revieweeId={ratingTarget.workerId}
            type="worker_review"
            onSuccess={loadDashboardData}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
