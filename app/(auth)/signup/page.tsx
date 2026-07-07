"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/supabase/authClient";
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  CheckCircle,
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import GoogleLoginModal from "@/components/ui/GoogleLoginModal";

export default function SignupPage() {
  const router = useRouter();
  
  // Form states
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Handle Form Submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!displayName || !email || !password || !confirmPassword) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (displayName.length < 2 || displayName.length > 50) {
      setErrorMsg("Display name must be between 2 and 50 characters.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsLoading(true);
    try {
      const { user, error } = await authClient.signUp(email, password, displayName);
      
      if (error) {
        setErrorMsg(error);
      } else if (user) {
        // Trigger confetti!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        
        setIsSuccess(true);
        
        // Wait and redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async (selectedEmail: string, selectedName: string) => {
    setErrorMsg(null);
    setIsGoogleModalOpen(false);
    setIsLoading(true);
    try {
      const { user, error } = await authClient.signInWithGoogle(selectedEmail, selectedName);
      if (error) {
        setErrorMsg(error);
      } else if (user) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Google signup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white select-none overflow-hidden font-sans">
      {/* Left Pane - Brand & Feature Showcase */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        
        {/* Subtle background graphics */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-400 rounded-full mix-blend-screen filter blur-3xl opacity-15"></div>

        {/* Logo/Header */}
        <div className="flex items-center space-x-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            PaperTrade
          </span>
        </div>

        {/* Catchy Content */}
        <div className="my-auto max-w-lg z-10 space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight"
          >
            Create Your Virtual Account in Under a Minute
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-blue-100/90 font-medium"
          >
            Start with ₹1,00,000 in virtual cash immediately upon signing up.
          </motion.p>

          <div className="text-xs text-blue-200/60 leading-relaxed space-y-2 max-w-md pt-4 border-t border-white/10">
            <p>*Disclaimer: For educational and simulation purposes only. No real money is deposited, traded, or won.</p>
            <p>*Option and limit orders are executed against real-ish delayed NSE price feeds.</p>
          </div>
        </div>

        {/* Dashboard Live Mockup */}
        <div className="relative w-full h-64 mt-4 z-10 flex items-center justify-center">
          {/* Mockup Card 1: Net Asset Value */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="glass-panel rounded-2xl p-5 w-72 absolute left-0 bottom-4 shadow-2xl animate-float-slow"
          >
            <span className="text-xs text-blue-200/80 font-semibold uppercase tracking-wider block">Net Asset Value</span>
            <span className="text-3xl font-black block mt-1 tracking-tight text-white">₹1,00,000.00</span>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                +0.00%
              </span>
              <span className="text-xs text-blue-200/60">Today's P&L</span>
            </div>
            
            {/* Animated SVG Sparkline */}
            <div className="w-full h-12 mt-4">
              <svg className="w-full h-full" viewBox="0 0 100 30">
                <path 
                  d="M0,25 Q15,20 30,22 T60,10 T90,5 L100,5" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path 
                  d="M0,25 Q15,20 30,22 T60,10 T90,5 L100,5 L100,30 L0,30 Z" 
                  fill="url(#sparkline-grad)" 
                  opacity="0.15"
                />
                <defs>
                  <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </motion.div>

          {/* Mockup Card 2: Market Indices */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="glass-panel rounded-2xl p-4 w-56 absolute right-0 top-0 shadow-2xl animate-float-delayed"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">NIFTY 50</span>
              <span className="text-xs font-bold text-emerald-400">+0.84%</span>
            </div>
            <div className="flex justify-between items-center text-xs text-blue-200/80">
              <span>LTP</span>
              <span className="font-bold text-white">24,320.50</span>
            </div>
            <div className="flex justify-between items-center text-xs text-blue-200/80 mt-1">
              <span>Prev Close</span>
              <span>24,118.20</span>
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-blue-200/40 z-10">
          © 2026 PaperTrade Inc. All rights reserved.
        </div>
      </div>

      {/* Right Pane - Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50/50 min-h-screen">
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md bg-white rounded-3xl p-8 lg:p-10 shadow-xl border border-slate-100 relative overflow-hidden"
        >
          {/* Success Overlay Animation */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
                >
                  <CheckCircle className="w-12 h-12" />
                </motion.div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Account Created!</h3>
                <p className="text-slate-500 mt-2 font-medium">₹1,00,000.00 virtual cash has been credited.</p>
                <div className="mt-8 flex items-center space-x-2 text-blue-600 font-bold text-sm">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Redirecting to Dashboard...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile logo display */}
          <div className="flex lg:hidden items-center space-x-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">
              PaperTrade
            </span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sign Up for PaperTrade</h2>
            <p className="text-sm text-slate-500 font-medium">Practice trading with virtual money risk-free</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3 text-rose-600 text-sm"
                >
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Display Name</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email Address</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Password</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-3 pt-2">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer accent-blue-600"
              />
              <label htmlFor="agreeTerms" className="text-xs text-slate-500 leading-relaxed font-semibold cursor-pointer">
                I agree to the{" "}
                <Link href="#" className="text-blue-600 hover:text-blue-700">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-blue-600 hover:text-blue-700">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center text-base mt-4"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center my-5">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Or sign up with
            </span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Social Auth Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => { setErrorMsg("Passkey signup is a mockup feature."); }}
              className="flex items-center justify-center space-x-2 border border-slate-200 hover:border-slate-300 bg-white rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              <span>Passkey</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              className="flex items-center justify-center space-x-2 border border-slate-200 hover:border-slate-300 bg-white rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" width="20" height="20">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google</span>
            </button>
          </div>

          <div className="text-center text-sm font-semibold text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700">
              Log In
            </Link>
          </div>
          <GoogleLoginModal
            isOpen={isGoogleModalOpen}
            onClose={() => setIsGoogleModalOpen(false)}
            onSelect={handleGoogleSignup}
          />
        </motion.div>
      </div>
    </div>
  );
}
