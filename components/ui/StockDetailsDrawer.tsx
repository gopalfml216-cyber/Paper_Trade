"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, TrendingUp, TrendingDown, Info, Coins, Plus, Minus, CheckCircle, Star } from "lucide-react";
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

interface StockDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockMaster | null;
  userCash: number;
  userHoldingsQuantity: number;
  onTradeSuccess: (newBalance: number) => void;
  isWatched: boolean;
  onWatchlistToggle?: (symbol: string, watched: boolean) => void;
}

export default function StockDetailsDrawer({
  isOpen,
  onClose,
  stock,
  userCash,
  userHoldingsQuantity,
  onTradeSuccess,
  isWatched,
  onWatchlistToggle,
}: StockDetailsDrawerProps) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [quantity, setQuantity] = useState<number>(5);
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradeStatus, setTradeStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setIsStarred(isWatched);
  }, [isWatched, isOpen]);

  const handleToggleWatchlist = async () => {
    if (!stock) return;
    setIsTogglingWatchlist(true);
    try {
      const res = await fetch("/api/market/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: stock.symbol }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsStarred(data.watched);
        if (onWatchlistToggle) {
          onWatchlistToggle(stock.symbol, data.watched);
        }
      }
    } catch (err) {
      console.error("Failed to toggle watchlist:", err);
    } finally {
      setIsTogglingWatchlist(false);
    }
  };

  // Initialize inputs when drawer opens or stock changes
  useEffect(() => {
    if (stock && stock.price_cache) {
      setLimitPrice(Number(stock.price_cache.last_price).toFixed(2));
      setTradeStatus("idle");
      setErrorMessage("");
      setSide("BUY");
      setOrderType("MARKET");
      setQuantity(5);
    }
  }, [stock, isOpen]);

  if (!stock || !stock.price_cache) return null;

  const currentPrice = Number(stock.price_cache.last_price);
  const open = Number(stock.price_cache.day_open || currentPrice);
  const high = Number(stock.price_cache.day_high || currentPrice);
  const low = Number(stock.price_cache.day_low || currentPrice);
  const prevClose = Number(stock.price_cache.prev_close || currentPrice);
  const dayChange = Number(stock.price_cache.day_change || 0);
  const dayChangePct = Number(stock.price_cache.day_change_pct || 0);
  const isPositive = dayChange >= 0;

  const tradePrice = orderType === "MARKET" ? currentPrice : Number(limitPrice) || currentPrice;
  const rawSubtotal = tradePrice * quantity;
  const brokerage = Math.min(20.00, Number((rawSubtotal * 0.0005).toFixed(2)));
  const estimatedTotal = side === "BUY" ? rawSubtotal + brokerage : rawSubtotal - brokerage;

  // Generate chart data points
  const { points, minVal, maxVal, range } = (() => {
    const pts = [];
    const min = Math.min(open, low, currentPrice, prevClose) * 0.999;
    const max = Math.max(open, high, currentPrice, prevClose) * 1.001;
    const rng = max - min || 1;

    // Generate 24 points to represent intraday activity
    for (let i = 0; i < 24; i++) {
      const progress = i / 23;
      const base = open + (currentPrice - open) * progress;
      // Daily bell-curve volatility pattern
      const vol = (high - low) * 0.22;
      const noise = Math.sin(progress * Math.PI) * vol * (Math.sin(i * 1.8) + Math.cos(i * 0.9));
      let val = base + noise;

      // Ensure clamped
      if (val > high) val = high - (val - high) * 0.05;
      if (val < low) val = low + (low - val) * 0.05;
      pts.push(val);
    }
    return { points: pts, minVal: min, maxVal: max, range: rng };
  })();

  // Build SVG path
  const svgWidth = 360;
  const svgHeight = 140;
  const pointsCoords = points.map((p, idx) => {
    const x = (idx / 23) * svgWidth;
    const y = svgHeight - ((p - minVal) / range) * svgHeight;
    return { x, y, price: p };
  });

  const linePath = pointsCoords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  // SVG hover coordinates handling
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Map client X to closest index in the points array
    const progressX = Math.max(0, Math.min(1, x / rect.width));
    const closestIdx = Math.round(progressX * 23);
    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Submit Trade
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
      
      // Dynamic trigger confetti for successful trade execution
      if (data.order && data.order.status === "EXECUTED") {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      // Fire success event handler
      onTradeSuccess(data.newBalance ?? userCash);

      // Close drawer after short delay
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
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[3px] z-40"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-100 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-black text-slate-800 tracking-tight">{stock.symbol}</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                    {stock.sector}
                  </span>
                </div>
                <h3 className="text-xs text-slate-400 font-semibold truncate max-w-[300px] mt-0.5">
                  {stock.company_name}
                </h3>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleWatchlist}
                  disabled={isTogglingWatchlist}
                  className="p-2 rounded-xl text-slate-400 hover:text-yellow-500 hover:bg-slate-50 transition-all cursor-pointer"
                  title={isStarred ? "Remove from Watchlist" : "Add to Watchlist"}
                >
                  <Star className={`w-5 h-5 ${isStarred ? "fill-yellow-400 text-yellow-500" : "text-slate-400"}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {/* Live Price Tag */}
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-slate-900 block">
                    {formatCurrency(currentPrice)}
                  </span>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className={`text-xs font-bold flex items-center ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                      {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                      {isPositive ? "+" : ""}{dayChange.toFixed(2)} ({isPositive ? "+" : ""}{dayChangePct.toFixed(2)}%)
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">• NSE</span>
                  </div>
                </div>
                {userHoldingsQuantity > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Position Owned</span>
                    <span className="text-sm font-black text-blue-600 block mt-0.5">
                      {userHoldingsQuantity} Shares
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic SVG Line Chart */}
              <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-100 relative overflow-hidden">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-2">
                  <span>INTRADAY CHART (24H MOCK)</span>
                  {hoverIndex !== null ? (
                    <span className="text-blue-600 font-extrabold bg-blue-50 px-2 py-0.5 rounded">
                      ₹{pointsCoords[hoverIndex].price.toFixed(2)}
                    </span>
                  ) : (
                    <span>Live Updates</span>
                  )}
                </div>

                <div className="relative h-[140px] w-full flex items-center justify-center">
                  <svg
                    ref={svgRef}
                    className="w-full h-full cursor-crosshair overflow-visible"
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    preserveAspectRatio="none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient Area Fill */}
                    <path d={areaPath} fill="url(#chartGrad)" />

                    {/* Spline Path */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke={isPositive ? "#10b981" : "#f43f5e"}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />

                    {/* Dynamic hover line & circle */}
                    {hoverIndex !== null && (
                      <>
                        <line
                          x1={pointsCoords[hoverIndex].x}
                          y1={0}
                          x2={pointsCoords[hoverIndex].x}
                          y2={svgHeight}
                          stroke="#cbd5e1"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                        <circle
                          cx={pointsCoords[hoverIndex].x}
                          cy={pointsCoords[hoverIndex].y}
                          r={4}
                          fill={isPositive ? "#10b981" : "#f43f5e"}
                          stroke="white"
                          strokeWidth={1.5}
                        />
                      </>
                    )}
                  </svg>
                </div>

                {/* Min / Max bounds */}
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100/50 mt-1">
                  <span>Min: ₹{minVal.toFixed(2)}</span>
                  <span>Max: ₹{maxVal.toFixed(2)}</span>
                </div>
              </div>

              {/* Key Financial Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Open</span>
                  <span className="text-sm font-bold text-slate-700 block mt-1">{formatCurrency(open)}</span>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prev Close</span>
                  <span className="text-sm font-bold text-slate-700 block mt-1">{formatCurrency(prevClose)}</span>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's High</span>
                  <span className="text-sm font-bold text-emerald-600 block mt-1">{formatCurrency(high)}</span>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Low</span>
                  <span className="text-sm font-bold text-rose-600 block mt-1">{formatCurrency(low)}</span>
                </div>
              </div>

              {/* Trading Interface Form */}
              <form onSubmit={handlePlaceOrder} className="space-y-4 pt-2">
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-black text-slate-800 tracking-tight mb-3">Place Trade</h4>
                </div>

                {/* BUY/SELL Toggle Tabs */}
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

                {/* Order Type + Quantity Row */}
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

                {/* LIMIT Order Price input box */}
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

                {/* Account Details Box */}
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
                    <span>Est. Share Price:</span>
                    <span>{formatCurrency(tradePrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Estimated Brokerage (0.05% / min ₹20):</span>
                    <span>{formatCurrency(brokerage)}</span>
                  </div>
                  <div className="border-t border-slate-100/50 pt-2 flex justify-between items-center text-slate-800">
                    <span className="font-bold">Total Estimated {side === "BUY" ? "Cost" : "Credit"}:</span>
                    <span className="font-black text-sm text-blue-600">{formatCurrency(estimatedTotal)}</span>
                  </div>
                </div>

                {/* Action feedback notifications */}
                {errorMessage && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3.5 rounded-2xl">
                    {errorMessage}
                  </div>
                )}

                {/* Submit Trade Button */}
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    tradeStatus === "success" ||
                    (side === "BUY" && userCash < estimatedTotal) ||
                    (side === "SELL" && userHoldingsQuantity < quantity)
                  }
                  className={`w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wide text-white transition-all active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer ${
                    tradeStatus === "success"
                      ? "bg-emerald-600"
                      : side === "BUY"
                      ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/10 disabled:bg-slate-300 disabled:shadow-none"
                      : "bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/10 disabled:bg-slate-300 disabled:shadow-none"
                  }`}
                >
                  {isSubmitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : tradeStatus === "success" ? (
                    <>
                      <CheckCircle className="w-5 h-5 animate-bounce" />
                      <span>{orderType === "LIMIT" ? "Limit Order Placed" : "Trade Successful!"}</span>
                    </>
                  ) : (
                    <span>
                      {side === "BUY"
                        ? userCash < estimatedTotal
                          ? "INSUFFICIENT CASH"
                          : `PLACE BUY ${orderType} ORDER`
                        : userHoldingsQuantity < quantity
                        ? "INSUFFICIENT SHARES"
                        : `PLACE SELL ${orderType} ORDER`}
                    </span>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
