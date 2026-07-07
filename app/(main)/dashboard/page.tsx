import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/authServer";
import { formatCurrency } from "@/lib/utils/formatCurrency";
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

  // Calculate overall metrics (initially flat for Day 1 skeleton)
  const cashBalance = user.virtual_cash_balance;
  const portfolioValue = cashBalance; // since no holdings exist yet
  const todayPnl = 0.00;
  const overallPnl = 0.00;
  const todayPnlPct = 0.00;
  const overallPnlPct = 0.00;

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Welcome back, {user.display_name}!
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
            <span className="text-2xl font-black text-slate-800 block mt-1">24,320.50</span>
          </div>
          <div className="flex items-center space-x-2 text-right">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <span className="text-sm font-bold text-emerald-600 block">+202.30</span>
              <span className="text-xs font-semibold text-emerald-500 block">+0.84%</span>
            </div>
          </div>
        </div>

        {/* SENSEX */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">SENSEX</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">80,050.40</span>
          </div>
          <div className="flex items-center space-x-2 text-right">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <span className="text-sm font-bold text-emerald-600 block">+650.10</span>
              <span className="text-xs font-semibold text-emerald-500 block">+0.82%</span>
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
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-600 block">{formatCurrency(todayPnl)}</span>
            <span className="text-xs text-emerald-500 font-semibold block mt-1">({todayPnlPct.toFixed(2)}%)</span>
          </div>
        </div>

        {/* Overall P&L */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall P&L</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-600 block">{formatCurrency(overallPnl)}</span>
            <span className="text-xs text-emerald-500 font-semibold block mt-1">({overallPnlPct.toFixed(2)}%)</span>
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
        
        {/* Holdings empty state (takes 2 cols on wide screen) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800">You don't own any stocks yet</h3>
          <p className="text-slate-400 text-sm max-w-sm mt-2">
            Practice buying and selling stocks with your virtual money. Explore Nifty 100 constituents now.
          </p>
          <Link
            href="#"
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all text-sm mt-6"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Start Your First Trade</span>
          </Link>
        </div>

        {/* Watchlist Quick View / News Placeholder */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-800">My Watchlist</h3>
          <div className="space-y-3">
            {/* Mock Watchlist rows */}
            {[
              { symbol: "TCS", name: "Tata Consultancy Services", price: 3850.40, pct: "+0.45%" },
              { symbol: "RELIANCE", name: "Reliance Industries", price: 2450.20, pct: "-0.22%" },
              { symbol: "INFY", name: "Infosys Limited", price: 1560.80, pct: "+1.20%" },
            ].map((stock) => (
              <div key={stock.symbol} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-b-0 last:pb-0">
                <div>
                  <span className="text-sm font-black text-slate-700 block">{stock.symbol}</span>
                  <span className="text-[10px] text-slate-400 font-semibold max-w-[120px] truncate block">{stock.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-800 block">{formatCurrency(stock.price)}</span>
                  <span className={`text-xs font-bold block ${stock.pct.startsWith("+") ? "text-emerald-500" : "text-rose-500"}`}>
                    {stock.pct}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link 
            href="#" 
            className="flex items-center justify-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700 pt-2 block text-center"
          >
            <span>View Watchlist Screen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
}
