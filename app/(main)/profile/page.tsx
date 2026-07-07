"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, type UserProfile } from "@/lib/supabase/authClient";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { User, Mail, Shield, Calendar, LogOut, Award, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import LogoutModal from "@/components/ui/LogoutModal";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Read the mock or real user from cookie
    const getCookie = (name: string): string | null => {
      const matches = document.cookie.match(
        new RegExp(
          `(?:^|; )${name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1")}=([^;]*)`
        )
      );
      return matches ? decodeURIComponent(matches[1]) : null;
    };

    const session = getCookie("paper-trade-session");
    if (session) {
      try {
        setUser(JSON.parse(session));
      } catch (err) {
        console.error("Failed to parse user session:", err);
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center">
        <User className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-black text-slate-800">Not Logged In</h3>
        <p className="text-slate-400 text-sm mt-1">Please sign in to view your profile.</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-6 bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 font-extrabold flex items-center justify-center uppercase text-3xl shrink-0">
          {user.display_name.substring(0, 2)}
        </div>
        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{user.display_name}</h2>
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
              <Shield className="w-3.5 h-3.5 mr-1" />
              {user.role === "admin" ? "Admin Account" : "Standard Account"}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Account Balance & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Virtual Balance</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">
              {formatCurrency(user.virtual_cash_balance)}
            </span>
            <span className="text-xs text-slate-400 font-semibold block mt-1">Available buying power</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Achievement Rank</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-950 block">Novice Trader</span>
            <span className="text-xs text-emerald-600 font-bold block mt-1">0 trades completed</span>
          </div>
        </div>
      </div>

      {/* Profile Details List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="font-black text-slate-800">Account Details</h3>
        </div>
        <div className="divide-y divide-slate-50">
          <div className="px-6 py-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-400">Email Address</span>
            <span className="text-sm font-bold text-slate-700 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-slate-400" />
              {user.email}
            </span>
          </div>
          <div className="px-6 py-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-400">Account Status</span>
            <span className="text-sm font-bold text-emerald-600 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Logout Action Button */}
      <div className="pt-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-4 px-6 rounded-2xl border border-rose-200/50 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out of Account</span>
        </button>
      </div>

      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
