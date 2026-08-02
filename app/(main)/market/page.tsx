"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, TrendingDown, RefreshCw, BarChart2, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockDetailsDrawer from "@/components/ui/StockDetailsDrawer";
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

const SECTORS = [
  "All Sectors",
  "My Watchlist",
  "Financial Services",
  "Technology",
  "Energy",
  "Consumer Goods",
  "Healthcare",
  "Automobile",
  "Metals & Mining",
  "Utilities",
  "Materials",
  "Services",
  "Construction",
  "Telecommunication",
  "Industrial Manufacturing"
];

export default function MarketPage() {
  const router = useRouter();
  const [stocks, setStocks] = useState<StockMaster[]>([]);
  const [pricesMap, setPricesMap] = useState<Record<string, StockPrice>>({});
  const [flashes, setFlashes] = useState<Record<string, "up" | "down" | null>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSector, setActiveSector] = useState("All Sectors");
  const [isLoading, setIsLoading] = useState(true);
  const [userCash, setUserCash] = useState(100000);
  const [userHoldings, setUserHoldings] = useState<Record<string, number>>({});
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockMaster | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Poll state ref to check current values without re-effecting
  const pricesMapRef = useRef<Record<string, StockPrice>>({});

  // 1. Initial Load of user balance + stocks list
  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      // Fetch user profile info
      const userRes = await fetch("/api/user/details");
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserCash(userData.user.virtual_cash_balance);
        setUserHoldings(userData.holdings);
        setWatchlist(userData.watchlist || []);
      }

      // Fetch stock master list
      const stocksRes = await fetch("/api/market/stocks");
      if (stocksRes.ok) {
        const stocksData = await stocksRes.json();
        setStocks(stocksData.stocks);
        
        // Populate initial prices
        const initialPrices: Record<string, StockPrice> = {};
        for (const s of stocksData.stocks) {
          if (s.price_cache) {
            initialPrices[s.symbol] = s.price_cache;
          }
        }
        setPricesMap(initialPrices);
        pricesMapRef.current = initialPrices;
      }
    } catch (err) {
      console.error("Failed to load market data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // 2. Real-time price poller
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/market/prices");
        if (res.ok) {
          const data = await res.json();
          const newFlashes: Record<string, "up" | "down" | null> = {};
          const nextPricesMap: Record<string, StockPrice> = { ...pricesMapRef.current };

          for (const newPrice of data.prices as StockPrice[]) {
            const oldPrice = nextPricesMap[newPrice.symbol];
            if (oldPrice) {
              const oldVal = Number(oldPrice.last_price);
              const newVal = Number(newPrice.last_price);
              if (newVal > oldVal) {
                newFlashes[newPrice.symbol] = "up";
              } else if (newVal < oldVal) {
                newFlashes[newPrice.symbol] = "down";
              }
            }
            nextPricesMap[newPrice.symbol] = newPrice;
          }

          setPricesMap(nextPricesMap);
          pricesMapRef.current = nextPricesMap;

          // Merge flashes
          setFlashes((prev) => ({ ...prev, ...newFlashes }));

          // Clear flashes after brief timeout
          setTimeout(() => {
            setFlashes((prev) => {
              const cleared = { ...prev };
              for (const sym in newFlashes) {
                cleared[sym] = null;
              }
              return cleared;
            });
          }, 600);
        }
      } catch (err) {
        console.error("Error polling price simulation:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Update selected stock in drawer if pricesMap updates
  useEffect(() => {
    if (selectedStock && pricesMap[selectedStock.symbol]) {
      setSelectedStock((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          price_cache: pricesMap[prev.symbol],
        };
      });
    }
  }, [pricesMap]);

  // Handle successful trade
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

  const handleToggleWatchlistRow = async (symbol: string) => {
    try {
      const res = await fetch("/api/market/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist((prev) =>
          data.watched
            ? [...prev, symbol]
            : prev.filter((s) => s !== symbol)
        );
      }
    } catch (err) {
      console.error("Failed to toggle watchlist in row:", err);
    }
  };

  // Filter stocks by sector & search query
  const filteredStocks = stocks.filter((stock) => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.company_name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesSector = true;
    if (activeSector === "My Watchlist") {
      matchesSector = watchlist.includes(stock.symbol);
    } else if (activeSector !== "All Sectors") {
      matchesSector = stock.sector === activeSector;
    }

    return matchesSearch && matchesSector;
  });

  // Calculate Market Index values based on average price changes
  const { nifty, niftyChange, niftyChangePct, sensex, sensexChange, sensexChangePct } = (() => {
    const list = Object.values(pricesMap);
    if (list.length === 0) {
      return {
        nifty: 24320.50,
        niftyChange: 202.30,
        niftyChangePct: 0.84,
        sensex: 80050.40,
        sensexChange: 650.10,
        sensexChangePct: 0.82,
      };
    }

    const avgPctChange = list.reduce((acc, p) => acc + Number(p.day_change_pct || 0), 0) / list.length;
    
    const niftyPrev = 24118.20;
    const sensexPrev = 79400.30;

    const currentNifty = niftyPrev * (1 + avgPctChange / 100);
    const currentSensex = sensexPrev * (1 + avgPctChange / 100);

    return {
      nifty: currentNifty,
      niftyChange: currentNifty - niftyPrev,
      niftyChangePct: avgPctChange,
      sensex: currentSensex,
      sensexChange: currentSensex - sensexPrev,
      sensexChangePct: avgPctChange,
    };
  })();

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Live Market Dashboard
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Track real-time NSE indices, search stocks, and execute simulated trades instantly.
          </p>
        </div>
        <button
          onClick={fetchInitialData}
          className="flex items-center space-x-2 bg-white border border-slate-100 hover:bg-slate-50 text-xs font-bold text-slate-600 px-4 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Indices Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NIFTY 50 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">NIFTY 50</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">
              {nifty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-right">
            <span className={`p-2 rounded-xl ${niftyChange >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {niftyChange >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </span>
            <div>
              <span className={`text-sm font-bold block ${niftyChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {niftyChange >= 0 ? "+" : ""}{niftyChange.toFixed(2)}
              </span>
              <span className={`text-xs font-semibold block ${niftyChangePct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {niftyChangePct >= 0 ? "+" : ""}{niftyChangePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* SENSEX */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">SENSEX</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">
              {sensex.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-right">
            <span className={`p-2 rounded-xl ${sensexChange >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {sensexChange >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </span>
            <div>
              <span className={`text-sm font-bold block ${sensexChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {sensexChange >= 0 ? "+" : ""}{sensexChange.toFixed(2)}
              </span>
              <span className={`text-xs font-semibold block ${sensexChangePct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {sensexChangePct >= 0 ? "+" : ""}{sensexChangePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search by stock symbol or company name (e.g. TCS, Reliance)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* Sectors horizontal slider */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {SECTORS.map((sector) => (
            <button
              key={sector}
              onClick={() => setActiveSector(sector)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 shrink-0 cursor-pointer ${
                activeSector === sector
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* Stocks Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-bold text-slate-400">Loading NSE constituents...</span>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
            <BarChart2 className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-800">No stocks found</h3>
            <p className="text-slate-400 text-sm max-w-xs mt-1">
              We couldn't find any stocks matching your query. Try searching for a different name.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Stock Name</th>
                  <th className="px-6 py-4">Sector</th>
                  <th className="px-6 py-4 text-right">Current Price</th>
                  <th className="px-6 py-4 text-right">Day's Change</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/50">
                {filteredStocks.map((stock) => {
                  const pCache = pricesMap[stock.symbol];
                  const price = pCache ? Number(pCache.last_price) : 0;
                  const change = pCache ? Number(pCache.day_change || 0) : 0;
                  const pct = pCache ? Number(pCache.day_change_pct || 0) : 0;
                  const isUp = change >= 0;
                  const flash = flashes[stock.symbol];

                  return (
                    <tr
                      key={stock.symbol}
                      onClick={() => {
                        router.push(`/stock/${stock.symbol}`);
                      }}
                      className={`hover:bg-slate-50/60 cursor-pointer transition-colors duration-150 ${
                        flash === "up"
                          ? "bg-emerald-50/30"
                          : flash === "down"
                          ? "bg-rose-50/30"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWatchlistRow(stock.symbol);
                            }}
                            className="text-slate-300 hover:text-yellow-500 transition-colors p-1 rounded hover:bg-slate-100/50 cursor-pointer"
                            title={watchlist.includes(stock.symbol) ? "Remove from Watchlist" : "Add to Watchlist"}
                          >
                            <Star className={`w-4 h-4 ${watchlist.includes(stock.symbol) ? "fill-yellow-400 text-yellow-500" : "text-slate-300"}`} />
                          </button>
                          <div>
                            <span className="text-sm font-black text-slate-800 block">
                              {stock.symbol}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold max-w-[180px] sm:max-w-[280px] truncate block mt-0.5">
                              {stock.company_name}
                            </span>
                          </div>
                          {userHoldings[stock.symbol] > 0 && (
                            <span className="text-[8px] font-black tracking-wider text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 uppercase shrink-0">
                              Owned: {userHoldings[stock.symbol]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-500">
                          {stock.sector}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right transition-colors duration-300 font-bold ${
                        flash === "up"
                          ? "text-emerald-600 scale-[1.01]"
                          : flash === "down"
                          ? "text-rose-600 scale-[1.01]"
                          : "text-slate-800"
                      }`}>
                        {formatCurrency(price)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xs font-extrabold inline-flex items-center ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
                          {isUp ? "+" : ""}{change.toFixed(2)} ({isUp ? "+" : ""}{pct.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          className="text-xs font-extrabold bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/stock/${stock.symbol}`);
                          }}
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Details Slide-Over Drawer */}
      <StockDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        stock={selectedStock}
        userCash={userCash}
        userHoldingsQuantity={selectedStock ? userHoldings[selectedStock.symbol] || 0 : 0}
        onTradeSuccess={handleTradeSuccess}
        isWatched={selectedStock ? watchlist.includes(selectedStock.symbol) : false}
        onWatchlistToggle={(symbol, watched) => {
          setWatchlist((prev) =>
            watched ? [...prev, symbol] : prev.filter((s) => s !== symbol)
          );
        }}
      />
    </div>
  );
}
