import React, { useMemo } from 'react';

interface IdenticonProps {
  address: string;
  size?: number;
  className?: string;
}

export function Identicon({ address, size = 40, className = "" }: IdenticonProps) {
  const colors = useMemo(() => {
    // Generate a simple deterministic color palette based on address
    const hash = address.slice(2);
    const c1 = `#${hash.slice(0, 6)}`;
    const c2 = `#${hash.slice(6, 12)}`;
    const c3 = `#${hash.slice(12, 18)}`;
    const c4 = `#${hash.slice(18, 24)}`;
    return [c1, c2, c3, c4, c1, c2, c3, c4, c1];
  }, [address]);

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 9 9" 
      className={`rounded-full overflow-hidden ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {colors.map((color, i) => (
        <rect 
          key={i} 
          x={(i % 3) * 3} 
          y={Math.floor(i / 3) * 3} 
          width="3" 
          height="3" 
          fill={color} 
        />
      ))}
    </svg>
  );
}
