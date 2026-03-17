import { CircleDot, BookOpen, Command, Send, TrendingUp } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-2 pt-3 pb-7 bg-gradient-to-t from-bg via-bg to-transparent flex justify-around z-50 border-t border-border/50 backdrop-blur-lg">
      <button 
        onClick={() => setActiveTab('today')}
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-all duration-150 active:scale-95 ${activeTab === 'today' ? 'text-accent' : 'text-text-tertiary'}`}
      >
        <CircleDot size={18} className="transition-colors duration-150" />
        <span className="text-[9px] tracking-[0.5px] uppercase font-bold">Today</span>
      </button>

      <button 
        onClick={() => setActiveTab('submit')}
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-all duration-150 active:scale-95 ${activeTab === 'submit' ? 'text-accent' : 'text-text-tertiary'}`}
      >
        <Send size={18} className="transition-colors duration-150" />
        <span className="text-[9px] tracking-[0.5px] uppercase font-bold">Submit</span>
      </button>

      <button 
        onClick={() => setActiveTab('progress')}
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-all duration-150 active:scale-95 ${activeTab === 'progress' ? 'text-accent' : 'text-text-tertiary'}`}
      >
        <TrendingUp size={18} className="transition-colors duration-150" />
        <span className="text-[9px] tracking-[0.5px] uppercase font-bold">Stats</span>
      </button>
      
      <button 
        onClick={() => setActiveTab('journal')}
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-all duration-150 active:scale-95 ${activeTab === 'journal' ? 'text-accent' : 'text-text-tertiary'}`}
      >
        <BookOpen size={18} className="transition-colors duration-150" />
        <span className="text-[9px] tracking-[0.5px] uppercase font-bold">Logs</span>
      </button>

      <button 
        onClick={() => setActiveTab('system')}
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-all duration-150 active:scale-95 ${activeTab === 'system' ? 'text-accent' : 'text-text-tertiary'}`}
      >
        <Command size={18} className="transition-colors duration-150" />
        <span className="text-[9px] tracking-[0.5px] uppercase font-bold">Rules</span>
      </button>
    </div>
  );
}
