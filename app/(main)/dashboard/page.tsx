import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/authServer";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import prisma from "@/lib/prisma";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowRight,
  Briefcase,
  PlayCircle
} from "lucide-react";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const rawCookieHeader = cookieStore.toString();
  const user = await getServerUser(rawCookieHeader);

  if (!user) {
    redirect("/login");
  }

  // Fetch holdings with pricing from DB
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      holdings: {
        include: {
          stock: {
            include: {
              price_cache: true
            }
          }
        }
      },
      watchlist: {
        include: {
          stock: {
            include: {
              price_cache: true
            }
          }
        }
      }
    }
  });

  if (!dbUser) {
    redirect("/login");
  }

  const cashBalance = Number(dbUser.virtual_cash_balance);

  // Compute metrics from real holdings
  let totalHoldingsValue = 0;
  let totalInvestedValue = 0;
  let todayPnl = 0;

  const holdingsList = dbUser.holdings.map((h) => {
    const currentPrice = h.stock.price_cache ? Number(h.stock.price_cache.last_price) : Number(h.avg_price);
    const dayChange = h.stock.price_cache ? Number(h.stock.price_cache.day_change || 0) : 0;
    const investedVal = Number(h.invested_value);
    const currentVal = h.quantity * currentPrice;
    
    totalHoldingsValue += currentVal;
    totalInvestedValue += investedVal;
    todayPnl += h.quantity * dayChange;

    const absolutePnl = currentVal - investedVal;
    const pnlPct = investedVal > 0 ? (absolutePnl / investedVal) * 100 : 0;

    return {
      symbol: h.symbol,
      name: h.stock.company_name,
      quantity: h.quantity,
      avgPrice: Number(h.avg_price),
      currentPrice,
      investedVal,
      currentVal,
      pnl: absolutePnl,
      pnlPct,
      dayChange,
    };
  });

  const watchlistList = dbUser.watchlist.map((w) => {
    const price = w.stock.price_cache ? Number(w.stock.price_cache.last_price) : 0;
    const pct = w.stock.price_cache ? Number(w.stock.price_cache.day_change_pct || 0) : 0;
    return {
      symbol: w.symbol,
      name: w.stock.company_name,
      price,
      pct,
      isUp: pct >= 0,
    };
  });

  const portfolioValue = cashBalance + totalHoldingsValue;
  const overallPnl = totalHoldingsValue - totalInvestedValue;
  
  const prevDayPortfolioValue = portfolioValue - todayPnl;
  const todayPnlPct = prevDayPortfolioValue > 0 ? (todayPnl / prevDayPortfolioValue) * 100 : 0;
  const overallPnlPct = totalInvestedValue > 0 ? (overallPnl / totalInvestedValue) * 100 : 0;

  // Render indices based on overall market movements
  // Fetch a subset of prices to represent indices
  const allPriceCaches = await prisma.priceCache.findMany({ take: 10 });
  const avgDayPct = allPriceCaches.length > 0 
    ? allPriceCaches.reduce((acc, p) => acc + Number(p.day_change_pct || 0), 0) / allPriceCaches.length
    : 0.82;

  const nifty = 24118.20 * (1 + avgDayPct / 100);
  const niftyChange = nifty - 24118.20;
  const sensex = 79400.30 * (1 + avgDayPct / 100);
  const sensexChange = sensex - 79400.30;

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Welcome back, {dbUser.display_name}!
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Here's how your virtual investments are performing today.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2 text-xs font-bold text-blue-700">
          <span>Status: Simulated Trading</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>

      {/* Market Indices Strip */}
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
              <span className={`text-xs font-semibold block ${avgDayPct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {avgDayPct >= 0 ? "+" : ""}{avgDayPct.toFixed(2)}%
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
              <span className={`text-xs font-semibold block ${avgDayPct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {avgDayPct >= 0 ? "+" : ""}{avgDayPct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Portfolio Value */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Portfolio Value</span>
            <span className="p-2 rounded-xl bg-slate-50 text-slate-500">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{formatCurrency(portfolioValue)}</span>
            <span className="text-xs text-slate-400 font-semibold block mt-1">Cash + Stock Holdings</span>
          </div>
        </div>

        {/* Today's P&L */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's P&L</span>
            <span className={`p-2 rounded-xl ${todayPnl >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {todayPnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </span>
          </div>
          <div>
            <span className={`text-2xl font-black block ${todayPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(todayPnl)}
            </span>
            <span className={`text-xs font-semibold block mt-1 ${todayPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              ({todayPnl >= 0 ? "+" : ""}{todayPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Overall P&L */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall P&L</span>
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

        {/* Virtual Cash Available */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Virtual Cash</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{formatCurrency(cashBalance)}</span>
            <span className="text-xs text-slate-400 font-semibold block mt-1">Available to Invest</span>
          </div>
        </div>

      </div>

      {/* Main Dashboard Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Holdings List (takes 2 cols on wide screen) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-800">My Stock Holdings</h3>
            {holdingsList.length > 0 && (
              <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded">
                Active Positions
              </span>
            )}
          </div>

          {holdingsList.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-md font-black text-slate-800">You don't own any stocks yet</h3>
              <p className="text-slate-400 text-xs max-w-sm mt-2">
                Practice buying and selling stocks with your virtual money. Explore Nifty constituents now.
              </p>
              <Link
                href="/market"
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all text-xs mt-6 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Start Your First Trade</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Stock</th>
                    <th className="pb-3 text-right">Quantity</th>
                    <th className="pb-3 text-right">Avg / Live Price</th>
                    <th className="pb-3 text-right">Current Value</th>
                    <th className="pb-3 text-right">Total P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50">
                  {holdingsList.slice(0, 4).map((holding) => {
                    const isUp = holding.pnl >= 0;
                    return (
                      <tr key={holding.symbol} className="text-xs hover:bg-slate-50/30 transition-all rounded-xl">
                        <td className="py-3">
                          <Link href={`/stock/${holding.symbol}`} className="hover:underline">
                            <span className="font-black text-slate-800 block">{holding.symbol}</span>
                          </Link>
                          <span className="text-[9px] text-slate-400 truncate max-w-[120px] block mt-0.5">{holding.name}</span>
                        </td>
                        <td className="py-3 text-right font-semibold text-slate-700">{holding.quantity}</td>
                        <td className="py-3 text-right font-semibold text-slate-700">
                          <div>{formatCurrency(holding.avgPrice)}</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{formatCurrency(holding.currentPrice)}</div>
                        </td>
                        <td className="py-3 text-right font-black text-slate-800">{formatCurrency(holding.currentVal)}</td>
                        <td className="py-3 text-right font-extrabold">
                          <span className={isUp ? "text-emerald-500" : "text-rose-500"}>
                            {isUp ? "+" : ""}{formatCurrency(holding.pnl)}
                          </span>
                          <span className={`block text-[9px] mt-0.5 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                            {isUp ? "+" : ""}{holding.pnlPct.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {holdingsList.length > 4 && (
                <div className="text-center pt-4 border-t border-slate-50 mt-2">
                  <Link
                    href="/portfolio"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center space-x-1"
                  >
                    <span>View all {holdingsList.length} positions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Watchlist Quick View */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-800">My Watchlist</h3>
            {watchlistList.length > 0 && (
              <span className="text-[10px] font-black uppercase bg-yellow-50 text-yellow-600 border border-yellow-100 px-2 py-0.5 rounded">
                Starred: {watchlistList.length}
              </span>
            )}
          </div>

          <div className="space-y-3 flex-grow">
            {watchlistList.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-4 py-8">
                <span className="text-xs font-bold text-slate-400">Your watchlist is empty.</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Star stocks on the Market screen to track them here.</span>
              </div>
            ) : (
              watchlistList.slice(0, 5).map((stock) => (
                <Link
                  href={`/stock/${stock.symbol}`}
                  key={stock.symbol}
                  className="flex justify-between items-center border-b border-slate-50 pb-2.5 last:border-b-0 last:pb-0 hover:bg-slate-50/70 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <div>
                    <span className="text-sm font-black text-slate-700 block">{stock.symbol}</span>
                    <span className="text-[9px] text-slate-400 font-semibold max-w-[120px] truncate block">{stock.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-800 block">{formatCurrency(stock.price)}</span>
                    <span className={`text-xs font-bold block ${stock.isUp ? "text-emerald-500" : "text-rose-500"}`}>
                      {stock.isUp ? "+" : ""}{stock.pct.toFixed(2)}%
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link 
            href="/market" 
            className="flex items-center justify-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700 pt-2 block text-center cursor-pointer border-t border-slate-50 mt-auto"
          >
            <span>Explore Market Screen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
}
