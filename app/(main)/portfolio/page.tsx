import React from "react";
import { Briefcase } from "lucide-react";

export default function PortfolioPage() {
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center animate-fade-in-up">
      <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
        <Briefcase className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-black text-slate-800">Portfolio Screen</h3>
      <p className="text-slate-400 text-sm max-w-sm mt-2">
        Your current holdings, average prices, and live P&L will be tracking here starting on Day 5 & 7.
      </p>
    </div>
  );
}
