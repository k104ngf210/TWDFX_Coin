import { useCallback, useEffect, useMemo, useState } from 'react';
import { BankComparisonSection } from './components/BankComparisonSection';
import { ConverterSection } from './components/ConverterSection';
import { Header } from './components/Header';
import { HistoricalTrendSection } from './components/HistoricalTrendSection';
import { RateMonitorSection } from './components/RateMonitorSection';
import {
  CURRENCY_LIST,
  ConvertDirection,
  CurrencyCode,
  FeeMode,
  FxRatesApiResponse,
  MonitorCurrencyData,
  RateType,
  TimeRange,
} from './data/fxData';

const SECTION_IDS = [
  'monitor-section',
  'trend-section',
  'bank-section',
  'converter-section',
];

function formatTaipeiTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeSection, setActiveSection] = useState('monitor-section');

  const [fxPayload, setFxPayload] = useState<FxRatesApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('JPY');
  const [chartRange, setChartRange] = useState<TimeRange>('1W');
  const [tableRateType, setTableRateType] = useState<RateType>('spotSell');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState('808');

  const [direction, setDirection] = useState<ConvertDirection>('TWD_TO_FX');
  const [converterAmount, setConverterAmount] = useState(100000);
  const [feeMode, setFeeMode] = useState<FeeMode>('none');
  const [feeValue, setFeeValue] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      let current = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          current = id;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadRates = useCallback(async (force: boolean) => {
    if (force) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await fetch(force ? '/api/fx/rates?force=1' : '/api/fx/rates');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as FxRatesApiResponse;
      setFxPayload(data);

      // Ensure selectedBankCode exists in live results
      const available = data.banks.JPY ?? [];
      if (
        available.length > 0 &&
        !available.some((b) => b.code === selectedBankCode)
      ) {
        setSelectedBankCode(available[0].code);
      }
    } catch {
      setErrorMessage('無法取得臺灣各銀行公開牌告匯率，請檢查網路連線後重試。');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBankCode]);

  useEffect(() => {
    loadRates(false);
    // Auto-refresh every 90 seconds to keep live quotes updated
    const interval = window.setInterval(() => {
      loadRates(false);
    }, 90_000);
    return () => window.clearInterval(interval);
  }, [loadRates]);

  const monitorData = useMemo<Record<CurrencyCode, MonitorCurrencyData> | null>(() => {
    if (!fxPayload) return null;
    const mapped = {} as Record<CurrencyCode, MonitorCurrencyData>;
    CURRENCY_LIST.forEach((meta) => {
      const quote = fxPayload.monitor[meta.code];
      mapped[meta.code] = {
        ...meta,
        spotBuy: quote.spotBuy,
        spotSell: quote.spotSell,
        changePct: quote.changePct,
        changeAbs: quote.changeAbs,
        low24h: quote.low24h,
        high24h: quote.high24h,
        sparkline: quote.sparkline,
      };
    });
    return mapped;
  }, [fxPayload]);

  const lastUpdated = useMemo(
    () => (fxPayload?.fetchedAt ? formatTaipeiTime(fxPayload.fetchedAt) : ''),
    [fxPayload]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        activeSection={activeSection}
        onRefresh={() => loadRates(true)}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 w-full pt-20 pb-14">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-6 flex flex-col gap-12">
          <RateMonitorSection
            monitorData={monitorData}
            sources={fxPayload?.sources ?? []}
            selectedCurrency={selectedCurrency}
            onSelectCurrency={setSelectedCurrency}
            lastUpdated={lastUpdated}
            onRefresh={() => loadRates(true)}
            isRefreshing={isRefreshing}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />

          <HistoricalTrendSection
            currency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            range={chartRange}
            onRangeChange={setChartRange}
            trendData={fxPayload?.trends ?? null}
            isLoading={isLoading}
          />

          <BankComparisonSection
            currency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            rateType={tableRateType}
            onRateTypeChange={setTableRateType}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedBankCode={selectedBankCode}
            onSelectBank={setSelectedBankCode}
            banksData={fxPayload?.banks ?? null}
            sources={fxPayload?.sources ?? []}
            converterAmount={converterAmount}
            isLoading={isLoading}
          />

          <ConverterSection
            direction={direction}
            onDirectionChange={setDirection}
            amount={converterAmount}
            onAmountChange={setConverterAmount}
            feeMode={feeMode}
            onFeeModeChange={setFeeMode}
            feeValue={feeValue}
            onFeeValueChange={setFeeValue}
            selectedBankCode={selectedBankCode}
            onSelectBank={setSelectedBankCode}
            rateType={tableRateType}
            banksData={fxPayload?.banks ?? null}
            monitorData={monitorData}
            isLoading={isLoading}
          />
        </div>
      </main>

      <footer className="w-full bg-white dark:bg-[#0d121f] border-t border-slate-200 dark:border-[#223048] py-6 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 dark:text-slate-400 text-xs">
          <span>© 2026 TWDFX 匯率通 · 串接臺灣各銀行公開牌告與歷史匯率資料</span>
          <span>實際交易匯率與手續費仍以各銀行臨櫃及網銀成交當下為準</span>
        </div>
      </footer>
    </div>
  );
}
