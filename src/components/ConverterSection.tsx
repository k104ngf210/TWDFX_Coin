import { useState } from 'react';
import { Calculator, CheckCircle2, Info, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  BANK_FEE_RULES,
  BankRateEntry,
  CURRENCY_LIST,
  ConvertDirection,
  CurrencyCode,
  FeeMode,
  MonitorCurrencyData,
  RATE_TYPE_LABELS,
  RateType,
  formatNum,
} from '../data/fxData';
import { AnimatedNumber } from './AnimatedNumber';

interface ConverterSectionProps {
  direction: ConvertDirection;
  onDirectionChange: (dir: ConvertDirection) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
  feeMode: FeeMode;
  onFeeModeChange: (mode: FeeMode) => void;
  feeValue: number;
  onFeeValueChange: (val: number) => void;
  selectedBankCode: string;
  onSelectBank: (code: string) => void;
  rateType: RateType;
  banksData: Record<CurrencyCode, BankRateEntry[]> | null;
  monitorData: Record<CurrencyCode, MonitorCurrencyData> | null;
  isLoading: boolean;
}

const QUICK_AMOUNTS = [
  { value: 10000, label: '1萬' },
  { value: 50000, label: '5萬' },
  { value: 100000, label: '10萬' },
  { value: 500000, label: '50萬' },
];

export function ConverterSection({
  direction,
  onDirectionChange,
  amount,
  onAmountChange,
  feeMode,
  onFeeModeChange,
  feeValue,
  onFeeValueChange,
  selectedBankCode,
  onSelectBank,
  rateType,
  banksData,
  monitorData,
  isLoading,
}: ConverterSectionProps) {
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);

  const jpyList = banksData?.JPY ?? [];
  const activeBankInfo =
    jpyList.find((b) => b.code === selectedBankCode) ??
    jpyList[0] ?? { code: '004', name: '臺灣銀行' };

  const effectiveRateType: RateType =
    direction === 'TWD_TO_FX'
      ? rateType === 'cashSell'
        ? 'cashSell'
        : 'spotSell'
      : rateType === 'cashBuy'
        ? 'cashBuy'
        : 'spotBuy';

  const visibleCurrencies = showAllCurrencies
    ? CURRENCY_LIST
    : CURRENCY_LIST.slice(0, 3);

  const handleAmountInput = (rawStr: string) => {
    const cleaned = rawStr.replace(/[^0-9]/g, '');
    const parsed = cleaned ? parseInt(cleaned, 10) : 0;
    onAmountChange(Math.min(parsed, 999999999));
  };

  const handleFeeInput = (rawStr: string) => {
    const parsed = parseFloat(rawStr);
    if (Number.isNaN(parsed) || parsed < 0) {
      onFeeValueChange(0);
      return;
    }
    if (feeMode === 'percent') {
      onFeeValueChange(Math.min(parsed, 50));
    } else {
      onFeeValueChange(Math.min(parsed, 100000));
    }
  };

  const applyPresetChip = (mode: FeeMode, val: number) => {
    onFeeModeChange(mode);
    onFeeValueChange(val);
  };

  const feeSummaryText =
    feeMode === 'none' || feeValue === 0
      ? '免收手續費'
      : feeMode === 'percent'
        ? `依 ${feeValue}% 計收`
        : `單筆固定 NT$ ${feeValue.toLocaleString('en-US')}`;

  return (
    <section
      id="converter-section"
      className="scroll-mt-24 flex flex-col gap-5 pt-6 border-t border-slate-200 dark:border-[#1f2b3c]"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            04. 台幣換算與手續費試算
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 text-balance">
            即時台幣換算器 &amp; 手續費試算
          </h2>
        </div>

        <div
          className="flex items-center gap-1 bg-slate-100 dark:bg-[#0d121f] p-1 rounded-lg border border-slate-200 dark:border-[#223048] self-start sm:self-auto"
          role="tablist"
          aria-label="換算方向"
        >
          <button
            type="button"
            role="tab"
            aria-selected={direction === 'TWD_TO_FX'}
            onClick={() => onDirectionChange('TWD_TO_FX')}
            className={`h-9 px-3.5 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              direction === 'TWD_TO_FX'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            台幣換外幣
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={direction === 'FX_TO_TWD'}
            onClick={() => onDirectionChange('FX_TO_TWD')}
            className={`h-9 px-3.5 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              direction === 'FX_TO_TWD'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            外幣換台幣
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white dark:bg-[#131c2e] p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-[#223048] flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="twd-amount-input"
                className="text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                {direction === 'TWD_TO_FX'
                  ? '輸入金額 (新台幣 TWD)'
                  : '輸入金額 (外幣單位)'}
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-[#0b111e] h-12 px-4 border border-slate-200 dark:border-[#2a3b58] rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mr-2.5 select-none">
                  {direction === 'TWD_TO_FX' ? 'NT$' : '外幣'}
                </span>
                <input
                  id="twd-amount-input"
                  type="text"
                  inputMode="numeric"
                  value={amount.toLocaleString('en-US')}
                  onChange={(e) => handleAmountInput(e.target.value)}
                  className="w-full bg-transparent text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                快速選擇金額
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_AMOUNTS.map((q) => {
                  const active = amount === q.value;
                  return (
                    <button
                      key={q.value}
                      type="button"
                      onClick={() => onAmountChange(q.value)}
                      className={`h-10 px-4 text-xs font-semibold rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-[#0b111e] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a263d] border-slate-200 dark:border-[#2a3b58]'
                      }`}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#1f2b3c] text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <span>
                  牌告匯率基準：
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {activeBankInfo.name} ({activeBankInfo.code})
                  </strong>{' '}
                  · {RATE_TYPE_LABELS[effectiveRateType]}
                </span>
              </div>
              {selectedBankCode !== '004' && (
                <button
                  type="button"
                  onClick={() => onSelectBank('004')}
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  切回台銀基準
                </button>
              )}
            </div>
          </div>

          {/* Right: Fee Customizer */}
          <div className="lg:col-span-6 bg-slate-50 dark:bg-[#0b111e] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#223048] flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-[#1f2b3c]">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  手續費自訂試算
                </span>
              </div>
              <span className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400">
                {feeSummaryText}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 dark:bg-[#131c2e] rounded-lg border border-slate-200 dark:border-[#223048]">
              <button
                type="button"
                onClick={() => {
                  onFeeModeChange('none');
                  onFeeValueChange(0);
                }}
                className={`h-9 px-2 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap truncate ${
                  feeMode === 'none'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                }`}
              >
                免手續費 (0%)
              </button>
              <button
                type="button"
                onClick={() => {
                  onFeeModeChange('percent');
                  if (feeMode !== 'percent' && (feeValue === 0 || feeValue > 10)) {
                    onFeeValueChange(0.2);
                  }
                }}
                className={`h-9 px-2 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap truncate ${
                  feeMode === 'percent'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                }`}
              >
                百分比率 (%)
              </button>
              <button
                type="button"
                onClick={() => {
                  onFeeModeChange('fixed');
                  if (feeMode !== 'fixed' && feeValue < 10) {
                    onFeeValueChange(100);
                  }
                }}
                className={`h-9 px-2 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap truncate ${
                  feeMode === 'fixed'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                }`}
              >
                固定金額 (單筆)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-[170px]">
                <label
                  htmlFor="fee-value-input"
                  className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap"
                >
                  {feeMode === 'fixed' ? '單筆手續費：' : '手續費率：'}
                </label>
                <div className="relative flex items-center bg-white dark:bg-[#131c2e] h-9 px-3 border border-slate-200 dark:border-[#2a3b58] rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 flex-1">
                  <input
                    id="fee-value-input"
                    type="number"
                    min="0"
                    max={feeMode === 'percent' ? 50 : 100000}
                    step={feeMode === 'percent' ? '0.05' : '10'}
                    disabled={feeMode === 'none'}
                    value={feeMode === 'none' ? 0 : feeValue}
                    onChange={(e) => handleFeeInput(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white font-mono tabular-nums text-right focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-1.5">
                    {feeMode === 'fixed' ? 'NT$' : '%'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPresetChip('percent', 0.2)}
                  className="h-9 px-2.5 text-xs font-mono bg-white dark:bg-[#182236] text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-[#2a3b58] rounded-md transition-colors cursor-pointer"
                >
                  0.2%
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetChip('percent', 0.5)}
                  className="h-9 px-2.5 text-xs font-mono bg-white dark:bg-[#182236] text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-[#2a3b58] rounded-md transition-colors cursor-pointer"
                >
                  0.5%
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetChip('fixed', 100)}
                  className="h-9 px-2.5 text-xs font-mono bg-white dark:bg-[#182236] text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-[#2a3b58] rounded-md transition-colors cursor-pointer"
                >
                  NT$100
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetChip('fixed', 300)}
                  className="h-9 px-2.5 text-xs font-mono bg-white dark:bg-[#182236] text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-[#2a3b58] rounded-md transition-colors cursor-pointer"
                >
                  NT$300
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Fee-Free Rules Reference */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#1f2b3c] flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              各大銀行免手續費門檻與優惠規則（點擊可快速套用該銀行即時牌告與 0 手續費）
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {BANK_FEE_RULES.map((rule) => {
              const isSelected = selectedBankCode === rule.code;
              return (
                <button
                  key={rule.code}
                  type="button"
                  onClick={() => {
                    onSelectBank(rule.code);
                    onFeeModeChange('none');
                    onFeeValueChange(0);
                  }}
                  className={`text-left p-3 rounded-lg border transition-colors flex flex-col gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/35 border-blue-400 dark:border-blue-500/60'
                      : 'bg-slate-50 dark:bg-[#0b111e] border-slate-200 dark:border-[#1f2b3c] hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {rule.bankName}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      {rule.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {rule.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          顯示 {visibleCurrencies.length} 種幣別實際到手試算結果
        </span>
        <button
          type="button"
          onClick={() => setShowAllCurrencies((v) => !v)}
          className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#131c2e] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#223048] hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
        >
          {showAllCurrencies ? '收合為主要三幣 (JPY / USD / CNY)' : '展開全部五幣 (+ EUR / GBP)'}
        </button>
      </div>

      {/* Result Cards */}
      {isLoading && !banksData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visibleCurrencies.map((m) => (
            <div
              key={m.code}
              className="h-56 rounded-xl border border-slate-200 dark:border-[#223048] bg-white dark:bg-[#131c2e] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visibleCurrencies.map((meta) => {
            const list = banksData?.[meta.code] ?? [];
            const bankRow =
              list.find((b) => b.code === selectedBankCode) ?? list[0];
            const fallbackSpot =
              direction === 'TWD_TO_FX' ? bankRow?.spotSell : bankRow?.spotBuy;
            const rawSelected = bankRow?.[effectiveRateType] ?? null;
            const usedFallback = rawSelected === null && fallbackSpot !== null;
            const unitRate = rawSelected ?? fallbackSpot ?? monitorData?.[meta.code]?.spotSell ?? 0;

            const monitor = monitorData?.[meta.code];
            const isPositive = (monitor?.changePct ?? 0) >= 0;

            let grossAmount = 0;
            let feeDisplayAmount = 0;
            let netAmount = 0;
            let resultDecimals = meta.amountDecimals;
            let resultUnit = meta.code as string;

            if (direction === 'TWD_TO_FX') {
              grossAmount = unitRate > 0 ? amount / unitRate : 0;
              const feeTwd =
                feeMode === 'none'
                  ? 0
                  : feeMode === 'percent'
                    ? amount * (feeValue / 100)
                    : feeValue;
              feeDisplayAmount = unitRate > 0 ? feeTwd / unitRate : 0;
              netAmount = Math.max(0, grossAmount - feeDisplayAmount);
              resultDecimals = meta.amountDecimals;
              resultUnit = meta.code;
            } else {
              grossAmount = amount * unitRate;
              feeDisplayAmount =
                feeMode === 'none'
                  ? 0
                  : feeMode === 'percent'
                    ? grossAmount * (feeValue / 100)
                    : feeValue;
              netAmount = Math.max(0, grossAmount - feeDisplayAmount);
              resultDecimals = 0;
              resultUnit = 'TWD';
            }

            return (
              <div
                key={meta.code}
                className="bg-white dark:bg-[#131c2e] p-5 rounded-xl border border-slate-200 dark:border-[#223048] flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="text-2xl leading-none">
                      {meta.flag}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {meta.name} ({meta.code})
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        1 {meta.code} = {unitRate > 0 ? formatNum(unitRate, meta.rateDecimals) : '--'} TWD
                        {usedFallback ? ' (即期)' : ''}
                      </div>
                    </div>
                  </div>

                  {monitor && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold font-mono tabular-nums ${
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
                      {monitor.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-[#0b111e] p-3.5 rounded-lg border border-slate-100 dark:border-[#1f2b3c] flex flex-col gap-1.5 text-xs font-mono tabular-nums">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="font-sans">手續費前試算</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {formatNum(grossAmount, resultDecimals)} {resultUnit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="font-sans">預估手續費</span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      - {formatNum(feeDisplayAmount, resultDecimals)} {resultUnit}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-[#1f2b3c] flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      實際到手金額 (Net Amount)
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      實付/實收
                    </span>
                  </div>
                  <div className="flex items-baseline justify-end gap-1.5 mt-1 text-right">
                    <AnimatedNumber
                      value={netAmount}
                      decimals={resultDecimals}
                      className="text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight"
                    />
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {resultUnit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
