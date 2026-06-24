import React from 'react';

interface SemiCircleGaugeProps {
  value: number | null;
  size?: number;
  strokeWidth?: number;
}

export function SemiCircleGauge({ value, size = 200, strokeWidth = 20 }: SemiCircleGaugeProps) {
  const score = Math.min(Math.max(value ?? 0, 0), 100);

  const cx = size / 2;
  const r = size / 2 - strokeWidth;
  // Circle center is at (cx, cy). The arch goes from (cx-r, cy) → top → (cx+r, cy)
  const cy = r + strokeWidth;

  // Left and right endpoints of the arch
  const x1 = cx - r;
  const x2 = cx + r;

  // Top arch: from LEFT to RIGHT going COUNTER-CLOCKWISE (upward) — sweep-flag = 0
  const archPath = `M ${x1},${cy} A ${r},${r} 0 0,0 ${x2},${cy}`;

  // Total arc length of a semicircle
  const arcLength = Math.PI * r;

  // Gradient ID (unique per size to avoid conflicts)
  const gid = `score-grad-${size}`;

  // SVG height: enough to show the arch + stroke caps
  const svgH = cy + strokeWidth / 2 + 2;

  return (
    <svg
      width={size}
      height={svgH}
      viewBox={`0 0 ${size} ${svgH}`}
      overflow="visible"
    >
      <defs>
        {/* Horizontal gradient: red (left/Low) → orange → yellow → green (right/High) */}
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ef4444" />
          <stop offset="35%"  stopColor="#f97316" />
          <stop offset="65%"  stopColor="#eab308" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      {/* Gray background track — full arch */}
      <path
        d={archPath}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Colored fill — start from left, fill clockwise up to score% */}
      {score > 0 && (
        <path
          d={archPath}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * arcLength} ${arcLength}`}
          strokeDashoffset={0}
        />
      )}
    </svg>
  );
}
