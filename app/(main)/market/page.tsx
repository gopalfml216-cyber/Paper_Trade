import React from "react";
import { BarChart2 } from "lucide-react";

export default function MarketPage() {
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center animate-fade-in-up">
      <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
        <BarChart2 className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-black text-slate-800">Market Screen</h3>
      <p className="text-slate-400 text-sm max-w-sm mt-2">
        Real-time NSE stock prices, lists, and search engine will be integrated on Day 2.
      </p>
    </div>
  );
}
