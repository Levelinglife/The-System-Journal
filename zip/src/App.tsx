import { useEffect, useState, useCallback } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { format, differenceInDays, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import TodayPage from './components/TodayPage';
import JournalPage from './components/JournalPage';
import SystemPage from './components/SystemPage';
import SubmitPage from './components/SubmitPage';
import ProgressPage from './components/ProgressPage';
import BottomNav from './components/BottomNav';
import { X } from 'lucide-react';
import { UserProfile, ScoreHistory, Submission } from './types';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Load profile from localStorage and sync with state
  const loadProfile = useCallback(() => {
    const data = JSON.parse(localStorage.getItem('king-system') || '{"streak":0,"score":0}');
    setProfile(data);
    return data;
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const base = prev || { streak: 0, score: 0 };
      
      const allowedFields = ['streak', 'lastCheckin', 'startDate', 'score', 'notificationTime', 'naggingEnabled', 'naggingFrequency'];
      const sanitizedUpdates: any = {};
      for (const key of Object.keys(updates)) {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = (updates as any)[key];
        }
      }

      const updated = { ...base, ...sanitizedUpdates };
      localStorage.setItem('king-system', JSON.stringify(updated));
      
      // Sync to Firestore if user is logged in
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        updateDoc(userRef, sanitizedUpdates).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
      }
      
      return updated;
    });
  }, []);

  // Theme initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    }
  }, []);

  // PWA Service Worker Registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('SW registered:', reg))
          .catch(err => console.log('SW registration failed:', err));
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      const dismissedAt = localStorage.getItem('installPromptDismissed');
      let shouldShow = true;
      if (dismissedAt) {
        const daysSinceDismissal = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissal < 7) {
          shouldShow = false;
        }
      }

      if (shouldShow) {
        // Delay the prompt so it doesn't interrupt the initial user flow
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 5000);
      }
    });
  }, []);

  // Auth and Score Logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          let currentProfile = loadProfile();

          if (!userSnap.exists()) {
            const initialProfile: UserProfile = {
              streak: 0,
              score: 0,
              startDate: todayStr,
              notificationTime: '08:00',
              naggingEnabled: true,
              naggingFrequency: 3,
              ...currentProfile
            };
            
            const allowedFields = ['streak', 'lastCheckin', 'startDate', 'score', 'notificationTime', 'naggingEnabled', 'naggingFrequency'];
            const sanitizedProfile: any = {};
            for (const key of Object.keys(initialProfile)) {
              if (allowedFields.includes(key)) {
                sanitizedProfile[key] = (initialProfile as any)[key];
              }
            }
            
            await setDoc(userRef, sanitizedProfile);
            updateProfile(sanitizedProfile);
          } else {
            const remoteData = userSnap.data() as UserProfile;
            const merged = { ...currentProfile, ...remoteData };
            updateProfile(merged);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loadProfile, updateProfile, todayStr]);

  // Score Deduction Logic
  useEffect(() => {
    if (!profile || !user) return;

    if (profile.lastCheckin) {
      const lastDate = parseISO(profile.lastCheckin);
      const diff = differenceInDays(new Date(todayStr), lastDate);
      
      if (diff > 1) {
        const missedDays = diff - 1;
        const deduction = missedDays * 15;
        const newScore = Math.max(-100, (profile.score || 0) - deduction);
        
        if (newScore !== profile.score) {
          updateProfile({ 
            score: newScore,
            lastCheckin: todayStr // Prevent repeated deduction
          });
          
          // Update history
          const history: ScoreHistory[] = JSON.parse(localStorage.getItem('king-score') || '[]');
          localStorage.setItem('king-score', JSON.stringify([...history, { date: todayStr, score: newScore }]));
        }
      }
    }
  }, [profile, user, todayStr, updateProfile]);

  // Notification Logic
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !profile) return;

    const checkNotifications = () => {
      const now = new Date();
      const currentHourMin = format(now, 'HH:mm');
      
      // 1. Morning Briefing
      if (currentHourMin === profile.notificationTime) {
        new Notification('The System Journal', {
          body: `Morning briefing: Your streak is at ${profile.streak}. Don't break it today.`,
          icon: '/icons/icon-192x192.png'
        });
      }

      // 2. Nagging Alerts
      const submissions: Submission[] = JSON.parse(localStorage.getItem('king-submissions') || '[]');
      const hasSubmittedToday = submissions.some(s => s.date === todayStr);

      const naggingEnabled = profile.naggingEnabled !== false;
      const naggingFreq = profile.naggingFrequency || 3;

      if (naggingEnabled && !hasSubmittedToday) {
        const hour = now.getHours();
        // Nag between 12:00 and 21:00 based on frequency
        if (hour >= 12 && hour <= 21 && (hour - 12) % naggingFreq === 0 && now.getMinutes() === 0) {
          new Notification('The System Journal', {
            body: "You haven't submitted your proof today. The System is waiting.",
            icon: '/icons/icon-192x192.png'
          });
        }
      }
    };

    const interval = setInterval(checkNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [profile, todayStr]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  const dismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-tertiary bg-bg">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-bg"
      >
        <div className="mb-8 relative">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(212,113,74,0.08)_0%,transparent_70%)] pointer-events-none"></div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-serif text-5xl font-bold leading-tight mb-2 text-text-primary"
          >
            The <em className="italic text-accent">System</em>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-sm text-text-tertiary font-medium tracking-wide"
          >
            EXPRESSION IS THE ONLY REAL ACT YOU OWN.
          </motion.p>
        </div>
        <motion.button 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          onClick={handleLogin}
          className="bg-accent border border-accent rounded-xl py-4 px-10 text-bg font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-accent/20"
        >
          Enter The System
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="relative min-h-screen w-full max-w-[420px] mx-auto bg-bg">
      <AnimatePresence>
        {deferredPrompt && showInstallPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-surface-raised border border-accent/30 rounded-xl p-4 flex items-center justify-between z-[100] shadow-2xl"
          >
            <div className="flex flex-col pr-2">
              <span className="text-xs font-bold text-text-primary">Install The System</span>
              <span className="text-[10px] text-text-secondary">Add to home screen for notifications</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleInstall}
                className="bg-accent text-bg text-[10px] font-bold px-4 py-2 rounded-lg transition-transform active:scale-95"
              >
                Install
              </button>
              <button onClick={dismissInstall} className="text-text-tertiary hover:text-text-primary transition-colors">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen pb-24"
        >
          {activeTab === 'today' && <TodayPage user={user} profile={profile} onUpdateProfile={updateProfile} />}
          {activeTab === 'submit' && <SubmitPage user={user} profile={profile} onUpdateProfile={updateProfile} />}
          {activeTab === 'progress' && <ProgressPage user={user} />}
          {activeTab === 'journal' && <JournalPage user={user} />}
          {activeTab === 'system' && <SystemPage user={user} profile={profile} onUpdateProfile={updateProfile} />}
        </motion.div>
      </AnimatePresence>
      
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
