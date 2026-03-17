import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { ReactNode, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Moon, Sun, Bell } from 'lucide-react';
import { UserProfile } from '../types';

export default function SystemPage({ 
  user, 
  profile, 
  onUpdateProfile 
}: { 
  user: any, 
  profile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void
}) {
  const [isLight, setIsLight] = useState(false);
  const [notifTime, setNotifTime] = useState(profile?.notificationTime || '08:00');
  const [naggingEnabled, setNaggingEnabled] = useState(profile?.naggingEnabled !== false);
  const [naggingFreq, setNaggingFreq] = useState(profile?.naggingFrequency || 3);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'));
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
    const keys = JSON.parse(localStorage.getItem('king-system-keys') || '{}');
    if (keys.gemini) setGeminiKey(keys.gemini);
    if (keys.anthropic) setAnthropicKey(keys.anthropic);
  }, []);

  const saveKeys = (gKey: string, aKey: string) => {
    const keys = { gemini: gKey, anthropic: aKey };
    localStorage.setItem('king-system-keys', JSON.stringify(keys));
  };

  const handleGeminiKeyChange = (e: any) => {
    const val = e.target.value;
    setGeminiKey(val);
    saveKeys(val, anthropicKey);
  };

  const handleAnthropicKeyChange = (e: any) => {
    const val = e.target.value;
    setAnthropicKey(val);
    saveKeys(geminiKey, val);
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  const handleTimeChange = (e: any) => {
    const newTime = e.target.value;
    setNotifTime(newTime);
    onUpdateProfile({ notificationTime: newTime });
  };

  const toggleNagging = () => {
    const newVal = !naggingEnabled;
    setNaggingEnabled(newVal);
    onUpdateProfile({ naggingEnabled: newVal });
  };

  const handleFreqChange = (e: any) => {
    const val = parseInt(e.target.value, 10);
    setNaggingFreq(val);
    onUpdateProfile({ naggingFrequency: val });
  };

  const toggleTheme = () => {
    const isCurrentlyLight = document.documentElement.classList.contains('light');
    if (isCurrentlyLight) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setIsLight(false);
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsLight(true);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="pt-14 px-6 pb-8 relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(200,169,110,0.08)_0%,transparent_70%)] pointer-events-none"></div>
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-text-tertiary mb-3"
        >
          The Rules
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-[28px] font-light leading-[1.35] text-text-primary mb-2"
        >
          When you are<br/><em className="italic text-accent">lost</em>, read this.
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[13px] text-text-tertiary font-light mt-1.5"
        >
          This is why you started.
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-6 mb-3 flex items-center justify-between"
      >
        <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-medium">Core Principles</span>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-2 mx-6 mb-6"
      >
        <RuleItem variants={itemVariants} text={<><strong>Stare at wall.</strong> Boring is rest. Your brain has limited bandwidth — use it carefully.</>} />
        <RuleItem variants={itemVariants} text={<><strong>One thing at a time.</strong> Not two. Not three. One.</>} />
        <RuleItem variants={itemVariants} text={<><strong>Do not stop in the middle.</strong> Finish. Even if it's bad. Bad and done beats perfect and abandoned.</>} />
        <RuleItem variants={itemVariants} text={<><strong>Discipline is self-love.</strong> Remember this when the urge to quit arrives.</>} />
        <RuleItem variants={itemVariants} text={<><strong>No screens without intention.</strong> Before any screen — define purpose, set a time. Doing nothing is better than distracted consumption.</>} />
        <RuleItem variants={itemVariants} text={<><strong>No new things.</strong> You know enough to start. Pick what you need as you go.</>} />
        <RuleItem variants={itemVariants} text={<><strong>Deadline: before you sleep.</strong> 1–2 goals. No negotiation. No excuses.</>} />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-6 mb-3 flex items-center justify-between mt-2"
      >
        <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-medium">The Goal — 90 Days</span>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-2 mx-6 mb-6"
      >
        <div className="flex items-start gap-2.5 p-3 bg-accent-glow border border-[rgba(200,169,110,0.2)] rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5 opacity-100"></div>
          <div className="text-[13px] text-text-primary font-light leading-relaxed">
            Express. Learn. Get feedback. Repeat. Content creation is just the medium. <em className="text-accent italic">Expression is the real act.</em>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="px-6 mb-3 flex items-center justify-between mt-6"
      >
        <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-medium">AI API Keys</span>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mx-6 mb-6 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-2 p-3 bg-surface border border-border rounded-lg">
          <div className="flex flex-col">
            <span className="text-[13px] text-text-primary font-medium">Gemini API Key</span>
            <span className="text-[11px] text-text-tertiary">Optional. Overrides the platform default.</span>
          </div>
          <input 
            type="password" 
            value={geminiKey}
            onChange={handleGeminiKeyChange}
            placeholder="AIzaSy..."
            className="bg-surface-raised border border-border rounded px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent w-full"
          />
        </div>

        <div className="flex flex-col gap-2 p-3 bg-surface border border-border rounded-lg">
          <div className="flex flex-col">
            <span className="text-[13px] text-text-primary font-medium">Anthropic API Key</span>
            <span className="text-[11px] text-text-tertiary">Required to use Claude models.</span>
          </div>
          <input 
            type="password" 
            value={anthropicKey}
            onChange={handleAnthropicKeyChange}
            placeholder="sk-ant-..."
            className="bg-surface-raised border border-border rounded px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-accent w-full"
          />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="px-6 mb-3 flex items-center justify-between mt-6"
      >
        <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-medium">Notifications</span>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mx-6 mb-6 flex flex-col gap-3"
      >
        {notifPermission !== 'granted' && (
          <button 
            onClick={requestPermission}
            className="flex items-center justify-center gap-2 w-full p-3 bg-accent/10 border border-accent/20 rounded-lg text-accent text-[13px] font-medium transition-all active:scale-95"
          >
            <Bell size={16} />
            Enable Notifications
          </button>
        )}

        <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
          <div className="flex flex-col">
            <span className="text-[13px] text-text-primary font-medium">Morning Briefing</span>
            <span className="text-[11px] text-text-tertiary">Daily report time</span>
          </div>
          <input 
            type="time" 
            value={notifTime}
            onChange={handleTimeChange}
            className="bg-surface-raised border border-border rounded px-2 py-1 text-[13px] text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
          <div className="flex flex-col">
            <span className="text-[13px] text-text-primary font-medium">Nagging Alerts</span>
            <span className="text-[11px] text-text-tertiary">Reminders if no submission</span>
          </div>
          <button 
            onClick={toggleNagging}
            className={`w-10 h-5 rounded-full relative transition-colors ${naggingEnabled ? 'bg-accent' : 'bg-surface-raised border border-border'}`}
          >
            <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-transform ${naggingEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {naggingEnabled && (
          <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
            <div className="flex flex-col">
              <span className="text-[13px] text-text-primary font-medium">Nagging Frequency</span>
              <span className="text-[11px] text-text-tertiary">Hours between alerts (12PM - 9PM)</span>
            </div>
            <select 
              value={naggingFreq}
              onChange={handleFreqChange}
              className="bg-surface-raised border border-border rounded px-2 py-1 text-[13px] text-text-primary focus:outline-none focus:border-accent"
            >
              <option value={2}>Every 2 hours</option>
              <option value={3}>Every 3 hours</option>
              <option value={4}>Every 4 hours</option>
            </select>
          </div>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="mx-6 mt-4 mb-4 flex justify-center"
      >
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-2 bg-surface hover:bg-surface-raised border border-border rounded-lg px-6 py-3 text-text-primary font-medium transition-all duration-150 active:scale-95"
        >
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
          {isLight ? 'Dark Mode' : 'Light Mode'}
        </button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mx-6 mb-16 text-center"
      >
        <button 
          onClick={handleLogout}
          className="bg-surface hover:bg-surface-raised border border-border rounded-lg px-6 py-3 text-text-primary font-bold text-xs uppercase tracking-wider transition-all duration-150 active:scale-95"
        >
          Sign Out
        </button>
      </motion.div>
      
      <div className="h-24"></div>
    </motion.div>
  );
}

function RuleItem({ text, variants }: { text: ReactNode, variants?: any }) {
  return (
    <motion.div 
      variants={variants}
      className="flex items-start gap-2.5 p-3 bg-surface border border-border rounded-lg"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5 opacity-60"></div>
      <div className="text-[13px] text-text-secondary font-light leading-relaxed [&_strong]:text-text-primary [&_strong]:font-medium">
        {text}
      </div>
    </motion.div>
  );
}
