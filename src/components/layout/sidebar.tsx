'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Target, Users, UserCircle, Newspaper, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/matches', label: '今日比赛', icon: Calendar },
  { href: '/predictions', label: '预测中心', icon: Target },
  { href: '/teams', label: '球队中心', icon: Users },
  { href: '/players', label: '球员中心', icon: UserCircle },
  { href: '/news', label: '新闻中心', icon: Newspaper },
  { href: '/settings', label: '系统设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-56 bg-slate-900 text-slate-100 flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="text-xs text-slate-400">WORLD CUP 2026</div>
        <div className="text-sm font-semibold text-green-400 mt-1">AI Predictor Pro</div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active ? 'bg-green-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-slate-500 border-t border-slate-800">
        v1.0.0 · Powered by Minimax M3
      </div>
    </aside>
  );
}
