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
  strokeWidth = 16,
  className = ""
}: SemiCircleGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle
  const safeValue = value === null ? 0 : Math.min(Math.max(value, 0), 100);
  const percent = safeValue / 100;
  const offset = circumference - percent * circumference;

  // SVG path for semi-circle
  const d = `
    M ${strokeWidth/2} ${size / 2}
    a ${radius} ${radius} 0 0 1 ${size - strokeWidth} 0
  `;

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ width: size, height: size / 2 + 10 }}>
      <svg width={size} height={size / 2 + strokeWidth} className="overflow-visible">
        <path
          d={d}
          fill="transparent"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="transparent"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
    </div>
  );
}
