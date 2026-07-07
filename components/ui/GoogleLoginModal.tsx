"use client";

import React, { useState, useEffect } from "react";
import { X, Globe, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (email: string, displayName: string) => void;
}

// Client-side JWT Decoder helper
const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export default function GoogleLoginModal({ isOpen, onClose, onSelect }: GoogleLoginModalProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isOpen || !googleClientId) return;

    // Load Google Identity Services SDK script dynamically
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      try {
        (window as any).google?.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            const payload = decodeJwt(response.credential);
            if (payload && payload.email) {
              onSelect(payload.email, payload.name || payload.email.split("@")[0]);
            } else {
              setErrorMsg("Failed to retrieve profile info from Google sign-in.");
            }
          },
        });
        (window as any).google?.accounts.id.renderButton(
          document.getElementById("google-signin-btn-target"),
          { theme: "outline", size: "large", width: 340, shape: "pill" }
        );
      } catch (err: any) {
        console.error("Error initializing Google Identity Client:", err);
      }
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [isOpen, googleClientId, onSelect]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!customEmail || !customName) {
      setErrorMsg("Please fill in both fields.");
      return;
    }
    if (!customEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    onSelect(customEmail.toLowerCase(), customName);
  };

  const handleMockBypass = (email: string, name: string) => {
    onSelect(email, name);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden z-10 font-sans"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200">
                  <Globe className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                  {googleClientId ? "Google OAuth" : "OAuth Configuration"}
                </span>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {googleClientId ? (
              // CASE A: Real Google OAuth is configured
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Sign in with Google</h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Select a Google account connected on your device to continue to PaperTrade
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                {/* Google Native Button Container */}
                <div className="flex justify-center py-4">
                  <div id="google-signin-btn-target" className="min-h-[44px]"></div>
                </div>

                <p className="text-[10px] text-slate-400 font-bold leading-normal">
                  Google will securely authenticate your session and share your email address and profile name with PaperTrade.
                </p>
              </div>
            ) : (
              // CASE B: Fallback Setup Guidance
              <div className="space-y-4">
                <div className="text-center space-y-2 mb-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                    <ShieldAlert className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Real Google Account Setup</h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Provide a Client ID to fetch real Google accounts on your device.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs space-y-2 text-slate-600 font-medium">
                  <p className="font-bold text-slate-800">To enable real device-level Google Sign-In:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open your Google Cloud Console.</li>
                    <li>Create credentials & OAuth 2.0 Client ID.</li>
                    <li>Add <code className="bg-slate-200 px-1 rounded">http://localhost:3000</code> to authorized origins.</li>
                    <li>Add your Client ID in <code className="bg-slate-200 px-1 rounded">.env.local</code>:</li>
                  </ol>
                  <div className="bg-slate-900 text-slate-200 p-2.5 rounded-xl font-mono text-[10px] overflow-x-auto select-all mt-1">
                    NEXT_PUBLIC_GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
                  </div>
                </div>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Temporary Bypass
                  </span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <AnimatePresence mode="wait">
                  {!showCustomInput ? (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleMockBypass("gopal.trading@gmail.com", "Gopal Trading")}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 hover:border-blue-200 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shadow-md shadow-blue-500/20">
                            GT
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-700 block group-hover:text-blue-600 transition-colors">
                              Bypass as Gopal Trading
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">gopal.trading@gmail.com</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCustomInput(true)}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-dashed border-slate-200 hover:border-slate-300 transition-all text-left text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-slate-500 animate-pulse" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">Enter custom Google account email</span>
                            <span className="text-[9px] font-semibold text-slate-400">Simulate any email of your choice</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      onSubmit={handleCustomSubmit}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-3"
                    >
                      {errorMsg && (
                        <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-semibold">
                          {errorMsg}
                        </div>
                      )}

                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gmail Address</label>
                        <input
                          type="email"
                          required
                          placeholder="yourname@gmail.com"
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Display Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Gopal Kumar"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      <div className="flex space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setShowCustomInput(false); setErrorMsg(""); }}
                          className="w-1/3 border border-slate-200 hover:border-slate-300 text-slate-600 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl shadow-lg shadow-blue-500/10 text-xs transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Log In & Sync
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
