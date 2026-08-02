"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, ArrowUpRight, TrendingUp, TrendingDown, RefreshCw, BarChart2, DollarSign, PlayCircle } from "lucide-react";
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

interface DBHolding {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  avg_price: string | number;
  invested_value: string | number;
  stock: StockMaster & {
    price_cache?: StockPrice | null;
  };
}

export default function PortfolioPage() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<DBHolding[]>([]);
  const [cashBalance, setCashBalance] = useState(100000);
  const [pricesMap, setPricesMap] = useState<Record<string, StockPrice>>({});
  const [flashes, setFlashes] = useState<Record<string, "up" | "down" | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockMaster | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Poll state ref
  const pricesMapRef = useRef<Record<string, StockPrice>>({});

  const fetchPortfolioData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/portfolio/details");
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings);
        setCashBalance(data.cashBalance);
        setWatchlist(data.watchlist || []);

        // Map prices
        const initialPrices: Record<string, StockPrice> = {};
        for (const h of data.holdings) {
          if (h.stock.price_cache) {
            initialPrices[h.symbol] = h.stock.price_cache;
          }
        }
        setPricesMap(initialPrices);
        pricesMapRef.current = initialPrices;
      }
    } catch (err) {
      console.error("Failed to load portfolio details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  // Poll live prices
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
        console.error("Error polling portfolio prices:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Update selected stock price when pricesMap updates
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

  // Recalculate metrics in real-time
  const { totalHoldingsVal, totalInvestedVal, totalTodayPnl, portfolioValue, overallPnl, overallPnlPct, todayPnlPct } = (() => {
    let holdingsVal = 0;
    let investedVal = 0;
    let todayPnl = 0;

    for (const h of holdings) {
      const priceObject = pricesMap[h.symbol];
      const currentPrice = priceObject ? Number(priceObject.last_price) : Number(h.avg_price);
      const dayChange = priceObject ? Number(priceObject.day_change || 0) : 0;

      holdingsVal += h.quantity * currentPrice;
      investedVal += Number(h.invested_value);
      todayPnl += h.quantity * dayChange;
    }

    const portVal = cashBalance + holdingsVal;
    const ovrPnl = holdingsVal - investedVal;
    const ovrPnlPct = investedVal > 0 ? (ovrPnl / investedVal) * 100 : 0;

    const prevDayPortVal = portVal - todayPnl;
    const tdyPnlPct = prevDayPortVal > 0 ? (todayPnl / prevDayPortVal) * 100 : 0;

    return {
      totalHoldingsVal: holdingsVal,
      totalInvestedVal: investedVal,
      totalTodayPnl: todayPnl,
      portfolioValue: portVal,
      overallPnl: ovrPnl,
      overallPnlPct: ovrPnlPct,
      todayPnlPct: tdyPnlPct,
    };
  })();

  const handleTradeSuccess = (newBalance: number) => {
    setCashBalance(newBalance);
    // Reload full portfolio list to update holdings quantity changes
    fetchPortfolioData();
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            My Portfolio
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Analyze your virtual holdings, tracking average purchase costs and live gains.
          </p>
        </div>
        <button
          onClick={fetchPortfolioData}
          className="flex items-center space-x-2 bg-white border border-slate-100 hover:bg-slate-50 text-xs font-bold text-slate-600 px-4 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Portfolio</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Net Worth */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Portfolio Value</span>
            <span className="p-2 rounded-xl bg-slate-50 text-slate-500">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{formatCurrency(portfolioValue)}</span>
            <span className="text-xs text-slate-400 font-semibold block mt-1">Cash + Live Positions</span>
          </div>
        </div>

        {/* Live Holdings Value */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Market Value</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BarChart2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{formatCurrency(totalHoldingsVal)}</span>
            <span className="text-xs text-slate-400 font-semibold block mt-1">Invested: {formatCurrency(totalInvestedVal)}</span>
          </div>
        </div>

        {/* Today's Returns */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Returns</span>
            <span className={`p-2 rounded-xl ${totalTodayPnl >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {totalTodayPnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </span>
          </div>
          <div>
            <span className={`text-2xl font-black block ${totalTodayPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(totalTodayPnl)}
            </span>
            <span className={`text-xs font-semibold block mt-1 ${totalTodayPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              ({totalTodayPnl >= 0 ? "+" : ""}{todayPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Overall Returns */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Returns (PnL)</span>
            <span className={`p-2 rounded-xl ${overallPnl >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {overallPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </span>
          </div>
          <div>
            <span className={`text-2xl font-black block ${overallPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(overallPnl)}
            </span>
            <span className={`text-xs font-semibold block mt-1 ${overallPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              ({overallPnl >= 0 ? "+" : ""}{overallPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Holdings List Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-bold text-slate-400">Loading your investments...</span>
          </div>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
            <Briefcase className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-800">Your portfolio is empty</h3>
            <p className="text-slate-400 text-sm max-w-sm mt-1">
              You haven't bought any stock positions yet. Start with our simulated funds of ₹100,000.00.
            </p>
            <Link
              href="/market"
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all text-sm mt-6 cursor-pointer"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Browse Live Market</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Stock Details</th>
                  <th className="px-6 py-4 text-right">Shares Owned</th>
                  <th className="px-6 py-4 text-right">Avg Purchase Price</th>
                  <th className="px-6 py-4 text-right">Current Live Price</th>
                  <th className="px-6 py-4 text-right">Total Invested</th>
                  <th className="px-6 py-4 text-right">Current Market Value</th>
                  <th className="px-6 py-4 text-right">Returns (PnL)</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/50">
                {holdings.map((h) => {
                  const pCache = pricesMap[h.symbol];
                  const livePrice = pCache ? Number(pCache.last_price) : Number(h.avg_price);
                  const currentVal = h.quantity * livePrice;
                  const investedVal = Number(h.invested_value);
                  const pnl = currentVal - investedVal;
                  const pnlPct = investedVal > 0 ? (pnl / investedVal) * 100 : 0;
                  const isUp = pnl >= 0;
                  const flash = flashes[h.symbol];

                  return (
                    <tr
                      key={h.symbol}
                      onClick={() => {
                        router.push(`/stock/${h.symbol}`);
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
                        <span className="text-sm font-black text-slate-800 block">{h.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[120px] block mt-0.5">
                          {h.stock.company_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">
                        {h.quantity}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">
                        {formatCurrency(Number(h.avg_price))}
                      </td>
                      <td className={`px-6 py-4 text-right transition-colors duration-300 font-semibold ${
                        flash === "up"
                          ? "text-emerald-600 scale-[1.01]"
                          : flash === "down"
                          ? "text-rose-600 scale-[1.01]"
                          : "text-slate-700"
                      }`}>
                        {formatCurrency(livePrice)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">
                        {formatCurrency(investedVal)}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-800">
                        {formatCurrency(currentVal)}
                      </td>
                      <td className="px-6 py-4 text-right font-black">
                        <span className={isUp ? "text-emerald-500" : "text-rose-500"}>
                          {isUp ? "+" : ""}{formatCurrency(pnl)}
                        </span>
                        <span className={`block text-[10px] font-bold mt-0.5 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/stock/${h.symbol}`);
                          }}
                          className="text-xs font-extrabold bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
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
        userCash={cashBalance}
        userHoldingsQuantity={selectedStock ? holdings.find((h) => h.symbol === selectedStock.symbol)?.quantity || 0 : 0}
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
