# ADHD Notification Strategy & Implementation Plan (v4)

> [!NOTE]
> This document merges behavioral science (Fogg Behavior Model, Hook Model) with the strict, technically defined mechanics of the System Journal v4. It focuses on replacing massive burnout-inducing 9-5 schedules with 24-hour flexible tracking, input/output accountability, and harsh but caring AI judgments.

---

## 🔬 Behavioral Framework & The Hook

1. **Flexible Time Boxing (Ability):** We eliminate "9 to 5" restrictions. The user defines their *Wake Time*, *Sleep Time*, and *Active Work Window*. Notifications adapt, accommodating night owls, shift workers, and hyperfocus sprints.
2. **Frictionless Quick Logs vs. High-Stakes AI:** 
   - Not every entry needs to be judged. A quick log (+20 pts) is an easy "Action" with immediate "Reward". 
   - The AI Toggle enables deep accountability for meaningful work, creating an unpredictable "Variable Reward" (Score multiplier based on AI judgment).
3. **The Skip Penalty (Pain Point):** ADHD users often accidentally swipe away notifications. A "Skip Today" notification action forces the app open into an un-dismissible overlay requiring a 10-character written reason and immediate point deduction. This creates necessary, conscious friction.

---

## 🕒 User Settings (SystemPage)
The hardcoded 12PM-9PM window is eliminated. The app will capture:
- **Wake / Day Start Time:** (`notifTime`) When the cycle begins.
- **Sleep / Day End Time:** (`sleepTime`) Absolute end-of-day. Notifications stop.
- **Active Hours:** (`workStart`, `workEnd`) The timeframe where the true "nagging" occurs for outputs.
- **Nagging Frequency:** (e.g., 2/3/4 hours) Fires *only* during Active Hours.
- **Weekly Review Time:** Designated day and sequence for weekly reflection.
- **Gemini API Key:** Stored locally via `localStorage` on initial load.

---

## 📝 Input vs Output Mechanics (SubmitPage)

Every day tracks Consumption vs Creation, feeding critical context to the AI mentor.

### 1. INPUT (Consumption)
- **What:** Videos, social media, reading.
- **Data:** Text input or quick tags, optional minutes spent. 
- **DB Path:** `users/{uid}/daily/{date}/input`

### 2. OUTPUT (Creation)
- **What:** Writing, code, design, filming.
- **Data:** Text, Proof URL (optional), Self-Rating (1-5).
- **The AI Toggle:** 
  - **OFF (Quick Log):** Frictionless submission. No AI evaluation. Flat `+20` points. Silent.
  - **ON (Judge Me):** Calls the AI mentor API. The AI scores effort 1-10. Score changes by `(AI Score * 10)`. Provides harsh feedback and tomorrow's instruction.

---

## 📲 The 6-Tier Notification Spec

1. **[A] Morning Brief:** Fires 15 mins after Wake Time. Shows current Score + last AI feedback line. Action: `[Open App]`.
2. **[B] Input Check:** Fires 2 hours after Wake Time (if no input logged). Action: `[Log Now]`.
3. **[C] Output Nudge:** Fires every Nagging Frequency interval during *Active Hours* (if no output submitted). Actions: `[Submit Output]` | `[Snooze Xhrs]`.
4. **[D] Ratio Warning:** Fires 2 hours before Sleep Time if input is logged but output is blank. Actions: `[Submit Now]` | `[Skip Today (opens penalty overlay)]`.
5. **[E] AI Feedback:** Fires immediately after AI processes a submitted output. Action: `[See Full Feedback]`.
6. **[F] Weekly Review:** Fires at user-selected configuration time weekly. Action: `[View Progress]`.

---

## ⚙️ Output Engine Scoring Mechanics
- **Base Score:** 0. No ceiling. Min -100.
- **Flat Win:** +20 for "AI: OFF" (Quick Logs).
- **AI Win:** +10 to +100 based on AI score multiplier.
- **Streak Bonus:** +5 bonus for a 7-day streak of *any* submission.
- **Decay:** -15 for 24 hours without a submission.
- **Sequential Decay Penalty:** Given an extra -5 penalty for 3 silent days.
- **Skip Penalty:** -15 immediately if explicitly skipping.

---

## 🧠 AI Mentor System Prompt Structure
Called ONLY when `aiRequested` is True.
- **Inputs provided to AI:** Input text, Output text, self-rating, Ratio, score, day #, days since last AI sub, weekly log volume.
- **Directives:** 
  - Max 120 words. No "great job" generics. 
  - Score 1-10 genuinely. 
  - < 6 score = harsh, explicit failure callout.
  - > 7 score = acknowledge effort, push further.
  - End with *one* precise instruction for tomorrow.
