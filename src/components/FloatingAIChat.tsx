import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Mic, Send, Bot, Check, ShieldAlert, Sparkles, Trash2, ArrowUpRight } from 'lucide-react';
import { Button, Card, Badge, Input } from './ui';
import { useAuth } from '../App';
import { dbService } from '../services/dbService';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  actionCard?: {
    type: 'post_job' | 'update_profile';
    payload: any;
    status: 'pending' | 'confirmed' | 'cancelled';
  };
  timestamp: number;
}

export function FloatingAIChat() {
  const { user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Web Speech API Ref
  const recognitionRef = useRef<any>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    if (user) {
      const storageKey = `loklink_persistent_chat_${user.uid}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch {
          setMessages(getDefaultWelcomeMessage());
        }
      } else {
        setMessages(getDefaultWelcomeMessage());
      }
    }
  }, [user, role]);

  // Save chat history on change
  const saveChatHistory = (history: ChatMessage[]) => {
    if (user) {
      const storageKey = `loklink_persistent_chat_${user.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(history));
      setMessages(history);
    }
  };

  const getDefaultWelcomeMessage = (): ChatMessage[] => {
    const welcomeText = role === 'worker'
      ? "Namaste! I am 'Sahay', LOKLINK's AI Assistant. I can help you update your availability, daily wages, trade skills (e.g. 'update my daily wage to ₹700'), or answer legal rights questions. How can I help you today?"
      : "Namaste! I am 'Sahay', LOKLINK's AI Assistant. I can help you find trade specialists, list/post open jobs (e.g. 'burst kitchen pipe is flooding, post plumber job for ₹850'), or book emergency specialists. How can I assist you today?";
    
    return [{
      id: 'welcome',
      role: 'ai',
      content: welcomeText,
      timestamp: Date.now()
    }];
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Standard Indian regional english/hindi friendly locale

      rec.onstart = () => {
        setIsRecording(true);
        toast.info("Listening... Speak clearly.");
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        toast.success("Voice transcribed successfully!");
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        toast.error("Speech input error. Try typing.");
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleToggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Clear all active conversation logs?")) {
      const cleared = getDefaultWelcomeMessage();
      saveChatHistory(cleared);
      toast.success("Conversation cleared.");
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userText = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: 'msg-' + Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };

    const nextHistory = [...messages, userMsg];
    saveChatHistory(nextHistory);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Determine what role variables exist for prompt
      const profile = await dbService.getUserProfile(user.uid);
      const userProfileCtx = profile ? JSON.stringify(profile) : `{"role":"${role}"}`;

      const systemInstruction = `You are "Sahay", LOKLINK's Generative AI platform coordinator.
      Your primary role is to assist users in physical daily wage tasks (Electricians, Plumbers, Carpenters, Masons, Housekeeping).
      
      LANGUAGE RULE (CRITICAL): 
      - You MUST reply strictly in the exact language the user is speaking to you. 
      - If the user types in clean English, reply in natural, premium English (do NOT use Hindi/Hinglish words like 'Ji', 'Arre', 'Bilkul' unless specifically prompted).
      - If the user types in Hindi, reply in clear, friendly Hindi. 
      - If the user types in Kannada, reply in clear Kannada.
      
      ACTION RULES:
      - If the user has role 'employer' and asks to post a job or book something (e.g. 'burst kitchen pipe is flooding, post a plumber job for ₹850'), you must output a JSON block at the very end of your response with action: "post_job":
        \`\`\`json
        {
          "action": "post_job",
          "title": "Emergency Plumber needed for burst kitchen pipe",
          "skillRequired": "Plumber",
          "wage": 850,
          "duration": "1 Day",
          "description": "Bursted pipe is flooding the kitchen. Needs urgent help."
        }
        \`\`\`
        Note: The skillRequired must be one of: 'Electrician', 'Plumber', 'Mason', 'Carpenter', 'Painter', 'Domestic Help', 'Cook', 'Caretaker', 'Driver', 'Loader', 'Mover', 'Tailor', 'Dhobi', 'Cobbler', 'Labourer', 'Pest Control', 'Repair'.
        
      - If the user has role 'worker' and asks to list themselves or update parameters (e.g., 'list me as available electrician for ₹700 per day'), you must output a JSON block at the very end of your response with action: "update_profile":
        \`\`\`json
        {
          "action": "update_profile",
          "dailyWage": 700,
          "experience": 4,
          "skills": ["Electrician"],
          "area": "Koramangala",
          "city": "Bengaluru"
        }
        \`\`\`
      - When formulating these actions, tell the user they need to click the green "Confirm & Publish" or "Confirm & Update" card inline in the chat log to proceed.
      
      Here is the user profile context:
      ${userProfileCtx}
      
      Here is the conversation log:
      ${nextHistory.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Sahay'}: ${m.content}`).join('\n')}
      
      Give your next coordinate response:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: systemInstruction }] }]
      });

      const aiText = response.text || "Arre, I couldn't reach my AI core right now. Let's try again in a bit!";
      
      let cleanedText = aiText;
      let actionCard = undefined;

      // Extract JSON action blocks if present
      if (aiText.includes('{') && (aiText.includes('post_job') || aiText.includes('update_profile'))) {
        try {
          const jsonStart = aiText.indexOf('{');
          const jsonEnd = aiText.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            const jsonStr = aiText.substring(jsonStart, jsonEnd);
            const parsed = JSON.parse(jsonStr);
            if (parsed.action === 'post_job') {
              actionCard = {
                type: 'post_job' as const,
                payload: parsed,
                status: 'pending' as const
              };
              cleanedText = aiText.substring(0, jsonStart).trim();
              if (!cleanedText) cleanedText = `I have formulated your Job Post listing: *"${parsed.title}"* for **₹${parsed.wage}**. Please review the details below and confirm to publish!`;
            } else if (parsed.action === 'update_profile') {
              actionCard = {
                type: 'update_profile' as const,
                payload: parsed,
                status: 'pending' as const
              };
              cleanedText = aiText.substring(0, jsonStart).trim();
              if (!cleanedText) cleanedText = `I have prepared your profile updates. Please review the details below and confirm to update your profile!`;
            }
          }
        } catch (jsonErr) {
          console.warn("AI JSON parse fail:", jsonErr);
        }
      }

      const aiMsg: ChatMessage = {
        id: 'msg-' + Math.random().toString(36).substr(2, 9),
        role: 'ai',
        content: cleanedText,
        actionCard,
        timestamp: Date.now()
      };

      saveChatHistory([...nextHistory, aiMsg]);
    } catch (e) {
      console.error(e);
      const errMsg: ChatMessage = {
        id: 'msg-err',
        role: 'ai',
        content: "Sorry, I encountered a temporary connection issue. Please make sure your API keys are configured and try again.",
        timestamp: Date.now()
      };
      saveChatHistory([...nextHistory, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (messageId: string) => {
    if (!user) return;
    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx === -1 || !messages[msgIdx].actionCard) return;

    const message = messages[msgIdx];
    const card = message.actionCard!;

    if (card.type === 'post_job') {
      try {
        const profile = await dbService.getUserProfile(user.uid);
        const currentBalance = profile?.walletBalance ?? 0;
        
        if (currentBalance < card.payload.wage) {
          toast.error("Insufficient wallet balance!", {
            description: `You need ₹${card.payload.wage} but currently have ₹${currentBalance}. Load funds under Settings first!`
          });
          return;
        }

        // Mutation post job (which deducts funds internally inside dbService.postJob!)
        await dbService.postJob({
          employerId: user.uid,
          title: card.payload.title,
          skillRequired: card.payload.skillRequired,
          wage: card.payload.wage,
          duration: card.payload.duration || '1 Day',
          date: new Date().toISOString().split('T')[0],
          description: card.payload.description,
          location: {
            area: profile?.area || 'Koramangala',
            city: profile?.city || 'Bengaluru',
            lat: 12.9352,
            lng: 77.6245
          }
        });

        toast.success("Job Auto-Posted successfully! Funds held safely in Escrow.");
        
        // Update Action status
        const nextMessages = [...messages];
        nextMessages[msgIdx] = {
          ...message,
          actionCard: {
            ...card,
            status: 'confirmed'
          }
        };
        
        // Append positive confirmation reply
        const finalConfirmMsg: ChatMessage = {
          id: 'msg-' + Math.random().toString(36).substr(2, 9),
          role: 'ai',
          content: `Ji Bilkul! Job Post for *"${card.payload.title}"* has been published onto LOKLINK successfully. Escrow funds secured.`,
          timestamp: Date.now()
        };

        saveChatHistory([...nextMessages, finalConfirmMsg]);
        window.dispatchEvent(new Event('loklink-db-updated'));
      } catch (err: any) {
        toast.error("Failed to secure and publish job: " + err.message);
      }
    } else if (card.type === 'update_profile') {
      try {
        await dbService.updateProfile(user.uid, card.payload);
        toast.success("Profile updated successfully!");

        // Update Action status
        const nextMessages = [...messages];
        nextMessages[msgIdx] = {
          ...message,
          actionCard: {
            ...card,
            status: 'confirmed'
          }
        };

        const finalConfirmMsg: ChatMessage = {
          id: 'msg-' + Math.random().toString(36).substr(2, 9),
          role: 'ai',
          content: `Great news! I have successfully updated your trade profile details. You are now fully active!`,
          timestamp: Date.now()
        };

        saveChatHistory([...nextMessages, finalConfirmMsg]);
        window.dispatchEvent(new Event('loklink-db-updated'));
      } catch (err) {
        toast.error("Failed to save profile updates.");
      }
    }
  };

  const handleCancelAction = (messageId: string) => {
    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx === -1 || !messages[msgIdx].actionCard) return;

    const message = messages[msgIdx];
    const card = message.actionCard!;

    const nextMessages = [...messages];
    nextMessages[msgIdx] = {
      ...message,
      actionCard: {
        ...card,
        status: 'cancelled'
      }
    };

    const finalCancelMsg: ChatMessage = {
      id: 'msg-' + Math.random().toString(36).substr(2, 9),
      role: 'ai',
      content: `No worries, I've cancelled the prepared transaction. Let me know if you need to adjust something else!`,
      timestamp: Date.now()
    };

    saveChatHistory([...nextMessages, finalCancelMsg]);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      
      {/* Floating Toggle Bubble */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/35 border-[3px] border-white dark:border-stone-900 cursor-pointer relative"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-stone-900 rounded-full dot-pulse" />
        )}
      </motion.button>

      {/* Floating Glassmorphic Chat Widget Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ duration: 0.25, cubicBezier: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-18 right-0 w-[90vw] sm:w-[380px] h-[500px] glass-strong rounded-[28px] shadow-2xl flex flex-col border border-stone-200/50 dark:border-stone-850 overflow-hidden"
          >
            {/* Header */}
            <header className="px-5 py-4 border-b border-stone-200/40 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center relative">
                  <Bot size={22} className="text-orange-600" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-stone-950 rounded-full" />
                </div>
                <div>
                  <h3 className="font-display font-black text-stone-900 dark:text-white text-base leading-tight">Sahay Assistant</h3>
                  <span className="text-[9px] font-bold text-stone-400 font-mono uppercase tracking-wider">AI Platform Coordinator</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleClearChat} 
                  className="rounded-full h-8 w-8 text-stone-400 hover:text-red-500"
                  title="Clear chat logs"
                >
                  <Trash2 size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsOpen(false)} 
                  className="rounded-full h-8 w-8"
                >
                  <X size={16} />
                </Button>
              </div>
            </header>

            {/* Conversation Log area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-stone-50/20 dark:bg-stone-950/10">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  <div className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ai' && (
                      <div className="h-7 w-7 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100/50">
                        <Bot size={14} />
                      </div>
                    )}
                    
                    <div className={`max-w-[78%] px-4 py-2.5 rounded-[20px] text-xs font-semibold leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-orange-500 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-stone-900 border border-stone-200/50 dark:border-stone-850 rounded-tl-none text-stone-850 dark:text-stone-100'
                    }`}>
                      {msg.content}
                    </div>
                  </div>

                  {/* Inline Action Gated Confirmation Card */}
                  {msg.actionCard && (
                    <div className="pl-9 pr-2 animate-scale-in">
                      <Card className={`p-4 border-2 shadow-md rounded-[22px] space-y-4 ${
                        msg.actionCard.status === 'confirmed' ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5' :
                        msg.actionCard.status === 'cancelled' ? 'border-stone-200 dark:border-stone-800 bg-stone-50/40 text-stone-400' :
                        'border-orange-200 dark:border-orange-850 bg-white dark:bg-stone-900'
                      }`}>
                        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-850 pb-2">
                          <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles size={12} />
                            <span>Action Required</span>
                          </span>
                          <Badge variant={
                            msg.actionCard.status === 'confirmed' ? 'success' :
                            msg.actionCard.status === 'cancelled' ? 'default' : 'warning'
                          } className="text-[8px] font-black tracking-widest uppercase">
                            {msg.actionCard.status}
                          </Badge>
                        </div>

                        {/* Action parameters breakdown */}
                        {msg.actionCard.type === 'post_job' && (
                          <div className="space-y-1.5 text-left text-[11px] font-bold text-stone-600 dark:text-stone-400">
                            <p className="text-stone-900 dark:text-white font-extrabold text-xs">📋 {msg.actionCard.payload.title}</p>
                            <div className="flex justify-between">
                              <span>Skill Required:</span>
                              <Badge variant="warning" className="text-[8px] px-1 h-4">{msg.actionCard.payload.skillRequired}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Locked Escrow Payout:</span>
                              <span className="font-extrabold text-orange-600">₹{msg.actionCard.payload.wage}/Day</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Duration:</span>
                              <span>{msg.actionCard.payload.duration || '1 Day'}</span>
                            </div>
                            <p className="text-[10px] text-stone-400 mt-1 italic font-medium">"{msg.actionCard.payload.description}"</p>
                          </div>
                        )}

                        {msg.actionCard.type === 'update_profile' && (
                          <div className="space-y-1.5 text-left text-[11px] font-bold text-stone-600 dark:text-stone-400">
                            <p className="text-stone-900 dark:text-white font-extrabold text-xs">👤 Profile Parameters Update</p>
                            {msg.actionCard.payload.dailyWage && (
                              <div className="flex justify-between">
                                <span>Preferred Daily Wage:</span>
                                <span className="font-extrabold text-orange-600">₹{msg.actionCard.payload.dailyWage}/Day</span>
                              </div>
                            )}
                            {msg.actionCard.payload.experience && (
                              <div className="flex justify-between">
                                <span>Experience Years:</span>
                                <span>{msg.actionCard.payload.experience} Years</span>
                              </div>
                            )}
                            {msg.actionCard.payload.skills && (
                              <div className="flex flex-col gap-1">
                                <span>Declared Skills:</span>
                                <div className="flex flex-wrap gap-1">
                                  {msg.actionCard.payload.skills.map((s: string) => (
                                    <Badge key={s} variant="default" className="text-[8px] px-1 py-0">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Interactive Buttons */}
                        {msg.actionCard.status === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-stone-50 dark:border-stone-850">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 h-9 rounded-xl border border-stone-200 hover:bg-stone-50 text-[10px] font-black uppercase tracking-wider text-stone-500 hover:text-stone-800"
                              onClick={() => handleCancelAction(msg.id)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex-1 h-9 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
                              onClick={() => handleConfirmAction(msg.id)}
                            >
                              <Check size={12} />
                              <span>Confirm & Post</span>
                            </Button>
                          </div>
                        )}
                      </Card>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 items-center">
                  <div className="h-7 w-7 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100/50">
                    <Bot size={14} />
                  </div>
                  <div className="px-4 py-3 rounded-[20px] rounded-tl-none bg-white dark:bg-stone-900 border border-stone-200/50 dark:border-stone-850 text-stone-400 text-xs flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-3 border-t border-stone-200/40 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleToggleVoiceInput}
                className={`rounded-full h-10 w-10 shrink-0 ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse hover:bg-red-600' 
                    : 'text-stone-400 hover:text-orange-600 hover:bg-stone-50'
                }`}
                title="Tap to record voice input"
              >
                <Mic size={18} />
              </Button>
              
              <Input
                placeholder={isRecording ? "Listening... Speak now." : "Describe issue / update profile..."}
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isRecording}
                className="flex-1 h-10 rounded-xl px-4 text-xs"
              />

              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-xl h-10 w-10 shrink-0 p-0 flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
              >
                <Send size={14} />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
