import React from 'react';

interface SemiCircleGaugeProps {
  value: number | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function SemiCircleGauge({
  value,
  size = 200,
  strokeWidth = 18,
  className = "",
}: SemiCircleGaugeProps) {
  const safeValue = value === null ? 0 : Math.min(Math.max(value, 0), 100);
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth * 2) / 2;

  // Semi-circle goes from 180° (left) to 0° (right), i.e. the top arc
  // In SVG angles: start at left (π), sweep to right (0) going counter-clockwise
  const startAngle = Math.PI;       // left endpoint
  const endAngle = 0;               // right endpoint
  const totalAngle = Math.PI;       // full sweep = 180°

  const polarToCartesian = (angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  // Full background arc (gray track): left → right
  const bgStart = polarToCartesian(startAngle);
  const bgEnd = polarToCartesian(endAngle);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  // Filled arc: left → (score%) → right
  const fillAngle = startAngle - (safeValue / 100) * totalAngle;
  const fillEnd = polarToCartesian(fillAngle);
  const largeArc = safeValue > 50 ? 1 : 0;
  const fillPath =
    safeValue === 0
      ? ""
      : safeValue === 100
      ? bgPath
      : `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`;

  // Gradient color stops: red → orange → gold/yellow
  const gradientId = `gauge-gradient-${size}`;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size / 2 + strokeWidth }}
    >
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        overflow="visible"
      >
        <defs>
          {/* Left-to-right linear gradient: red → orange → gold */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#ef4444" />
            <stop offset="40%"  stopColor="#f97316" />
            <stop offset="75%"  stopColor="#eab308" />
            <stop offset="100%" stopColor="#84cc16" />
          </linearGradient>
        </defs>

        {/* Gray background track */}
        <path
          d={bgPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored filled arc */}
        {safeValue > 0 && (
          <path
            d={fillPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease-out" }}
          />
        )}
      </svg>
    </div>
  );
}
