"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    // Check local session cookie (mock & real check via cookie)
    const checkAuth = async () => {
      // Small timeout for visual brand impact (500ms-1000ms)
      await new Promise((resolve) => setTimeout(resolve, 800));

      const getCookie = (name: string): string | null => {
        if (typeof document === "undefined") return null;
        const matches = document.cookie.match(
          new RegExp(
            `(?:^|; )${name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1")}=([^;]*)`
          )
        );
        return matches ? decodeURIComponent(matches[1]) : null;
      };

      const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
      let isLoggedIn = false;

      if (isMock) {
        const session = getCookie("paper-trade-session");
        isLoggedIn = !!session;
      } else {
        // Real Supabase check
        try {
          const res = await fetch("/api/auth/session-check");
          if (res.ok) {
            const data = await res.json();
            isLoggedIn = data.authenticated;
          }
        } catch {
          isLoggedIn = false;
        }
      }

      if (isLoggedIn) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white select-none">
      <div className="flex flex-col items-center space-y-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20"
        >
          <TrendingUp className="w-12 h-12 text-blue-600 animate-pulse" />
        </motion.div>

        <div className="text-center space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl font-extrabold tracking-tight"
          >
            PaperTrade
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-sm text-blue-200 font-medium"
          >
            Indian Stock Market Simulator
          </motion.p>
        </div>

        {/* Spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pt-4"
        >
          <svg className="animate-spin h-6 w-6 text-white/50" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
