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
import ProfilePage from './components/ProfilePage';
import NotificationSettingsPage from './components/NotificationSettingsPage';
import SkipOverlay from './components/SkipOverlay';
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
  const [showSkipOverlay, setShowSkipOverlay] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Load profile from localStorage and sync with state
  const loadProfile = useCallback(() => {
    const data = JSON.parse(localStorage.getItem(`king-system-${auth.currentUser?.uid || 'guest'}`) || '{"streak":0,"score":0}');
    setProfile(data);
    return data;
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const base = prev || { streak: 0, score: 0 };
      
      const allowedFields = ['streak', 'lastCheckin', 'startDate', 'score', 'notificationTime', 'sleepTime', 'workStart', 'workEnd', 'naggingEnabled', 'naggingFrequency', 'weeklyReviewDay', 'weeklyReviewTime', 'quotas', 'graceDaysUsed', 'lastGraceDayWeek'];
      const sanitizedUpdates: any = {};
      for (const key of Object.keys(updates)) {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = (updates as any)[key];
        }
      }

      const updated = { ...base, ...sanitizedUpdates };
      localStorage.setItem(`king-system-${auth.currentUser?.uid || 'guest'}`, JSON.stringify(updated));
      
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

  // Handle URL params from notification clicks (e.g. ?action=skip&tab=submit)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const tab = params.get('tab');

    if (action === 'skip') {
      setShowSkipOverlay(true);
    }
    if (tab && ['today', 'submit', 'progress', 'journal', 'system', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }

    // Clean up URL params after reading
    if (action || tab) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auth and Score Logic
  useEffect(() => {
    const isDevMode = new URLSearchParams(window.location.search).get('dev') === 'true';

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // -- MIGRATION: Rescue old global data into this user's UID boundary --
        const uid = currentUser.uid;
        const keysToMigrate = ['king-system', 'king-inputs', 'king-submissions', 'king-score', 'king-skips', 'king-system-keys'];
        if (!localStorage.getItem(`king-system-${uid}`) && localStorage.getItem('king-system')) {
          keysToMigrate.forEach(key => {
            const oldData = localStorage.getItem(key);
            if (oldData) {
              localStorage.setItem(`${key}-${uid}`, oldData);
              localStorage.removeItem(key);
            }
          });
        }
        
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
            
            const allowedFields = ['streak', 'lastCheckin', 'startDate', 'score', 'notificationTime', 'sleepTime', 'workStart', 'workEnd', 'naggingEnabled', 'naggingFrequency', 'weeklyReviewDay', 'weeklyReviewTime', 'quotas', 'graceDaysUsed', 'lastGraceDayWeek'];
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
      } else if (isDevMode) {
        // ─── DEV AUTH BYPASS ───
        const mockUser = {
          uid: 'dev-user-123',
          displayName: 'Dev Tester',
          email: 'dev@test.com',
          photoURL: null,
        };
        setUser(mockUser);
        const savedProfile = loadProfile();
        const devProfile: UserProfile = {
          streak: 5,
          score: 42,
          startDate: todayStr,
          notificationTime: '08:00',
          sleepTime: '23:00',
          workStart: '10:00',
          workEnd: '20:00',
          naggingEnabled: true,
          naggingFrequency: 3,
          weeklyReviewDay: 0,
          weeklyReviewTime: '20:00',
          ...savedProfile,
        };
        updateProfile(devProfile);
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
          const history: ScoreHistory[] = JSON.parse(localStorage.getItem(`king-score-${auth.currentUser?.uid || 'guest'}`) || '[]');
          localStorage.setItem(`king-score-${auth.currentUser?.uid || 'guest'}`, JSON.stringify([...history, { date: todayStr, score: newScore }]));
        }
      }
    }
  }, [profile, user, todayStr, updateProfile]);

  // ─── 6-Tier Notification Engine ─────────────────────────────────
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !profile) return;

    // Helper: parse "HH:mm" to { h, m }
    const parseTime = (t: string) => {
      const [h, m] = (t || '00:00').split(':').map(Number);
      return { h, m };
    };

    // Helper: get minutes since midnight
    const toMinutes = (h: number, m: number) => h * 60 + m;

    // Prevent duplicate notifications per type per day
    const notifKey = (type: string) => `notif-${type}-${todayStr}`;
    const hasFired = (type: string) => localStorage.getItem(notifKey(type)) === 'true';
    const markFired = (type: string) => localStorage.setItem(notifKey(type), 'true');

    const checkNotifications = () => {
      const now = new Date();
      const nowH = now.getHours();
      const nowM = now.getMinutes();
      const nowMin = toMinutes(nowH, nowM);

      const wake = parseTime(profile.notificationTime || '08:00');
      const sleep = parseTime(profile.sleepTime || '23:00');
      const wakeMin = toMinutes(wake.h, wake.m);
      const sleepMin = toMinutes(sleep.h, sleep.m);

      // Don't fire anything outside wake-sleep window
      if (nowMin < wakeMin || nowMin > sleepMin) return;

      const wsH = parseTime(profile.workStart || '10:00').h;
      const weH = parseTime(profile.workEnd || '20:00').h;
      const naggingEnabled = profile.naggingEnabled !== false;
      const naggingFreq = profile.naggingFrequency || 3;

      // Data checks
      const submissions: Submission[] = JSON.parse(localStorage.getItem(`king-submissions-${auth.currentUser?.uid || 'guest'}`) || '[]');
      const hasOutputToday = submissions.some(s => s.date === todayStr);
      const todayInputs = JSON.parse(localStorage.getItem(`king-inputs-${auth.currentUser?.uid || 'guest'}`) || '[]')
        .filter((i: any) => i.date === todayStr);
      const hasInputToday = todayInputs.length > 0;

      // ── [A] MORNING BRIEF ── 15 min after wake time, once daily
      const briefMin = wakeMin + 15;
      if (nowMin === briefMin && !hasFired('morning-brief')) {
        markFired('morning-brief');
        new Notification('The System Journal', {
          body: `Day ${Math.max(1, Math.ceil((Date.now() - new Date(profile.startDate || todayStr).getTime()) / 86400000))} · Score: ${profile.score || 0} · Streak: ${profile.streak || 0}`,
          icon: '/icons/icon-192x192.png',
          tag: 'morning-brief'
        });
      }

      // ── [B] INPUT CHECK ── 2h after wake, only if no input logged
      const inputCheckMin = wakeMin + 120;
      if (nowMin === inputCheckMin && !hasInputToday && !hasFired('input-check')) {
        markFired('input-check');
        new Notification('The System Journal', {
          body: 'What are you consuming today? Log it.',
          icon: '/icons/icon-192x192.png',
          tag: 'input-check'
        });
      }

      // ── [C] OUTPUT NUDGE ── Every naggingFreq hours during work window
      if (naggingEnabled && !hasOutputToday && nowH >= wsH && nowH <= weH) {
        if ((nowH - wsH) % naggingFreq === 0 && nowM === 0) {
          const nudgeKey = `output-nudge-${nowH}`;
          if (!hasFired(nudgeKey)) {
            markFired(nudgeKey);
            new Notification('The System Journal', {
              body: 'No output yet today. Your score is decaying.',
              icon: '/icons/icon-192x192.png',
              tag: 'output-nudge'
            });
          }
        }
      }

      // ── [D] RATIO WARNING ── 2h before sleep, if input but no output
      const ratioWarnMin = sleepMin - 120;
      if (nowMin === ratioWarnMin && hasInputToday && !hasOutputToday && !hasFired('ratio-warning')) {
        markFired('ratio-warning');
        new Notification('The System Journal', {
          body: 'You consumed but didn\'t create today. -15 points in 2 hours.',
          icon: '/icons/icon-192x192.png',
          tag: 'ratio-warning'
        });
      }

      // ── [F] WEEKLY REVIEW ── user-configured day + time
      const reviewDay = profile.weeklyReviewDay ?? 0;
      const reviewTime = parseTime(profile.weeklyReviewTime || '20:00');
      if (now.getDay() === reviewDay && nowH === reviewTime.h && nowM === reviewTime.m && !hasFired('weekly-review')) {
        markFired('weekly-review');
        new Notification('The System Journal', {
          body: 'Your weekly review is ready. Open for full progress.',
          icon: '/icons/icon-192x192.png',
          tag: 'weekly-review'
        });
      }
    };

    // Run once immediately + every minute
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);
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
          {activeTab === 'progress' && <ProgressPage />}
          {activeTab === 'journal' && <JournalPage user={user} />}
          {activeTab === 'system' && <SystemPage user={user} profile={profile} onUpdateProfile={updateProfile} />}
          {activeTab === 'profile' && <ProfilePage user={user} profile={profile} onUpdateProfile={updateProfile} onNavigateToNotifications={() => setActiveTab('notifications')} />}
          {activeTab === 'notifications' && <NotificationSettingsPage profile={profile} onUpdateProfile={updateProfile} onBack={() => setActiveTab('profile')} />}
        </motion.div>
      </AnimatePresence>
      
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Skip Overlay — renders above everything */}
      <AnimatePresence>
        {showSkipOverlay && (
          <SkipOverlay
            profile={profile}
            onUpdateProfile={updateProfile}
            onClose={() => setShowSkipOverlay(false)}
            onSubmitInstead={() => {
              setShowSkipOverlay(false);
              setActiveTab('submit');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
