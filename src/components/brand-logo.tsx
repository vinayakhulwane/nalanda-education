import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  variant?: "primary" | "white";
  size?: number;
}

export function BrandLogo({ className, variant = "primary", size = 40 }: BrandLogoProps) {
  // Determine color based on variant
  // Primary = Violet (Hex #8b5cf6 is Tailwind violet-500, adjust as needed)
  // White = Pure White
  const colorClass = variant === "white" ? "text-white" : "text-[#8b5cf6]";

  return (
    <div 
      className={cn("relative flex items-center justify-center select-none", colorClass, className)} 
      style={{ width: size, height: size }}
    >
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* 1. Outer Circle (Thick) */}
        <circle 
          cx="50" 
          cy="50" 
          r="44" 
          stroke="currentColor" 
          strokeWidth="8" 
        />

        {/* 2. Letter 'N' (Top Left) */}
        <text 
          x="32" 
          y="42" 
          fontSize="32" 
          fontWeight="900" 
          fontFamily="Arial, sans-serif" 
          fill="currentColor" 
          textAnchor="middle"
        >
          N
        </text>

        {/* 3. Letter 'E' (Bottom Right) */}
        <text 
          x="68" 
          y="78" 
          fontSize="32" 
          fontWeight="900" 
          fontFamily="Arial, sans-serif" 
          fill="currentColor" 
          textAnchor="middle"
        >
          E
        </text>

        {/* 4. Compass Needle (The Diamond Shape) */}
        {/* Points North-East. Rotated slightly. */}
        <path 
          d="M30 70 L65 25 L55 50 L30 70 Z" 
          fill="currentColor" 
        />
        <path 
          d="M30 70 L55 50 L70 30 L30 70 Z" 
          fill="currentColor" 
          className="opacity-90" 
        />
        {/* Refined Needle based on your image (Diagonal) */}
        <path 
           d="M28 72 L72 28 L48 52 L28 72Z" 
           fill="currentColor" 
        />
      </svg>
    </div>
  );
}
