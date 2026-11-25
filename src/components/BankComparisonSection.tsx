import { Check, Search, X } from 'lucide-react';
import {
  BankRateEntry,
  BankSourceStatus,
  CURRENCY_LIST,
  CurrencyCode,
  RATE_TYPE_LABELS,
  RateType,
  formatNum,
} from '../data/fxData';
import { AnimatedNumber } from './AnimatedNumber';

interface BankComparisonSectionProps {
  currency: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
  rateType: RateType;
  onRateTypeChange: (type: RateType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedBankCode: string;
  onSelectBank: (code: string) => void;
  banksData: Record<CurrencyCode, BankRateEntry[]> | null;
  sources: BankSourceStatus[];
  converterAmount: number;
  isLoading: boolean;
}

const RATE_TYPES: RateType[] = ['spotSell', 'cashSell', 'spotBuy', 'cashBuy'];

function sortBanksByRate(list: BankRateEntry[], rateType: RateType, isSell: boolean) {
  return list.slice().sort((a, b) => {
    const valA = a[rateType];
    const valB = b[rateType];
    if (valA === null && valB === null) return 0;
    if (valA === null) return 1;
    if (valB === null) return -1;
    return isSell ? valA - valB : valB - valA;
  });
}

export function BankComparisonSection({
  currency,
  onCurrencyChange,
  rateType,
  onRateTypeChange,
  searchQuery,
  onSearchChange,
  selectedBankCode,
  onSelectBank,
  banksData,
  sources,
  converterAmount,
  isLoading,
}: BankComparisonSectionProps) {
  const meta = CURRENCY_LIST.find((c) => c.code === currency) ?? CURRENCY_LIST[0];
  const isSell = rateType === 'spotSell' || rateType === 'cashSell';

  const rawList = banksData?.[currency] ?? [];
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const sortedBanks = sortBanksByRate(
    rawList.filter(
      (b) =>
        b.name.toLowerCase().includes(normalizedQuery) ||
        b.code.toLowerCase().includes(normalizedQuery)
    ),
    rateType,
    isSell
  );

  const allSorted = sortBanksByRate(rawList, rateType, isSell).filter(
    (b) => b[rateType] !== null
  );
  const bestRate = allSorted.length > 0 ? allSorted[0][rateType] : null;
  const bestCode = allSorted.length > 0 ? allSorted[0].code : '';

  const rateDec = meta.rateDecimals;
  const amtDec = isSell ? meta.amountDecimals : 0;
  const calcHeaderLabel = isSell
    ? `試算可換 (${converterAmount.toLocaleString('en-US')} TWD)`
    : `試算換回 (${converterAmount.toLocaleString('en-US')} ${currency})`;

  const activeSources = sources.filter((s) => s.status === 'ok');

  return (
    <section id="bank-section" className="scroll-mt-24 flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            03. 銀行匯率比價
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 text-balance">
            台灣各銀行最划算匯率比較表
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          即時讀取各銀行公開牌告並依交易類型排序，點擊任一銀行列即可套用至換算器 · 最優牌告標示為{' '}
          <span className="font-semibold text-blue-600 dark:text-blue-400">最划算</span>
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#131c2e] p-4 rounded-xl border border-slate-200 dark:border-[#223048] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex flex-wrap items-center bg-slate-100 dark:bg-[#0b111e] p-1 rounded-lg border border-slate-200 dark:border-[#2a3b58]"
            role="tablist"
            aria-label="比較幣別"
          >
            {CURRENCY_LIST.map((c) => {
              const active = currency === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onCurrencyChange(c.code)}
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
            className="flex flex-wrap items-center bg-slate-100 dark:bg-[#0b111e] p-1 rounded-lg border border-slate-200 dark:border-[#2a3b58]"
            role="tablist"
            aria-label="交易類型"
          >
            {RATE_TYPES.map((type) => {
              const active = rateType === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onRateTypeChange(type)}
                  className={`h-9 px-3 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active
                      ? 'bg-white dark:bg-[#182236] text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200 dark:border-[#2a3b58]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  {RATE_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative flex items-center bg-slate-50 dark:bg-[#0b111e] h-10 px-3.5 min-w-[230px] rounded-lg border border-slate-200 dark:border-[#2a3b58] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜尋銀行名稱或代碼..."
            aria-label="搜尋銀行名稱或代碼"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="清除搜尋"
              className="ml-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-[#223048] bg-white dark:bg-[#131c2e]">
        {isLoading && rawList.length === 0 ? (
          <div className="p-5 flex flex-col gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-11 rounded-lg bg-slate-100 dark:bg-[#0b111e] animate-pulse"
              />
            ))}
          </div>
        ) : sortedBanks.length === 0 ? (
          <div className="py-12 px-6 text-center flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {searchQuery
                ? `找不到符合「${searchQuery}」的銀行報價`
                : '暫時無法讀取銀行牌告資料'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                顯示全部銀行
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#182236] text-slate-500 dark:text-slate-400 text-xs font-semibold border-b border-slate-200 dark:border-[#223048]">
                <th className="py-3.5 px-4 whitespace-nowrap">銀行名稱</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">現金買入</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">現金賣出</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">即期買入</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">即期賣出</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">{calcHeaderLabel}</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">價差 / 推薦</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700 dark:text-slate-200 divide-y divide-slate-100 dark:divide-[#1b263b]">
              {sortedBanks.map((bank, idx) => {
                const activeRate = bank[rateType];
                const isBest = bank.code === bestCode && activeRate !== null;
                const isSelected = bank.code === selectedBankCode;
                const calcVal =
                  activeRate !== null
                    ? isSell
                      ? converterAmount / activeRate
                      : converterAmount * activeRate
                    : null;
                const diff =
                  activeRate !== null && bestRate !== null
                    ? Math.abs(activeRate - bestRate).toFixed(rateDec)
                    : null;

                return (
                  <tr
                    key={bank.code}
                    onClick={() => onSelectBank(bank.code)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectBank(bank.code);
                      }
                    }}
                    aria-selected={isSelected}
                    className={`cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/45 ring-1 ring-inset ring-blue-500/40'
                        : idx % 2 === 0
                          ? 'bg-white dark:bg-[#131c2e] hover:bg-slate-50 dark:hover:bg-[#1a263d]'
                          : 'bg-slate-50/50 dark:bg-[#101827] hover:bg-slate-100/70 dark:hover:bg-[#1a263d]'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-medium whitespace-nowrap text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-[#1b263b] border border-slate-300 dark:border-[#2a3b58]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span
                          className={`text-xs font-mono ${
                            isSelected
                              ? 'text-blue-600 dark:text-blue-300 font-semibold'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {bank.code}
                        </span>
                        <span
                          className={
                            isSelected
                              ? 'text-blue-700 dark:text-blue-200 font-bold'
                              : 'font-medium'
                          }
                        >
                          {bank.name}
                        </span>
                        {isSelected && (
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                            · 已套用
                          </span>
                        )}
                      </div>
                    </td>

                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums ${
                        rateType === 'cashBuy'
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {bank.cashBuy !== null ? formatNum(bank.cashBuy, rateDec) : '--'}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums ${
                        rateType === 'cashSell'
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {bank.cashSell !== null ? formatNum(bank.cashSell, rateDec) : '--'}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums ${
                        rateType === 'spotBuy'
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {bank.spotBuy !== null ? formatNum(bank.spotBuy, rateDec) : '--'}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums ${
                        rateType === 'spotSell'
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {bank.spotSell !== null ? formatNum(bank.spotSell, rateDec) : '--'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono tabular-nums whitespace-nowrap">
                      {calcVal !== null ? (
                        <>
                          <AnimatedNumber value={calcVal} decimals={amtDec} />{' '}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {isSell ? currency : 'TWD'}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {activeRate === null ? (
                        <span className="text-xs text-slate-400">未提供此項牌告</span>
                      ) : isBest ? (
                        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-600 text-white">
                          最划算
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          差 {diff}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {activeSources.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>公開牌告來源：</span>
          {activeSources.map((src, i) => (
            <span key={src.code} className="inline-flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">·</span>}
              <span>
                {src.name} ({src.code})
              </span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
