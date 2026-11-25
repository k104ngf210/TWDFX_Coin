import { AlertCircle, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  BankSourceStatus,
  CURRENCY_LIST,
  CurrencyCode,
  MonitorCurrencyData,
  formatNum,
} from '../data/fxData';
import { AnimatedNumber } from './AnimatedNumber';

interface RateMonitorSectionProps {
  monitorData: Record<CurrencyCode, MonitorCurrencyData> | null;
  sources: BankSourceStatus[];
  selectedCurrency: CurrencyCode;
  onSelectCurrency: (code: CurrencyCode) => void;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  isLoading: boolean;
  errorMessage: string | null;
}

export function RateMonitorSection({
  monitorData,
  sources,
  selectedCurrency,
  onSelectCurrency,
  lastUpdated,
  onRefresh,
  isRefreshing,
  isLoading,
  errorMessage,
}: RateMonitorSectionProps) {
  const connectedCount = sources.filter((s) => s.status === 'ok').length;

  return (
    <section id="monitor-section" className="scroll-mt-24 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">01. 即時行情</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-pulse-dot" />
              {connectedCount > 0
                ? `已連線 ${connectedCount} 家台灣銀行公開牌告`
                : '正在連線台灣銀行公開牌告'}
            </span>
            {lastUpdated && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">更新於 {lastUpdated}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1.5 tracking-tight text-balance">
            主要外幣即時匯率總覽
          </h1>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || isLoading}
          className="self-start sm:self-auto h-10 px-4 rounded-lg bg-white dark:bg-[#131c2e] hover:bg-slate-50 dark:hover:bg-[#182236] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#223048] text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${
              isRefreshing || isLoading ? 'animate-spin' : ''
            }`}
          />
          <span>{isRefreshing || isLoading ? '同步最新牌告中...' : '手動同步報價'}</span>
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-sm text-rose-800 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="h-9 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
          >
            重新連線
          </button>
        </div>
      )}

      {isLoading && !monitorData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CURRENCY_LIST.map((meta) => (
            <div
              key={meta.code}
              className="p-4 rounded-xl border border-slate-200 dark:border-[#223048] bg-white dark:bg-[#131c2e] flex flex-col gap-3 animate-pulse"
            >
              <div className="h-9 rounded bg-slate-100 dark:bg-[#1b263b]" />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-14 rounded-lg bg-slate-100 dark:bg-[#0b111e]" />
                <div className="h-14 rounded-lg bg-slate-100 dark:bg-[#0b111e]" />
              </div>
              <div className="h-4 rounded bg-slate-100 dark:bg-[#1b263b]" />
              <div className="h-7 rounded bg-slate-100 dark:bg-[#1b263b]" />
            </div>
          ))}
        </div>
      ) : (
        monitorData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CURRENCY_LIST.map((meta) => {
              const item = monitorData[meta.code];
              const isPositive = item.changePct >= 0;
              const isSelected = selectedCurrency === meta.code;

              const minVal = Math.min(...item.sparkline);
              const maxVal = Math.max(...item.sparkline);
              const span = maxVal - minVal || 1;
              const pts = item.sparkline.map((v, i) => {
                const x = (i / Math.max(item.sparkline.length - 1, 1)) * 100;
                const y = 22 - ((v - minVal) / span) * 16;
                return { x, y };
              });
              const pathD = pts
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(' ');
              const lastPt = pts[pts.length - 1];
              const strokeColor = isPositive ? '#10b981' : '#ef4444';

              return (
                <button
                  key={meta.code}
                  type="button"
                  onClick={() => onSelectCurrency(meta.code)}
                  className={`text-left p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-[#16233b] border-blue-500/70 dark:border-blue-500/70 ring-1 ring-blue-500/30'
                      : 'bg-white dark:bg-[#131c2e] border-slate-200 dark:border-[#223048] hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-[#1f2b3c] w-full">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span aria-hidden="true" className="text-xl leading-none shrink-0">
                        {item.flag}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.name} {item.code}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {item.code} / TWD
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold font-mono tabular-nums shrink-0 ${
                        isPositive
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="w-3 h-3" aria-hidden="true" />
                      )}
                      {isPositive ? '+' : ''}
                      {item.changePct.toFixed(2)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <div className="bg-slate-50 dark:bg-[#0b111e] p-2.5 rounded-lg border border-slate-100 dark:border-[#1f2b3c]">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">即期買入</div>
                      <AnimatedNumber
                        value={item.spotBuy}
                        decimals={item.rateDecimals}
                        className="block text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5 font-mono tabular-nums"
                      />
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0b111e] p-2.5 rounded-lg border border-slate-100 dark:border-[#1f2b3c]">
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        即期賣出
                      </div>
                      <AnimatedNumber
                        value={item.spotSell}
                        decimals={item.rateDecimals}
                        className="block text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums w-full">
                    <span>當日/各行區間</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {formatNum(item.low24h, item.rateDecimals)} –{' '}
                      {formatNum(item.high24h, item.rateDecimals)}
                    </span>
                  </div>

                  <div className="w-full h-7 pt-0.5">
                    <svg
                      className="w-full h-full overflow-visible"
                      viewBox="0 0 100 26"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {lastPt && (
                        <circle cx={lastPt.x} cy={lastPt.y} r="2.8" fill={strokeColor} />
                      )}
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}
    </section>
  );
}
