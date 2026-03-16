import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc, where, deleteField } from 'firebase/firestore';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Goal, UserProfile } from '../types';
import { Check, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TodayPage({ user }: { user: any }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;

    // Listen to user profile
    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        
        // Auto-reset streak if missed a day
        if (data.lastCheckin) {
          const daysDiff = differenceInDays(new Date(), parseISO(data.lastCheckin));
          if (daysDiff > 1 && data.streak > 0) {
            updateDoc(userRef, { streak: 0 });
          }
        }
        
        setProfile(data);
      }
    }, (error) => {
      console.error('Error fetching user profile:', error);
    });

    // Listen to today's goals
    const q = query(
      collection(db, 'users', user.uid, 'goals'),
      where('date', '==', todayStr),
      orderBy('createdAt', 'asc')
    );

    const unsubGoals = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Goal[];
      setGoals(data);
    }, (error) => {
      console.error('Error fetching goals:', error);
    });

    return () => {
      unsubUser();
      unsubGoals();
    };
  }, [user, todayStr]);

  // Check if all goals are done to increment streak
  useEffect(() => {
    if (!profile || goals.length === 0 || !user) return;

    const allDone = goals.every(g => g.done);
    const alreadyCheckedInToday = profile.lastCheckin === todayStr;

    if (allDone && !alreadyCheckedInToday) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        streak: profile.streak + 1,
        lastCheckin: todayStr
      });
    }
  }, [goals, profile, user, todayStr]);

  const handleAddGoal = async () => {
    if (!newGoalText.trim() || !user || saving) return;
    setSaving(true);
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'goals'), {
        text: newGoalText.trim(),
        done: false,
        date: todayStr,
        createdAt: serverTimestamp()
      });
      setNewGoalText('');
      setShowInput(false);
    } catch (error) {
      console.error('Error adding goal:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = async (goal: Goal) => {
    if (!user) return;
    try {
      const goalRef = doc(db, 'users', user.uid, 'goals', goal.id);
      await updateDoc(goalRef, {
        done: !goal.done
      });
    } catch (error) {
      console.error('Error toggling goal:', error);
    }
  };

  const handleResetStreak = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        streak: 0,
        lastCheckin: deleteField()
      });
      setShowResetModal(false);
    } catch (error) {
      console.error('Error resetting streak:', error);
    }
  };

  const renderDots = () => {
    if (!profile?.startDate) return null;
    
    const start = parseISO(profile.startDate);
    const daysSinceStart = differenceInDays(new Date(), start) + 1;
    const dotsCount = Math.min(daysSinceStart, 14); // Show up to 14 dots
    
    const dots = [];
    for (let i = 0; i < dotsCount; i++) {
      const isToday = i === dotsCount - 1;
      const isDone = profile.streak >= (dotsCount - i) || (isToday && profile.lastCheckin === todayStr);
      
      dots.push(
        <motion.div 
          key={i} 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[9px] font-medium transition-all duration-150
            ${isDone ? 'bg-accent-dim border-accent text-accent' : 'bg-surface border-border text-text-tertiary'}
            ${isToday && !isDone ? 'border-accent text-accent shadow-[0_0_0_2px_rgba(212,113,74,0.15)]' : ''}
          `}
        >
          {i + 1}
        </motion.div>
      );
    }
    return dots;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="pt-14 px-6 pb-8 relative overflow-hidden">
        <div className="absolute -top-[60px] -right-[60px] w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(200,169,110,0.08)_0%,transparent_70%)] pointer-events-none"></div>
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-text-tertiary mb-3"
        >
          {format(new Date(), 'MMM dd, yyyy')}
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-[28px] font-light leading-[1.35] text-text-primary mb-2"
        >
          Expression is the only<br/><em className="italic text-accent">real act</em> you own.
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[13px] text-text-tertiary font-light mt-1.5"
        >
          Everything else is borrowed. This moment is yours.
        </motion.div>
      </div>

      {/* STREAK CARD */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-6 mb-6 bg-surface-raised border border-border rounded-2xl p-5 relative overflow-hidden"
      >
        <div className="absolute -bottom-5 -right-5 w-[120px] h-[120px] rounded-full bg-[radial-gradient(circle,rgba(212,113,74,0.08)_0%,transparent_70%)] pointer-events-none"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] tracking-[1.2px] uppercase text-text-tertiary font-medium">Current Streak</span>
          <span className="text-[10px] tracking-[0.8px] uppercase text-accent bg-[rgba(212,113,74,0.25)] px-2.5 py-1 rounded-full font-medium">
            {profile?.streak && profile.streak > 0 ? 'Active' : 'Start'}
          </span>
        </div>
        <div className="font-serif text-[64px] font-bold text-accent leading-none mb-1">
          {profile?.streak || 0}
        </div>
        <div className="text-[13px] text-text-secondary font-light">days in a row</div>
        <div className="flex gap-1.5 mt-5 flex-wrap">
          {renderDots()}
        </div>
      </motion.div>

      {/* GOALS */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-6 mb-3 flex items-center justify-between"
      >
        <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-medium">Today's 1–2 Things</span>
      </motion.div>

      <div className="flex flex-col gap-2.5 mx-6 mb-6">
        <AnimatePresence>
          {goals.map((goal, index) => (
            <motion.div 
              key={goal.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => toggleGoal(goal)}
              className={`bg-surface border rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer transition-colors duration-150 active:scale-98
                ${goal.done ? 'border-[rgba(122,158,126,0.3)] bg-[rgba(122,158,126,0.06)]' : 'border-border'}
              `}
            >
              <div className={`w-[22px] h-[22px] rounded-md border-[1.5px] shrink-0 flex items-center justify-center transition-all duration-200
                ${goal.done ? 'bg-green border-green' : 'border-border'}
              `}>
                <Check size={14} className={`text-bg transition-opacity duration-150 ${goal.done ? 'opacity-100' : 'opacity-0'}`} />
              </div>
              <div className={`text-[15px] font-light flex-1 leading-[1.4] transition-colors duration-200
                ${goal.done ? 'text-text-secondary line-through decoration-[rgba(240,237,230,0.2)]' : 'text-text-primary'}
              `}>
                {goal.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ADD GOAL */}
      <div className="mx-6 mb-6">
        <AnimatePresence mode="wait">
          {showInput ? (
            <motion.div 
              key="input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <input 
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                placeholder="Write it simply..."
                maxLength={80}
                autoFocus
                className="w-full bg-surface-raised border border-accent rounded-2xl p-3.5 text-text-primary font-sans text-[15px] outline-none placeholder:text-text-tertiary mb-2"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowInput(false)}
                  className="flex-1 py-2 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddGoal}
                  disabled={!newGoalText.trim() || saving}
                  className="flex-1 py-2 bg-accent text-bg rounded-lg text-[13px] font-bold disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Goal'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button 
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInput(true)}
              className="w-full bg-surface/50 hover:bg-surface border border-dashed border-[rgba(255,255,255,0.15)] rounded-2xl p-3.5 flex items-center gap-2.5 cursor-pointer transition-all duration-150 active:opacity-60"
            >
              <div className="w-[22px] h-[22px] rounded-md border-[1.5px] border-text-secondary flex items-center justify-center text-text-secondary">
                <Plus size={14} />
              </div>
              <span className="text-[14px] text-text-primary font-medium">Add a goal for today</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* RESET */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mx-6 mb-16 text-center"
      >
        <button 
          onClick={() => setShowResetModal(true)}
          className="bg-[rgba(192,97,74,0.05)] hover:bg-[rgba(192,97,74,0.1)] border border-[rgba(192,97,74,0.3)] rounded-lg px-5 py-2.5 text-red font-sans text-[12px] font-medium tracking-[0.8px] uppercase cursor-pointer transition-all duration-150 active:scale-95"
        >
          Reset Streak to Zero
        </button>
      </motion.div>

      {/* RESET MODAL */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-end justify-center z-[200] p-4 pb-8"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-surface-raised border border-border rounded-3xl p-6 w-full max-w-[420px]"
            >
              <div className="font-serif text-[20px] font-light mb-2 text-text-primary">Reset streak to zero?</div>
              <div className="text-[14px] text-text-secondary mb-6 leading-[1.6] font-light">
                This cannot be undone. The number goes back to 0. Own it and start again.
              </div>
              <div className="flex gap-2.5">
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 p-3.5 bg-surface border border-border rounded-xl text-text-secondary font-sans text-[14px] cursor-pointer transition-all duration-150 active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleResetStreak}
                  className="flex-1 p-3.5 bg-[rgba(192,97,74,0.15)] border border-[rgba(192,97,74,0.3)] rounded-xl text-red font-sans text-[14px] font-medium cursor-pointer transition-all duration-150 active:scale-95"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="h-24"></div>
    </motion.div>
  );
}
