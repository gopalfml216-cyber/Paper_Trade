"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface StockChartProps {
  data: ChartDataPoint[];
}

export default function StockChart({ data }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  const lastPoint = data.length > 0 ? data[data.length - 1] : null;
  const activePoint = hoveredPoint || lastPoint;

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const container = chartContainerRef.current;

    // Create the chart instance
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#64748b",
        fontFamily: "Outfit, Inter, system-ui, sans-serif",
      },
      width: container.clientWidth,
      height: 340,
      grid: {
        vertLines: { color: "#f8fafc" },
        horzLines: { color: "#f8fafc" },
      },
      crosshair: {
        vertLine: {
          color: "#cbd5e1",
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: "#3b82f6",
        },
        horzLine: {
          color: "#cbd5e1",
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: "#3b82f6",
        },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    // Add Candlestick Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    candlestickSeries.setData(data);

    // Fit content
    chart.timeScale().fitContent();

    // Subscribe to crosshair movement
    chart.subscribeCrosshairMove((param) => {
      if (
        param.time &&
        param.point &&
        param.seriesData.has(candlestickSeries)
      ) {
        const d = param.seriesData.get(candlestickSeries) as any;
        if (d) {
          setHoveredPoint({
            time: param.time.toString(),
            open: Number(d.open),
            high: Number(d.high),
            low: Number(d.low),
            close: Number(d.close),
          });
        }
      } else {
        setHoveredPoint(null);
      }
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });

    resizeObserver.observe(container);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
      {/* OHLC top strip stats */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-slate-400 border-b border-slate-50 pb-4">
        {activePoint ? (
          <>
            <div className="flex items-center space-x-1.5">
              <span>DATE:</span>
              <span className="text-slate-700 font-extrabold">{activePoint.time}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span>OPEN:</span>
              <span className="text-slate-800 font-black">{formatCurrency(activePoint.open)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span>HIGH:</span>
              <span className="text-emerald-600 font-black">{formatCurrency(activePoint.high)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span>LOW:</span>
              <span className="text-rose-600 font-black">{formatCurrency(activePoint.low)}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span>CLOSE:</span>
              <span className={`font-black ${activePoint.close >= activePoint.open ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(activePoint.close)}
              </span>
            </div>
          </>
        ) : (
          <span className="animate-pulse">Loading charts metrics...</span>
        )}
      </div>

      {/* Chart Canvas ref */}
      <div ref={chartContainerRef} className="w-full min-h-[340px] relative overflow-hidden" />
    </div>
  );
}
