"use client";

import type { Tick } from "@/lib/history";

type Props = {
  data: Tick[];
  width?: number;
  height?: number;
  bars?: number;
};

export function MiniBars({ data, width = 64, height = 24, bars = 8 }: Props) {
  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className="opacity-30">
        {Array.from({ length: bars }, (_, i) => {
          const bw = width / bars;
          return (
            <rect
              key={i}
              x={i * bw + 0.5}
              y={height - 4}
              width={bw - 1}
              height={3}
              fill="currentColor"
            />
          );
        })}
      </svg>
    );
  }

  // Bucket data into N bars (downsample)
  const samples = data.length;
  const bucketed: number[] = [];
  for (let i = 0; i < bars; i++) {
    const start = Math.floor((i * samples) / bars);
    const end = Math.max(start + 1, Math.floor(((i + 1) * samples) / bars));
    const slice = data.slice(start, end);
    if (slice.length === 0) bucketed.push(NaN);
    else {
      bucketed.push(slice.reduce((a, t) => a + t.ask, 0) / slice.length);
    }
  }

  const valid = bucketed.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || max * 0.0001 || 1;

  const bw = width / bars;
  const first = bucketed.find((v) => Number.isFinite(v))!;
  const last = [...bucketed].reverse().find((v) => Number.isFinite(v))!;
  const up = last >= first;
  const color = up ? "#5A7F4A" : "#B85450";

  return (
    <svg width={width} height={height}>
      {bucketed.map((v, i) => {
        if (!Number.isFinite(v)) {
          return (
            <rect
              key={i}
              x={i * bw + 0.5}
              y={height - 3}
              width={bw - 1.5}
              height={2}
              fill="#D4CCB8"
            />
          );
        }
        const h = Math.max(3, ((v - min) / range) * (height - 2));
        return (
          <rect
            key={i}
            x={i * bw + 0.5}
            y={height - h}
            width={bw - 1.5}
            height={h}
            fill={color}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
