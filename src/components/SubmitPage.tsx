import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Video, Link as LinkIcon, CheckCircle2, AlertTriangle, Shield, ShieldCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Anthropic from '@anthropic-ai/sdk';
import { Goal, Submission, UserProfile, ScoreHistory } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function SubmitPage({ 
  user, 
  profile, 
  onUpdateProfile 
}: { 
  user: any, 
  profile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void
}) {
  const [text, setText] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofType, setProofType] = useState<'url' | 'file'>('url');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [todayGoals, setTodayGoals] = useState<Goal[]>([]);

  const [aiModel, setAiModel] = useState<
    'gemini-2.5-flash' | 
    'gemini-3-flash-preview' | 
    'gemini-3.1-pro-preview' | 
    'claude-3-5-sonnet-latest'
  >('gemini-3-flash-preview');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchTodayData = async () => {
      if (!user) return;
      
      // Check for today's submission
      const submissions = JSON.parse(localStorage.getItem('king-submissions') || '[]');
      const todaySub = submissions.find((s: Submission) => s.date === todayStr);
      if (todaySub) {
        setHasSubmittedToday(true);
        setFeedback(todaySub.feedback);
        setAiScore(todaySub.score);
      }

      // Fetch today's goals for context
      try {
        const q = query(
          collection(db, 'users', user.uid, 'goals'),
          where('date', '==', todayStr)
        );
        const snapshot = await getDocs(q);
        const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Goal[];
        setTodayGoals(goals);
      } catch (err) {
        console.error("Error fetching goals for submission context:", err);
      }
    };

    fetchTodayData();
  }, [user, todayStr]);

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

  const handleSubmit = async () => {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const keys = JSON.parse(localStorage.getItem('king-system-keys') || '{}');
      
      const goalsContext = todayGoals.length > 0 
        ? todayGoals.map(g => `- ${g.text} (${g.done ? 'DONE' : 'NOT DONE'})`).join('\n')
        : "No specific goals set for today.";

      const prompt = `
        You are "The Guide", a supportive, wise, and highly encouraging mentor for someone on a journey of personal growth. 
        Your task is to evaluate their daily submission and provide warm, constructive feedback that fuels their motivation.

        USER CONTEXT:
        - Current Streak: ${profile?.streak || 0} days
        - Total Score: ${profile?.score || 0} points
        - Today's Objectives:
        ${goalsContext}

        SUBMISSION:
        - Report: ${text}
        - Proof: ${proofType === 'url' ? proofUrl : 'Video File Uploaded'}

        EVALUATION CRITERIA:
        1. Celebration: Find something positive in their effort, no matter how small.
        2. Encouragement: Use language that builds confidence and resilience.
        3. Constructive Growth: If they missed a goal, frame it as a learning opportunity for tomorrow.
        4. Momentum: Acknowledge their streak and the consistency they are building.

        OUTPUT FORMAT:
        Return ONLY a valid JSON object with:
        - "score": A number from 1 to 10. Use this to reflect their level of engagement and effort.
        - "feedback": A warm, inspiring message (max 120 words). Focus on their potential and the value of their work.
        - "instruction": One gentle, encouraging suggestion for tomorrow to keep their momentum.

        Example JSON: {"score": 8, "feedback": "Your dedication today is truly inspiring. You faced the challenges and showed up for yourself. This consistency is the foundation of your future success.", "instruction": "Tomorrow, try to find one moment of joy in your work. You're doing great."}
      `;

      let score = 5;
      let feedbackText = "Submission received.";
      let instructionText = "";

      if (aiModel.startsWith('claude')) {
        if (!keys.anthropic) {
          throw new Error("Anthropic API key is missing. Please add it in The Rules (System) page.");
        }
        const anthropic = new Anthropic({ apiKey: keys.anthropic, dangerouslyAllowBrowser: true });
        const msg = await anthropic.messages.create({
          model: aiModel,
          max_tokens: 400,
          system: "You are 'The Guide'. Your tone is warm, supportive, and encouraging. Return ONLY JSON. No preamble. No markdown.",
          messages: [{ role: 'user', content: prompt }]
        });
        
        const responseText = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanedText || '{}');
        score = result.score || 5;
        feedbackText = result.feedback || "Submission received.";
        instructionText = result.instruction || "";
      } else {
        const apiKey = keys.gemini || process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          throw new Error("Gemini API key is missing.");
        }
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: aiModel,
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const result = JSON.parse(response.text || '{}');
        score = result.score || 5;
        feedbackText = result.feedback || "Submission received.";
        instructionText = result.instruction || "";
      }

      const finalFeedback = instructionText ? `${feedbackText}\n\nSUGGESTION FOR TOMORROW: ${instructionText}` : feedbackText;

      const newSubmission: Submission = {
        id: Date.now().toString(),
        text,
        proofUrl: proofType === 'url' ? proofUrl : (fileBase64 || ''),
        proofType,
        date: todayStr,
        score,
        feedback: finalFeedback,
        createdAt: Date.now()
      };

      // Save submission
      const submissions = JSON.parse(localStorage.getItem('king-submissions') || '[]');
      localStorage.setItem('king-submissions', JSON.stringify([...submissions, newSubmission]));

      // Update score
      const pointsEarned = score * 10;
      const newScore = (profile?.score || 0) + pointsEarned;
      
      onUpdateProfile({
        score: newScore,
        lastCheckin: todayStr
      });

      // Update score history for chart
      const history: ScoreHistory[] = JSON.parse(localStorage.getItem('king-score') || '[]');
      localStorage.setItem('king-score', JSON.stringify([...history, { date: todayStr, score: newScore }]));

      setAiScore(score);
      setFeedback(feedbackText);
      setHasSubmittedToday(true);

      // Notify user
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('System Judgment', {
          body: `Score: ${score}/10. ${feedbackText.substring(0, 50)}...`,
          icon: '/icons/icon-192x192.png'
        });
      }

    } catch (error: any) {
      console.error("Submission error:", error);
      setErrorMsg(error.message || "An error occurred while communicating with the AI. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (hasSubmittedToday) {
    return (
      <div className="p-6 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-raised border border-border rounded-2xl p-6 text-center space-y-4 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-accent opacity-20" />
          
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent">
              <Shield size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-serif font-bold text-text-primary">Your Journey Continues</h2>
          <p className="text-text-secondary text-sm">Your progress has been recorded. Take a moment to reflect on your growth.</p>
          
          <div className="mt-8 pt-8 border-t border-border text-left space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Daily Progress</span>
                <span className="text-3xl font-serif font-bold text-accent">{aiScore}<span className="text-sm text-text-tertiary">/10</span></span>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${aiScore && aiScore >= 8 ? 'bg-green/10 border-green/20 text-green' : aiScore && aiScore >= 5 ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-accent/5 border-accent/10 text-text-tertiary'}`}>
                {aiScore && aiScore >= 8 ? 'Exceptional' : aiScore && aiScore >= 5 ? 'Steady' : 'Starting'}
              </div>
            </div>
            
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-bold">Mentor's Note</span>
              <div className="bg-surface p-5 rounded-xl border border-border relative">
                <div className="absolute -left-1 top-4 w-2 h-2 bg-surface border-l border-t border-border rotate-[-45deg]" />
                <p className="text-text-primary text-[15px] leading-relaxed font-light whitespace-pre-wrap">
                  {feedback}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-serif font-bold text-text-primary">Share Your Progress</h1>
        <p className="text-text-secondary text-sm">Every step forward is a victory. Tell us about your day.</p>
      </header>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-text-tertiary font-medium">Choose Your Guide</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setAiModel('gemini-2.5-flash')}
              className={`py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${aiModel === 'gemini-2.5-flash' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-tertiary'}`}
            >
              Gemini 2.5
            </button>
            <button 
              onClick={() => setAiModel('gemini-3-flash-preview')}
              className={`py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${aiModel === 'gemini-3-flash-preview' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-tertiary'}`}
            >
              Gemini 3 Flash
            </button>
            <button 
              onClick={() => setAiModel('gemini-3.1-pro-preview')}
              className={`py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${aiModel === 'gemini-3.1-pro-preview' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-tertiary'}`}
            >
              Gemini 3.1 Pro
            </button>
            <button 
              onClick={() => setAiModel('claude-3-5-sonnet-latest')}
              className={`py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${aiModel === 'claude-3-5-sonnet-latest' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-tertiary'}`}
            >
              Claude 4.5 Sonnet
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-text-tertiary font-medium">Daily Report</label>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you actually achieve today? Be specific."
            className="w-full bg-surface border border-border rounded-xl p-4 text-text-primary text-sm min-h-[150px] focus:border-accent outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-text-tertiary font-medium">Proof of Work</label>
          <div className="flex gap-2 mb-2">
            <button 
              onClick={() => setProofType('url')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${proofType === 'url' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
            >
              <LinkIcon size={14} /> URL Link
            </button>
            <button 
              onClick={() => setProofType('file')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${proofType === 'file' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-text-secondary'}`}
            >
              <Video size={14} /> Video Upload
            </button>
          </div>

          {proofType === 'url' ? (
            <input 
              type="text"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="YouTube, Instagram, or any proof link"
              className="w-full bg-surface border border-border rounded-xl p-4 text-text-primary text-sm focus:border-accent outline-none transition-colors"
            />
          ) : (
            <div className="relative">
              <input 
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                id="video-upload"
              />
              <label 
                htmlFor="video-upload"
                className="w-full bg-surface border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent transition-colors"
              >
                <Video size={24} className="text-text-tertiary" />
                <span className="text-sm text-text-secondary">{fileBase64 ? 'Video selected' : 'Select video proof'}</span>
              </label>
            </div>
          )}
        </div>

        <button 
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="w-full bg-accent text-bg font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
          ) : (
            <>
              <Send size={18} />
              Share with Mentor
            </>
          )}
        </button>

        {errorMsg && (
          <div className="p-3 bg-red/10 border border-red/20 rounded-lg text-red text-sm">
            {errorMsg}
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-accent/5 border border-accent/10 rounded-xl">
          <ShieldCheck size={18} className="text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Your effort matters. The AI Mentor is here to support your growth and celebrate your consistency. 
            One update per day helps build the habit of a lifetime.
          </p>
        </div>
      </div>
    </div>
  );
}
