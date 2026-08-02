"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, AlertCircle, CheckCircle2, XCircle, Trash2, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface StockMaster {
  symbol: string;
  company_name: string;
}

interface Order {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT";
  quantity: number;
  limit_price: string | number | null;
  status: "PENDING" | "EXECUTED" | "CANCELLED" | "REJECTED";
  rejection_reason: string | null;
  created_at: string;
  stock: StockMaster;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING");
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this pending limit order?")) return;
    
    setCancellingId(orderId);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/market/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel order.");
      }

      setStatusMessage({ type: "success", text: "Order cancelled successfully." });
      fetchOrders();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setCancellingId(null);
      // Clear toast after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const historyOrders = orders.filter((o) => o.status !== "PENDING");

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Order Book
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Monitor pending limit order thresholds and review complete trade execution logs.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center space-x-2 bg-white border border-slate-100 hover:bg-slate-50 text-xs font-bold text-slate-600 px-4 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Book</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 space-x-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`pb-3 relative cursor-pointer ${
            activeTab === "PENDING" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Pending Limits ({pendingOrders.length})
          {activeTab === "PENDING" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("HISTORY")}
          className={`pb-3 relative cursor-pointer ${
            activeTab === "HISTORY" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Execution History ({historyOrders.length})
          {activeTab === "HISTORY" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Toast Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-2 text-xs font-bold ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-600"
              : "bg-rose-50 border-rose-100 text-rose-600"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Card Content */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[300px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-bold text-slate-400">Loading order book...</span>
          </div>
        ) : activeTab === "PENDING" ? (
          pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
              <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-black text-slate-800">No pending limit orders</h3>
              <p className="text-slate-400 text-sm max-w-sm mt-1">
                You haven't placed any pending limit orders. Limit orders execute automatically when the price target is touched.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Side</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Quantity</th>
                    <th className="px-6 py-4 text-right">Target price</th>
                    <th className="px-6 py-4">Placed Date</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50">
                  {pendingOrders.map((order) => (
                    <tr key={order.id} className="text-xs">
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-800 block">{order.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px] block mt-0.5">
                          {order.stock.company_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-black uppercase px-2 py-0.5 rounded text-[9px] ${
                            order.side === "BUY" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                          }`}
                        >
                          {order.side}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-500">{order.order_type}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">{order.quantity}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-800">
                        {formatCurrency(Number(order.limit_price || 0))}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-500">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-xs font-extrabold bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white px-3.5 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1 active:scale-95 disabled:bg-slate-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : historyOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
            <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-800">No execution history</h3>
            <p className="text-slate-400 text-sm max-w-sm mt-1">
              Your executed, rejected, and cancelled orders will be archived here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Side</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Quantity</th>
                  <th className="px-6 py-4 text-right">Execution Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/50">
                {historyOrders.map((order) => {
                  const statusColors = {
                    EXECUTED: "bg-emerald-50 text-emerald-600 border border-emerald-100",
                    CANCELLED: "bg-slate-50 text-slate-500 border border-slate-200",
                    REJECTED: "bg-rose-50 text-rose-600 border border-rose-100",
                    PENDING: "",
                  };

                  return (
                    <tr key={order.id} className="text-xs">
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-800 block">{order.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px] block mt-0.5">
                          {order.stock.company_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-black uppercase px-2 py-0.5 rounded text-[9px] ${
                            order.side === "BUY" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                          }`}
                        >
                          {order.side}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-500">{order.order_type}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">{order.quantity}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-800">
                        {order.limit_price && order.status !== "EXECUTED"
                          ? formatCurrency(Number(order.limit_price))
                          : order.limit_price && order.status === "EXECUTED"
                          ? formatCurrency(Number(order.limit_price)) // Or actual trade price, but for simplicity
                          : "Market Price"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start">
                          <span className={`font-black text-[9px] uppercase px-2 py-0.5 rounded ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                          {order.rejection_reason && (
                            <span className="text-[9px] text-rose-500 font-semibold max-w-[160px] truncate mt-1">
                              {order.rejection_reason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-500">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
