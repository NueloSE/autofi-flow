"use client";

import { useEffect, useState } from "react";
import { PricePoint, getFlowPriceHistory, get24hChange, formatUsd } from "@/lib/flow-prices";

interface PriceChartProps {
  currentPrice: number;
  targetPrice?: number;
  direction?: "below" | "above";
}

export function PriceChart({ currentPrice, targetPrice, direction }: PriceChartProps) {
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [chartHover, setChartHover] = useState<{ x: number; price: number } | null>(null);

  useEffect(() => {
    getFlowPriceHistory(1).then((points: PricePoint[]) => {
      setChartData(points.map((p) => [p.timestamp, p.price] as [number, number]));
    });
  }, []);

  const change24h = chartData.length >= 2
    ? ((chartData[chartData.length - 1][1] - chartData[0][1]) / chartData[0][1]) * 100
    : 0;

  const chartMin = chartData.length
    ? Math.min(...chartData.map((d) => d[1]), targetPrice ?? Infinity) * 0.9995
    : 0;
  const chartMax = chartData.length
    ? Math.max(...chartData.map((d) => d[1]), targetPrice ?? -Infinity) * 1.0005
    : 1;
  const chartRange = chartMax - chartMin || 1;

  const strokeColor = change24h >= 0 ? "#22C55E" : "#EF4444";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-bold text-zinc-100">
              {chartHover ? formatUsd(chartHover.price) : formatUsd(currentPrice)}
            </span>
            {!chartHover && (
              <span className={`text-xs font-mono font-medium ${change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            FLOW / USD · 24h
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-52 w-full relative">
        {chartData.length > 10 ? (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${chartData.length} 100`}
            preserveAspectRatio="none"
            className="cursor-crosshair"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.floor(((e.clientX - rect.left) / rect.width) * chartData.length);
              if (chartData[x]) setChartHover({ x, price: chartData[x][1] });
            }}
            onMouseLeave={() => setChartHover(null)}
          >
            {/* Gradient definition for area fill */}
            <defs>
              <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={change24h >= 0 ? "#22C55E" : "#EF4444"}
                  stopOpacity="0.12"
                />
                <stop
                  offset="100%"
                  stopColor={change24h >= 0 ? "#22C55E" : "#EF4444"}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((frac) => (
              <line
                key={frac}
                x1={0}
                x2={chartData.length}
                y1={100 - frac * 90}
                y2={100 - frac * 90}
                stroke="rgba(113,113,122,0.15)"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="4 4"
              />
            ))}

            {/* Area fill under the line */}
            <polygon
              fill="url(#areaGrad)"
              points={`0,100 ${chartData
                .map((d, i) => `${i},${100 - ((d[1] - chartMin) / chartRange) * 90}`)
                .join(" ")} ${chartData.length - 1},100`}
            />

            {/* Main price line */}
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              points={chartData
                .map((d, i) => `${i},${100 - ((d[1] - chartMin) / chartRange) * 90}`)
                .join(" ")}
            />

            {/* Target price line */}
            {targetPrice && (() => {
              const y = 100 - ((targetPrice - chartMin) / chartRange) * 90;
              if (y < -10 || y > 110) return null;
              const lineColor = direction === "below" ? "#EF4444" : "#22C55E";
              return (
                <line
                  x1={0}
                  x2={chartData.length}
                  y1={y}
                  y2={y}
                  stroke={lineColor}
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.6"
                />
              );
            })()}

            {/* Hover crosshair line */}
            {chartHover && (
              <line
                x1={chartHover.x}
                y1={0}
                x2={chartHover.x}
                y2={100}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        ) : (
          /* Loading state */
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
              <span className="text-xs font-mono text-zinc-600">Loading chart...</span>
            </div>
          </div>
        )}

        {/* Time labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between pointer-events-none">
          <span className="text-[10px] font-mono text-zinc-400">24h ago</span>
          <span className="text-[10px] font-mono text-zinc-400">Now</span>
        </div>

        {/* Price scale */}
        {chartData.length > 10 && (
          <div className="absolute top-1 right-0 bottom-4 flex flex-col justify-between pointer-events-none">
            <span className="text-[10px] font-mono text-zinc-400">
              ${chartMax.toFixed(4)}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              ${chartMin.toFixed(4)}
            </span>
          </div>
        )}

        {/* Target price label (floating on the right edge) */}
        {targetPrice && chartData.length > 10 && (() => {
          const yPct = ((targetPrice - chartMin) / chartRange) * 90;
          const topPct = 100 - yPct;
          if (topPct < 0 || topPct > 100) return null;
          const labelColor = direction === "below" ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-green-400 bg-green-500/10 border-green-500/20";
          return (
            <div
              className={`absolute right-0 pointer-events-none px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium ${labelColor}`}
              style={{ top: `${topPct * 0.85 + 2}%`, transform: "translateY(-50%)" }}
            >
              {formatUsd(targetPrice)}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
