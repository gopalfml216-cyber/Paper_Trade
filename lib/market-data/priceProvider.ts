import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();



export interface LivePriceData {
  lastPrice: number;
  dayChange: number;
  dayChangePct: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  prevClose: number;
}

export interface HistoricalDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchLiveQuote(symbol: string): Promise<LivePriceData> {
  const nseSymbol = `${symbol.toUpperCase()}.NS`;
  try {
    const quote = (await yahooFinance.quote(nseSymbol)) as any;
    
    const lastPrice = Number(quote.regularMarketPrice ?? 0);
    const prevClose = Number(quote.regularMarketPreviousClose ?? lastPrice);
    const dayChange = Number(quote.regularMarketChange ?? (lastPrice - prevClose));
    const dayChangePct = Number(quote.regularMarketChangePercent ?? ((dayChange / prevClose) * 100));
    const dayOpen = Number(quote.regularMarketOpen ?? lastPrice);
    const dayHigh = Number(quote.regularMarketDayHigh ?? lastPrice);
    const dayLow = Number(quote.regularMarketDayLow ?? lastPrice);

    return {
      lastPrice,
      dayChange,
      dayChangePct,
      dayOpen,
      dayHigh,
      dayLow,
      prevClose,
    };
  } catch (err: any) {
    console.error(`Failed to fetch live quote for ${nseSymbol} from Yahoo Finance:`, err);
    throw err;
  }
}

export async function fetchHistoricalData(symbol: string): Promise<HistoricalDataPoint[]> {
  const nseSymbol = `${symbol.toUpperCase()}.NS`;
  
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  try {
    const results = (await yahooFinance.historical(nseSymbol, {
      period1: oneYearAgo.toISOString().split("T")[0],
      period2: today.toISOString().split("T")[0],
      interval: "1d",
    })) as any[];

    return results.map((r: any) => ({
      date: new Date(r.date),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume || 0),
    }));
  } catch (err: any) {
    console.error(`Failed to fetch historical prices for ${nseSymbol} from Yahoo Finance:`, err);
    throw err;
  }
}
