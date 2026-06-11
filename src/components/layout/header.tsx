import { Trophy, Bell } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-green-600" />
        <span className="font-bold text-lg">World Cup AI Predictor Pro</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span className="hidden md:flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          实时同步中
        </span>
        <Bell className="w-4 h-4" />
        <span>{new Date().toLocaleDateString('zh-CN')}</span>
      </div>
    </header>
  );
}
