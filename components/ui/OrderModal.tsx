"use client";

import React, { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Coins, Plus, Minus, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
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

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockMaster;
  initialSide?: "BUY" | "SELL";
  userCash: number;
  userHoldingsQuantity: number;
  onTradeSuccess: (newBalance: number) => void;
}

export default function OrderModal({
  isOpen,
  onClose,
  stock,
  initialSide = "BUY",
  userCash,
  userHoldingsQuantity,
  onTradeSuccess,
}: OrderModalProps) {
  const [side, setSide] = useState<"BUY" | "SELL">(initialSide);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [quantity, setQuantity] = useState<number>(5);
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradeStatus, setTradeStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (stock && stock.price_cache) {
      setLimitPrice(Number(stock.price_cache.last_price).toFixed(2));
      setSide(initialSide);
      setTradeStatus("idle");
      setErrorMessage("");
      setOrderType("MARKET");
      setQuantity(5);
    }
  }, [stock, isOpen, initialSide]);

  if (!stock || !stock.price_cache) return null;

  const currentPrice = Number(stock.price_cache.last_price);
  const tradePrice = orderType === "MARKET" ? currentPrice : Number(limitPrice) || currentPrice;
  const rawSubtotal = tradePrice * quantity;
  const brokerage = Math.min(20.00, Number((rawSubtotal * 0.0005).toFixed(2)));
  const estimatedTotal = side === "BUY" ? rawSubtotal + brokerage : rawSubtotal - brokerage;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setErrorMessage("Please enter a valid quantity.");
      return;
    }

    if (orderType === "LIMIT" && (!limitPrice || Number(limitPrice) <= 0)) {
      setErrorMessage("Please enter a valid limit price.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setTradeStatus("idle");

    try {
      const res = await fetch("/api/market/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: stock.symbol,
          side,
          quantity,
          orderType,
          limitPrice: orderType === "LIMIT" ? Number(limitPrice) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order placement failed.");
      }

      setTradeStatus("success");
      
      if (data.order && data.order.status === "EXECUTED") {
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.6 }
        });
      }

      onTradeSuccess(data.newBalance ?? userCash);

      setTimeout(() => {
        onClose();
        setTradeStatus("idle");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setTradeStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[3px] z-50 flex items-center justify-center p-4"
          >
            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    Confirm Order: {stock.symbol}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold truncate max-w-[280px] mt-0.5">
                    {stock.company_name}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handlePlaceOrder} className="p-6 space-y-6">
                {/* BUY/SELL Toggle */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSide("BUY")}
                    className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                      side === "BUY"
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide("SELL")}
                    className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                      side === "SELL"
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    SELL
                  </button>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Order Type</label>
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as "MARKET" | "LIMIT")}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="MARKET">Market Order</option>
                      <option value="LIMIT">Limit Order</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Quantity</label>
                    <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden px-1 h-9">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* LIMIT Price Input */}
                {orderType === "LIMIT" && (
                  <div className="space-y-1 animate-fade-in-up">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Limit Price (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder={currentPrice.toFixed(2)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}

                {/* Financial Summary */}
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-xs font-semibold space-y-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Available Cash:</span>
                    <span className="font-extrabold text-slate-800">{formatCurrency(userCash)}</span>
                  </div>
                  {side === "SELL" && (
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Available Shares:</span>
                      <span className="font-extrabold text-slate-800">{userHoldingsQuantity} Shares</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Share Price:</span>
                    <span>{formatCurrency(tradePrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Estimated Brokerage (0.05%):</span>
                    <span>{formatCurrency(brokerage)}</span>
                  </div>
                  <div className="border-t border-slate-100/50 pt-2 flex justify-between items-center text-slate-800">
                    <span className="font-bold">Total Estimated {side === "BUY" ? "Cost" : "Credit"}:</span>
                    <span className="font-black text-sm text-blue-600">{formatCurrency(estimatedTotal)}</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3.5 rounded-2xl">
                    {errorMessage}
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-2xl text-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      tradeStatus === "success" ||
                      (side === "BUY" && userCash < estimatedTotal) ||
                      (side === "SELL" && userHoldingsQuantity < quantity)
                    }
                    className={`w-2/3 py-3 px-4 rounded-2xl font-black text-xs text-white transition-all active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer ${
                      tradeStatus === "success"
                        ? "bg-emerald-600"
                        : side === "BUY"
                        ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/10 disabled:bg-slate-300 disabled:shadow-none"
                        : "bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/10 disabled:bg-slate-300 disabled:shadow-none"
                    }`}
                  >
                    {isSubmitting ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : tradeStatus === "success" ? (
                      <span>Order Placed!</span>
                    ) : (
                      <span>
                        {side === "BUY"
                          ? userCash < estimatedTotal
                            ? "Insufficient Cash"
                            : `Buy ${orderType}`
                          : userHoldingsQuantity < quantity
                          ? "Insufficient Shares"
                          : `Sell ${orderType}`}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
