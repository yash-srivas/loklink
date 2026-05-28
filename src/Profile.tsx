/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  MapPin, 
  Calendar, 
  Star, 
  MessageSquare, 
  Heart, 
  Award, 
  Edit3, 
  Settings as SettingsIcon, 
  Share2, 
  Plus, 
  CheckCircle2, 
  Trophy, 
  Clock, 
  ArrowRight,
  Camera,
  Trash2,
  Briefcase,
  Phone,
  Send,
  IndianRupee,
  X,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Button, Card, Badge, Input } from './components/ui';
import { useAuth } from './App';
import { dbService } from './services/dbService';
import { geminiService } from './services/geminiService';
import { User, Review, Job } from './types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const targetUserId = userId || user?.uid;
  const isOwnProfile = targetUserId === user?.uid;

  const [profile, setProfile] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Trust scorecard states
  const [isTrustLoading, setIsTrustLoading] = useState(false);
  const [trustScorecard, setTrustScorecard] = useState<{ score: number; summary: string; greenFlags: string[]; redFlags: string[] } | null>(null);
  const [showTrustModal, setShowTrustModal] = useState(false);

  const handleVerifyWithAi = async () => {
    if (!profile) return;
    setIsTrustLoading(true);
    try {
      const dataPayload = {
        name: profile.name,
        role: profile.role,
        skills: profile.skills,
        experience: profile.experience,
        rating: profile.role === 'worker' ? profile.rating : profile.employerRating,
        reviewsCount: profile.role === 'worker' ? profile.reviewsCount : profile.employerReviewsCount,
        dailyWage: profile.dailyWage,
        city: profile.city,
        area: profile.area,
        isVerified: profile.isVerified
      };
      
      const scorecard = await geminiService.generateTrustworthinessSummary(
        profile.role === 'worker' ? 'worker' : 'employer', 
        dataPayload
      );
      
      setTrustScorecard(scorecard);
      setShowTrustModal(true);
      toast.success("AI Trust Scorecard Generated!");
    } catch (err) {
      toast.error("Failed to generate trust assessment.");
    } finally {
      setIsTrustLoading(false);
    }
  };
  
  // Hiring modal state (if employer is viewing this worker's profile)
  const [showHireModal, setShowHireModal] = useState(false);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [hireJobId, setHireJobId] = useState<string>('direct');
  const [hireWage, setHireWage] = useState<number>(500);
  const [hireTitle, setHireTitle] = useState<string>('');
  const [hireMessage, setHireMessage] = useState<string>('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  useEffect(() => {
    if (targetUserId) {
      loadProfileAndReviews();
    }
  }, [targetUserId]);

  const loadProfileAndReviews = async () => {
    setLoading(true);
    try {
      const data = await dbService.getUserProfile(targetUserId!);
      if (data) {
        setProfile(data);
        setHireWage(data.dailyWage || 500);
        setHireTitle(`Hire ${data.skills?.[0] || 'Worker'}`);
        setHireMessage(`Hi ${data.name.split(' ')[0]}, I would like to hire you for physical worker support at ₹${data.dailyWage || 500}/Day. Please accept the request if available.`);
      }

      // Fetch reviews received
      const rec = await dbService.getReviews(targetUserId!);
      setReviews(rec);

      // Fetch employer's open jobs for selector
      if (user && !isOwnProfile) {
        const empJobs = await dbService.getJobs({ employerId: user.uid, status: 'open' });
        setOpenJobs(empJobs);
      }
    } catch (error) {
      toast.error('Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendHiringRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || isSendingRequest) return;

    setIsSendingRequest(true);
    try {
      let finalJobId = hireJobId;
      let finalTitle = hireTitle;
      let finalWage = hireWage;

      if (hireJobId === 'direct') {
        const tempJob = await dbService.postJob({
          employerId: user.uid,
          title: hireTitle || `Direct Hire offer`,
          skillRequired: profile.skills?.[0] || 'Labourer',
          wage: hireWage,
          duration: '1 Day',
          date: new Date().toISOString().split('T')[0],
          description: hireMessage || 'Direct quick-hire offer.',
          location: {
            area: profile.area || 'Koramangala',
            city: profile.city || 'Bengaluru',
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
        workerId: profile.id,
        message: hireMessage || 'I would like to hire you for physical trade support.',
        jobTitle: finalTitle,
        offeredWage: finalWage,
        dateNeeded: new Date().toISOString().split('T')[0],
        area: profile.area || 'Koramangala'
      });

      toast.success(`Hiring request sent to ${profile.name}!`);
      setShowHireModal(false);
    } catch (err) {
      toast.error('Failed to send invitation request');
    } finally {
      setIsSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="relative">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-orange-500/20 border-t-orange-600" />
          <div className="absolute inset-0 h-10 w-10 rounded-full animate-ping opacity-20 bg-orange-500" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-stone-50 p-6 text-center">
        <UserIcon className="text-stone-350 mb-3" size={48} />
        <h3 className="text-lg font-black text-stone-900">Profile Not Found</h3>
        <p className="text-xs text-stone-400 mt-1 max-w-xs">The requested user profile does not exist or has been deleted.</p>
        <Button className="mt-4 rounded-xl" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const isWorker = profile.role === 'worker';

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 lg:pb-8 p-6 page-enter">
      
      {/* Header Profile Cover block */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Cover Canvas */}
        <div className="h-44 bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700 rounded-[32px] p-6 flex items-end justify-between relative shadow-lg overflow-hidden border border-orange-500/10">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]"></div>
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-20 w-20 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/50 dark:border-stone-700 overflow-hidden relative shadow-md">
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="text-white space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black font-display leading-none">{profile.name}</h2>
                {profile.isVerified && (
                  <CheckCircle2 size={18} className="text-emerald-500 fill-white dark:fill-stone-900 shrink-0" />
                )}
                <Badge variant={isWorker ? "warning" : "default"} className="px-2 py-0.5 text-[8px] tracking-widest font-black uppercase text-stone-950 dark:bg-white dark:text-stone-950">
                  {profile.role}
                </Badge>
              </div>
              <p className="text-xs font-semibold text-orange-100 flex items-center gap-1">
                <MapPin size={12} className="text-orange-200" />
                <span>{profile.area} • {profile.city}</span>
              </p>
            </div>
          </div>

          <div className="relative z-10 flex gap-2">
            {isOwnProfile && (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl bg-white/20 border-white/20 text-white hover:bg-white/30 gap-1 text-[10px] font-black uppercase tracking-wider h-10 shadow-sm" 
                onClick={() => navigate('/settings')}
              >
                <SettingsIcon size={14} />
                <span>Settings</span>
              </Button>
            )}
          </div>
        </div>

        {/* Profile specific detail rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Trade Details / Stats Left Column */}
          <div className="md:col-span-1 space-y-6">
            
            {/* AI Trustworthiness trigger card */}
            <Card className="p-6 space-y-4 shadow-sm hover:shadow-md border border-stone-200/40 bg-gradient-to-br from-orange-500/5 to-transparent rounded-[24px] relative overflow-hidden">
              <div className="flex items-center gap-2">
                <Sparkles className="text-orange-500 animate-pulse" size={18} />
                <h4 className="text-xs font-black uppercase text-stone-400 tracking-wider">LOKLINK AI Trust Guard</h4>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold leading-relaxed">
                Audits profile completeness, ratings consistency, and verification logs using Gemini AI.
              </p>
              <Button 
                onClick={handleVerifyWithAi}
                disabled={isTrustLoading}
                className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider gap-2 shadow-md shadow-orange-600/10"
              >
                {isTrustLoading ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                <span>{isTrustLoading ? 'Auditing profile...' : 'Verify with LOKLINK AI'}</span>
              </Button>
            </Card>

            <Card className="p-6 space-y-4 shadow-sm hover:shadow-md border border-stone-200/50 dark:border-stone-850 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider">SPECIALIST INFO</h3>
                {profile.isVerified ? (
                  <Badge variant="success" className="text-[8px] font-black tracking-widest uppercase flex items-center gap-0.5 bg-emerald-500 text-white">
                    <CheckCircle2 size={8} className="fill-white text-emerald-500" />
                    <span>Verified</span>
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-[8px] font-black tracking-widest uppercase flex items-center gap-0.5 text-stone-500 bg-stone-100 dark:bg-stone-800">
                    <X size={8} />
                    <span>Unverified</span>
                  </Badge>
                )}
              </div>
              
              {isWorker ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="text-stone-400">Daily Wage</span>
                    <span className="text-orange-600 dark:text-orange-400 font-extrabold text-base">₹{profile.dailyWage} / Day</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="text-stone-400">Experience</span>
                    <span className="text-stone-700 dark:text-stone-300 font-black">{profile.experience} Years</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="text-stone-400">Status</span>
                    <Badge variant={profile.isAvailable ? "success" : "danger"} className="text-[9px] font-black">
                      {profile.isAvailable ? 'Available' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="text-stone-400">Languages</span>
                    <span className="text-stone-700 dark:text-stone-300 font-extrabold text-[10px]">English, Hindi, Kannada</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="text-stone-400">Preferred Area</span>
                    <span className="text-stone-700 dark:text-stone-300 font-extrabold text-[10px] text-right truncate max-w-[130px]">{profile.area || 'Koramangala'}</span>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">Specialty skills</span>
                    <div className="flex flex-wrap gap-1">
                      {profile.skills?.map(s => (
                        <Badge key={s} variant="warning" className="text-[9px] font-extrabold px-2 py-0.5">{s}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">Trade Badges</span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-bold px-2 py-1 rounded-lg border border-amber-100/30 flex items-center gap-1">
                        🏆 Top Rated
                      </span>
                      <span className="text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold px-2 py-1 rounded-lg border border-blue-100/30 flex items-center gap-1">
                        ⚡ Quick Response
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="text-stone-400">Organization</span>
                    <span className="text-stone-700 dark:text-stone-300 font-black">{profile.companyName || 'Residential Hirer'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="text-stone-400">Hiring Status</span>
                    <Badge variant="success" className="text-[9px] font-black">Active Employer</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="text-stone-400">Languages</span>
                    <span className="text-stone-700 dark:text-stone-300 font-extrabold text-[10px]">English, Kannada</span>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">Employer Badges</span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-lg border border-emerald-100/30 flex items-center gap-1">
                        🤝 Safe Escrow Employer
                      </span>
                      <span className="text-xs bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 font-bold px-2 py-1 rounded-lg border border-purple-100/30 flex items-center gap-1">
                        ⭐ Highly Rated
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Hire button if viewed by another user */}
              {!isOwnProfile && isWorker && (
                <div className="pt-4 space-y-2 border-t border-stone-100 dark:border-stone-800">
                  <a 
                    href={`tel:${profile.phone}`}
                    className="w-full h-12 bg-white border border-stone-200 text-stone-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-stone-50 text-sm shadow-sm"
                  >
                    <Phone size={14} />
                    <span>Call Specialist</span>
                  </a>
                  <Button 
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-sm gap-2"
                    onClick={() => setShowHireModal(true)}
                  >
                    <Send size={14} />
                    <span>Quick Hire Offer</span>
                  </Button>
                </div>
              )}
            </Card>

            {/* UPI QR Code Card for workers */}
            {isWorker && (
              <Card className="p-6 text-center space-y-4 shadow-sm hover:shadow-md border border-stone-200/50 dark:border-stone-850 bg-gradient-to-b from-stone-50/50 to-white dark:from-stone-900/30 dark:to-stone-900 rounded-[24px]">
                <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider">DIRECT PAY QR CODE</h3>
                <div className="bg-white p-3 rounded-2xl border border-stone-100 inline-block shadow-inner mx-auto relative group">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${profile.phone || '9876543210'}@upi&pn=${profile.name}&cu=INR`)}`} 
                    alt="Direct Pay UPI QR" 
                    className="h-36 w-36 object-contain"
                  />
                  <div className="absolute inset-0 bg-stone-950/5 backdrop-blur-[0.5px] rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-900 bg-white/90 px-2 py-1 rounded-lg shadow">Ready to Scan</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">💸 Scan to Pay Tips / Cash Wages</span>
                  <p className="text-[10px] text-stone-400 font-bold uppercase">Direct to Bank transfer via UPI scheme</p>
                </div>
              </Card>
            )}

            {/* LOKLINK Pay Wallet Balance loader card (If Own Profile!) */}
            {isOwnProfile && (
              <Card className="p-6 space-y-4 shadow-sm hover:shadow-md border border-stone-200/40 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-[24px]">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-400">
                  <span>LOKLINK Pay Wallet</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">₹{profile.walletBalance ?? 0}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      const nextBal = await dbService.loadMockFunds(profile.id, 500);
                      setProfile(prev => prev ? { ...prev, walletBalance: nextBal } : null);
                      toast.success(`Successfully loaded ₹500!`);
                      window.dispatchEvent(new Event('loklink-db-updated'));
                    }}
                    className="flex-grow h-9 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    + ₹500
                  </Button>
                  <Button 
                    onClick={async () => {
                      const nextBal = await dbService.loadMockFunds(profile.id, 1000);
                      setProfile(prev => prev ? { ...prev, walletBalance: nextBal } : null);
                      toast.success(`Successfully loaded ₹1000!`);
                      window.dispatchEvent(new Event('loklink-db-updated'));
                    }}
                    className="flex-grow h-9 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    + ₹1000
                  </Button>
                </div>
              </Card>
            )}

            {/* Overall Rating stars card */}
            <Card className="p-6 space-y-3">
              <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider">RATING PROFILE</h3>
              <div className="flex items-center gap-2">
                <Star className="text-orange-500 fill-orange-500" size={24} />
                <span className="text-3xl font-black text-stone-900 dark:text-white">
                  {isWorker 
                    ? (profile.rating && profile.rating > 0 ? profile.rating : 'New') 
                    : (profile.employerRating && profile.employerRating > 0 ? profile.employerRating : 'New')
                  }
                </span>
                <span className="text-xs text-stone-400 font-bold">
                  / 5 ({isWorker ? (profile.reviewsCount || 0) : (profile.employerReviewsCount || 0)} ratings)
                </span>
              </div>
            </Card>
          </div>

          {/* Reviews list Right Column */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xs font-black uppercase text-stone-400 tracking-widest ml-1">COMMUNITY REVIEWS FEED</h3>
            
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map(review => (
                  <Card key={review.id} className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-stone-50 border border-stone-100 rounded-xl overflow-hidden shrink-0">
                          <img src={review.reviewerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${review.reviewerId}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 leading-tight">
                            {review.reviewerName || 'Community Member'}
                          </h4>
                          <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="bg-orange-50/50 dark:bg-orange-950/20 px-2 py-0.5 rounded-lg flex items-center gap-1 text-orange-600 font-black text-[10px]">
                        <Star size={10} fill="currentColor" />
                        <span>{review.overall} Stars</span>
                      </div>
                    </div>

                    {review.comment && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 font-semibold bg-stone-55/50 dark:bg-stone-850/20 p-3 rounded-2xl border border-stone-100/50 dark:border-stone-800/40 leading-relaxed italic pl-3.5">
                        "{review.comment}"
                      </p>
                    )}

                    {/* Criteria breakdowns */}
                    <div className="grid grid-cols-3 gap-2 border-t border-stone-50 dark:border-stone-850 pt-3 text-center text-[10px]">
                      {isWorker ? (
                        <>
                          <div>
                            <span className="text-stone-300 font-black uppercase text-[8px] block">Punctuality</span>
                            <span className="font-extrabold text-stone-600 dark:text-stone-300">{(review.ratings as any).punctuality || 5}/5</span>
                          </div>
                          <div>
                            <span className="text-stone-300 font-black uppercase text-[8px] block">Quality</span>
                            <span className="font-extrabold text-stone-600 dark:text-stone-300">{(review.ratings as any).quality || 5}/5</span>
                          </div>
                          <div>
                            <span className="text-stone-300 font-black uppercase text-[8px] block">Reliability</span>
                            <span className="font-extrabold text-stone-600 dark:text-stone-300">{(review.ratings as any).reliability || 5}/5</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-stone-300 font-black uppercase text-[8px] block">Payment</span>
                            <span className="font-extrabold text-stone-600 dark:text-stone-300">{(review.ratings as any).payment || 5}/5</span>
                          </div>
                          <div>
                            <span className="text-stone-300 font-black uppercase text-[8px] block">Safety</span>
                            <span className="font-extrabold text-stone-600 dark:text-stone-300">{(review.ratings as any).safety || 5}/5</span>
                          </div>
                          <div>
                            <span className="text-stone-300 font-black uppercase text-[8px] block">Respect</span>
                            <span className="font-extrabold text-stone-600 dark:text-stone-300">{(review.ratings as any).behavior || 5}/5</span>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="py-12 text-center text-stone-400 italic text-xs">
                No reviews received yet. High-quality work will help build review feeds quickly!
              </Card>
            )}

          </div>

        </div>

      </div>

      {/* QUICK HIRE INVITE MODAL */}
      <AnimatePresence>
        {showHireModal && profile && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-100 rounded-[32px] shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <h3 className="font-display font-black text-lg text-stone-900 dark:text-white">Quick Hire Specialist</h3>
                <button onClick={() => setShowHireModal(false)} className="p-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendHiringRequestSubmit} className="p-6 overflow-y-auto no-scrollbar space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Invite for job post</label>
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
                        setHireWage(profile.dailyWage || 500);
                        setHireTitle(`Hire ${profile.skills?.[0] || 'Worker'}`);
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
                    placeholder="Write details: location area, start date, tools needed..."
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
                    onClick={() => setShowHireModal(false)}
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
                    <span>Send Invite</span>
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRUST SCORECARD MODAL OVERLAY */}
      <AnimatePresence>
        {showTrustModal && trustScorecard && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-100 rounded-[32px] shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-orange-500 animate-pulse" size={18} />
                  <h3 className="font-display font-black text-lg text-stone-900 dark:text-white">AI Trust Scorecard</h3>
                </div>
                <button onClick={() => setShowTrustModal(false)} className="p-2 hover:bg-stone-50 dark:hover:bg-stone-850 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto no-scrollbar space-y-6 flex-1">
                {/* Radial Gauge Circular Progress */}
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="relative h-28 w-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="#E2E8F0"
                        strokeWidth="10"
                        fill="transparent"
                        className="dark:stroke-stone-800"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke={trustScorecard.score >= 80 ? "#10B981" : "#F59E0B"}
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={2 * Math.PI * 48 * (1 - trustScorecard.score / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-stone-900 dark:text-white">{trustScorecard.score}</span>
                      <span className="text-[8px] font-black uppercase text-stone-400 tracking-wider font-sans">Trust Score</span>
                    </div>
                  </div>
                  <Badge variant={trustScorecard.score >= 80 ? "success" : "warning"} className="px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider">
                    {trustScorecard.score >= 80 ? 'Highly Reliable' : 'Standard Trust'}
                  </Badge>
                </div>

                {/* AI assessment text */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">AI Audit Summary</span>
                  <p className="text-xs text-stone-600 dark:text-stone-300 font-semibold leading-relaxed bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-100/50 dark:border-stone-850">
                    {trustScorecard.summary}
                  </p>
                </div>

                {/* Green Flags */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-450 tracking-wider block">🟢 Green Flags (Positive indicators)</span>
                  <div className="space-y-1.5 pl-1">
                    {trustScorecard.greenFlags.map((flag, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
                        <span className="text-emerald-600 mt-0.5">•</span>
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Red Flags */}
                {trustScorecard.redFlags && trustScorecard.redFlags.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <span className="text-[9px] font-black uppercase text-orange-650 tracking-wider block">⚠️ Caution Flags</span>
                    <div className="space-y-1.5 pl-1">
                      {trustScorecard.redFlags.map((flag, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-bold text-stone-500 dark:text-stone-400">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-stone-50 dark:bg-stone-950 border-t border-stone-100 dark:border-stone-850 rounded-b-[32px] flex justify-end">
                <Button 
                  onClick={() => setShowTrustModal(false)}
                  className="rounded-xl font-bold text-xs px-6 h-10 w-full"
                >
                  Close Scorecard
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
