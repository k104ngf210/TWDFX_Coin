import { Moon, RefreshCw, Sun } from 'lucide-react';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  activeSection: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const NAV_ITEMS = [
  { id: 'monitor-section', label: '即時行情' },
  { id: 'trend-section', label: '歷史走勢' },
  { id: 'bank-section', label: '銀行比價' },
  { id: 'converter-section', label: '台幣換算器' },
];

export function Header({
  isDark,
  onToggleTheme,
  activeSection,
  onRefresh,
  isRefreshing,
}: HeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#223048] transition-colors">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#monitor-section"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          TWDFX 匯率通
        </a>

        {/* Zone 2: Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="主導覽">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={isActive ? 'page' : undefined}
                className={`text-sm whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold border-blue-600 dark:border-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent font-medium'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Theme Switch & Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? '切換為淺色模式' : '切換為深色模式'}
            title={isDark ? '切換為淺色模式' : '切換為深色模式'}
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-[#131c2e] dark:hover:bg-[#1b2740] text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-[#223048] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#090d16]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? '更新中...' : '立即刷新'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
