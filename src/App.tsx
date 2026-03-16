import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import TodayPage from './components/TodayPage';
import JournalPage from './components/JournalPage';
import SystemPage from './components/SystemPage';
import BottomNav from './components/BottomNav';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Ensure user profile exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            streak: 0,
            startDate: format(new Date(), 'yyyy-MM-dd')
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-tertiary">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
      >
        <div className="mb-8 relative">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(200,169,110,0.08)_0%,transparent_70%)] pointer-events-none"></div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-serif text-4xl font-light leading-tight mb-2 text-text-primary"
          >
            The <em className="italic text-accent">System</em>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-sm text-text-tertiary font-light"
          >
            Expression is the only real act you own.
          </motion.p>
        </div>
        <motion.button 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          onClick={handleLogin}
          className="bg-accent border border-accent rounded-lg py-3 px-6 text-bg font-bold hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="relative min-h-screen w-full max-w-[420px] mx-auto pb-[120px]">
      <AnimatePresence mode="wait">
        {activeTab === 'today' && <TodayPage key="today" user={user} />}
        {activeTab === 'journal' && <JournalPage key="journal" user={user} />}
        {activeTab === 'system' && <SystemPage key="system" user={user} />}
      </AnimatePresence>
      
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
