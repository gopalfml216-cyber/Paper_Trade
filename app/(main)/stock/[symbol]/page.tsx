"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, TrendingUp, TrendingDown, RefreshCw, BarChart2, Shield, Calendar } from "lucide-react";
import StockChart from "@/components/ui/StockChart";
import OrderModal from "@/components/ui/OrderModal";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface StockPrice {
  symbol: string;
  last_price: string | number;
  day_change: string | number | null;
  day_change_pct: string | number | null;
  day_open: string | number | null;
  day_high: string | number | null;
  day_low: string | number | null;
  prev_close: string | number | null;
}

interface StockMaster {
  symbol: string;
  company_name: string;
  sector: string | null;
  price_cache?: StockPrice | null;
}

interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const router = useRouter();

  const [stock, setStock] = useState<StockMaster | null>(null);
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [activeRange, setActiveRange] = useState<"1W" | "1M" | "3M" | "1Y">("1M");
  
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [userCash, setUserCash] = useState(100000);
  const [userHoldings, setUserHoldings] = useState<Record<string, number>>({});

  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  const prevPriceRef = React.useRef<number | null>(null);

  // 1. Fetch initial stock metadata, user profile and watchlist
  const fetchInitialData = async () => {
    try {
      setIsLoadingStock(true);
      
      // Fetch user profile + holdings
      const userRes = await fetch("/api/user/details");
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserCash(userData.user.virtual_cash_balance);
        setUserHoldings(userData.holdings || {});
        setWatchlist(userData.watchlist || []);
      }

      // Fetch stock metadata
      const stockRes = await fetch(`/api/market/stocks?query=${symbol}`);
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        const foundStock = stockData.stocks.find((s: StockMaster) => s.symbol.toUpperCase() === symbol.toUpperCase());
        if (foundStock) {
          setStock(foundStock);
          if (foundStock.price_cache) {
            prevPriceRef.current = Number(foundStock.price_cache.last_price);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load stock details:", err);
    } finally {
      setIsLoadingStock(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [symbol]);

  // 2. Fetch history on mount and activeRange changes
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const res = await fetch(`/api/stocks/${symbol}/history?range=${activeRange}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error("Failed to load historical prices:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [symbol, activeRange]);

  // 3. Poll prices every 4 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/market/prices");
        if (res.ok) {
          const data = await res.json();
          const targetPrice = data.prices.find((p: StockPrice) => p.symbol.toUpperCase() === symbol.toUpperCase());
          
          if (targetPrice && stock) {
            const oldPrice = prevPriceRef.current;
            const newPrice = Number(targetPrice.last_price);

            if (oldPrice !== null && newPrice !== oldPrice) {
              setFlash(newPrice > oldPrice ? "up" : "down");
              setTimeout(() => setFlash(null), 600);
            }

            prevPriceRef.current = newPrice;
            setStock((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                price_cache: targetPrice,
              };
            });
          }
        }
      } catch (err) {
        console.error("Error polling live price cache:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [symbol, stock]);

  // 4. Star toggle watchlist
  const handleToggleWatchlist = async () => {
    try {
      const res = await fetch("/api/market/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist((prev) =>
          data.watched ? [...prev, symbol] : prev.filter((s) => s !== symbol)
        );
      }
    } catch (err) {
      console.error("Failed to toggle watchlist:", err);
    }
  };

  const handleTradeSuccess = (newBalance: number) => {
    setUserCash(newBalance);
    // Refresh user holdings map
    fetch("/api/user/details")
      .then((res) => res.json())
      .then((data) => {
        if (data.holdings) {
          setUserHoldings(data.holdings);
        }
      })
      .catch((err) => console.error("Error updating holdings:", err));
  };

  if (isLoadingStock) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs font-bold text-slate-400">Loading stock details...</span>
      </div>
    );
  }

  if (!stock || !stock.price_cache) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center">
        <Shield className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-black text-slate-800">Stock Not Found</h3>
        <p className="text-slate-400 text-sm mt-1">We couldn't retrieve the stock profile for {symbol.toUpperCase()}.</p>
        <button
          onClick={() => router.push("/market")}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-xs"
        >
          Return to Market
        </button>
      </div>
    );
  }

  const currentPrice = Number(stock.price_cache.last_price);
  const open = Number(stock.price_cache.day_open || currentPrice);
  const high = Number(stock.price_cache.day_high || currentPrice);
  const low = Number(stock.price_cache.day_low || currentPrice);
  const prevClose = Number(stock.price_cache.prev_close || currentPrice);
  const change = Number(stock.price_cache.day_change || 0);
  const pct = Number(stock.price_cache.day_change_pct || 0);
  const isUp = change >= 0;
  const isStarred = watchlist.includes(stock.symbol);
  const ownedQuantity = userHoldings[stock.symbol] || 0;

  // Calculate 52-week high & low dynamically from cached history
  const { fiftyTwoWeekHigh, fiftyTwoWeekLow } = (() => {
    if (history.length === 0) {
      return { fiftyTwoWeekHigh: high, fiftyTwoWeekLow: low };
    }
    const highs = history.map((h) => h.high);
    const lows = history.map((h) => h.low);
    return {
      fiftyTwoWeekHigh: Math.max(...highs, high),
      fiftyTwoWeekLow: Math.min(...lows, low),
    };
  })();

  // Mock static values for details card representation
  const volume = history.length > 0 ? Number(history[history.length - 1].open * 1250) : 1852030;
  const marketCap = currentPrice * 1850000000; // Mock share count representation

  return (
    <div className="space-y-6 pb-20 animate-fade-in-up">
      {/* Top Header Navigation */}
      <div className="flex justify-between items-center bg-white border border-slate-100 px-6 py-4 rounded-3xl shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/market")}
            className="p-2.5 rounded-xl border border-slate-50 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black text-slate-800 tracking-tight">{stock.symbol}</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                {stock.sector}
              </span>
            </div>
            <h3 className="text-xs text-slate-400 font-semibold truncate max-w-[180px] sm:max-w-[300px] mt-0.5">
              {stock.company_name}
            </h3>
          </div>
        </div>

        <button
          onClick={handleToggleWatchlist}
          className="p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-all cursor-pointer text-slate-400 hover:text-yellow-500"
          title={isStarred ? "Remove from Watchlist" : "Add to Watchlist"}
        >
          <Star className={`w-5 h-5 ${isStarred ? "fill-yellow-400 text-yellow-500" : ""}`} />
        </button>
      </div>

      {/* Grid: Left (Chart + Stats) / Right (Quick Trade Card on wide screen) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column (takes 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Price Widget */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Price (INR)</span>
              <span className={`text-4xl font-black block mt-1 tracking-tight transition-all duration-300 ${
                flash === "up" ? "text-emerald-600 scale-[1.01]" : flash === "down" ? "text-rose-600 scale-[1.01]" : "text-slate-800"
              }`}>
                {formatCurrency(currentPrice)}
              </span>
              <span className={`text-xs font-bold inline-flex items-center mt-1.5 ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
                {isUp ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {isUp ? "+" : ""}{change.toFixed(2)} ({isUp ? "+" : ""}{pct.toFixed(2)}%)
              </span>
            </div>
            
            {ownedQuantity > 0 && (
              <div className="sm:text-right bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Position</span>
                <span className="text-lg font-black text-blue-600 block mt-1">{ownedQuantity} Shares</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                  Avg Cost: {formatCurrency(Number(userHoldings[stock.symbol + "_avg"] || currentPrice))}
                </span>
              </div>
            )}
          </div>

          {/* Candlestick Chart Card */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Price Movements</h2>
              
              {/* Range Tabs */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200/50">
                {(["1W", "1M", "3M", "1Y"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setActiveRange(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      activeRange === r ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="bg-white rounded-3xl border border-slate-100 h-[400px] flex flex-col items-center justify-center space-y-3">
                <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs font-bold text-slate-400">Loading historical data...</span>
              </div>
            ) : (
              <StockChart data={history} />
            )}
          </div>
        </div>

        {/* Stats & Metadata Details (takes 1 col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3">Key Stats</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Open</span>
                <span className="font-extrabold text-slate-700 block mt-0.5">{formatCurrency(open)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prev Close</span>
                <span className="font-extrabold text-slate-700 block mt-0.5">{formatCurrency(prevClose)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's High</span>
                <span className="font-extrabold text-emerald-600 block mt-0.5">{formatCurrency(high)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Low</span>
                <span className="font-extrabold text-rose-600 block mt-0.5">{formatCurrency(low)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">52w High</span>
                <span className="font-extrabold text-emerald-600 block mt-0.5">{formatCurrency(fiftyTwoWeekHigh)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">52w Low</span>
                <span className="font-extrabold text-rose-600 block mt-0.5">{formatCurrency(fiftyTwoWeekLow)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume (Daily)</span>
                <span className="font-extrabold text-slate-700 block mt-0.5">{volume.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Market Cap</span>
                <span className="font-extrabold text-slate-700 block mt-0.5">{formatCurrency(marketCap).split(".")[0]}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-3 text-xs text-slate-500 font-semibold">
            <h3 className="font-black text-slate-800 border-b border-slate-50 pb-2">Trading Info</h3>
            <div className="flex justify-between items-center">
              <span>Lot Size:</span>
              <span className="font-bold text-slate-700">1 Share</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Exchange:</span>
              <span className="font-bold text-slate-700">NSE (National Stock Exchange)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Simulated Balance:</span>
              <span className="font-bold text-blue-600">{formatCurrency(userCash)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Floating Trading Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-18 bg-white border-t border-slate-100 flex items-center justify-between px-4 sm:px-8 z-40 shadow-lg">
        <div className="hidden md:flex items-center space-x-2 text-xs font-bold text-slate-400">
          <span>Simulation Mode: Active</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        <div className="flex items-center space-x-4 w-full md:w-auto">
          <button
            onClick={() => {
              setOrderSide("BUY");
              setIsOrderModalOpen(true);
            }}
            className="flex-grow md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-8 py-3 rounded-2xl shadow-lg shadow-emerald-500/10 active:scale-95 transition-all h-10 w-full sm:w-[150px] cursor-pointer"
          >
            BUY
          </button>
          <button
            onClick={() => {
              setOrderSide("SELL");
              setIsOrderModalOpen(true);
            }}
            disabled={ownedQuantity === 0}
            className="flex-grow md:flex-none bg-rose-500 hover:bg-rose-600 text-white disabled:bg-slate-300 font-black text-xs px-8 py-3 rounded-2xl shadow-lg shadow-rose-500/10 disabled:shadow-none active:scale-95 transition-all h-10 w-full sm:w-[150px] cursor-pointer"
            title={ownedQuantity === 0 ? "You don't own any shares" : ""}
          >
            SELL
          </button>
        </div>
      </div>

      {/* Interactive OrderModal dialog */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        stock={stock}
        initialSide={orderSide}
        userCash={userCash}
        userHoldingsQuantity={ownedQuantity}
        onTradeSuccess={handleTradeSuccess}
      />
    </div>
  );
}
