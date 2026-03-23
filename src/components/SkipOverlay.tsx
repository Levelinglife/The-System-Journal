import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { UserProfile, ScoreHistory } from '../types';

export default function SkipOverlay({
  profile,
  onUpdateProfile,
  onClose,
  onSubmitInstead
}: {
  profile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void,
  onClose: () => void,
  onSubmitInstead: () => void
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const isValid = reason.trim().length >= 10;

  const handleAcceptSkip = () => {
    if (!isValid) return;
    setSaving(true);

    // Save skip reason
    const skips = JSON.parse(localStorage.getItem('king-skips') || '[]');
    skips.push({ date: todayStr, reason: reason.trim(), createdAt: Date.now() });
    localStorage.setItem('king-skips', JSON.stringify(skips));

    // Apply -15 penalty
    const newScore = Math.max(-100, (profile?.score || 0) - 15);
    onUpdateProfile({ score: newScore, lastCheckin: todayStr });

    // Update score history
    const history: ScoreHistory[] = JSON.parse(localStorage.getItem('king-score') || '[]');
    localStorage.setItem('king-score', JSON.stringify([...history, { date: todayStr, score: newScore }]));

    // Check 3-day consecutive skip penalty
    const recentSkips = skips.filter((s: any) => {
      const diff = (Date.now() - s.createdAt) / (1000 * 60 * 60 * 24);
      return diff <= 3;
    });
    if (recentSkips.length >= 3) {
      const bonusPenalty = Math.max(-100, newScore - 5);
      onUpdateProfile({ score: bonusPenalty });
      const history2: ScoreHistory[] = JSON.parse(localStorage.getItem('king-score') || '[]');
      localStorage.setItem('king-score', JSON.stringify([...history2, { date: todayStr, score: bonusPenalty }]));
    }

    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] bg-bg/95 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-[380px] bg-surface-raised border border-red/20 rounded-2xl p-6 space-y-5"
      >
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-red/10 border border-red/20 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="font-serif text-xl font-semibold text-text-primary mb-1">
            You're skipping today.
          </h2>
          <p className="text-[12px] text-text-tertiary">
            This is a conscious choice, not a casual tap.
          </p>
        </div>

        {/* Streak & Score impact */}
        <div className="flex gap-3">
          <div className="flex-1 bg-red/5 border border-red/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-red">-15</div>
            <div className="text-[9px] uppercase tracking-[2px] text-text-tertiary font-bold mt-1">Points</div>
          </div>
          <div className="flex-1 bg-red/5 border border-red/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-red">{profile?.streak || 0} → 0</div>
            <div className="text-[9px] uppercase tracking-[2px] text-text-tertiary font-bold mt-1">Streak</div>
          </div>
        </div>

        {/* Reason input */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">
            Why are you skipping? Be honest.
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Minimum 10 characters..."
            className="w-full bg-surface border border-border rounded-xl p-3 text-text-primary text-sm min-h-[80px] focus:border-red/50 outline-none transition-colors resize-none"
          />
          <div className="text-right">
            <span className={`text-[10px] font-bold ${isValid ? 'text-text-tertiary' : 'text-red'}`}>
              {reason.trim().length}/10
            </span>
          </div>
        </div>

        {/* Penalty warning */}
        <div className="bg-red/5 border border-red/10 rounded-xl p-3">
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Your score drops <strong className="text-red">-15 tonight</strong>.
            3 skips in a row = <strong className="text-red">-5 bonus penalty</strong>.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleAcceptSkip}
            disabled={!isValid || saving}
            className="w-full py-3.5 bg-red/10 border border-red/30 rounded-xl text-red text-[12px] font-bold uppercase tracking-[2px] transition-all active:scale-[0.98] disabled:opacity-30"
          >
            {saving ? 'Saving...' : 'I Accept. Submit Reason'}
          </button>
          <button
            onClick={onSubmitInstead}
            className="w-full py-3.5 bg-accent/10 border border-accent/30 rounded-xl text-accent text-[12px] font-bold uppercase tracking-[2px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            Wait — I'll Submit Instead
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
