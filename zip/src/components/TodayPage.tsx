import { useState, useEffect, MouseEvent } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, deleteField } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { Goal, UserProfile } from '../types';
import { Check, Plus, Shield, Zap, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmationModal from './ConfirmationModal';

export default function TodayPage({ 
  user, 
  profile, 
  onUpdateProfile 
}: { 
  user: any, 
  profile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalText, setEditGoalText] = useState('');
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;

    // Listen to today's goals from Firestore (keeping sync for goals)
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
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/goals`);
    });

    return () => {
      unsubGoals();
    };
  }, [user, todayStr]);

  // Check if all goals are done to increment streak
  useEffect(() => {
    if (!profile || goals.length === 0 || !user) return;

    const allDone = goals.every(g => g.done);
    const alreadyCheckedInToday = profile.lastCheckin === todayStr;

    if (allDone && !alreadyCheckedInToday) {
      onUpdateProfile({
        streak: (profile.streak || 0) + 1,
        lastCheckin: todayStr
      });
    }
  }, [goals, profile, user, todayStr, onUpdateProfile]);

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
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/goals`);
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
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/goals/${goal.id}`);
    }
  };

  const handleDeleteGoal = async (goalId: string, e: MouseEvent) => {
    e.stopPropagation();
    setGoalToDelete(goalId);
  };

  const confirmDeleteGoal = async () => {
    if (!user || !goalToDelete) return;
    try {
      const goalRef = doc(db, 'users', user.uid, 'goals', goalToDelete);
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(goalRef);
      setGoalToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/goals/${goalToDelete}`);
    }
  };

  const startEditingGoal = (goal: Goal, e: MouseEvent) => {
    e.stopPropagation();
    setEditingGoalId(goal.id);
    setEditGoalText(goal.text);
  };

  const handleUpdateGoal = async (goalId: string) => {
    if (!user || !editGoalText.trim()) {
      setEditingGoalId(null);
      return;
    }
    try {
      const goalRef = doc(db, 'users', user.uid, 'goals', goalId);
      await updateDoc(goalRef, {
        text: editGoalText.trim()
      });
      setEditingGoalId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/goals/${goalId}`);
    }
  };

  const handleResetStreak = async () => {
    if (!user) return;
    onUpdateProfile({
      streak: 0,
      lastCheckin: undefined
    });
    setShowResetModal(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="pb-24"
    >
      <div className="pt-14 px-6 pb-8 relative overflow-hidden">
        <div className="absolute -top-[60px] -right-[60px] w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(212,113,74,0.08)_0%,transparent_70%)] pointer-events-none"></div>
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="font-sans text-[11px] font-bold tracking-[1.5px] uppercase text-text-tertiary mb-3 flex items-center gap-2"
        >
          <Shield size={12} className="text-accent" />
          {format(new Date(), 'MMM dd, yyyy')}
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-[32px] font-bold leading-[1.2] text-text-primary mb-2"
        >
          Your <em className="italic text-accent">Journey</em><br/>continues.
        </motion.div>
      </div>

      {/* SCORE & STREAK GRID */}
      <div className="grid grid-cols-2 gap-4 mx-6 mb-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-raised border border-border rounded-2xl p-5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-[1.2px] uppercase text-text-tertiary font-bold">Score</span>
            <Zap size={12} className="text-accent" />
          </div>
          <div className="font-serif text-[42px] font-bold text-accent leading-none mb-1">
            {profile?.score || 0}
          </div>
          <div className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">Points</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-raised border border-border rounded-2xl p-5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-[1.2px] uppercase text-text-tertiary font-bold">Streak</span>
            <div className="w-2 h-2 rounded-full bg-green" />
          </div>
          <div className="font-serif text-[42px] font-bold text-text-primary leading-none mb-1">
            {profile?.streak || 0}
          </div>
          <div className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">Days</div>
        </motion.div>
      </div>

      {/* GOALS */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-6 mb-3 flex items-center justify-between"
      >
        <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-bold">Today's 1–2 Things</span>
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
              onClick={() => editingGoalId !== goal.id && toggleGoal(goal)}
              className={`bg-surface border rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-150 active:scale-[0.98]
                ${goal.done ? 'border-green/30 bg-green/5' : 'border-border'}
              `}
            >
              <div className={`w-[24px] h-[24px] rounded-lg border-2 shrink-0 flex items-center justify-center transition-all duration-200
                ${goal.done ? 'bg-green border-green' : 'border-border'}
              `}>
                <Check size={14} className={`text-bg transition-opacity duration-150 ${goal.done ? 'opacity-100' : 'opacity-0'}`} />
              </div>
              
              {editingGoalId === goal.id ? (
                <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="text"
                    value={editGoalText}
                    onChange={(e) => setEditGoalText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateGoal(goal.id)}
                    autoFocus
                    className="flex-1 bg-surface-raised border border-accent rounded p-1 text-text-primary text-[15px] outline-none"
                  />
                  <button onClick={() => handleUpdateGoal(goal.id)} className="text-accent text-xs font-bold uppercase">Save</button>
                  <button onClick={() => setEditingGoalId(null)} className="text-text-tertiary text-xs font-bold uppercase">Cancel</button>
                </div>
              ) : (
                <>
                  <div className={`text-[15px] font-medium flex-1 leading-[1.4] transition-colors duration-200
                    ${goal.done ? 'text-text-secondary line-through' : 'text-text-primary'}
                  `}>
                    {goal.text}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={(e) => startEditingGoal(goal, e)} className="text-text-tertiary hover:text-accent transition-colors p-1">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={(e) => handleDeleteGoal(goal.id, e)} className="text-text-tertiary hover:text-red transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
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
                className="w-full bg-surface-raised border border-accent rounded-2xl p-4 text-text-primary font-sans text-[15px] outline-none placeholder:text-text-tertiary mb-3"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowInput(false)}
                  className="flex-1 py-3 text-[13px] text-text-tertiary font-bold uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddGoal}
                  disabled={!newGoalText.trim() || saving}
                  className="flex-1 py-3 bg-accent text-bg rounded-xl text-[13px] font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Confirm'}
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
              className="w-full bg-surface/50 hover:bg-surface border border-dashed border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-150 active:opacity-60"
            >
              <div className="w-[24px] h-[24px] rounded-lg border-2 border-dashed border-text-tertiary flex items-center justify-center text-text-tertiary">
                <Plus size={14} />
              </div>
              <span className="text-[14px] text-text-secondary font-bold uppercase tracking-widest">Add Objective</span>
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
          className="bg-red/5 hover:bg-red/10 border border-red/20 rounded-xl px-6 py-3 text-red font-sans text-[11px] font-bold tracking-[1.5px] uppercase cursor-pointer transition-all duration-150 active:scale-95"
        >
          Reset Streak
        </button>
      </motion.div>

      {/* MODALS */}
      <ConfirmationModal
        isOpen={!!goalToDelete}
        title="Delete Objective?"
        message="This action cannot be undone. Are you sure you want to remove this goal?"
        onConfirm={confirmDeleteGoal}
        onCancel={() => setGoalToDelete(null)}
      />

      <ConfirmationModal
        isOpen={showResetModal}
        title="Reset Streak?"
        message="This count returns to zero. Take a deep breath and start fresh. Are you sure?"
        onConfirm={handleResetStreak}
        onCancel={() => setShowResetModal(false)}
        confirmText="Reset"
      />
    </motion.div>
  );
}
