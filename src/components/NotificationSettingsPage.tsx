import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Bell, Clock, Moon, Sun, Calendar, AlertTriangle, Zap } from 'lucide-react';
import { UserProfile } from '../types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function NotificationSettingsPage({
  profile,
  onUpdateProfile,
  onBack
}: {
  profile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void,
  onBack: () => void
}) {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [wakeTime, setWakeTime] = useState(profile?.notificationTime || '08:00');
  const [sleepTime, setSleepTime] = useState(profile?.sleepTime || '23:00');
  const [workStart, setWorkStart] = useState(profile?.workStart || '10:00');
  const [workEnd, setWorkEnd] = useState(profile?.workEnd || '20:00');
  const [naggingEnabled, setNaggingEnabled] = useState(profile?.naggingEnabled !== false);
  const [naggingFreq, setNaggingFreq] = useState(profile?.naggingFrequency || 3);
  const [reviewDay, setReviewDay] = useState(profile?.weeklyReviewDay ?? 0);
  const [reviewTime, setReviewTime] = useState(profile?.weeklyReviewTime || '20:00');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  const handleWakeTimeChange = (e: any) => {
    const val = e.target.value;
    setWakeTime(val);
    onUpdateProfile({ notificationTime: val });
  };
  const handleSleepTimeChange = (e: any) => {
    const val = e.target.value;
    setSleepTime(val);
    onUpdateProfile({ sleepTime: val });
  };
  const handleWorkStartChange = (e: any) => {
    const val = e.target.value;
    setWorkStart(val);
    onUpdateProfile({ workStart: val });
  };
  const handleWorkEndChange = (e: any) => {
    const val = e.target.value;
    setWorkEnd(val);
    onUpdateProfile({ workEnd: val });
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
  const handleReviewDayChange = (e: any) => {
    const val = parseInt(e.target.value, 10);
    setReviewDay(val);
    onUpdateProfile({ weeklyReviewDay: val });
  };
  const handleReviewTimeChange = (e: any) => {
    const val = e.target.value;
    setReviewTime(val);
    onUpdateProfile({ weeklyReviewTime: val });
  };

  // Calculate active hours display
  const formatTime12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="pt-14 px-6 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-accent text-[12px] font-bold uppercase tracking-[2px] mb-4 transition-all active:scale-95"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="font-serif text-[24px] font-light text-text-primary leading-tight mb-1">
          Notification <em className="italic text-accent">Settings</em>
        </div>
        <div className="text-[12px] text-text-tertiary font-light">
          Customize your schedule. Your routine, your rules.
        </div>
      </div>

      <div className="px-6 space-y-5 pb-32">

        {/* Permission Banner */}
        {notifPermission !== 'granted' && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={requestPermission}
            className="w-full flex items-center justify-center gap-2 p-4 bg-accent/10 border border-accent/20 rounded-2xl text-accent text-[12px] font-bold uppercase tracking-[2px] transition-all active:scale-95"
          >
            <Bell size={16} />
            Enable Notifications
          </motion.button>
        )}

        {notifPermission === 'granted' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-3 bg-green/5 border border-green/15 rounded-xl"
          >
            <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
            <span className="text-[11px] text-green font-medium">Notifications active</span>
          </motion.div>
        )}

        {/* ── Your Day ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Sun size={12} className="text-accent" />
            <span className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Your Day</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {/* Wake Time */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex flex-col">
                <span className="text-[13px] text-text-primary font-medium">Wake / Day Start</span>
                <span className="text-[10px] text-text-tertiary">Morning brief fires 15m after this</span>
              </div>
              <input
                type="time"
                value={wakeTime}
                onChange={handleWakeTimeChange}
                className="bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Sleep Time */}
            <div className="flex items-center justify-between p-4">
              <div className="flex flex-col">
                <span className="text-[13px] text-text-primary font-medium">Sleep / Day End</span>
                <span className="text-[10px] text-text-tertiary">All notifications stop after this</span>
              </div>
              <input
                type="time"
                value={sleepTime}
                onChange={handleSleepTimeChange}
                className="bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Info banner */}
          <div className="mt-2.5 flex items-start gap-2 px-1">
            <AlertTriangle size={12} className="text-accent/60 shrink-0 mt-0.5" />
            <p className="text-[10px] text-text-tertiary leading-relaxed">
              Works for any routine — night owls, early birds, night shifts. Set your wake time to whenever your day actually starts.
            </p>
          </div>
        </motion.div>

        {/* ── Active Hours (Nagging Window) ──────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Zap size={12} className="text-accent" />
            <span className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Active Hours</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex flex-col">
                <span className="text-[13px] text-text-primary font-medium">Work Start</span>
                <span className="text-[10px] text-text-tertiary">Nagging begins here</span>
              </div>
              <input
                type="time"
                value={workStart}
                onChange={handleWorkStartChange}
                className="bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex flex-col">
                <span className="text-[13px] text-text-primary font-medium">Work End</span>
                <span className="text-[10px] text-text-tertiary">Nagging stops here</span>
              </div>
              <input
                type="time"
                value={workEnd}
                onChange={handleWorkEndChange}
                className="bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Active hours summary */}
          <div className="mt-2.5 bg-accent/5 border border-accent/10 rounded-xl p-3 text-center">
            <span className="text-[11px] text-text-secondary">
              Nagging fires between <strong className="text-accent">{formatTime12(workStart)}</strong> and <strong className="text-accent">{formatTime12(workEnd)}</strong>
            </span>
          </div>
        </motion.div>

        {/* ── Nagging Alerts ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Bell size={12} className="text-accent" />
            <span className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Nagging Alerts</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {/* Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex flex-col">
                <span className="text-[13px] text-text-primary font-medium">Enable Nagging</span>
                <span className="text-[10px] text-text-tertiary">Reminders if you haven't submitted</span>
              </div>
              <button
                onClick={toggleNagging}
                className={`w-11 h-6 rounded-full relative transition-colors ${naggingEnabled ? 'bg-accent' : 'bg-surface-raised border border-border'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${naggingEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {/* Frequency */}
            {naggingEnabled && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-4"
              >
                <div className="flex flex-col">
                  <span className="text-[13px] text-text-primary font-medium">Frequency</span>
                  <span className="text-[10px] text-text-tertiary">During your active hours</span>
                </div>
                <select
                  value={naggingFreq}
                  onChange={handleFreqChange}
                  className="bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value={2}>Every 2 hours</option>
                  <option value={3}>Every 3 hours</option>
                  <option value={4}>Every 4 hours</option>
                </select>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── Weekly Review ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Calendar size={12} className="text-accent" />
            <span className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Weekly Review</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex flex-col">
                <span className="text-[13px] text-text-primary font-medium">Review Day</span>
                <span className="text-[10px] text-text-tertiary">Weekly progress notification</span>
              </div>
              <select
                value={reviewDay}
                onChange={handleReviewDayChange}
                className="bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-text-primary focus:outline-none focus:border-accent"
              >
                {DAYS_OF_WEEK.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex flex-col">
                <span className="text-[13px] text-text-primary font-medium">Review Time</span>
                <span className="text-[10px] text-text-tertiary">When to receive the review</span>
              </div>
              <input
                type="time"
                value={reviewTime}
                onChange={handleReviewTimeChange}
                className="bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
        </motion.div>

        {/* ── Notification Tiers Info ─────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold mb-3">How Notifications Work</div>
          <div className="space-y-2">
            {[
              { emoji: '🌅', title: 'Morning Brief', desc: '15 min after wake · Score + last feedback' },
              { emoji: '📥', title: 'Input Check', desc: '2h after wake · Only if no input logged' },
              { emoji: '📤', title: 'Output Nudge', desc: 'Every few hours during active window' },
              { emoji: '⚠️', title: 'Ratio Warning', desc: '2h before sleep · If consumed but didn\'t create' },
              { emoji: '🤖', title: 'AI Feedback', desc: 'Instant · After AI-judged submissions' },
              { emoji: '📊', title: 'Weekly Review', desc: `${DAYS_OF_WEEK[reviewDay]}s at ${formatTime12(reviewTime)}` },
            ].map((tier, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-start gap-3 p-3 bg-surface border border-border rounded-xl"
              >
                <span className="text-lg shrink-0">{tier.emoji}</span>
                <div>
                  <div className="text-[12px] text-text-primary font-medium">{tier.title}</div>
                  <div className="text-[10px] text-text-tertiary">{tier.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── ADHD Recommendation ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-accent/5 border border-accent/15 rounded-2xl p-4 space-y-2"
        >
          <div className="text-[10px] uppercase tracking-[2px] text-accent font-bold">💡 Recommended for ADHD</div>
          <ul className="text-[11px] text-text-secondary space-y-1.5 leading-relaxed">
            <li>• Set <strong className="text-text-primary">nagging to every 2 hours</strong> — shorter loops maintain focus</li>
            <li>• Make your <strong className="text-text-primary">active window narrow</strong> (4-6 hours) — less pressure, more output</li>
            <li>• Set sleep time <strong className="text-text-primary">even if you don't sleep then</strong> — it's your boundary, not a bedtime</li>
            <li>• The persistent nudges are designed to <strong className="text-text-primary">break autopilot</strong> — don't disable them</li>
          </ul>
        </motion.div>

      </div>
    </motion.div>
  );
}
