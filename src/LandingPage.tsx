/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './components/ui';
import { 
  MapPin, 
  Bot, 
  ShieldCheck, 
  Wallet, 
  Languages, 
  ArrowRight, 
  Star, 
  Zap, 
  Globe, 
  Sparkles, 
  AlertTriangle, 
  Briefcase, 
  Users, 
  TrendingUp,
  Moon,
  Sun
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [scrollY, setScrollY] = useState(0);

  // Monitor scroll for header animation
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', !isDark);
    localStorage.setItem('theme', newTheme);
    setIsDark(!isDark);
    // Dispatch event to update other components
    window.dispatchEvent(new CustomEvent('loklink-theme-changed', { detail: newTheme }));
  };

  const handleGetStarted = (role?: 'worker' | 'employer') => {
    if (role) {
      localStorage.setItem('loklink_temp_role', role);
    }
    navigate('/login');
  };

  return (
    <div className="min-h-screen font-sans antialiased text-stone-800 dark:text-stone-100 bg-gradient-to-br from-stone-50 via-orange-50/20 to-stone-100 dark:from-stone-950 dark:via-stone-900/40 dark:to-stone-950 transition-colors duration-300 relative overflow-hidden">
      
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[40%] -right-40 w-[450px] h-[450px] bg-orange-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
      </div>

      {/* HEADER NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 20 
          ? 'bg-white/70 dark:bg-stone-950/70 backdrop-blur-xl border-b border-stone-200/40 dark:border-stone-800/40 shadow-sm py-4' 
          : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-xl rounded-xl flex items-center justify-center shadow-md shadow-orange-500/25">
              L
            </div>
            <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">LOKLINK</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold tracking-tight">
            <a href="#features" className="text-stone-600 dark:text-stone-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">Features</a>
            <a href="#how-it-works" className="text-stone-600 dark:text-stone-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">How It Works</a>
            <a href="#testimonials" className="text-stone-600 dark:text-stone-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">Safety</a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Dark Mode Switcher */}
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-900 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/50 dark:border-stone-800/50 active:scale-95 transition-transform duration-200 cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Button 
              variant="outline" 
              onClick={() => handleGetStarted()}
              className="hidden sm:inline-flex"
            >
              Sign In
            </Button>

            <Button 
              onClick={() => handleGetStarted()}
              className="gap-2"
            >
              <span>Launch App</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-32 pb-20 lg:pt-40 lg:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-black uppercase tracking-wider animate-bounce">
              <Sparkles size={14} className="animate-pulse" />
              <span>Next-Gen Hyperlocal Gig Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-stone-900 dark:text-white leading-[1.08] tracking-tight">
              Bridging the Gap Between <span className="text-gradient">Talent</span> & <span className="text-gradient">Opportunity</span>
            </h1>

            <p className="text-lg text-stone-500 dark:text-stone-400 font-medium leading-relaxed max-w-xl">
              LOKLINK connects verified gig workers and hiring parties locally in real time. Use state-of-the-art AI command flows, interactive mapping, secure escrows, and robust SOS security.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={() => handleGetStarted('employer')}
                className="h-14 px-8 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-orange-500/25 border border-orange-600/20 transition-all hover:scale-105 active:scale-[0.98] cursor-pointer"
              >
                <Briefcase size={20} />
                <span>Hire Gig Workers</span>
              </button>

              <button
                onClick={() => handleGetStarted('worker')}
                className="h-14 px-8 bg-white dark:bg-stone-900 border-2 border-stone-200 hover:border-orange-400 dark:border-stone-800 dark:hover:border-orange-500/60 text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-[0.98] cursor-pointer shadow-sm hover:shadow"
              >
                <Users size={20} className="text-orange-500" />
                <span>Find Local Work</span>
              </button>
            </div>

            {/* Quick Ratings badge */}
            <div className="flex items-center gap-6 pt-4 border-t border-stone-200/50 dark:border-stone-800/50">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <img 
                    key={i}
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar${i}`} 
                    alt="user avatar" 
                    className="w-10 h-10 rounded-full border-2 border-white dark:border-stone-950 bg-stone-100" 
                  />
                ))}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={15} fill="currentColor" className="text-orange-500" />
                  ))}
                  <span className="text-sm font-black text-stone-800 dark:text-stone-200 ml-1">4.9/5</span>
                </div>
                <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Trusted by 2,500+ Hubballi Locals</p>
              </div>
            </div>
          </div>

          {/* Right Showcase Column */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto w-full max-w-[420px] aspect-[4/5] glass-strong rounded-[40px] border border-white/40 dark:border-stone-800 p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              
              {/* Dynamic glass effect layers */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-600/10 rounded-full blur-2xl pointer-events-none" />

              {/* Title Bar */}
              <div className="flex items-center justify-between border-b border-stone-200/40 dark:border-stone-800/40 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">LOKLINK NETWORK</span>
                </div>
                <div className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800/50 text-[9px] font-black uppercase text-stone-500">
                  REAL-TIME GPS
                </div>
              </div>

              {/* Central Map Illustration */}
              <div className="flex-1 my-4 bg-stone-100/50 dark:bg-stone-900/50 rounded-3xl border border-stone-200/30 dark:border-stone-800/30 p-4 relative overflow-hidden flex flex-col justify-end">
                {/* Simulated markers */}
                <div className="absolute top-6 left-12 p-2 bg-white dark:bg-stone-950 rounded-2xl shadow-lg border border-stone-200/40 dark:border-stone-800/60 flex items-center gap-2 animate-float scale-90">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 font-bold text-sm">💼</div>
                  <div>
                    <h5 className="font-extrabold text-[10px] text-stone-900 dark:text-white leading-none">Pipeline Repair</h5>
                    <span className="text-[8px] text-stone-400 leading-none">Vidyanagar • ₹600</span>
                  </div>
                </div>

                <div className="absolute top-[40%] right-6 p-2 bg-white dark:bg-stone-950 rounded-2xl shadow-lg border border-stone-200/40 dark:border-stone-800/60 flex items-center gap-2 animate-float scale-95" style={{ animationDelay: '1.2s' }}>
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Basavaraj" alt="worker" className="w-8 h-8 rounded-xl bg-stone-50" />
                  <div>
                    <h5 className="font-extrabold text-[10px] text-stone-900 dark:text-white leading-none">Basavaraj Patil</h5>
                    <span className="text-[8px] text-stone-400 leading-none">Plumber • ★ 4.7</span>
                  </div>
                </div>

                {/* Accuracy pulsing ring */}
                <div className="absolute top-1/2 left-1/3 w-16 h-16 border-2 border-orange-500/20 rounded-full animate-ping opacity-60 pointer-events-none" />
                <div className="absolute top-1/2 left-1/3 translate-x-4 translate-y-4 w-4 h-4 bg-orange-600 border-2 border-white dark:border-stone-950 rounded-full shadow-md z-10" />

                {/* Footer Alert overlay */}
                <div className="relative z-10 p-3 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md rounded-2xl border border-stone-200/60 dark:border-stone-800/60 shadow-lg text-left flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <div>
                    <h6 className="font-extrabold text-[10px] text-stone-900 dark:text-white uppercase tracking-wider">AI MATCH CONCLUDED</h6>
                    <p className="text-[9px] text-stone-400 font-medium leading-normal mt-0.5">Basavaraj has claimed the job and has been routed to Anand's location in Vidyanagar.</p>
                  </div>
                </div>
              </div>

              {/* Bottom Escrow milestone card */}
              <div className="p-3 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200/40 dark:border-stone-800/40 flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <h5 className="font-black text-xs text-stone-900 dark:text-white">Escrow Secured</h5>
                    <span className="text-[9px] text-stone-400 font-bold">₹600 Milestone</span>
                  </div>
                </div>
                <div className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40">
                  PROTECTED
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* STATS SECTION */}
      <section className="relative z-10 py-12 bg-white/40 dark:bg-stone-950/40 backdrop-blur-md border-y border-stone-200/40 dark:border-stone-800/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="p-6 text-center space-y-2">
              <div className="flex justify-center text-orange-600"><Briefcase size={28} /></div>
              <h3 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white">10,000+</h3>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Active Gig Postings</p>
            </div>
            <div className="p-6 text-center space-y-2 border-y sm:border-y-0 sm:border-x border-stone-200/50 dark:border-stone-800/50">
              <div className="flex justify-center text-orange-600"><Users size={28} /></div>
              <h3 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white">98%</h3>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Job Completion Rate</p>
            </div>
            <div className="p-6 text-center space-y-2">
              <div className="flex justify-center text-orange-600"><TrendingUp size={28} /></div>
              <h3 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white">15 Min</h3>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Average Connection Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-16 text-center">
          <div className="space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">SIMPLIFIED WORKFLOW</span>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">How LOKLINK Works</h2>
            <p className="text-sm text-stone-500 font-medium">Getting jobs done locally should not be difficult. LOKLINK streamlines the entire hiring lifecycle in 3 simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Explain to AI Bot',
                desc: 'Describe what needs to be done. Our smart Floating AI chatbot will immediately understand and auto-generate detailed job listings, rates, and matches.',
                icon: Bot,
                gradient: 'from-orange-100 to-orange-50 dark:from-orange-950/20 dark:to-orange-900/10 text-orange-600'
              },
              {
                step: '02',
                title: 'Match Instantly on Map',
                desc: 'View active workers or open listings immediately on our hyperlocal interactive map. Coordinate, claim, and communicate in real time.',
                icon: MapPin,
                gradient: 'from-orange-200/80 to-orange-100/50 dark:from-orange-900/30 dark:to-orange-850/10 text-orange-600'
              },
              {
                step: '03',
                title: 'Secure Escrow Escort',
                desc: 'Hiring guys load funds into secure Escrow Wallets. Workers complete the task, request verification, scan detailed UPI QRs, and receive instant payouts.',
                icon: Wallet,
                gradient: 'from-stone-800 to-stone-900 text-white dark:from-stone-700 dark:to-stone-850'
              }
            ].map((item, idx) => (
              <div key={idx} className="glass-strong p-8 rounded-[32px] border border-white/50 dark:border-stone-800 relative text-left group hover:scale-[1.02] transition-transform duration-300">
                <div className="absolute top-6 right-8 text-6xl font-black text-stone-100 dark:text-stone-900 select-none group-hover:text-orange-500/10 transition-colors">
                  {item.step}
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${item.gradient}`}>
                  <item.icon size={22} />
                </div>
                <h4 className="text-lg font-black text-stone-900 dark:text-white mb-2">{item.title}</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 FEATURES GRID */}
      <section id="features" className="relative z-10 py-20 bg-stone-100/30 dark:bg-stone-950/20 px-6 border-y border-stone-200/30 dark:border-stone-800/30">
        <div className="max-w-7xl mx-auto space-y-16 text-center">
          <div className="space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">PLATFORM FEATS</span>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">Equipped with Elite Features</h2>
            <p className="text-sm text-stone-500 font-medium">LOKLINK brings state-of-the-art enterprise tech into hyperlocal labor markets, ensuring smooth operations all around.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                title: 'Smart AI Voice Chatbot',
                desc: 'A voice-capable AI assistant that auto-generates job cards, coordinates details, confirms prompts, and executes listings natively without manual forms.',
              },
              {
                icon: MapPin,
                title: 'Hyperlocal Map Layers',
                desc: 'Highly detailed reactive Leaflet maps. Role-gated visibility keeps workers focused on jobs and hiring managers looking at available local talent.',
              },
              {
                icon: Wallet,
                title: 'Secured Escrow Wallets',
                desc: 'Ensures payment guarantees! Managers block daily wages in secure escrow, released instantly upon photo proof and interactive ratings completion.',
              },
              {
                icon: AlertTriangle,
                title: 'Immediate SOS Assistance',
                desc: 'Safety first. One-tap emergency broadcast signals immediate crisis alerts to nearby workers and community members with GPS positioning.',
              },
              {
                icon: Languages,
                title: 'Multi-Lingual Platform',
                desc: 'Bridging language divides. Fully localized system support for English, Hindi, and Kannada ensures navigation fits every segment of society.',
              },
              {
                icon: ShieldCheck,
                title: 'Detailed Portfolios & QRs',
                desc: 'Comprehensive profiles including dynamic UPI QR badges, specialized experience, work history, and cross-party ratings to ensure reliability.',
              }
            ].map((f, i) => (
              <Card key={i} className="text-left p-8 glass-strong rounded-3xl border border-stone-200/40 dark:border-stone-800/50 flex flex-col justify-between hover:border-orange-500/30 hover:shadow-lg transition-all duration-300">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <f.icon size={20} />
                  </div>
                  <h4 className="text-base font-black text-stone-900 dark:text-white">{f.title}</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed">{f.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass-strong p-8 sm:p-14 rounded-[40px] border border-white/50 dark:border-stone-800 shadow-xl text-center space-y-8 relative overflow-hidden">
            {/* Ambient gradients */}
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-orange-400/8 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-4 max-w-xl mx-auto">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">READY TO LAUNCH?</span>
              <h2 className="text-3xl sm:text-5xl font-black text-stone-900 dark:text-white tracking-tight">Join the Future of Hyperlocal Work</h2>
              <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 font-medium">Whether you are looking to hire a reliable plumber in minutes or looking to land high-paying gigs in Hubballi, LOKLINK is your absolute terminal.</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-sm mx-auto">
              <Button 
                onClick={() => handleGetStarted()} 
                className="h-14 rounded-2xl font-black text-sm uppercase tracking-wider"
              >
                Get Started Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-stone-200/50 dark:border-stone-800/50 bg-stone-50 dark:bg-stone-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-base rounded-lg flex items-center justify-center">
              L
            </div>
            <span className="text-lg font-black tracking-tight text-stone-900 dark:text-white">LOKLINK</span>
          </div>

          <p className="text-xs text-stone-400 font-medium">
            © {new Date().getFullYear()} LOKLINK. Bridging community talent and daily tasks with integrity. All Rights Reserved.
          </p>

          <div className="flex items-center gap-6 text-xs font-bold text-stone-400">
            <a href="#features" className="hover:text-orange-500 transition-colors">Privacy</a>
            <a href="#how-it-works" className="hover:text-orange-500 transition-colors">Terms</a>
            <a href="#testimonials" className="hover:text-orange-500 transition-colors">Security</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
