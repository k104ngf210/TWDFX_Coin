// Netlify Function 版 API：由 server.ts 移植（去掉 Express / fs / path）
// 網址 /api/fx/rates 會執行這個函式，網頁檔案由 Netlify 直接提供 (dist)

type CurrencyCode = 'JPY' | 'USD' | 'CNY' | 'EUR' | 'GBP';

interface BankCurrencyRates {
  cashBuy: number | null;
  cashSell: number | null;
  spotBuy: number | null;
  spotSell: number | null;
}

interface LiveBankResult {
  code: string;
  name: string;
  sourceLabel: string;
  sourceUrl: string;
  updatedAt: string | null;
  rates: Partial<Record<CurrencyCode, BankCurrencyRates>>;
}

interface FinMindRow {
  date: string;
  currency: string;
  cash_buy: number;
  cash_sell: number;
  spot_buy: number;
  spot_sell: number;
}

interface TrendPoint {
  label: string;
  value: number;
}

interface TrendRangeData {
  subLabel: string;
  points: TrendPoint[];
  high: number;
  low: number;
  avg: number;
  changePct: number;
}

interface MonitorQuote {
  code: CurrencyCode;
  spotBuy: number;
  spotSell: number;
  changePct: number;
  changeAbs: number;
  low24h: number;
  high24h: number;
  sparkline: number[];
}

interface FxApiResponse {
  fetchedAt: string;
  sources: {
    code: string;
    name: string;
    sourceLabel: string;
    sourceUrl: string;
    status: 'ok' | 'unavailable';
    updatedAt: string | null;
  }[];
  banks: Record<CurrencyCode, Array<{
    code: string;
    name: string;
    cashBuy: number | null;
    cashSell: number | null;
    spotBuy: number | null;
    spotSell: number | null;
  }>>;
  monitor: Record<CurrencyCode, MonitorQuote>;
  trends: Record<CurrencyCode, {
    '1D': TrendRangeData;
    '1W': TrendRangeData;
    '1M': TrendRangeData;
  }>;
}

const TARGET_CURRENCIES: CurrencyCode[] = ['JPY', 'USD', 'CNY', 'EUR', 'GBP'];
const RATE_DECIMALS: Record<CurrencyCode, number> = {
  JPY: 4,
  USD: 3,
  CNY: 3,
  EUR: 3,
  GBP: 3,
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function toNum(val: unknown): number | null {
  if (typeof val === 'number') {
    return Number.isFinite(val) && val > 0 ? val : null;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    if (!cleaned || cleaned === '-' || cleaned === '--' || cleaned === '---') {
      return null;
    }
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function formatTaipeiTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

// 1. 臺灣銀行 (004) via RateWise v3 CDN (mirroring rate.bot.com.tw)
async function fetchBotRates(): Promise<LiveBankResult> {
  const manifestRes = await fetch(
    'https://cdn.jsdelivr.net/gh/haotool/app@data/public/rates/v3/current.json',
    { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(7000) }
  );
  if (!manifestRes.ok) throw new Error(`BOT manifest HTTP ${manifestRes.status}`);
  const manifest = (await manifestRes.json()) as { manifest?: { path?: string } };
  const releasePath = manifest.manifest?.path;
  if (!releasePath) throw new Error('BOT manifest path missing');

  const releaseRes = await fetch(
    `https://cdn.jsdelivr.net/gh/haotool/app@data/public/rates/v3/${releasePath}`,
    { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(7000) }
  );
  if (!releaseRes.ok) throw new Error(`BOT release HTTP ${releaseRes.status}`);
  const release = (await releaseRes.json()) as {
    generatedAt?: string;
    providers?: Array<{ providerId: string; snapshot?: { path?: string }; lastSuccessfulCheckAt?: string }>;
  };

  const botProvider = release.providers?.find((p) => p.providerId === 'bot');
  const snapPath = botProvider?.snapshot?.path;
  if (!snapPath) throw new Error('BOT snapshot path missing');

  const snapRes = await fetch(
    `https://cdn.jsdelivr.net/gh/haotool/app@data/public/rates/v3/${snapPath}`,
    { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(7000) }
  );
  if (!snapRes.ok) throw new Error(`BOT snapshot HTTP ${snapRes.status}`);
  const snap = (await snapRes.json()) as {
    quotes?: Array<{
      fromCurrency: string;
      sourceQuote?: {
        providerBuyPrice?: string;
        providerSellPrice?: string;
        originalBuyField?: string;
        originalSellField?: string;
        sourcePublishedAt?: string;
      };
    }>;
  };

  const rates: Partial<Record<CurrencyCode, BankCurrencyRates>> = {};
  let publishedAt: string | null = botProvider?.lastSuccessfulCheckAt ?? release.generatedAt ?? null;

  for (const q of snap.quotes ?? []) {
    const code = q.fromCurrency as CurrencyCode;
    if (!TARGET_CURRENCIES.includes(code) || !q.sourceQuote) continue;
    const sq = q.sourceQuote;
    if (sq.sourcePublishedAt) publishedAt = sq.sourcePublishedAt;

    rates[code] ??= { cashBuy: null, cashSell: null, spotBuy: null, spotSell: null };
    const buy = toNum(sq.providerBuyPrice);
    const sell = toNum(sq.providerSellPrice);

    if (sq.originalBuyField === 'cash.buy') {
      rates[code]!.cashBuy = buy;
      rates[code]!.cashSell = sell;
    } else if (sq.originalBuyField === 'spot.buy') {
      rates[code]!.spotBuy = buy;
      rates[code]!.spotSell = sell;
    }
  }

  return {
    code: '004',
    name: '臺灣銀行',
    sourceLabel: '臺灣銀行牌告 (RateWise Open Data)',
    sourceUrl: 'https://rate.bot.com.tw/xrt?Lang=zh-TW',
    updatedAt: publishedAt,
    rates,
  };
}

// 2. 玉山銀行 (808) via official JSON-LD on E.SUN exchange rate page
async function fetchEsunRates(): Promise<LiveBankResult> {
  const url = 'https://www.esunbank.com/zh-tw/personal/deposit/rate/forex/foreign-exchange-rates';
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`ESUN HTTP ${res.status}`);
  const html = await res.text();

  const rates: Partial<Record<CurrencyCode, BankCurrencyRates>> = {};
  let updatedAt: string | null = null;

  for (const match of html.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (!match[1].includes('ExchangeRateSpecification')) continue;
    const parsed = JSON.parse(match[1]) as {
      mainEntity?: {
        itemListElement?: Array<{
          currency?: string;
          name?: string;
          currentExchangeRate?: { price?: string; validFrom?: string };
        }>;
      };
    };

    for (const item of parsed.mainEntity?.itemListElement ?? []) {
      const code = item.currency as CurrencyCode;
      if (!TARGET_CURRENCIES.includes(code)) continue;
      const price = toNum(item.currentExchangeRate?.price);
      if (item.currentExchangeRate?.validFrom && !updatedAt) {
        updatedAt = item.currentExchangeRate.validFrom;
      }
      rates[code] ??= { cashBuy: null, cashSell: null, spotBuy: null, spotSell: null };
      const label = item.name ?? '';
      if (label.includes('即期匯率') && label.includes('銀行買入')) rates[code]!.spotBuy = price;
      else if (label.includes('即期匯率') && label.includes('銀行賣出')) rates[code]!.spotSell = price;
      else if (label.includes('現金匯率') && label.includes('銀行買入')) rates[code]!.cashBuy = price;
      else if (label.includes('現金匯率') && label.includes('銀行賣出')) rates[code]!.cashSell = price;
    }
  }

  return {
    code: '808',
    name: '玉山銀行',
    sourceLabel: '玉山銀行官網牌告',
    sourceUrl: url,
    updatedAt,
    rates,
  };
}

// 3. 國泰世華 (013) via official Cathay currency billboard HTML
async function fetchCathayRates(): Promise<LiveBankResult> {
  const url = 'https://www.cathaybk.com.tw/cathaybk/personal/product/deposit/currency-billboard/';
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`Cathay HTTP ${res.status}`);
  const html = await res.text();

  const rates: Partial<Record<CurrencyCode, BankCurrencyRates>> = {};
  for (const match of html.matchAll(
    /<div class="cubre-m-currency__name">([\s\S]*?)<\/div>([\s\S]*?)<\/table>/g
  )) {
    const codeMatch = match[1].match(/([A-Z]{3})/);
    if (!codeMatch) continue;
    const code = codeMatch[1] as CurrencyCode;
    if (!TARGET_CURRENCIES.includes(code)) continue;

    const body = match[2].replace(/\s+/g, ' ');
    const spotMatch = body.match(
      /即期匯率<\/div>\s*<\/td>\s*<td>\s*<div>([^<]+)<\/div>\s*<\/td>\s*<td>\s*<div>([^<]+)<\/div>/
    );
    const cashMatch = body.match(
      /現鈔匯率<\/div>\s*<\/td>\s*<td>\s*<div>([^<]+)<\/div>\s*<\/td>\s*<td>\s*<div>([^<]+)<\/div>/
    );

    rates[code] = {
      spotBuy: spotMatch ? toNum(spotMatch[1]) : null,
      spotSell: spotMatch ? toNum(spotMatch[2]) : null,
      cashBuy: cashMatch ? toNum(cashMatch[1]) : null,
      cashSell: cashMatch ? toNum(cashMatch[2]) : null,
    };
  }

  return {
    code: '013',
    name: '國泰世華',
    sourceLabel: '國泰世華官網牌告',
    sourceUrl: url,
    updatedAt: new Date().toISOString(),
    rates,
  };
}

// 4. 台北富邦 (012) via official Fubon ebank HTML
async function fetchFubonRates(): Promise<LiveBankResult> {
  const url = 'https://ebank.taipeifubon.com.tw/B2C/cfhqu/cfhqu009/CFHQU009_Home.faces';
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`Fubon HTTP ${res.status}`);
  const html = await res.text();

  const rates: Partial<Record<CurrencyCode, BankCurrencyRates>> = {};
  for (const match of html.matchAll(
    /class="flag_([A-Z]{3})"[^>]*>[^<]*<\/span><\/td>\s*<td class="rt">([^<]+)<\/td>\s*<td class="rt">([^<]+)<\/td>\s*<td class="rt">([^<]+)<\/td>\s*<td class="rt">([^<]+)<\/td>/g
  )) {
    const code = match[1] as CurrencyCode;
    if (!TARGET_CURRENCIES.includes(code)) continue;
    rates[code] = {
      spotBuy: toNum(match[2]),
      spotSell: toNum(match[3]),
      cashBuy: toNum(match[4]),
      cashSell: toNum(match[5]),
    };
  }

  return {
    code: '012',
    name: '台北富邦',
    sourceLabel: '台北富邦官網牌告',
    sourceUrl: url,
    updatedAt: new Date().toISOString(),
    rates,
  };
}

// 5. 永豐銀行 (807) via official SinoPac JSON API
async function fetchSinoPacRates(): Promise<LiveBankResult> {
  const remitUrl = 'https://mma.sinopac.com/ws/share/rate/ws_exchange.ashx?exchangeType=REMIT';
  const cashUrl = 'https://mma.sinopac.com/ws/share/rate/ws_exchange.ashx?exchangeType=CASH';

  const [remitRes, cashRes] = await Promise.all([
    fetch(remitUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(7000) }),
    fetch(cashUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(7000) }),
  ]);
  if (!remitRes.ok || !cashRes.ok) {
    throw new Error(`SinoPac HTTP ${remitRes.status}/${cashRes.status}`);
  }

  interface SinoPacPayload {
    QueryDate?: string;
    SubInfo?: Array<{ DataValue2?: string; DataValue3?: string; DataValue4?: string }>;
  }

  const remitJson = (await remitRes.json()) as SinoPacPayload[];
  const cashJson = (await cashRes.json()) as SinoPacPayload[];

  const rates: Partial<Record<CurrencyCode, BankCurrencyRates>> = {};
  for (const row of remitJson[0]?.SubInfo ?? []) {
    const code = row.DataValue4 as CurrencyCode;
    if (!TARGET_CURRENCIES.includes(code)) continue;
    rates[code] ??= { cashBuy: null, cashSell: null, spotBuy: null, spotSell: null };
    rates[code]!.spotBuy = toNum(row.DataValue2);
    rates[code]!.spotSell = toNum(row.DataValue3);
  }
  for (const row of cashJson[0]?.SubInfo ?? []) {
    const code = row.DataValue4 as CurrencyCode;
    if (!TARGET_CURRENCIES.includes(code)) continue;
    rates[code] ??= { cashBuy: null, cashSell: null, spotBuy: null, spotSell: null };
    rates[code]!.cashBuy = toNum(row.DataValue2);
    rates[code]!.cashSell = toNum(row.DataValue3);
  }

  return {
    code: '807',
    name: '永豐銀行',
    sourceLabel: '永豐銀行官方 API',
    sourceUrl: 'https://mma.sinopac.com/ws/share/rate/ws_exchange.ashx?exchangeType=REMIT',
    updatedAt: remitJson[0]?.QueryDate ?? new Date().toISOString(),
    rates,
  };
}

// 6. 第一銀行 (007) via official First Bank HTML
async function fetchFirstBankRates(): Promise<LiveBankResult> {
  const url = 'https://ibank.firstbank.com.tw/NetBank/7/0201.html?sh=none';
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`FirstBank HTTP ${res.status}`);
  const html = await res.text();

  const rates: Partial<Record<CurrencyCode, BankCurrencyRates>> = {};
  for (const match of html.matchAll(
    /alt="([A-Z]{3})"[\s\S]*?<!--即期或現鈔-->\s*([^<\s]+)[\s\S]*?<td[^>]*>\s*([^<\s]+)\s*<\/td>\s*<td[^>]*>\s*([^<\s]+)\s*<\/td>/g
  )) {
    const code = match[1] as CurrencyCode;
    if (!TARGET_CURRENCIES.includes(code)) continue;
    const kind = match[2].trim();
    const buy = toNum(match[3]);
    const sell = toNum(match[4]);

    rates[code] ??= { cashBuy: null, cashSell: null, spotBuy: null, spotSell: null };
    if (kind === 'Spot') {
      rates[code]!.spotBuy = buy;
      rates[code]!.spotSell = sell;
    } else if (kind === 'Cash') {
      rates[code]!.cashBuy = buy;
      rates[code]!.cashSell = sell;
    }
  }

  return {
    code: '007',
    name: '第一銀行',
    sourceLabel: '第一銀行官網牌告',
    sourceUrl: url,
    updatedAt: new Date().toISOString(),
    rates,
  };
}

// 7. Historical BOT daily series via FinMind Open Data
async function fetchFinMindHistory(
  currency: CurrencyCode
): Promise<FinMindRow[]> {
  const start = new Date(Date.now() - 38 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanExchangeRate&data_id=${currency}&start_date=${start}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`FinMind HTTP ${res.status}`);
  const json = (await res.json()) as { status?: number; data?: FinMindRow[] };
  return (json.data ?? []).filter((r) => Number.isFinite(r.spot_sell) && r.spot_sell > 0);
}

function summarizeSeries(
  subLabel: string,
  points: TrendPoint[],
  decimals: number
): TrendRangeData {
  if (points.length === 0) {
    return { subLabel, points: [], high: 0, low: 0, avg: 0, changePct: 0 };
  }
  const vals = points.map((p) => p.value);
  const high = Math.max(...vals);
  const low = Math.min(...vals);
  const avg = roundTo(vals.reduce((sum, v) => sum + v, 0) / vals.length, decimals);
  const first = vals[0];
  const last = vals[vals.length - 1];
  const changePct = first > 0 ? roundTo(((last - first) / first) * 100, 2) : 0;
  return { subLabel, points, high, low, avg, changePct };
}

// In-memory cache & intraday live tick recorder
let cachedPayload: FxApiResponse | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60_000;
const FORCE_COOLDOWN_MS = 5_000;

const intradayTicks: Record<CurrencyCode, TrendPoint[]> = {
  JPY: [],
  USD: [],
  CNY: [],
  EUR: [],
  GBP: [],
};

async function buildLiveFxPayload(): Promise<FxApiResponse> {
  const bankFetchers = [
    { code: '004', name: '臺灣銀行', sourceLabel: '臺灣銀行牌告 (RateWise)', sourceUrl: 'https://rate.bot.com.tw/xrt?Lang=zh-TW', fn: fetchBotRates },
    { code: '808', name: '玉山銀行', sourceLabel: '玉山銀行官網牌告', sourceUrl: 'https://www.esunbank.com/zh-tw/personal/deposit/rate/forex/foreign-exchange-rates', fn: fetchEsunRates },
    { code: '013', name: '國泰世華', sourceLabel: '國泰世華官網牌告', sourceUrl: 'https://www.cathaybk.com.tw/cathaybk/personal/product/deposit/currency-billboard/', fn: fetchCathayRates },
    { code: '012', name: '台北富邦', sourceLabel: '台北富邦官網牌告', sourceUrl: 'https://ebank.taipeifubon.com.tw/B2C/cfhqu/cfhqu009/CFHQU009_Home.faces', fn: fetchFubonRates },
    { code: '807', name: '永豐銀行', sourceLabel: '永豐銀行官方 API', sourceUrl: 'https://mma.sinopac.com/ws/share/rate/ws_exchange.ashx?exchangeType=REMIT', fn: fetchSinoPacRates },
    { code: '007', name: '第一銀行', sourceLabel: '第一銀行官網牌告', sourceUrl: 'https://ibank.firstbank.com.tw/NetBank/7/0201.html?sh=none', fn: fetchFirstBankRates },
  ];

  const [bankResults, historyResults] = await Promise.all([
    Promise.allSettled(bankFetchers.map((b) => b.fn())),
    Promise.allSettled(TARGET_CURRENCIES.map((c) => fetchFinMindHistory(c))),
  ]);

  const activeBanks: LiveBankResult[] = [];
  const sources: FxApiResponse['sources'] = [];

  bankResults.forEach((result, idx) => {
    const meta = bankFetchers[idx];
    if (result.status === 'fulfilled' && Object.keys(result.value.rates).length > 0) {
      activeBanks.push(result.value);
      sources.push({
        code: meta.code,
        name: meta.name,
        sourceLabel: result.value.sourceLabel,
        sourceUrl: result.value.sourceUrl,
        status: 'ok',
        updatedAt: result.value.updatedAt,
      });
    } else {
      if (result.status === 'rejected') {
        console.warn(`[FX] ${meta.name} fetch failed:`, result.reason);
      }
      sources.push({
        code: meta.code,
        name: meta.name,
        sourceLabel: meta.sourceLabel,
        sourceUrl: meta.sourceUrl,
        status: 'unavailable',
        updatedAt: null,
      });
    }
  });

  if (activeBanks.length === 0) {
    throw new Error('All upstream bank rate feeds are temporarily unavailable.');
  }

  const banksByCurrency = {} as FxApiResponse['banks'];
  const monitor = {} as FxApiResponse['monitor'];
  const trends = {} as FxApiResponse['trends'];
  const nowStr = formatTaipeiTime(new Date());
  const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(
    new Date()
  );

  TARGET_CURRENCIES.forEach((curr, idx) => {
    const dec = RATE_DECIMALS[curr];
    banksByCurrency[curr] = activeBanks
      .filter((b) => Boolean(b.rates[curr]))
      .map((b) => {
        const r = b.rates[curr]!;
        return {
          code: b.code,
          name: b.name,
          cashBuy: r.cashBuy,
          cashSell: r.cashSell,
          spotBuy: r.spotBuy,
          spotSell: r.spotSell,
        };
      });

    const botEntry =
      banksByCurrency[curr].find((b) => b.code === '004') ?? banksByCurrency[curr][0];

    const histResult = historyResults[idx];
    const histRows =
      histResult.status === 'fulfilled' ? histResult.value : [];

    const latestSpotSell = botEntry?.spotSell ?? histRows[histRows.length - 1]?.spot_sell ?? 0;
    const latestSpotBuy = botEntry?.spotBuy ?? histRows[histRows.length - 1]?.spot_buy ?? 0;

    // Combine FinMind daily rows with today's live BOT quote if newer
    const dailyPoints: TrendPoint[] = histRows.map((row) => ({
      label: row.date.slice(5).replace('-', '/'),
      value: row.spot_sell,
    }));
    const lastHistDate = histRows[histRows.length - 1]?.date;
    if (latestSpotSell > 0 && lastHistDate !== todayIso) {
      dailyPoints.push({ label: '今日', value: latestSpotSell });
    }

    // 1M: all ~22+ trading days
    const monthPoints = dailyPoints.slice(-24);
    // 1W: last 7 trading days
    const weekPoints = dailyPoints.slice(-7);

    // 1D: yesterday close + recorded live ticks (or 5-day intraday anchor if only 1 tick)
    const ticks = intradayTicks[curr];
    if (latestSpotSell > 0) {
      const lastTick = ticks[ticks.length - 1];
      if (!lastTick || lastTick.label !== nowStr) {
        ticks.push({ label: nowStr, value: latestSpotSell });
        if (ticks.length > 12) ticks.shift();
      }
    }
    const prevCloseRow =
      lastHistDate === todayIso
        ? histRows[histRows.length - 2]
        : histRows[histRows.length - 1];
    const oneDayPoints: TrendPoint[] = [];
    if (prevCloseRow) {
      oneDayPoints.push({
        label: `昨收 (${prevCloseRow.date.slice(5).replace('-', '/')})`,
        value: prevCloseRow.spot_sell,
      });
    }
    oneDayPoints.push(...ticks);

    trends[curr] = {
      '1D': summarizeSeries('昨日收盤與今日即時連線紀錄', oneDayPoints, dec),
      '1W': summarizeSeries('臺灣銀行近 7 個交易日收盤與即時報價', weekPoints, dec),
      '1M': summarizeSeries('臺灣銀行近 30 日歷史牌告走勢', monthPoints, dec),
    };

    const prevRef = prevCloseRow?.spot_sell ?? latestSpotSell;
    const changeAbs = roundTo(latestSpotSell - prevRef, dec);
    const changePct =
      prevRef > 0 ? roundTo(((latestSpotSell - prevRef) / prevRef) * 100, 2) : 0;

    const sparkVals = weekPoints.slice(-6).map((p) => p.value);
    const low24h = Math.min(prevRef, latestSpotSell, ...banksByCurrency[curr].map((b) => b.spotSell ?? latestSpotSell));
    const high24h = Math.max(prevRef, latestSpotSell, ...banksByCurrency[curr].map((b) => b.spotSell ?? latestSpotSell));

    monitor[curr] = {
      code: curr,
      spotBuy: latestSpotBuy,
      spotSell: latestSpotSell,
      changePct,
      changeAbs,
      low24h: roundTo(low24h, dec),
      high24h: roundTo(high24h, dec),
      sparkline: sparkVals.length >= 2 ? sparkVals : [prevRef, latestSpotSell],
    };
  });

  return {
    fetchedAt: new Date().toISOString(),
    sources,
    banks: banksByCurrency,
    monitor,
    trends,
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default async (request: Request): Promise<Response> => {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === '1';
    const now = Date.now();
    const cacheValid = cachedPayload && now - lastFetchTimestamp < CACHE_TTL_MS;
    const withinCooldown = cachedPayload && now - lastFetchTimestamp < FORCE_COOLDOWN_MS;

    if ((cacheValid && !force) || (force && withinCooldown)) {
      return json(cachedPayload);
    }

    const fresh = await buildLiveFxPayload();
    cachedPayload = fresh;
    lastFetchTimestamp = Date.now();
    return json(fresh);
  } catch (err) {
    console.error('[FX API Error]', err);
    if (cachedPayload) return json(cachedPayload);
    return json({ error: '無法取得臺灣各銀行公開牌告匯率，請稍後再試。' }, 502);
  }
};

// 讓這個函式對應到 /api/fx/rates
export const config = { path: '/api/fx/rates' };
