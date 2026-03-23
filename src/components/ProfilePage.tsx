import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Moon, Sun, Bell, Shield, LogOut, ChevronRight, User } from 'lucide-react';
import { UserProfile } from '../types';

export default function ProfilePage({
  user,
  profile,
  onUpdateProfile,
  onNavigateToNotifications
}: {
  user: any,
  profile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void,
  onNavigateToNotifications: () => void
}) {
  const [isLight, setIsLight] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showGemini, setShowGemini] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'));
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

  const dayNumber = profile?.startDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(profile.startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="pt-14 px-6 pb-6 relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(200,169,110,0.08)_0%,transparent_70%)] pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-4 mb-6"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full border-2 border-accent/30 object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
              <User size={24} className="text-accent" />
            </div>
          )}
          <div>
            <div className="font-serif text-xl font-semibold text-text-primary leading-tight">
              {user?.displayName || 'Warrior'}
            </div>
            <div className="text-[11px] text-text-tertiary font-medium mt-0.5">
              Day {dayNumber} of 90 · Score: {profile?.score || 0}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Settings Sections */}
      <div className="px-6 space-y-6 pb-32">

        {/* ── Appearance ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold mb-3">Appearance</div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-4 bg-surface border border-border rounded-2xl transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              {isLight ? <Moon size={18} className="text-accent" /> : <Sun size={18} className="text-accent" />}
              <span className="text-[13px] text-text-primary font-medium">
                {isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              </span>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-colors ${isLight ? 'bg-accent' : 'bg-surface-raised border border-border'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isLight ? 'left-6' : 'left-1'}`} />
            </div>
          </button>
        </motion.div>

        {/* ── Notifications ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold mb-3">Notifications</div>
          <button
            onClick={onNavigateToNotifications}
            className="w-full flex items-center justify-between p-4 bg-surface border border-border rounded-2xl transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-accent" />
              <div className="text-left">
                <div className="text-[13px] text-text-primary font-medium">Notification Settings</div>
                <div className="text-[11px] text-text-tertiary">Schedule, nagging, weekly review</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
        </motion.div>

        {/* ── API Keys ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold mb-3 flex items-center gap-1.5">
            <Shield size={12} className="text-text-tertiary" />
            API Keys
          </div>
          <div className="text-[10px] text-text-tertiary mb-3 leading-relaxed">
            Keys are stored locally on your device. They are <strong className="text-text-secondary">never sent anywhere</strong> except directly to the Gemini or Anthropic API endpoints.
          </div>

          <div className="flex flex-col gap-3">
            {/* Gemini Key */}
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-text-primary font-medium">Gemini API Key</div>
                  <div className="text-[10px] text-text-tertiary">
                    {geminiKey ? '✓ Key saved' : 'Not set — required for AI feedback'}
                  </div>
                </div>
                <button
                  onClick={() => setShowGemini(!showGemini)}
                  className="text-[10px] text-accent font-bold uppercase tracking-wider"
                >
                  {showGemini ? 'Hide' : 'Edit'}
                </button>
              </div>
              {showGemini && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  type="password"
                  value={geminiKey}
                  onChange={handleGeminiKeyChange}
                  placeholder="AIzaSy..."
                  className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                />
              )}
            </div>

            {/* Anthropic Key */}
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-text-primary font-medium">Anthropic API Key</div>
                  <div className="text-[10px] text-text-tertiary">
                    {anthropicKey ? '✓ Key saved' : 'Optional — for Claude models'}
                  </div>
                </div>
                <button
                  onClick={() => setShowAnthropic(!showAnthropic)}
                  className="text-[10px] text-accent font-bold uppercase tracking-wider"
                >
                  {showAnthropic ? 'Hide' : 'Edit'}
                </button>
              </div>
              {showAnthropic && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  type="password"
                  value={anthropicKey}
                  onChange={handleAnthropicKeyChange}
                  placeholder="sk-ant-..."
                  className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Sign Out ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="pt-4"
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-surface border border-red/20 rounded-2xl text-red text-[12px] font-bold uppercase tracking-[2px] transition-all active:scale-[0.98] hover:bg-red/5"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
