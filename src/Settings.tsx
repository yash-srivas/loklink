import React, { useState, useEffect } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Moon, 
  Sun, 
  Monitor, 
  Trash2, 
  Download, 
  ChevronRight, 
  Star, 
  Share2, 
  FileText, 
  Lock,
  ArrowLeft,
  Check,
  HelpCircle,
  Mail,
  Send,
  MessageSquare,
  X
} from 'lucide-react';
import { Button, Card, Badge, Input } from './components/ui';
import { useAuth } from './App';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, LanguageCode } from './lib/i18n';
import { applyAccentColor } from './lib/utils';

export default function Settings() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      import('./services/dbService').then(({ dbService }) => {
        dbService.getUserProfile(user.uid).then(p => {
          if (p) setProfile(p);
        });
      });
    }
  }, [user]);
  const { t, changeLanguage, language } = useTranslation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [accentColor, setAccentColor] = useState(localStorage.getItem('accent-color') || 'orange');
  const [compactMode, setCompactMode] = useState(localStorage.getItem('compact-mode') === 'true');

  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | 'rating' | null>(null);
  const [platformRating, setPlatformRating] = useState<number>(5);
  const [platformFeedback, setPlatformFeedback] = useState<string>('');
  
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSendingTicket, setIsSendingTicket] = useState(false);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;
    setIsSendingTicket(true);
    setTimeout(() => {
      const ticketId = 'LK-' + Math.floor(1000 + Math.random() * 9000);
      const tickets = JSON.parse(localStorage.getItem('loklink_tickets') || '[]');
      const newTicket = {
        id: ticketId,
        userId: user?.uid || 'mock-user',
        userName: user?.displayName || 'Anonymous User',
        userPhone: user?.phone || '9876543210',
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        status: 'pending',
        createdAt: Date.now()
      };
      localStorage.setItem('loklink_tickets', JSON.stringify([newTicket, ...tickets]));
      
      setIsSendingTicket(false);
      setTicketSubject('');
      setTicketDescription('');
      toast.success('Support Ticket Raised Successfully!', {
        description: `Reference ID: ${ticketId}. We will reply within 3 hours.`
      });
      window.dispatchEvent(new Event('loklink-db-updated'));
    }, 1500);
  };

  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    sms: true,
    marketing: false
  });
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showNameOnListings: true
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'light') {
      html.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.classList.toggle('dark', prefersDark);
    }
    // Emit global event so Leaflet and other non-tailwind components react immediately
    window.dispatchEvent(new CustomEvent('loklink-theme-changed', { detail: theme }));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('accent-color', accentColor);
    applyAccentColor(accentColor);
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem('compact-mode', String(compactMode));
  }, [compactMode]);

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode as LanguageCode);
    toast.success('System language updated!', {
      description: `Language set to ${langCode === 'en' ? 'English' : langCode === 'hi' ? 'Hindi (हिन्दी)' : 'Kannada (ಕನ್ನಡ)'}`
    });
  };

  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Notification settings updated');
  };

  const handleExportData = () => {
    const data = {
      user: user?.email,
      settings: { theme, accentColor, compactMode, notifications, privacy, language },
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loklink-data-${user?.uid || 'mock'}.json`;
    a.click();
    toast.success('Data exported successfully');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you absolutely sure? This action cannot be undone.')) {
      toast.error('Account deletion is a simulated feature for this demo.');
    }
  };

  const accentColors = [
    { name: 'Orange', value: 'orange', hex: '#ea580c' },
    { name: 'Blue', value: 'blue', hex: '#2563eb' },
    { name: 'Green', value: 'green', hex: '#059669' },
    { name: 'Purple', value: 'purple', hex: '#9333ea' },
    { name: 'Red', value: 'red', hex: '#e11d48' },
    { name: 'Stone', value: 'stone', hex: '#78716c' },
  ];

  const SettingSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-8">
      <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-4 px-4">{title}</h3>
      <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-[24px] overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  );

  const SettingItem = ({ 
    icon: Icon, 
    label, 
    value, 
    onClick, 
    toggle, 
    active,
    danger 
  }: { 
    icon: any, 
    label: string, 
    value?: string, 
    onClick?: () => void, 
    toggle?: boolean,
    active?: boolean,
    danger?: boolean
  }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 hover:bg-stone-50/50 dark:hover:bg-stone-850/30 transition-all border-b border-stone-100/60 dark:border-stone-800/60 last:border-0 text-left cursor-pointer ${
        danger ? 'text-rose-600 dark:text-rose-455' : 'text-stone-900 dark:text-stone-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${
          danger ? 'bg-rose-50 dark:bg-rose-950/20' : 'bg-stone-100 dark:bg-stone-800'
        } ${active ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600' : ''}`}>
          <Icon size={18} />
        </div>
        <span className="font-bold text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-bold text-stone-400">{value}</span>}
        {toggle !== undefined ? (
          <div className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${active ? 'bg-orange-600' : 'bg-stone-200 dark:bg-stone-750'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-5' : 'left-1'}`} />
          </div>
        ) : (
          <ChevronRight size={16} className="text-stone-300 dark:text-stone-600" />
        )}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 lg:pb-8 page-enter">
      <header className="sticky top-0 z-30 bg-white/72 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800 px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-10 w-10">
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-xl font-black tracking-tight dark:text-white font-display">Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 pt-6">
        
        <SettingSection title="Appearance">
          <div className="p-4 border-b border-stone-100/60 dark:border-stone-800/60">
            <label className="text-xs font-black text-stone-400 uppercase mb-3 block">Theme Preferences</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light', icon: Sun, label: 'Light' },
                { id: 'dark', icon: Moon, label: 'Dark' },
                { id: 'system', icon: Monitor, label: 'System' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    theme === t.id 
                      ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400' 
                      : 'border-transparent bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100/50'
                  }`}
                >
                  <t.icon size={20} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-stone-100/60 dark:border-stone-800/60">
            <label className="text-xs font-black text-stone-400 uppercase mb-3 block">Theme Accent</label>
            <div className="flex flex-wrap gap-3">
              {accentColors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setAccentColor(c.value)}
                  style={{ backgroundColor: c.hex }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform active:scale-90 cursor-pointer ${
                    accentColor === c.value ? 'ring-4 ring-stone-300 dark:ring-stone-600 scale-110' : ''
                  }`}
                >
                  {accentColor === c.value && <Check size={20} />}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-stone-100/60 dark:border-stone-800/60 space-y-3">
            <label className="text-xs font-black text-stone-400 uppercase block">Platform Language</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'Hindi (हिन्दी)' },
                { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' }
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${
                    language === lang.code 
                      ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400' 
                      : 'border-transparent bg-stone-50 dark:bg-stone-800 text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <SettingItem 
            icon={User} 
            label="Compact Grid mode" 
            toggle 
            active={compactMode} 
            onClick={() => setCompactMode(!compactMode)} 
          />
        </SettingSection>

        <SettingSection title="Notifications">
          <SettingItem 
            icon={Bell} 
            label="Push Alerts" 
            toggle 
            active={notifications.push} 
            onClick={() => handleToggleNotification('push')} 
          />
          <SettingItem 
            icon={Bell} 
            label="SMS Verification reminders" 
            toggle 
            active={notifications.sms} 
            onClick={() => handleToggleNotification('sms')} 
          />
        </SettingSection>

        <SettingSection title="Privacy & Safety">
          <SettingItem 
            icon={Shield} 
            label="Public Profile Listing visibility" 
            toggle 
            active={privacy.publicProfile} 
            onClick={() => setPrivacy(prev => ({ ...prev, publicProfile: !prev.publicProfile }))} 
          />
          <SettingItem 
            icon={Download} 
            label="Export Account JSON backup" 
            onClick={handleExportData} 
          />
        </SettingSection>

        {profile?.isAdmin && (
          <SettingSection title="Administrative Board">
            <SettingItem 
              icon={Shield} 
              label="Access Proximity Admin Console" 
              onClick={() => navigate('/admin')} 
            />
          </SettingSection>
        )}

        <SettingSection title="Danger Zone">
          <SettingItem 
            icon={Trash2} 
            label="Delete Account & Wallets" 
            danger 
            onClick={handleDeleteAccount} 
          />
        </SettingSection>

        {/* Community Help Center with FAQ & Counseling ticketing forms */}
        <div className="mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-4 px-4">Community Help Center</h3>
          <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-[24px] overflow-hidden shadow-sm p-6 space-y-6">
            
            {/* FAQ Accordion */}
            <div className="space-y-3 text-left">
              <h4 className="text-sm font-black uppercase text-stone-400 tracking-wider mb-2 flex items-center gap-2">
                <HelpCircle size={16} className="text-orange-500" />
                <span>Frequently Asked Questions</span>
              </h4>
              {[
                {
                  q: "What if the employer refuses to pay?",
                  a: "All payments are secured in our LOKLINK Escrow. If there is a dispute, our community mediators will step in, review communication logs, and transfer funds to the deserving party fairly."
                },
                {
                  q: "What if I get hurt or injured at work?",
                  a: "Under the Workmen Compensation Act, the hirer is legally liable for medical costs and paid leave. Tap the red emergency SOS button to request immediate nearby rescue assistance from nearby helpers."
                },
                {
                  q: "How do I list a new skilled trade worker?",
                  a: "Tap 'Add' or 'Post Job/List Specialty' in your sidebar or bottom navigation bar, fill in the worker's name, category, daily wage expectation, and local coordinates, and submit."
                },
                {
                  q: "How does the escrow payment system work?",
                  a: "When an employer hires a worker, the agreed budget is locked in Escrow. Once the job is completed, the employer confirms, and the escrow funds are immediately transferred to the worker's wallet."
                },
                {
                  q: "How can I verify if a worker is genuine?",
                  a: "Look for the green 'Verified' badge which represents that the worker has completed biometric/Aadhar scanning with our secure LOKLINK AI."
                },
                {
                  q: "Is there a limit to daily wage requests?",
                  a: "No, workers are free to set their preferred daily rates based on skills and experience, and employers can negotiate directly via the hiring proposal."
                },
                {
                  q: "What happens in case of an accident?",
                  a: "LOKLINK provides direct access to nearby emergency contacts and a one-click distress SOS system that alerts local helpers immediately."
                },
                {
                  q: "How do I claim my wallet balance?",
                  a: "Balance can be directly paid out to any valid Indian bank account via UPI. Payout processing takes less than 5 minutes."
                }
              ].map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div key={idx} className="border-b border-stone-100 dark:border-stone-800 last:border-0 pb-3 last:pb-0">
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between font-bold text-sm text-stone-850 dark:text-stone-200 py-2 hover:text-orange-500 transition-colors text-left cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <span className="text-xs text-stone-400">{isOpen ? '−' : '+'}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="text-xs text-stone-500 dark:text-stone-450 mt-1 leading-relaxed pl-1">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <hr className="border-stone-100 dark:border-stone-800" />

            {/* Support Ticket Raising Form */}
            <div className="space-y-4 text-left">
              <h4 className="text-sm font-black uppercase text-stone-400 tracking-wider flex items-center gap-2">
                <MessageSquare size={16} className="text-orange-500" />
                <span>Contact Community Support</span>
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Facing payment disputes or technical errors? Submit a help ticket below. A LOKLINK counselor will review it immediately.
              </p>

              <form onSubmit={handleSubmitTicket} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Subject</label>
                  <Input
                    placeholder="e.g. Escrow payout not credited"
                    value={ticketSubject}
                    onChange={e => setTicketSubject(e.target.value)}
                    required
                    className="h-11 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Message Description</label>
                  <textarea
                    placeholder="Describe the incident with dates, job ID, and details..."
                    value={ticketDescription}
                    onChange={e => setTicketDescription(e.target.value)}
                    required
                    rows={3}
                    className="flex w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-xs placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 transition-all font-medium dark:bg-stone-850 dark:border-stone-700 dark:text-stone-200"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isSendingTicket || !ticketSubject || !ticketDescription} 
                  className="w-full h-11 text-xs font-bold gap-2"
                >
                  <Send size={12} />
                  <span>{isSendingTicket ? 'Submitting Support Ticket...' : 'File Help Ticket'}</span>
                </Button>
              </form>
            </div>

          </div>
        </div>

        <SettingSection title="Community">
          <SettingItem icon={Star} label="Write Platform Rating" onClick={() => setActiveLegalModal('rating')} />
          <SettingItem icon={Share2} label="Copy Invite Link" onClick={() => {
            navigator.clipboard.writeText('https://loklink.app');
            toast.success('Link copied to clipboard');
          }} />
          <SettingItem icon={FileText} label="Privacy Policy Statement" onClick={() => setActiveLegalModal('privacy')} />
          <SettingItem icon={FileText} label="Terms of Service terms" onClick={() => setActiveLegalModal('terms')} />
          <div className="p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-300 dark:text-stone-700">LOKLINK Showcase Version 1.0.8</p>
          </div>
        </SettingSection>
      </main>

      {/* POLICY & RATING MODALS OVERLAY */}
      <AnimatePresence>
        {activeLegalModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <h3 className="font-display font-black text-lg text-stone-900 dark:text-white capitalize">
                  {activeLegalModal === 'rating' ? 'Rate LOKLINK App' : activeLegalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </h3>
                <button onClick={() => setActiveLegalModal(null)} className="p-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto no-scrollbar space-y-4 text-sm text-stone-600 dark:text-stone-300">
                {activeLegalModal === 'privacy' && (
                  <div className="space-y-4">
                    <p className="font-bold text-stone-800 dark:text-white">LOKLINK Privacy Commitment</p>
                    <p>At LOKLINK, we value the trust you place in our platform. We gather minimal user parameters including phone metadata, approximate trade coordinates, and specialist daily rates to help local hirers discover you near Hubballi.</p>
                    <p className="font-bold text-stone-800 dark:text-white">1. Secure Aadhar Storage</p>
                    <p>All scanned identity credentials (Aadhar card extracts) are parsed locally by our LOKLINK AI scanner model. No card visual data is shared with third parties or advertisers.</p>
                    <p className="font-bold text-stone-800 dark:text-white">2. Proximity Shielding</p>
                    <p>To preserve safety, we do not expose your precise residential location on the mapping dashboards. Listings display a randomized offset zone within a 500-meter threshold.</p>
                  </div>
                )}

                {activeLegalModal === 'terms' && (
                  <div className="space-y-4">
                    <p className="font-bold text-stone-800 dark:text-white">LOKLINK Terms of Service</p>
                    <p>Welcome to LOKLINK. By accessing our services, you agree to comply with our fair-labor and secure payout guidelines.</p>
                    <p className="font-bold text-stone-800 dark:text-white">1. Escrow Release Guarantees</p>
                    <p>Employers agree to lock specified job wages in LOKLINK Escrow prior to requesting workers. Once a worker completes their tasks, the employer must release escrow holds within 24 hours.</p>
                    <p className="font-bold text-stone-800 dark:text-white">2. Zero Discrimination Policy</p>
                    <p>LOKLINK is built to empower blue-collar specialists without bias. Any discrimination based on language, region, or gender will result in immediate permanent account termination.</p>
                  </div>
                )}

                {activeLegalModal === 'rating' && (
                  <div className="space-y-4 text-center">
                    <p className="text-xs font-semibold">How would you rate your LOKLINK experience today?</p>
                    <div className="flex justify-center gap-2 py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setPlatformRating(star)}
                          className="focus:outline-none transform hover:scale-115 transition-transform"
                        >
                          <Star
                            size={32}
                            className={star <= platformRating ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-stone-200 dark:text-stone-700'}
                          />
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Leave Feedback remarks</label>
                      <textarea
                        value={platformFeedback}
                        onChange={(e) => setPlatformFeedback(e.target.value)}
                        placeholder="Help us improve LOKLINK for workers and employers..."
                        rows={3}
                        className="flex w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-xs placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 transition-all font-medium dark:bg-stone-850 dark:border-stone-700 dark:text-stone-200"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        toast.success("Thank you for your rating!", {
                          description: `Your ${platformRating}-star review helps improve LOKLINK India.`
                        });
                        setActiveLegalModal(null);
                        setPlatformFeedback('');
                      }}
                      className="w-full h-11 text-xs font-black uppercase tracking-widest mt-2"
                    >
                      Submit Platform Review
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
