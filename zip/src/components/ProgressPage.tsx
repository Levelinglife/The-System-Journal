import { useMemo } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, Activity, Zap, Award, BarChart3, ShieldCheck } from 'lucide-react';
import { ScoreHistory, UserProfile, Submission } from '../types';

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

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) { // Show last 30 days for better readability
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const historyEntry = history.find(h => h.date === dateStr);
      const hasSubmission = submissions.some(s => s.date === dateStr);
      
      // Get the last known score if no entry for this date
      let currentScore = 0;
      if (historyEntry) {
        currentScore = historyEntry.score;
      } else {
        const previousEntries = history.filter(h => h.date < dateStr).sort((a, b) => b.date.localeCompare(a.date));
        currentScore = previousEntries.length > 0 ? previousEntries[0].score : 0;
      }
      
      data.push({
        day: 30 - i,
        date: dateStr,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: currentScore,
        hasSubmission
      });
    }
    return data;
  }, [history, submissions]);

  const stats = useMemo(() => {
    const totalSubmissions = submissions.length;
    const avgScore = submissions.length > 0 
      ? (submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length).toFixed(1)
      : 0;
    
    // Calculate consistency (percentage of days with submissions in last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    const submissionsInLast7 = submissions.filter(s => last7Days.includes(s.date)).length;
    const consistency = Math.round((submissionsInLast7 / 7) * 100);

    // Calculate velocity (score growth in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const scoreNow = profile.score || 0;
    const scoreThenEntry = history.filter(h => h.date <= sevenDaysAgoStr).sort((a, b) => b.date.localeCompare(a.date))[0];
    const scoreThen = scoreThenEntry ? scoreThenEntry.score : 0;
    const velocity = scoreNow - scoreThen;
    
    return { totalSubmissions, avgScore, consistency, velocity };
  }, [submissions, history, profile.score]);

  return (
    <div className="p-6 space-y-8 pb-24 max-w-2xl mx-auto">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-accent font-mono text-[10px] tracking-[2px] uppercase font-bold mb-1">
          <Activity size={12} />
          Growth Diagnostics
        </div>
        <h1 className="text-4xl font-serif font-bold text-text-primary tracking-tight">Evolution</h1>
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-widest">Your Journey / 90-Day Cycle</p>
      </header>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-raised border border-border rounded-2xl p-5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={40} className="text-accent" />
          </div>
          <div className="flex items-center gap-2 text-text-tertiary mb-3">
            <TrendingUp size={14} className="text-accent" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Total Power</span>
          </div>
          <div className="text-4xl font-serif font-bold text-accent mb-1">{profile.score || 0}</div>
          <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Accumulated Points</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-raised border border-border rounded-2xl p-5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target size={40} className="text-text-primary" />
          </div>
          <div className="flex items-center gap-2 text-text-tertiary mb-3">
            <Award size={14} className="text-text-primary" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Avg Quality</span>
          </div>
          <div className="text-4xl font-serif font-bold text-text-primary mb-1">{stats.avgScore}<span className="text-sm text-text-tertiary">/10</span></div>
          <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Judgment Mean</div>
        </motion.div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold mb-1">Consistency</div>
          <div className="text-lg font-serif font-bold text-text-primary">{stats.consistency}%</div>
          <div className="w-full h-1 bg-border rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${stats.consistency}%` }} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold mb-1">Velocity</div>
          <div className="text-lg font-serif font-bold text-text-primary">+{stats.velocity}</div>
          <div className="text-[8px] text-text-tertiary uppercase font-bold mt-1">Last 7 Days</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <div className="text-[9px] uppercase tracking-widest text-text-tertiary font-bold mb-1">Reports</div>
          <div className="text-lg font-serif font-bold text-text-primary">{stats.totalSubmissions}</div>
          <div className="text-[8px] text-text-tertiary uppercase font-bold mt-1">Total Proofs</div>
        </div>
      </div>

      {/* Chart Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-surface-raised border border-border rounded-3xl p-6 space-y-6 relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-accent" />
            <h3 className="text-xs font-bold uppercase tracking-[2px] text-text-primary">Growth Curve</h3>
          </div>
          <div className="px-3 py-1 bg-surface border border-border rounded-full text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
            Last 30 Days
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4714A" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4714A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                stroke="rgba(255,255,255,0.1)" 
                fontSize={9} 
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.1)" 
                fontSize={9} 
                tickLine={false}
                axisLine={false}
                hide
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-surface-raised border border-border p-3 rounded-xl shadow-2xl">
                        <div className="text-[10px] text-text-tertiary uppercase font-bold mb-1">{payload[0].payload.date}</div>
                        <div className="text-lg font-serif font-bold text-accent">{payload[0].value} <span className="text-[10px] text-text-tertiary uppercase">Points</span></div>
                        {payload[0].payload.hasSubmission && (
                          <div className="mt-1 text-[9px] text-green font-bold uppercase tracking-widest flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-green" /> Proof Submitted
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#D4714A" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Submissions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Recent Judgments</h3>
          <div className="h-[1px] flex-1 mx-4 bg-border opacity-30" />
        </div>
        
        <div className="space-y-3">
          {submissions.slice(-4).reverse().map((sub, idx) => (
            <motion.div 
              key={sub.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (idx * 0.1) }}
              className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between group hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-serif font-bold text-lg ${sub.score >= 8 ? 'bg-green/10 text-green' : sub.score >= 5 ? 'bg-accent/10 text-accent' : 'bg-red/10 text-red'}`}>
                  {sub.score}
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">{new Date(sub.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  <div className="text-sm text-text-primary font-medium line-clamp-1 group-hover:text-accent transition-colors">{sub.text}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-text-tertiary uppercase font-bold">Credit</div>
                <div className="text-xs text-text-primary font-bold">+{sub.score * 10} PTS</div>
              </div>
            </motion.div>
          ))}
          {submissions.length === 0 && (
            <div className="bg-surface/30 border border-dashed border-border rounded-2xl py-12 text-center text-text-tertiary text-sm italic">
              No data points recorded. The system awaits your first proof.
            </div>
          )}
        </div>
      </div>

      <div className="bg-accent/5 border border-accent/10 rounded-2xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent shrink-0">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Growth Path Verified</h4>
          <p className="text-xs text-text-tertiary leading-relaxed">Your potential is being realized with every consistent action. Keep moving forward.</p>
        </div>
      </div>
    </div>
  );
}

