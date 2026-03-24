import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDown, ArrowUp, Send, Video, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Anthropic from '@anthropic-ai/sdk';
import {
  Goal, Submission, UserProfile, ScoreHistory, InputLog,
  INPUT_CATEGORIES, YOUTUBE_SUBCATEGORIES, OUTPUT_CATEGORIES,
  FITNESS_TYPES, DURATION_PRESETS, MOOD_EMOJIS,
  getInputScoreImpact
} from '../types';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';

// Score celebration component
function ScoreCelebration({ score, visible }: { score: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -80, scale: 1.5 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
    >
      <span className="text-4xl font-serif font-bold text-accent drop-shadow-2xl">
        {score > 0 ? '+' : ''}{score} ✨
      </span>
    </motion.div>
  );
}

export default function SubmitPage({
  user,
  profile,
  onUpdateProfile
}: {
  user: any,
  profile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void
}) {
  const [activeSection, setActiveSection] = useState<'input' | 'output'>('output');

  // INPUT state
  const [inputCategory, setInputCategory] = useState<string | null>(null);
  const [inputSubcategory, setInputSubcategory] = useState<string | null>(null);
  const [inputDuration, setInputDuration] = useState<number | null>(null);
  const [inputMood, setInputMood] = useState<number | null>(null);
  const [inputSaving, setInputSaving] = useState(false);

  // OUTPUT state
  const [outputCategory, setOutputCategory] = useState<string | null>(null);
  const [outputText, setOutputText] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofType, setProofType] = useState<'url' | 'file' | 'none'>('none');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [outputMood, setOutputMood] = useState<number | null>(null);
  const [outputSaving, setOutputSaving] = useState(false);

  // Fitness sub-fields
  const [fitnessType, setFitnessType] = useState<string | null>(null);
  const [fitnessIntensity, setFitnessIntensity] = useState<'Low' | 'Medium' | 'High' | null>(null);
  const [fitnessDuration, setFitnessDuration] = useState<number | null>(null);

  // AI model
  const [aiModel, setAiModel] = useState<
    'gemini-2.5-flash' |
    'gemini-3-flash-preview' |
    'gemini-3.1-pro-preview' |
    'claude-3-5-sonnet-latest'
  >('gemini-3-flash-preview');

  // AI Toggle — ON = AI judges, OFF = Quick Log (+20)
  const [aiEnabled, setAiEnabled] = useState(true);

  // Celebration
  const [celebration, setCelebration] = useState<{ score: number; key: number } | null>(null);

  // Feedback after output submit
  const [outputFeedback, setOutputFeedback] = useState<string | null>(null);
  const [outputScore, setOutputScore] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Goals context for AI
  const [todayGoals, setTodayGoals] = useState<Goal[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Compute today's used entertainment minutes
  const todayInputs: InputLog[] = useMemo(() => {
    const all: InputLog[] = JSON.parse(localStorage.getItem(`king-inputs-${user?.uid || 'guest'}`) || '[]');
    return all.filter(i => i.date === todayStr);
  }, [todayStr, inputSaving, user?.uid]); // re-compute after saving and user auth change

  const todayOutputs: Submission[] = useMemo(() => {
    const all: Submission[] = JSON.parse(localStorage.getItem(`king-submissions-${user?.uid || 'guest'}`) || '[]');
    return all.filter(s => s.date === todayStr);
  }, [todayStr, outputSaving, user?.uid]);

  const entertainmentUsed = useMemo(() => {
    return todayInputs
      .filter(i => !(i.category === 'youtube' && i.subcategory === 'learning'))
      .reduce((sum, i) => sum + i.durationMinutes, 0);
  }, [todayInputs]);

  const learningUsed = useMemo(() => {
    return todayInputs
      .filter(i => i.category === 'youtube' && i.subcategory === 'learning')
      .reduce((sum, i) => sum + i.durationMinutes, 0);
  }, [todayInputs]);

  const entertainmentQuota = profile?.quotas?.entertainment || 60;
  const learningQuota = profile?.quotas?.learning || 60;

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'users', user.uid, 'goals'),
          where('date', '==', todayStr)
        );
        const snapshot = await getDocs(q);
        setTodayGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Goal[]);
      } catch (err) {
        console.error("Error fetching goals:", err);
      }
    };
    fetchGoals();
  }, [user, todayStr]);

  // ─── INPUT LOGGING ───────────────────────────────────────────────

  const resetInputForm = () => {
    setInputCategory(null);
    setInputSubcategory(null);
    setInputDuration(null);
    setInputMood(null);
  };

  const handleLogInput = () => {
    if (!inputCategory || !inputDuration) return;
    if (inputCategory === 'youtube' && !inputSubcategory) return;
    setInputSaving(true);

    const scoreImpact = getInputScoreImpact(
      inputCategory,
      inputSubcategory || undefined,
      inputDuration,
      entertainmentUsed,
      entertainmentQuota
    );

    const entry: InputLog = {
      id: Date.now().toString(),
      category: inputCategory,
      subcategory: inputSubcategory || undefined,
      durationMinutes: inputDuration,
      date: todayStr,
      scoreImpact,
      mood: inputMood || undefined,
      createdAt: Date.now(),
    };

    const allInputs: InputLog[] = JSON.parse(localStorage.getItem(`king-inputs-${auth.currentUser?.uid || 'guest'}`) || '[]');
    localStorage.setItem(`king-inputs-${auth.currentUser?.uid || 'guest'}`, JSON.stringify([...allInputs, entry]));

    // Sync to Backend
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'inputs', entry.id), entry).catch(console.error);
    }

    // Update score
    if (scoreImpact !== 0) {
      const newScore = (profile?.score || 0) + scoreImpact;
      onUpdateProfile({ score: newScore, lastCheckin: todayStr });

      // Update score history
      const history: ScoreHistory[] = JSON.parse(localStorage.getItem(`king-score-${auth.currentUser?.uid || 'guest'}`) || '[]');
      localStorage.setItem(`king-score-${auth.currentUser?.uid || 'guest'}`, JSON.stringify([...history, { date: todayStr, score: newScore }]));
      
      if (user) {
        addDoc(collection(db, 'users', user.uid, 'scoreHistory'), { date: todayStr, score: newScore }).catch(console.error);
      }
    }

    // Show celebration
    setCelebration({ score: scoreImpact, key: Date.now() });
    setTimeout(() => setCelebration(null), 1500);

    resetInputForm();
    setInputSaving(false);
  };

  // ─── OUTPUT LOGGING ──────────────────────────────────────────────

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileBase64(reader.result as string);
        setProofType('file');
      };
      reader.readAsDataURL(file);
    }
  };

  const getBaseScore = (cat: string): number => {
    if (cat === 'fitness') {
      if (fitnessIntensity === 'High') return 22;
      if (fitnessIntensity === 'Medium') return 15;
      return 10;
    }
    const found = OUTPUT_CATEGORIES.find(c => c.id === cat);
    return found ? found.baseScore : 10;
  };

  const shouldUseAI = (cat: string): boolean => {
    if (!aiEnabled) return false;
    return outputText.trim().length > 10;
  };

  // Calculate today's input/output ratio
  const getTodayRatio = () => {
    const inputs = JSON.parse(localStorage.getItem(`king-inputs-${auth.currentUser?.uid || 'guest'}`) || '[]').filter((i: any) => i.date === todayStr);
    const outputs: Submission[] = JSON.parse(localStorage.getItem(`king-submissions-${auth.currentUser?.uid || 'guest'}`) || '[]').filter((s: Submission) => s.date === todayStr);
    const inputMin = inputs.reduce((sum: number, i: any) => sum + (i.durationMinutes || 0), 0);
    const outputCount = outputs.length;
    return { inputMin, outputCount, ratio: outputCount === 0 && inputMin > 0 ? 'ALL_INPUT' : inputMin > 0 ? `${inputMin}min consumed / ${outputCount} outputs` : 'none' };
  };

  const handleSubmitOutput = async () => {
    if (!outputCategory || !user) return;
    if (outputCategory === 'fitness' && (!fitnessType || !fitnessIntensity || !fitnessDuration)) return;
    setOutputSaving(true);
    setErrorMsg(null);

    let score = 20; // Quick Log default
    let feedbackText = "Output logged. +20 points. Keep building.";

    try {
      if (shouldUseAI(outputCategory)) {
        // ── AI-JUDGED PATH ──
        const keys = JSON.parse(localStorage.getItem(`king-system-keys-${auth.currentUser?.uid || 'guest'}`) || '{}');
        const goalsContext = todayGoals.length > 0
          ? todayGoals.map(g => `- ${g.text} (${g.done ? 'DONE' : 'NOT DONE'})`).join('\n')
          : "No specific goals set.";
        const ratioInfo = getTodayRatio();

        const prompt = `You are THE SYSTEM — a harsh, no-BS accountability engine.
You judge output quality on a 1-10 scale. You never inflate scores.
A 5 means mediocre. A 7 means genuinely impressive. 9-10 is reserved for exceptional work.

Rules:
- Be brutally honest. If the work is low-effort, say so.
- If description is vague or short, assume low effort. Score 1-3.
- If they have proof (URL/file), score more generously.
- Factor in the input/output ratio: ${ratioInfo.ratio}
- Give ONE specific instruction for tomorrow. Max 120 words total.

USER CONTEXT:
- Day: ${Math.max(1, Math.ceil((Date.now() - new Date(profile?.startDate || todayStr).getTime()) / 86400000))} of 90
- Streak: ${profile?.streak || 0} days
- Score: ${profile?.score || 0}
- Today's Goals:\n${goalsContext}
- Input/Output: ${ratioInfo.ratio}

OUTPUT TYPE: ${outputCategory}
DESCRIPTION: ${outputText}
PROOF: ${proofType === 'url' ? proofUrl : proofType === 'file' ? 'File uploaded' : 'None'}

Return ONLY valid JSON:
{"score": 1-10, "feedback": "Max 120 words. Be harsh but constructive.", "instruction": "One specific task for tomorrow."}`;

        if (aiModel.startsWith('claude')) {
          if (!keys.anthropic) throw new Error("Add Anthropic API key in Profile → API Keys.");
          const anthropic = new Anthropic({ apiKey: keys.anthropic, dangerouslyAllowBrowser: true });
          const msg = await anthropic.messages.create({
            model: aiModel,
            max_tokens: 400,
            system: "You are THE SYSTEM. Harsh. Return ONLY JSON. No markdown.",
            messages: [{ role: 'user', content: prompt }]
          });
          const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
          const result = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
          score = Math.max(10, (result.score || 5) * 10);
          feedbackText = result.feedback + (result.instruction ? `\n\n📋 Tomorrow: ${result.instruction}` : '') || feedbackText;
        } else {
          const apiKey = keys.gemini || '';
          if (!apiKey) throw new Error("Add Gemini API key in Profile → API Keys.");
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: aiModel,
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          const result = JSON.parse(response.text || '{}');
          score = Math.max(10, (result.score || 5) * 10);
          feedbackText = result.feedback + (result.instruction ? `\n\n📋 Tomorrow: ${result.instruction}` : '') || feedbackText;
        }
      }

      const submission: Submission = {
        id: Date.now().toString(),
        category: outputCategory,
        text: outputText || OUTPUT_CATEGORIES.find(c => c.id === outputCategory)?.label || outputCategory,
        proofUrl: proofType === 'url' ? proofUrl : (fileBase64 || ''),
        proofType,
        date: todayStr,
        score,
        feedback: feedbackText,
        mood: outputMood || undefined,
        createdAt: Date.now(),
        fitnessType: outputCategory === 'fitness' ? (fitnessType || undefined) : undefined,
        fitnessIntensity: outputCategory === 'fitness' ? (fitnessIntensity || undefined) : undefined,
        durationMinutes: outputCategory === 'fitness' ? (fitnessDuration || undefined) : undefined,
      };

      const submissions: Submission[] = JSON.parse(localStorage.getItem(`king-submissions-${auth.currentUser?.uid || 'guest'}`) || '[]');
      localStorage.setItem(`king-submissions-${auth.currentUser?.uid || 'guest'}`, JSON.stringify([...submissions, submission]));

      if (user) {
        setDoc(doc(db, 'users', user.uid, 'submissions', submission.id), submission).catch(console.error);
      }

      const newScore = (profile?.score || 0) + score;
      onUpdateProfile({ score: newScore, lastCheckin: todayStr });

      const history: ScoreHistory[] = JSON.parse(localStorage.getItem(`king-score-${auth.currentUser?.uid || 'guest'}`) || '[]');
      localStorage.setItem(`king-score-${auth.currentUser?.uid || 'guest'}`, JSON.stringify([...history, { date: todayStr, score: newScore }]));

      if (user) {
        addDoc(collection(db, 'users', user.uid, 'scoreHistory'), { date: todayStr, score: newScore }).catch(console.error);
      }

      setCelebration({ score, key: Date.now() });
      setTimeout(() => setCelebration(null), 1500);

      setOutputScore(score);
      setOutputFeedback(feedbackText);

      // Reset form
      setOutputCategory(null);
      setOutputText('');
      setProofUrl('');
      setProofType('none');
      setFileBase64(null);
      setOutputMood(null);
      setFitnessType(null);
      setFitnessIntensity(null);
      setFitnessDuration(null);
    } catch (err: any) {
      console.error("Output submit error:", err);
      setErrorMsg(err.message || "Something went wrong. Try again.");
    } finally {
      setOutputSaving(false);
    }
  };

  const entertainmentPercent = Math.min(100, Math.round((entertainmentUsed / entertainmentQuota) * 100));
  const learningPercent = Math.min(100, Math.round((learningUsed / learningQuota) * 100));

  return (
    <div className="p-6 pb-28 space-y-6">
      {/* Score celebration overlay */}
      {celebration && (
        <ScoreCelebration score={celebration.score} visible={true} />
      )}

      {/* Toggle Pills */}
      <div className="flex bg-surface border border-border rounded-2xl p-1.5 relative">
        <motion.div
          className="absolute top-1.5 bottom-1.5 rounded-xl bg-accent/15 border border-accent/30"
          layout
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            left: activeSection === 'input' ? '6px' : '50%',
            right: activeSection === 'output' ? '6px' : '50%',
          }}
        />
        <button
          onClick={() => setActiveSection('input')}
          className={`flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[2px] flex items-center justify-center gap-2 transition-colors relative z-10 ${activeSection === 'input' ? 'text-accent' : 'text-text-tertiary'}`}
        >
          <ArrowDown size={14} /> Input
        </button>
        <button
          onClick={() => setActiveSection('output')}
          className={`flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[2px] flex items-center justify-center gap-2 transition-colors relative z-10 ${activeSection === 'output' ? 'text-accent' : 'text-text-tertiary'}`}
        >
          <ArrowUp size={14} /> Output
        </button>
      </div>

      {/* Quota Rings (always visible) */}
      <div className="grid grid-cols-2 gap-3">
        <QuotaRing label="Entertainment" used={entertainmentUsed} quota={entertainmentQuota} percent={entertainmentPercent} />
        <QuotaRing label="Learning" used={learningUsed} quota={learningQuota} percent={learningPercent} isLearning />
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'input' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Step 1: Category */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">What did you consume?</label>
              <div className="grid grid-cols-3 gap-2">
                {INPUT_CATEGORIES.map(cat => (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => { setInputCategory(cat.id); setInputSubcategory(null); }}
                    className={`py-4 rounded-2xl border text-center transition-all ${inputCategory === cat.id ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
                  >
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider">{cat.label}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Step 2: Subcategory (if YouTube) */}
            <AnimatePresence>
              {inputCategory === 'youtube' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">What kind?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {YOUTUBE_SUBCATEGORIES.map(sub => (
                      <motion.button
                        key={sub.id}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setInputSubcategory(sub.id)}
                        className={`py-3 rounded-xl border text-center transition-all ${inputSubcategory === sub.id ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
                      >
                        <span className="mr-1">{sub.icon}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wider">{sub.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: Duration */}
            <AnimatePresence>
              {inputCategory && (inputCategory !== 'youtube' || inputSubcategory) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">How long?</label>
                  <div className="flex gap-2">
                    {DURATION_PRESETS.map(d => (
                      <motion.button
                        key={d.value}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setInputDuration(d.value)}
                        className={`flex-1 py-3 rounded-xl border text-[12px] font-bold transition-all ${inputDuration === d.value ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
                      >
                        {d.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Optional: Mood */}
            <AnimatePresence>
              {inputDuration && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Mood right now <span className="text-text-tertiary/50">(optional)</span></label>
                  <div className="flex gap-2 justify-center">
                    {MOOD_EMOJIS.map((emoji, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setInputMood(inputMood === i + 1 ? null : i + 1)}
                        className={`text-2xl p-2 rounded-xl border transition-all ${inputMood === i + 1 ? 'bg-accent/10 border-accent scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Log Button */}
            <AnimatePresence>
              {inputDuration && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleLogInput}
                  disabled={inputSaving}
                  className="w-full bg-accent text-bg font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
                >
                  {inputSaving ? (
                    <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                  ) : (
                    'Log Input'
                  )}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Today's Inputs Log */}
            {todayInputs.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Today's Inputs</div>
                {todayInputs.slice().reverse().slice(0, 5).map(inp => (
                  <motion.div
                    key={inp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{INPUT_CATEGORIES.find(c => c.id === inp.category)?.icon || '💬'}</span>
                      <div>
                        <div className="text-xs text-text-primary font-medium capitalize">
                          {inp.category}{inp.subcategory ? ` · ${inp.subcategory}` : ''}
                        </div>
                        <div className="text-[10px] text-text-tertiary">{inp.durationMinutes} min</div>
                      </div>
                    </div>
                    <div className={`text-xs font-bold ${inp.scoreImpact === 0 ? 'text-text-tertiary' : 'text-red'}`}>
                      {inp.scoreImpact === 0 ? '—' : inp.scoreImpact}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="output"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Show feedback if just submitted */}
            {outputFeedback && outputScore !== null ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-raised border border-border rounded-2xl p-6 space-y-4"
              >
                <div className="text-center">
                  <div className="text-3xl font-serif font-bold text-accent mb-1">+{outputScore} ✨</div>
                  <div className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Points Earned</div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-border">
                  <p className="text-sm text-text-primary leading-relaxed">{outputFeedback}</p>
                </div>
                <button
                  onClick={() => { setOutputFeedback(null); setOutputScore(null); }}
                  className="w-full py-3 text-[11px] uppercase tracking-[2px] font-bold text-accent border border-accent/30 rounded-xl transition-all active:scale-95"
                >
                  Log Another Output
                </button>
              </motion.div>
            ) : (
              <>
                {/* Step 1: Output Type */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">What did you create?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {OUTPUT_CATEGORIES.map(cat => (
                      <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setOutputCategory(cat.id)}
                        className={`py-3 rounded-2xl border text-center transition-all ${outputCategory === cat.id ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
                      >
                        <div className="text-xl mb-0.5">{cat.icon}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider">{cat.label}</div>
                        <div className="text-[8px] text-text-tertiary mt-0.5">+{cat.id === 'fitness' ? '10-22' : cat.baseScore}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Fitness sub-fields */}
                <AnimatePresence>
                  {outputCategory === 'fitness' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Exercise Type</label>
                        <div className="flex gap-2 flex-wrap">
                          {FITNESS_TYPES.map(ft => (
                            <motion.button
                              key={ft}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setFitnessType(ft)}
                              className={`py-2 px-4 rounded-xl border text-[11px] font-bold transition-all ${fitnessType === ft ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
                            >
                              {ft}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Intensity</label>
                        <div className="flex gap-2">
                          {(['Low', 'Medium', 'High'] as const).map(level => (
                            <motion.button
                              key={level}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setFitnessIntensity(level)}
                              className={`flex-1 py-3 rounded-xl border text-center transition-all ${fitnessIntensity === level ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
                            >
                              <div className="text-lg mb-0.5">{level === 'Low' ? '😌' : level === 'Medium' ? '💪' : '🔥'}</div>
                              <div className="text-[10px] font-bold">{level}</div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Duration</label>
                        <div className="flex gap-2">
                          {DURATION_PRESETS.map(d => (
                            <motion.button
                              key={d.value}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setFitnessDuration(d.value)}
                              className={`flex-1 py-3 rounded-xl border text-[12px] font-bold transition-all ${fitnessDuration === d.value ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
                            >
                              {d.label}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Notes (optional, collapsed by default for non-fitness) */}
                <AnimatePresence>
                  {outputCategory && outputCategory !== 'fitness' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">
                          Details <span className="text-text-tertiary/50">(optional — adds AI bonus)</span>
                        </label>
                        <textarea
                          value={outputText}
                          onChange={(e) => setOutputText(e.target.value)}
                          placeholder="What did you do? Be specific for a higher score..."
                          className="w-full bg-surface border border-border rounded-xl p-3 text-text-primary text-sm min-h-[100px] focus:border-accent outline-none transition-colors"
                        />
                      </div>

                      {/* Proof — collapsed */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">
                          Proof <span className="text-text-tertiary/50">(optional)</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setProofType(proofType === 'url' ? 'none' : 'url')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all ${proofType === 'url' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
                          >
                            <LinkIcon size={12} /> URL
                          </button>
                          <button
                            onClick={() => setProofType(proofType === 'file' ? 'none' : 'file')}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all ${proofType === 'file' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
                          >
                            <Video size={12} /> File
                          </button>
                        </div>
                        <AnimatePresence>
                          {proofType === 'url' && (
                            <motion.input
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              type="text"
                              value={proofUrl}
                              onChange={(e) => setProofUrl(e.target.value)}
                              placeholder="Paste link here..."
                              className="w-full bg-surface border border-border rounded-xl p-3 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                            />
                          )}
                          {proofType === 'file' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <input type="file" accept="video/*,image/*" onChange={handleFileChange} className="hidden" id="output-upload" />
                              <label htmlFor="output-upload" className="w-full bg-surface border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-accent transition-colors">
                                <Video size={20} className="text-text-tertiary" />
                                <span className="text-xs text-text-secondary">{fileBase64 ? 'File selected' : 'Select file'}</span>
                              </label>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* AI Toggle */}
                      <div className="space-y-3">
                        <button
                          onClick={() => setAiEnabled(!aiEnabled)}
                          className="w-full flex items-center justify-between p-3.5 bg-surface border border-border rounded-xl transition-all active:scale-[0.98]"
                        >
                          <div className="flex flex-col text-left">
                            <span className="text-[12px] text-text-primary font-medium">
                              {aiEnabled ? '🤖 AI Judge — ON' : '⚡ Quick Log — +20 pts'}
                            </span>
                            <span className="text-[10px] text-text-tertiary">
                              {aiEnabled ? 'AI scores your output (10-100 pts)' : 'Instant save, flat 20 points'}
                            </span>
                          </div>
                          <div className={`w-11 h-6 rounded-full relative transition-colors ${aiEnabled ? 'bg-accent' : 'bg-surface-raised border border-border'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${aiEnabled ? 'left-6' : 'left-1'}`} />
                          </div>
                        </button>

                        {/* AI Model Selector — only when AI is ON */}
                        {aiEnabled && outputText.trim().length > 10 && (
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">AI Model</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { key: 'gemini-2.5-flash', label: 'Gemini 2.5' },
                                { key: 'gemini-3-flash-preview', label: 'Gemini 3' },
                                { key: 'gemini-3.1-pro-preview', label: 'Gemini 3.1' },
                                { key: 'claude-3-5-sonnet-latest', label: 'Claude 4.5' },
                              ].map(m => (
                                <button
                                  key={m.key}
                                  onClick={() => setAiModel(m.key as any)}
                                  className={`py-2 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all ${aiModel === m.key ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-tertiary'}`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mood (optional) */}
                <AnimatePresence>
                  {outputCategory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Mood <span className="text-text-tertiary/50">(optional)</span></label>
                      <div className="flex gap-2 justify-center">
                        {MOOD_EMOJIS.map((emoji, i) => (
                          <motion.button
                            key={i}
                            whileTap={{ scale: 0.85 }}
                            onClick={() => setOutputMood(outputMood === i + 1 ? null : i + 1)}
                            className={`text-2xl p-2 rounded-xl border transition-all ${outputMood === i + 1 ? 'bg-accent/10 border-accent scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <AnimatePresence>
                  {outputCategory && (outputCategory !== 'fitness' || (fitnessType && fitnessIntensity && fitnessDuration)) && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleSubmitOutput}
                      disabled={outputSaving}
                      className="w-full bg-accent text-bg font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
                    >
                      {outputSaving ? (
                        <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={16} />
                          {aiEnabled && outputText.trim().length > 10 ? 'Submit for AI Review' : 'Quick Log (+20)'}
                        </>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>

                {errorMsg && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red/10 border border-red/20 rounded-xl text-red text-sm">
                    {errorMsg}
                  </motion.div>
                )}

                <div className="flex items-start gap-3 p-4 bg-accent/5 border border-accent/10 rounded-xl">
                  <ShieldCheck size={16} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    Every action matters. Quick-log a category for base points, or add details for an AI-evaluated bonus score.
                  </p>
                </div>
              </>
            )}

            {/* Today's Outputs Log */}
            {todayOutputs.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Today's Outputs</div>
                {todayOutputs.slice().reverse().slice(0, 5).map(outp => (
                  <motion.div
                    key={outp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-surface border border-border rounded-xl p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{OUTPUT_CATEGORIES.find(c => c.id === outp.category)?.icon || '✨'}</span>
                        <div>
                          <div className="text-xs text-text-primary font-medium capitalize">
                            {outp.category}
                          </div>
                          <div className="text-[10px] text-text-tertiary">{outp.date}</div>
                        </div>
                      </div>
                      <div className={`text-xs font-bold text-accent`}>
                        +{outp.score}
                      </div>
                    </div>
                    {outp.text && (
                      <div className="bg-bg/50 rounded-lg p-2 text-[11px] text-text-secondary border border-border/30 italic">
                        "{outp.text}"
                      </div>
                    )}
                    {outp.feedback && (
                      <div className="bg-surface-raised rounded-lg p-2 text-[11px] text-text-secondary border border-border/50">
                        <span className="font-bold text-accent">AI: </span>
                        <span className="leading-snug">{outp.feedback}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Quota Ring Component ────────────────────────────────────────

function QuotaRing({
  label,
  used,
  quota,
  percent,
  isLearning = false,
}: {
  label: string;
  used: number;
  quota: number;
  percent: number;
  isLearning?: boolean;
}) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference;

  const color = isLearning
    ? 'var(--theme-green)'
    : percent >= 100
      ? 'var(--theme-red)'
      : percent >= 80
        ? '#F5A623'
        : 'var(--theme-accent)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3"
    >
      <div className="relative w-[72px] h-[72px] shrink-0">
        <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
          <circle cx="38" cy="38" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <motion.circle
            cx="38" cy="38" r={radius} fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[13px] font-bold text-text-primary">{percent}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold truncate block" title={label}>{label}</div>
        <div className="text-sm text-text-primary font-medium">{used}m / {quota}m</div>
        {percent >= 100 && !isLearning && (
          <div className="text-[9px] text-red mt-0.5 font-medium">Quota used · penalty active</div>
        )}
      </div>
    </motion.div>
  );
}
