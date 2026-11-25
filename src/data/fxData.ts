export type CurrencyCode = 'JPY' | 'USD' | 'CNY' | 'EUR' | 'GBP';
export type RateType = 'spotSell' | 'cashSell' | 'spotBuy' | 'cashBuy';
export type TimeRange = '1D' | '1W' | '1M';
export type FeeMode = 'none' | 'percent' | 'fixed';
export type ConvertDirection = 'TWD_TO_FX' | 'FX_TO_TWD';

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  flag: string;
  rateDecimals: number;
  amountDecimals: number;
}

export interface MonitorCurrencyData extends CurrencyMeta {
  spotBuy: number;
  spotSell: number;
  changePct: number;
  changeAbs: number;
  low24h: number;
  high24h: number;
  sparkline: number[];
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TrendRangeData {
  subLabel: string;
  points: TrendPoint[];
  high: number;
  low: number;
  avg: number;
  changePct: number;
}

export interface BankRateEntry {
  code: string;
  name: string;
  cashBuy: number | null;
  cashSell: number | null;
  spotBuy: number | null;
  spotSell: number | null;
}

export interface BankSourceStatus {
  code: string;
  name: string;
  sourceLabel: string;
  sourceUrl: string;
  status: 'ok' | 'unavailable';
  updatedAt: string | null;
}

export interface FxRatesApiResponse {
  fetchedAt: string;
  sources: BankSourceStatus[];
  banks: Record<CurrencyCode, BankRateEntry[]>;
  monitor: Record<
    CurrencyCode,
    {
      code: CurrencyCode;
      spotBuy: number;
      spotSell: number;
      changePct: number;
      changeAbs: number;
      low24h: number;
      high24h: number;
      sparkline: number[];
    }
  >;
  trends: Record<CurrencyCode, Record<TimeRange, TrendRangeData>>;
}

export interface BankFeeRule {
  code: string;
  bankName: string;
  badge: string;
  description: string;
}

export const CURRENCY_LIST: CurrencyMeta[] = [
  { code: 'JPY', name: '日幣', flag: '🇯🇵', rateDecimals: 4, amountDecimals: 0 },
  { code: 'USD', name: '美金', flag: '🇺🇸', rateDecimals: 3, amountDecimals: 2 },
  { code: 'CNY', name: '人民幣', flag: '🇨🇳', rateDecimals: 3, amountDecimals: 2 },
  { code: 'EUR', name: '歐元', flag: '🇪🇺', rateDecimals: 3, amountDecimals: 2 },
  { code: 'GBP', name: '英鎊', flag: '🇬🇧', rateDecimals: 3, amountDecimals: 2 },
];

export const BANK_FEE_RULES: BankFeeRule[] = [
  {
    code: '808',
    bankName: '玉山銀行 (808)',
    badge: '線上結匯 0 元',
    description: '外幣帳戶線上結匯 0 手續費，數位帳戶每月享外幣提領減免優惠。',
  },
  {
    code: '013',
    bankName: '國泰世華 CUBE (013)',
    badge: '數位通路讓分',
    description: 'CUBE 網銀/App 線上結匯免手續費，另享數位通路優惠匯率。',
  },
  {
    code: '012',
    bankName: '台北富邦 (012)',
    badge: '網銀結匯 0 元',
    description: '網路銀行與行動銀行線上換匯免手續費，數位存戶享指定優惠。',
  },
  {
    code: '004',
    bankName: '臺灣銀行 (004)',
    badge: '牌告讓分優惠',
    description: '網銀線上結匯免手續費且享匯率牌告減讓，外幣現鈔提領據點最廣。',
  },
  {
    code: '807',
    bankName: '永豐銀行 DAWHO (807)',
    badge: '大戶專屬特權',
    description: '大戶等級享外幣換匯減分與多項跨行轉匯手續費優惠。',
  },
  {
    code: '007',
    bankName: '第一銀行 iLEO (007)',
    badge: '線上換匯優惠',
    description: 'iLEO 數位帳戶線上即期結匯免手續費，定期定額換匯另享減碼。',
  },
];

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  spotSell: '即期賣出 (線上換匯)',
  cashSell: '現金賣出 (臨櫃換匯)',
  spotBuy: '即期買入',
  cashBuy: '現金買入',
};

export function formatNum(val: number, decimals: number): string {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
