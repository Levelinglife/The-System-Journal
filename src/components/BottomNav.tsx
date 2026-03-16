import { CircleDot, BookOpen, Command } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-6 pt-3 pb-7 bg-gradient-to-t from-bg via-bg to-transparent flex justify-around z-50">
      <button 
        onClick={() => setActiveTab('today')}
        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-md transition-all duration-150 active:scale-95 ${activeTab === 'today' ? 'text-accent' : 'text-text-tertiary'}`}
      >
        <CircleDot size={20} className="transition-colors duration-150" />
        <span className="text-[10px] tracking-[0.8px] uppercase font-medium">Today</span>
      </button>
      
      <button 
        onClick={() => setActiveTab('journal')}
        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-md transition-all duration-150 active:scale-95 ${activeTab === 'journal' ? 'text-accent' : 'text-text-tertiary'}`}
      >
        <BookOpen size={20} className="transition-colors duration-150" />
        <span className="text-[10px] tracking-[0.8px] uppercase font-medium">Journal</span>
      </button>

      <button 
        onClick={() => setActiveTab('system')}
        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-md transition-all duration-150 active:scale-95 ${activeTab === 'system' ? 'text-accent' : 'text-text-tertiary'}`}
      >
        <Command size={20} className="transition-colors duration-150" />
        <span className="text-[10px] tracking-[0.8px] uppercase font-medium">System</span>
      </button>
    </div>
  );
}
