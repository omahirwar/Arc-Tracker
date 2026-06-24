import React from 'react';

interface SemiCircleGaugeProps {
  value: number | null;
  size?: number;
  strokeWidth?: number;
}

export function SemiCircleGauge({ value, size = 220, strokeWidth = 22 }: SemiCircleGaugeProps) {
  const score = Math.min(Math.max(value ?? 0, 0), 100);

  const cx = size / 2;
  // Place circle center near the BOTTOM so the top arch is visible
  const r = cx - strokeWidth;
  const cy = size / 2; // center of circle at vertical midpoint

  // Left and right bottom endpoints
  const x1 = cx - r;  // left: (strokeWidth, cy)
  const x2 = cx + r;  // right: (size-strokeWidth, cy)

  // TOP arch: from LEFT to RIGHT going CLOCKWISE (sweep=1) in SVG screen coords
  // Clockwise from 9-o'clock → 12-o'clock → 3-o'clock = LEFT → TOP → RIGHT ✓
  const archPath = `M ${x1},${cy} A ${r},${r} 0 0,1 ${x2},${cy}`;

  // Semicircle arc length
  const arcLength = Math.PI * r;

  // Filled portion — dasharray starts from the LEFT (Low/Red) going toward right
  const fillLen = (score / 100) * arcLength;

  const gid = `sg-${Math.round(size)}`;

  // SVG height = from top of arch to bottom endpoints + half stroke
  const svgH = cy + strokeWidth / 2 + 2;
  const topY = cy - r - strokeWidth / 2 - 2;

  return (
    <svg
      width={size}
      height={svgH - Math.min(topY, 0)}
      viewBox={`0 ${Math.min(topY, 0)} ${size} ${svgH - Math.min(topY, 0)}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Horizontal gradient: red → orange → yellow → green */}
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ef4444" />
          <stop offset="30%"  stopColor="#f97316" />
          <stop offset="60%"  stopColor="#eab308" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      {/* Gray background track — full top arch */}
      <path
        d={archPath}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Colored fill — from left (red) clockwise toward right (green) */}
      {score > 0 && (
        <path
          d={archPath}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${fillLen} ${arcLength}`}
          strokeDashoffset={0}
        />
      )}
    </svg>
  );
}
