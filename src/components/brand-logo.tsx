import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  variant?: "primary" | "white";
  size?: number;
}

export function BrandLogo({ className, variant = "primary", size = 40 }: BrandLogoProps) {
  // Determine color based on variant
  // Primary = Violet (Hex #8b5cf6 is Tailwind violet-500)
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
        {/* 1. Thick Outer Circle */}
        <circle
          cx="50"
          cy="50"
          r="43"
          stroke="currentColor"
          strokeWidth="7"
        />

        {/* 2. Letter 'N' (Top Left Quadrant) */}
        <text
          x="34"
          y="42"
          fontSize="30"
          fontWeight="900"
          fontFamily="Arial, sans-serif"
          fill="currentColor"
          textAnchor="middle"
        >
          N
        </text>

        {/* 3. Letter 'E' (Bottom Right Quadrant) */}
        <text
          x="66"
          y="78"
          fontSize="30"
          fontWeight="900"
          fontFamily="Arial, sans-serif"
          fill="currentColor"
          textAnchor="middle"
        >
          E
        </text>

        {/* 4. Compass Needle (Single Diagonal Diamond) */}
        {/* Points from Bottom-Left (SW) to Top-Right (NE) */}
        {/* d="M [SW_Tip] L [NW_Bulge] L [NE_Tip] L [SE_Bulge] Z" */}
        <path
          d="M 27 73 L 46 46 L 73 27 L 54 54 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}