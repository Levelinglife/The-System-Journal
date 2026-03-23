import { CircleDot, BookOpen, Command, Send, TrendingUp, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: 'today', label: 'Today', Icon: CircleDot },
    { id: 'submit', label: 'Submit', Icon: Send },
    { id: 'progress', label: 'Stats', Icon: TrendingUp },
    { id: 'journal', label: 'Logs', Icon: BookOpen },
    { id: 'system', label: 'Rules', Icon: Command },
    { id: 'profile', label: 'Profile', Icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-1 pt-3 pb-7 bg-gradient-to-t from-bg via-bg to-transparent flex justify-around z-50 border-t border-border/50 backdrop-blur-lg">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-md transition-all duration-150 active:scale-95 ${activeTab === id ? 'text-accent' : 'text-text-tertiary'}`}
        >
          <Icon size={17} className="transition-colors duration-150" />
          <span className="text-[8px] tracking-[0.5px] uppercase font-bold">{label}</span>
        </button>
      ))}
    </div>
  );
}
