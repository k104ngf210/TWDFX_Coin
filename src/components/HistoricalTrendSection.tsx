import { useMemo, useState } from 'react';
import {
  CURRENCY_LIST,
  CurrencyCode,
  TimeRange,
  TrendRangeData,
  formatNum,
} from '../data/fxData';
import { AnimatedNumber } from './AnimatedNumber';

interface HistoricalTrendSectionProps {
  currency: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  trendData: Record<CurrencyCode, Record<TimeRange, TrendRangeData>> | null;
  isLoading: boolean;
}

const RANGES: { id: TimeRange; label: string }[] = [
  { id: '1D', label: '當日' },
  { id: '1W', label: '當週' },
  { id: '1M', label: '當月' },
];

export function HistoricalTrendSection({
  currency,
  onCurrencyChange,
  range,
  onRangeChange,
  trendData,
  isLoading,
}: HistoricalTrendSectionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const meta = CURRENCY_LIST.find((c) => c.code === currency) ?? CURRENCY_LIST[0];
  const currentSeries: TrendRangeData = trendData?.[currency]?.[range] ?? {
    subLabel: '載入中',
    points: [],
    high: 0,
    low: 0,
    avg: 0,
    changePct: 0,
  };
  const dec = meta.rateDecimals;

  const chartGeometry = useMemo(() => {
    const pts = currentSeries.points;
    if (pts.length === 0) {
      return null;
    }

    const values = pts.map((p) => p.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const padding = (rawMax - rawMin || rawMin * 0.004) * 0.25;
    const yMin = rawMin - padding;
    const yMax = rawMax + padding;
    const ySpan = yMax - yMin || 1;

    const leftX = 64;
    const rightX = 692;
    const topY = 28;
    const bottomY = 192;
    const width = rightX - leftX;
    const height = bottomY - topY;

    const coords = pts.map((p, idx) => {
      const x =
        pts.length === 1
          ? leftX + width / 2
          : leftX + (idx / (pts.length - 1)) * width;
      const y = bottomY - ((p.value - yMin) / ySpan) * height;
      return { x, y, label: p.label, value: p.value };
    });

    const linePath = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(' ');
    const areaPath =
      coords.length > 1
        ? `${linePath} L${rightX},${bottomY} L${leftX},${bottomY} Z`
        : '';

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const val = yMax - t * ySpan;
      const y = topY + t * height;
      return { val, y };
    });

    let highIdx = 0;
    let lowIdx = 0;
    pts.forEach((p, idx) => {
      if (p.value > pts[highIdx].value) highIdx = idx;
      if (p.value < pts[lowIdx].value) lowIdx = idx;
    });

    // Limit X-axis label density to avoid overlap on 1M (~24 points)
    const maxLabels = 7;
    const step = Math.max(1, Math.ceil((pts.length - 1) / (maxLabels - 1)));
    const visibleXIndices = new Set<number>();
    for (let i = 0; i < pts.length; i += step) {
      visibleXIndices.add(i);
    }
    visibleXIndices.add(pts.length - 1);

    return {
      coords,
      linePath,
      areaPath,
      yTicks,
      highIdx,
      lowIdx,
      visibleXIndices,
      leftX,
      rightX,
      topY,
      bottomY,
    };
  }, [currentSeries]);

  const isNegative = currentSeries.changePct < 0;
  const activePoint =
    hoveredIndex !== null && chartGeometry ? chartGeometry.coords[hoveredIndex] : null;
  const highCoord = chartGeometry ? chartGeometry.coords[chartGeometry.highIdx] : null;
  const lowCoord = chartGeometry ? chartGeometry.coords[chartGeometry.lowIdx] : null;

  return (
    <section id="trend-section" className="scroll-mt-24 flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            02. 歷史走勢分析
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 text-balance">
            匯率起伏走勢折線圖
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex flex-wrap items-center bg-slate-100 dark:bg-[#0d121f] p-1 rounded-lg border border-slate-200 dark:border-[#223048]"
            role="tablist"
            aria-label="選擇走勢幣別"
          >
            {CURRENCY_LIST.map((c) => {
              const active = currency === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setHoveredIndex(null);
                    onCurrencyChange(c.code);
                  }}
                  className={`h-9 px-3 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  {c.name} {c.code}
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center bg-slate-100 dark:bg-[#0d121f] p-1 rounded-lg border border-slate-200 dark:border-[#223048]"
            role="tablist"
            aria-label="選擇時間區間"
          >
            {RANGES.map((r) => {
              const active = range === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setHoveredIndex(null);
                    onRangeChange(r.id);
                  }}
                  className={`h-9 px-3.5 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active
                      ? 'bg-white dark:bg-[#182236] text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200 dark:border-[#2a3b58]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
        <div className="lg:col-span-3 bg-white dark:bg-[#131c2e] p-5 rounded-xl border border-slate-200 dark:border-[#223048] flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#1f2b3c]">
            <div className="flex items-center gap-2.5 text-sm">
              <span className="font-bold text-slate-900 dark:text-white">
                {meta.name} ({meta.code}/TWD) 即期賣出走勢
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {currentSeries.subLabel}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {activePoint ? (
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {activePoint.label}：{formatNum(activePoint.value, dec)} TWD
                </span>
              ) : (
                <span>資料來源：臺灣銀行公開歷史牌告 (TWD)</span>
              )}
            </div>
          </div>

          <div className="w-full h-64 sm:h-72 relative select-none">
            {isLoading && !chartGeometry ? (
              <div className="w-full h-full rounded-lg bg-slate-100 dark:bg-[#0b111e] animate-pulse" />
            ) : chartGeometry ? (
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 720 226"
                preserveAspectRatio="none"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <defs>
                  <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                    <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {chartGeometry.yTicks.map((tick, idx) => (
                  <g key={idx}>
                    <line
                      x1={chartGeometry.leftX}
                      x2={chartGeometry.rightX}
                      y1={tick.y}
                      y2={tick.y}
                      className="stroke-slate-200 dark:stroke-[#1f2d44]"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={chartGeometry.leftX - 10}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="text-[11px] fill-slate-500 dark:fill-slate-400 font-mono tabular-nums"
                    >
                      {tick.val.toFixed(dec)}
                    </text>
                  </g>
                ))}

                {chartGeometry.coords.map(
                  (coord, idx) =>
                    chartGeometry.visibleXIndices.has(idx) && (
                      <text
                        key={idx}
                        x={coord.x}
                        y={216}
                        textAnchor="middle"
                        className="text-[11px] fill-slate-500 dark:fill-slate-400 font-mono"
                      >
                        {coord.label}
                      </text>
                    )
                )}

                {chartGeometry.areaPath && (
                  <path d={chartGeometry.areaPath} fill="url(#trendAreaGradient)" />
                )}
                {chartGeometry.coords.length > 1 && (
                  <path
                    d={chartGeometry.linePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {activePoint && (
                  <line
                    x1={activePoint.x}
                    x2={activePoint.x}
                    y1={chartGeometry.topY}
                    y2={chartGeometry.bottomY}
                    className="stroke-blue-400/60"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                  />
                )}

                {highCoord && (
                  <g>
                    <circle
                      cx={highCoord.x}
                      cy={highCoord.y}
                      r="5"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      className="chart-ripple-ring pointer-events-none"
                    />
                    <g
                      transform={`translate(${Math.min(
                        Math.max(highCoord.x, 96),
                        652
                      )}, ${Math.max(highCoord.y - 30, 2)})`}
                    >
                      <rect
                        x="-38"
                        y="0"
                        width="76"
                        height="21"
                        rx="4"
                        className="fill-emerald-50 dark:fill-[#064e3b] stroke-emerald-500"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="14.5"
                        textAnchor="middle"
                        className="fill-emerald-700 dark:fill-[#34d399] text-[11px] font-mono font-semibold"
                      >
                        高 {highCoord.value.toFixed(dec)}
                      </text>
                    </g>
                  </g>
                )}

                {lowCoord && chartGeometry.lowIdx !== chartGeometry.highIdx && (
                  <g>
                    <circle
                      cx={lowCoord.x}
                      cy={lowCoord.y}
                      r="5"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      className="chart-ripple-ring pointer-events-none"
                    />
                    <g
                      transform={`translate(${Math.min(
                        Math.max(lowCoord.x, 96),
                        652
                      )}, ${Math.min(lowCoord.y + 10, 178)})`}
                    >
                      <rect
                        x="-38"
                        y="0"
                        width="76"
                        height="21"
                        rx="4"
                        className="fill-rose-50 dark:fill-[#4c0519] stroke-rose-500"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="14.5"
                        textAnchor="middle"
                        className="fill-rose-700 dark:fill-[#f87171] text-[11px] font-mono font-semibold"
                      >
                        低 {lowCoord.value.toFixed(dec)}
                      </text>
                    </g>
                  </g>
                )}

                {chartGeometry.coords.map((coord, idx) => {
                  const isHigh = idx === chartGeometry.highIdx;
                  const isLow = idx === chartGeometry.lowIdx;
                  const isHovered = hoveredIndex === idx;
                  const showPoint =
                    chartGeometry.coords.length <= 12 ||
                    isHigh ||
                    isLow ||
                    isHovered ||
                    idx === chartGeometry.coords.length - 1;
                  const stroke = isHigh ? '#10b981' : isLow ? '#ef4444' : '#3b82f6';

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onClick={() => setHoveredIndex(idx)}
                    >
                      <circle cx={coord.x} cy={coord.y} r="14" fill="transparent" />
                      {showPoint && (
                        <circle
                          cx={coord.x}
                          cy={coord.y}
                          r={isHovered ? 6 : 4}
                          className="fill-white dark:fill-[#0b111e] transition-all duration-150"
                          stroke={stroke}
                          strokeWidth={isHovered ? 3 : 2.2}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-500">
                暫無歷史走勢資料
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <div className="bg-white dark:bg-[#131c2e] p-4 rounded-xl border border-slate-200 dark:border-[#223048] flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">期間最高 (High)</span>
            <AnimatedNumber
              value={currentSeries.high}
              decimals={dec}
              className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1"
            />
          </div>

          <div className="bg-white dark:bg-[#131c2e] p-4 rounded-xl border border-slate-200 dark:border-[#223048] flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">期間最低 (Low)</span>
            <AnimatedNumber
              value={currentSeries.low}
              decimals={dec}
              className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1"
            />
          </div>

          <div className="bg-white dark:bg-[#131c2e] p-4 rounded-xl border border-slate-200 dark:border-[#223048] flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">期間均價 (Average)</span>
            <AnimatedNumber
              value={currentSeries.avg}
              decimals={dec}
              className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1"
            />
          </div>

          <div className="bg-white dark:bg-[#131c2e] p-4 rounded-xl border border-slate-200 dark:border-[#223048] flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">區間漲跌幅 (Change)</span>
            <AnimatedNumber
              value={currentSeries.changePct}
              decimals={2}
              prefix={currentSeries.changePct > 0 ? '+' : ''}
              suffix="%"
              className={`text-xl font-bold font-mono tabular-nums mt-1 ${
                isNegative
                  ? 'text-rose-600 dark:text-[#f87171]'
                  : 'text-emerald-600 dark:text-[#34d399]'
              }`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
