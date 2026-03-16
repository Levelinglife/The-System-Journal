import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { ReactNode, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';

export default function SystemPage({ user }: { user: any }) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'));
  }, []);

  const toggleTheme = () => {
    const isCurrentlyLight = document.documentElement.classList.contains('light');
    if (isCurrentlyLight) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setIsLight(false);
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsLight(true);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="pt-14 px-6 pb-8 relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(200,169,110,0.08)_0%,transparent_70%)] pointer-events-none"></div>
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-text-tertiary mb-3"
        >
          The Rules
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-[28px] font-light leading-[1.35] text-text-primary mb-2"
        >
          When you are<br/><em className="italic text-accent">lost</em>, read this.
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[13px] text-text-tertiary font-light mt-1.5"
        >
          This is why you started.
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-6 mb-3 flex items-center justify-between"
      >
        <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-medium">Core Principles</span>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-2 mx-6 mb-6"
      >
        <RuleItem variants={itemVariants} text={<><strong>Stare at wall.</strong> Boring is rest. Your brain has limited bandwidth — use it carefully.</>} />
        <RuleItem variants={itemVariants} text={<><strong>One thing at a time.</strong> Not two. Not three. One.</>} />
        <RuleItem variants={itemVariants} text={<><strong>Do not stop in the middle.</strong> Finish. Even if it's bad. Bad and done beats perfect and abandoned.</>} />
        <RuleItem variants={itemVariants} text={<><strong>Feeling and emotion stops greatness.</strong> Remember this when the urge to quit arrives.</>} />
        <RuleItem variants={itemVariants} text={<><strong>No screens without intention.</strong> Before any screen — define purpose, set a time. Doing nothing is better than distracted consumption.</>} />
        <RuleItem variants={itemVariants} text={<><strong>No new things.</strong> You know enough to start. Pick what you need as you go.</>} />
        <RuleItem variants={itemVariants} text={<><strong>Deadline: before you sleep.</strong> 1–2 goals. No negotiation. No bullshit.</>} />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-6 mb-3 flex items-center justify-between mt-2"
      >
        <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-medium">The Goal — 90 Days</span>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-2 mx-6 mb-6"
      >
        <div className="flex items-start gap-2.5 p-3 bg-accent-glow border border-[rgba(200,169,110,0.2)] rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5 opacity-100"></div>
          <div className="text-[13px] text-text-primary font-light leading-relaxed">
            Express. Learn. Get feedback. Repeat. Content creation is just the medium. <em className="text-accent italic">Expression is the real act.</em>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="mx-6 mt-10 mb-4 flex justify-center"
      >
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-2 bg-surface hover:bg-surface-raised border border-border rounded-lg px-6 py-3 text-text-primary font-medium transition-all duration-150 active:scale-95"
        >
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
          {isLight ? 'Dark Mode' : 'Light Mode'}
        </button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mx-6 mb-16 text-center"
      >
        <button 
          onClick={handleLogout}
          className="bg-surface hover:bg-surface-raised border border-border rounded-lg px-6 py-3 text-text-primary font-bold text-xs uppercase tracking-wider transition-all duration-150 active:scale-95"
        >
          Sign Out
        </button>
      </motion.div>
      
      <div className="h-24"></div>
    </motion.div>
  );
}

function RuleItem({ text, variants }: { text: ReactNode, variants?: any }) {
  return (
    <motion.div 
      variants={variants}
      className="flex items-start gap-2.5 p-3 bg-surface border border-border rounded-lg"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5 opacity-60"></div>
      <div className="text-[13px] text-text-secondary font-light leading-relaxed [&_strong]:text-text-primary [&_strong]:font-medium">
        {text}
      </div>
    </motion.div>
  );
}
