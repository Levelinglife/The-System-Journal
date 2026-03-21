import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell, PieChart, Pie,
  ComposedChart, Line,
} from 'recharts';
import {
  TrendingUp, Target, Activity, Zap, Award, BarChart3, ShieldCheck,
  ChevronDown, ChevronUp, Flame, Clock, Dumbbell, Smile
} from 'lucide-react';
import {
  ScoreHistory, UserProfile, Submission, InputLog,
  INPUT_CATEGORIES, OUTPUT_CATEGORIES, MOOD_EMOJIS
} from '../types';

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-raised border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-[2px] text-text-primary">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-text-tertiary" /> : <ChevronDown size={16} className="text-text-tertiary" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ProgressPage() {
  const profile: UserProfile = useMemo(() => {
    return JSON.parse(localStorage.getItem('king-system') || '{"streak":0,"score":0}');
  }, []);

  const history: ScoreHistory[] = useMemo(() => {
    return JSON.parse(localStorage.getItem('king-score') || '[]');
  }, []);

  const submissions: Submission[] = useMemo(() => {
    return JSON.parse(localStorage.getItem('king-submissions') || '[]');
  }, []);

  const inputs: InputLog[] = useMemo(() => {
    return JSON.parse(localStorage.getItem('king-inputs') || '[]');
  }, []);

  // ── Computed Data ──────────────────────────────────────────────

  // Last 30 days chart data
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayInputs = inputs.filter(inp => inp.date === dateStr);
      const daySubmissions = submissions.filter(s => s.date === dateStr);

      const inputHours = dayInputs.reduce((s, inp) => s + inp.durationMinutes, 0) / 60;
      const outputScore = daySubmissions.reduce((s, sub) => s + sub.score, 0);

      const historyEntry = history.find(h => h.date === dateStr);
      let totalScore = 0;
      if (historyEntry) {
        totalScore = historyEntry.score;
      } else {
        const prev = history.filter(h => h.date < dateStr).sort((a, b) => b.date.localeCompare(a.date));
        totalScore = prev.length > 0 ? prev[0].score : 0;
      }

      data.push({
        date: dateStr,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        inputHours: +inputHours.toFixed(1),
        outputScore,
        totalScore,
      });
    }
    return data;
  }, [history, submissions, inputs]);

  // Stats
  const stats = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const weekSubmissions = submissions.filter(s => last7.includes(s.date));
    const weekInputs = inputs.filter(i => last7.includes(i.date));

    const totalOutputScore = weekSubmissions.reduce((s, sub) => s + sub.score, 0);
    const totalInputHours = weekInputs.reduce((s, inp) => s + inp.durationMinutes, 0) / 60;
    const ratio = totalInputHours > 0 ? +(totalInputHours / Math.max(weekSubmissions.length || 1, 1)).toFixed(1) : 0;

    const consistency = Math.round((new Set(submissions.filter(s => last7.includes(s.date)).map(s => s.date)).size / 7) * 100);

    const scoreNow = profile.score || 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenStr = sevenDaysAgo.toISOString().split('T')[0];
    const scoreThenEntry = history.filter(h => h.date <= sevenStr).sort((a, b) => b.date.localeCompare(a.date))[0];
    const velocity = scoreNow - (scoreThenEntry?.score || 0);

    return { totalOutputScore, totalInputHours: +totalInputHours.toFixed(1), ratio, consistency, velocity };
  }, [submissions, inputs, history, profile.score]);

  // Radar data
  const radarData = useMemo(() => {
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const recentSubs = submissions.filter(s => last30.includes(s.date));
    const recentInputs = inputs.filter(i => last30.includes(i.date));

    const creativeMins = recentSubs.filter(s => ['writing', 'scripting', 'video-editing', 'website', 'other'].includes(s.category)).length * 30;
    const physicalMins = recentSubs.filter(s => s.category === 'fitness').reduce((sum, s) => sum + (s.durationMinutes || 30), 0);
    const mentalMins = recentSubs.filter(s => ['problem-solving', 'new-skill', 'thought'].includes(s.category)).length * 20;
    const learningMins = recentInputs.filter(i => i.category === 'youtube' && i.subcategory === 'learning').reduce((sum, i) => sum + i.durationMinutes, 0);
    const entertainmentMins = recentInputs.filter(i => !(i.category === 'youtube' && i.subcategory === 'learning')).reduce((sum, i) => sum + i.durationMinutes, 0);
    const lifeMins = recentSubs.filter(s => s.category === 'house-chores').length * 20;

    const max = Math.max(creativeMins, physicalMins, mentalMins, learningMins, entertainmentMins, lifeMins, 1);

    return [
      { subject: 'Creative', value: Math.round((creativeMins / max) * 100), fullMark: 100 },
      { subject: 'Physical', value: Math.round((physicalMins / max) * 100), fullMark: 100 },
      { subject: 'Mental', value: Math.round((mentalMins / max) * 100), fullMark: 100 },
      { subject: 'Learning', value: Math.round((learningMins / max) * 100), fullMark: 100 },
      { subject: 'Entertainment', value: Math.round((entertainmentMins / max) * 100), fullMark: 100 },
      { subject: 'Life', value: Math.round((lifeMins / max) * 100), fullMark: 100 },
    ];
  }, [submissions, inputs]);

  // Fitness progression
  const fitnessData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - (29 - i));
      const dateStr = date.toISOString().split('T')[0];
      const daySubs = submissions.filter(s => s.date === dateStr && s.category === 'fitness');
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: daySubs.reduce((s, sub) => s + sub.score, 0),
      };
    });
  }, [submissions]);

  // Mood correlation
  const moodData = useMemo(() => {
    const allWithMood = [
      ...submissions.filter(s => s.mood).map(s => ({ mood: s.mood!, score: s.score })),
      ...inputs.filter(i => i.mood).map(i => ({ mood: i.mood!, score: Math.abs(i.scoreImpact) })),
    ];
    return MOOD_EMOJIS.map((emoji, i) => {
      const items = allWithMood.filter(d => d.mood === i + 1);
      return {
        emoji,
        avgScore: items.length > 0 ? +(items.reduce((s, d) => s + d.score, 0) / items.length).toFixed(1) : 0,
        count: items.length,
      };
    });
  }, [submissions, inputs]);

  // Timeline (last 10 events)
  const timeline = useMemo(() => {
    const allEvents = [
      ...submissions.map(s => ({ type: 'output' as const, date: s.date, category: s.category, score: s.score, text: s.text, createdAt: s.createdAt })),
      ...inputs.map(i => ({ type: 'input' as const, date: i.date, category: i.category, score: i.scoreImpact, text: `${i.durationMinutes}m ${i.category}${i.subcategory ? ` · ${i.subcategory}` : ''}`, createdAt: i.createdAt })),
    ];
    return allEvents.sort((a, b) => b.createdAt - a.createdAt).slice(0, 15);
  }, [submissions, inputs]);

  // Weekly summary
  const weeklySummary = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const weekSubs = submissions.filter(s => last7.includes(s.date));
    const weekInputs = inputs.filter(i => last7.includes(i.date));

    const bestDay = weekSubs.length > 0
      ? Object.entries(weekSubs.reduce((acc, s) => { acc[s.date] = (acc[s.date] || 0) + s.score; return acc; }, {} as Record<string, number>))
        .sort((a, b) => b[1] - a[1])[0]
      : null;

    const favCategory = weekSubs.length > 0
      ? Object.entries(weekSubs.reduce((acc, s) => { acc[s.category] = (acc[s.category] || 0) + 1; return acc; }, {} as Record<string, number>))
        .sort((a, b) => b[1] - a[1])[0]?.[0]
      : null;

    return {
      totalOutput: weekSubs.reduce((s, sub) => s + sub.score, 0),
      totalInputHours: +(weekInputs.reduce((s, i) => s + i.durationMinutes, 0) / 60).toFixed(1),
      bestDay: bestDay ? { date: bestDay[0], score: bestDay[1] } : null,
      favCategory: favCategory ? OUTPUT_CATEGORIES.find(c => c.id === favCategory)?.label || favCategory : null,
      streakTrend: stats.velocity > 0 ? '↑' : stats.velocity < 0 ? '↓' : '→',
    };
  }, [submissions, inputs, stats.velocity]);

  return (
    <div className="p-6 space-y-5 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-accent font-mono text-[10px] tracking-[2px] uppercase font-bold mb-1">
          <Activity size={12} />
          Growth Diagnostics
        </div>
        <h1 className="text-4xl font-serif font-bold text-text-primary tracking-tight">Evolution</h1>
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-widest">Your data tells your story</p>
      </header>

      {/* ── Section 1: Hero Metrics ── */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-raised border border-border rounded-2xl p-4 text-center"
        >
          <div className="text-[9px] uppercase tracking-[2px] text-text-tertiary font-bold mb-1">I/O Ratio</div>
          <div className="text-2xl font-serif font-bold text-accent">{stats.ratio}×</div>
          <div className="text-[8px] text-text-tertiary uppercase mt-0.5">This Week</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-surface-raised border border-border rounded-2xl p-4 text-center"
        >
          <div className="text-[9px] uppercase tracking-[2px] text-text-tertiary font-bold mb-1">Total Score</div>
          <div className="text-2xl font-serif font-bold text-text-primary">{profile.score || 0}</div>
          <div className="text-[8px] text-text-tertiary uppercase mt-0.5">Points</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-raised border border-border rounded-2xl p-4 text-center"
        >
          <div className="text-[9px] uppercase tracking-[2px] text-text-tertiary font-bold mb-1">Streak</div>
          <div className="text-2xl font-serif font-bold text-text-primary">{profile.streak || 0}</div>
          <div className="text-[8px] text-text-tertiary uppercase mt-0.5">Days</div>
        </motion.div>
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold mb-1">Consistency</div>
          <div className="text-lg font-serif font-bold text-text-primary">{stats.consistency}%</div>
          <div className="w-full h-1 bg-border rounded-full mt-2 overflow-hidden">
            <motion.div className="h-full bg-accent rounded-full" initial={{ width: 0 }} animate={{ width: `${stats.consistency}%` }} transition={{ duration: 1 }} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold mb-1">Velocity</div>
          <div className={`text-lg font-serif font-bold ${stats.velocity >= 0 ? 'text-green' : 'text-red'}`}>
            {stats.velocity >= 0 ? '+' : ''}{stats.velocity}
          </div>
          <div className="text-[8px] text-text-tertiary uppercase font-bold mt-1">7-Day Δ</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold mb-1">Outputs</div>
          <div className="text-lg font-serif font-bold text-text-primary">{submissions.length}</div>
          <div className="text-[8px] text-text-tertiary uppercase font-bold mt-1">Total</div>
        </div>
      </div>

      {/* ── Section 2: Behavior Radar ── */}
      <CollapsibleSection title="Behavior Profile" icon={Target} defaultOpen={true}>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar
                name="Profile"
                dataKey="value"
                stroke="#E87F55"
                fill="#E87F55"
                fillOpacity={0.2}
                strokeWidth={2}
                animationDuration={1500}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-text-tertiary text-center mt-2">Where are you spending your life? (Last 30 days)</p>
      </CollapsibleSection>

      {/* ── Section 3: Input vs Output ── */}
      <CollapsibleSection title="Input vs Output" icon={BarChart3} defaultOpen={true}>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="gradOutput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8CBF92" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8CBF92" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="displayDate" stroke="rgba(255,255,255,0.1)" fontSize={9} tickLine={false} axisLine={false} interval={6} />
              <YAxis yAxisId="left" stroke="rgba(255,255,255,0.1)" fontSize={9} tickLine={false} axisLine={false} hide />
              <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.1)" fontSize={9} tickLine={false} axisLine={false} hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-surface-raised border border-border p-3 rounded-xl shadow-2xl">
                        <div className="text-[10px] text-text-tertiary uppercase font-bold mb-1">{payload[0]?.payload?.date}</div>
                        <div className="flex gap-3 text-xs">
                          <span className="text-green font-bold">Output: {payload[0]?.payload?.outputScore}</span>
                          <span className="text-text-tertiary font-bold">Input: {payload[0]?.payload?.inputHours}h</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar yAxisId="right" dataKey="inputHours" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} barSize={8} />
              <Area yAxisId="left" type="monotone" dataKey="outputScore" stroke="#8CBF92" strokeWidth={2} fillOpacity={1} fill="url(#gradOutput)" animationDuration={1500} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green" /><span className="text-[10px] text-text-tertiary">Output Score</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-text-tertiary/30" /><span className="text-[10px] text-text-tertiary">Input Hours</span></div>
        </div>
      </CollapsibleSection>

      {/* ── Section 4: Growth Curve ── */}
      <CollapsibleSection title="Growth Curve" icon={TrendingUp}>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E87F55" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E87F55" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="displayDate" stroke="rgba(255,255,255,0.1)" fontSize={9} tickLine={false} axisLine={false} interval={6} />
              <YAxis stroke="rgba(255,255,255,0.1)" fontSize={9} tickLine={false} axisLine={false} hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-surface-raised border border-border p-3 rounded-xl shadow-2xl">
                        <div className="text-[10px] text-text-tertiary uppercase font-bold mb-1">{payload[0]?.payload?.date}</div>
                        <div className="text-lg font-serif font-bold text-accent">{payload[0]?.value} <span className="text-[10px] text-text-tertiary">PTS</span></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="totalScore" stroke="#E87F55" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CollapsibleSection>

      {/* ── Section 5: Fitness Progression ── */}
      <CollapsibleSection title="Fitness Progress" icon={Dumbbell}>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fitnessData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.1)" fontSize={9} tickLine={false} axisLine={false} interval={6} />
              <YAxis hide />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} animationDuration={1000}>
                {fitnessData.map((entry, i) => (
                  <Cell key={i} fill={entry.score > 0 ? '#8CBF92' : 'rgba(255,255,255,0.04)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {submissions.filter(s => s.category === 'fitness').length === 0 && (
          <p className="text-[10px] text-text-tertiary text-center italic mt-2">No fitness data yet. Log a workout to start.</p>
        )}
      </CollapsibleSection>

      {/* ── Section 6: Mood × Output ── */}
      <CollapsibleSection title="Mood Correlation" icon={Smile}>
        <div className="flex items-end justify-center gap-3 h-[140px]">
          {moodData.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="text-[10px] text-text-tertiary font-bold">{d.avgScore > 0 ? d.avgScore : '—'}</div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: d.avgScore > 0 ? `${Math.max(d.avgScore * 10, 8)}px` : '4px' }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="w-8 rounded-t-lg"
                style={{ background: d.avgScore > 0 ? `hsl(${20 + i * 20}, 70%, 60%)` : 'rgba(255,255,255,0.06)' }}
              />
              <span className="text-lg">{d.emoji}</span>
              <span className="text-[8px] text-text-tertiary">{d.count}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-tertiary text-center mt-3">Average output score by mood rating</p>
      </CollapsibleSection>

      {/* ── Section 7: Activity Timeline ── */}
      <CollapsibleSection title="Activity Timeline" icon={Clock}>
        <div className="space-y-3">
          {timeline.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center italic py-6">No activity logged yet.</p>
          ) : (
            timeline.map((event, idx) => (
              <motion.div
                key={`${event.createdAt}-${idx}`}
                initial={{ opacity: 0, x: event.type === 'output' ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${event.type === 'output'
                    ? 'bg-green/5 border-green/20'
                    : 'bg-surface border-border'
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${event.type === 'output' ? 'bg-green/10' : 'bg-surface-raised'}`}>
                  {event.type === 'output'
                    ? (OUTPUT_CATEGORIES.find(c => c.id === event.category)?.icon || '⬆')
                    : (INPUT_CATEGORIES.find(c => c.id === event.category)?.icon || '⬇')
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-primary font-medium truncate">{event.text}</div>
                  <div className="text-[10px] text-text-tertiary">{new Date(event.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
                <div className={`text-xs font-bold shrink-0 ${event.type === 'output' ? 'text-green' : event.score === 0 ? 'text-text-tertiary' : 'text-red'}`}>
                  {event.score > 0 ? '+' : ''}{event.score}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CollapsibleSection>

      {/* ── Section 8: Weekly Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-accent/5 border border-accent/10 rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-center gap-2 mb-2">
          <Flame size={14} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-[2px] text-text-primary">Weekly Report</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold">Output Score</div>
            <div className="text-xl font-serif font-bold text-accent">{weeklySummary.totalOutput}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold">Hours Consumed</div>
            <div className="text-xl font-serif font-bold text-text-primary">{weeklySummary.totalInputHours}h</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold">Best Day</div>
            <div className="text-sm text-text-primary font-medium">
              {weeklySummary.bestDay
                ? `${new Date(weeklySummary.bestDay.date).toLocaleDateString('en-US', { weekday: 'short' })} (+${weeklySummary.bestDay.score})`
                : '—'
              }
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold">Top Output</div>
            <div className="text-sm text-text-primary font-medium">{weeklySummary.favCategory || '—'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-accent/10">
          <span className="text-lg">{weeklySummary.streakTrend}</span>
          <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
            {stats.velocity > 0 ? 'Momentum rising' : stats.velocity < 0 ? 'Momentum dipping — show up tomorrow' : 'Steady state'}
          </span>
        </div>
      </motion.div>

      {/* Footer inspiration */}
      <div className="bg-surface-raised border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-primary">Your data is your mirror</h4>
          <p className="text-[10px] text-text-tertiary leading-relaxed">Growth is not linear. See the pattern. Trust the process.</p>
        </div>
      </div>
    </div>
  );
}
