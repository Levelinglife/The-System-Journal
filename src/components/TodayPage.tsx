import { useState, useEffect, MouseEvent } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, deleteField } from 'firebase/firestore';
import { format, parseISO, subDays } from 'date-fns';
import { Goal, UserProfile } from '../types';
import { Check, Plus, Shield, Zap, Trash2, Edit2, Calendar, Flag, Activity } from 'lucide-react';
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
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'low' | 'medium' | 'high' | ''>('');
  const [showExtras, setShowExtras] = useState(false);
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [viewDate, setViewDate] = useState(todayStr);

  useEffect(() => {
    if (!user) return;

    // Listen to today's goals from Firestore (keeping sync for goals)
    const q = query(
      collection(db, 'users', user.uid, 'goals'),
      where('date', '==', viewDate),
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

  // Check if all goals are done to increment Goal Streak
  useEffect(() => {
    if (!profile || goals.length === 0 || !user || viewDate !== todayStr) return;

    const allDone = goals.every(g => g.done);
    const alreadyGoalCheckedInToday = profile.lastGoalCheckin === todayStr;

    if (allDone && !alreadyGoalCheckedInToday) {
      onUpdateProfile({
        goalStreak: (profile.goalStreak || 0) + 1,
        lastGoalCheckin: todayStr
      });
    }
  }, [goals, profile?.lastGoalCheckin, profile?.goalStreak, user, todayStr, viewDate, onUpdateProfile]);

  const handleAddGoal = async () => {
    if (!newGoalText.trim() || !user || saving) return;
    setSaving(true);
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'goals'), {
        text: newGoalText.trim(),
        done: false,
        date: viewDate, // Add goal for the currently viewed date
        createdAt: serverTimestamp(),
        ...(newGoalDeadline ? { deadline: newGoalDeadline } : {}),
        ...(newGoalPriority ? { priority: newGoalPriority } : {}),
      });
      setNewGoalText('');
      setNewGoalDeadline('');
      setNewGoalPriority('');
      setShowExtras(false);
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
      goalStreak: 0,
      lastCheckin: undefined,
      lastGoalCheckin: undefined
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
          className="font-sans text-[11px] font-bold tracking-[1.5px] uppercase text-text-tertiary mb-3 flex items-center gap-2 relative z-10"
        >
          <Shield size={12} className="text-accent" />
          <input 
            type="date" 
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
            className="bg-transparent border-none outline-none text-accent cursor-pointer appearance-none font-bold"
          />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-[32px] font-bold leading-[1.2] text-text-primary mb-2 relative z-10"
        >
          {viewDate === todayStr ? (
            <>Your <em className="italic text-accent">Journey</em><br/>continues.</>
          ) : (
            <>{format(parseISO(viewDate), 'MMM dd, yyyy')}</>
          )}
        </motion.div>
      </div>

      {/* SCORE & STREAK GRID */}
      <div className="grid grid-cols-3 gap-3 mx-6 mb-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-raised border border-border rounded-2xl p-4 relative overflow-hidden flex flex-col items-center text-center"
        >
          <Zap size={14} className="text-accent mb-2" />
          <div className="font-serif text-[28px] font-bold text-accent leading-none mb-1">
            {profile?.score || 0}
          </div>
          <div className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mt-auto">Score</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-raised border border-border rounded-2xl p-4 relative overflow-hidden flex flex-col items-center text-center"
        >
          <div className="w-3 h-3 rounded-full bg-green mb-2 shadow-[0_0_8px_rgba(74,222,128,0.4)]" />
          <div className="font-serif text-[28px] font-bold text-text-primary leading-none mb-1">
            {profile?.streak || 0}
          </div>
          <div className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mt-auto">Logins</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-surface-raised border border-border rounded-2xl p-4 relative overflow-hidden flex flex-col items-center text-center"
        >
          <Activity size={14} className="text-purple-400 mb-2" />
          <div className="font-serif text-[28px] font-bold text-text-primary leading-none mb-1">
            {profile?.goalStreak || 0}
          </div>
          <div className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mt-auto">Goals <br/>Streak</div>
        </motion.div>
      </div>

      {/* GOALS */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="px-6 mb-3 flex items-center justify-between"
      >
        <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-bold">
          {viewDate === todayStr ? "Today's 1–2 Things" : "Goals"}
        </span>
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
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className={`text-[15px] font-medium leading-[1.4] transition-colors duration-200
                      ${goal.done ? 'text-text-secondary line-through' : 'text-text-primary'}
                    `}>
                      {goal.text}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {goal.priority && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded 
                          ${goal.priority === 'high' ? 'bg-red/10 text-red' : goal.priority === 'medium' ? 'bg-accent/10 text-accent' : 'bg-surface-raised text-text-tertiary'}`}>
                          {goal.priority}
                        </span>
                      )}
                      {goal.deadline && (
                        <span className="text-[9px] text-text-tertiary flex items-center gap-0.5">
                          <Calendar size={9} /> 
                          {goal.deadline.includes('T') ? format(parseISO(goal.deadline), 'MMM d, h:mm a') : goal.deadline}
                        </span>
                      )}
                    </div>
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
                className="w-full bg-surface-raised border border-accent rounded-2xl p-4 text-text-primary font-sans text-[15px] outline-none placeholder:text-text-tertiary mb-2"
              />
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setShowExtras(!showExtras)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all duration-150 border
                    ${showExtras ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-tertiary hover:border-text-tertiary'}`}
                >
                  <Flag size={12} /> {showExtras ? 'Hide Options' : 'Add Details'}
                </button>
              </div>

              <AnimatePresence>
                {showExtras && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 mb-4 overflow-hidden"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold ml-1">Deadline</label>
                      <input
                        type="datetime-local"
                        value={newGoalDeadline}
                        onChange={(e) => setNewGoalDeadline(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl p-3 text-text-primary text-[13px] outline-none focus:border-accent"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold ml-1">Priority</label>
                      <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setNewGoalPriority(p)}
                            className={`flex-1 capitalize py-2 rounded-lg text-xs font-bold transition-all border
                              ${newGoalPriority === p 
                                ? (p === 'high' ? 'bg-red/10 border-red text-red' : p === 'medium' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface-raised border-text-secondary text-text-primary') 
                                : 'bg-surface border-border text-text-tertiary hover:border-text-tertiary'}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
          Reset Streaks
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
        title="Reset Streaks?"
        message="Your Login and Goal Streaks will return to zero. Take a deep breath and start fresh. Are you sure?"
        onConfirm={handleResetStreak}
        onCancel={() => setShowResetModal(false)}
        confirmText="Reset"
      />
    </motion.div>
  );
}
