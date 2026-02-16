import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface HandPatternProps {
  className?: string;
  opacity?: number;
  color?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "hero";
  variant?: "solid" | "outline" | "glow" | "gradient" | "neon" | "3d";
  animated?: boolean;
  parallax?: boolean;
  interactive?: boolean;
}

const sizeMap = {
  sm: "w-12 h-18",
  md: "w-20 h-30",
  lg: "w-32 h-48",
  xl: "w-48 h-72",
  "2xl": "w-64 h-96",
  "3xl": "w-80 h-120",
  "hero": "w-[400px] h-[600px]",
};

// Premium hand SVG with refined proportions and effects
export const HandSVG = ({ 
  className, 
  color = "currentColor",
  variant = "solid",
  gradientId,
  animated = false,
}: { 
  className?: string; 
  color?: string;
  variant?: "solid" | "outline" | "glow" | "gradient" | "neon" | "3d";
  gradientId?: string;
  animated?: boolean;
}) => {
  const strokeWidth = variant === "outline" ? 2 : variant === "glow" || variant === "neon" ? 3 : variant === "3d" ? 4 : 6;
  const useGradient = variant === "gradient" && gradientId;
  const uniqueId = gradientId || `hand-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <svg 
      viewBox="0 0 100 140" 
      className={cn(className, animated && "animate-hand-float")}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradient definitions */}
        <linearGradient id={`${uniqueId}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
          <stop offset="50%" stopColor="hsl(var(--accent-foreground))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
        </linearGradient>
        
        {/* Neon glow effect */}
        <filter id={`${uniqueId}-neon`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur1"/>
          <feGaussianBlur stdDeviation="8" result="blur2"/>
          <feGaussianBlur stdDeviation="12" result="blur3"/>
          <feMerge>
            <feMergeNode in="blur3"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur1"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Soft glow */}
        <filter id={`${uniqueId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* 3D shadow effect */}
        <filter id={`${uniqueId}-3d`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="3" stdDeviation="2" floodOpacity="0.3"/>
          <feDropShadow dx="6" dy="6" stdDeviation="4" floodOpacity="0.2"/>
        </filter>
      </defs>
      
      <g 
        stroke={useGradient ? `url(#${uniqueId}-gradient)` : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={
          variant === "glow" ? `url(#${uniqueId}-glow)` : 
          variant === "neon" ? `url(#${uniqueId}-neon)` :
          variant === "3d" ? `url(#${uniqueId}-3d)` : undefined
        }
      >
        {/* Five fingers representing the 5 pillars */}
        <path d="M18 25 L18 60" className={animated ? "animate-finger-1" : ""} />
        <path d="M35 12 L35 65" className={animated ? "animate-finger-2" : ""} />
        <path d="M52 8 L52 68" className={animated ? "animate-finger-3" : ""} />
        <path d="M69 12 L69 65" className={animated ? "animate-finger-4" : ""} />
        <path d="M84 28 L84 58" className={animated ? "animate-finger-5" : ""} />
        
        {/* Palm - elegant curved shape */}
        <path d="M12 60 C12 85 20 105 52 115 C84 105 92 85 92 60" />
      </g>
    </svg>
  );
};

// Interactive hand that responds to mouse
export const InteractiveHand = ({ className }: { className?: string }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return (
    <div 
      className={cn("transition-transform duration-300 ease-out", className)}
      style={{ 
        transform: `perspective(1000px) rotateX(${mousePosition.y}deg) rotateY(${-mousePosition.x}deg)`
      }}
    >
      <HandSVG variant="neon" color="hsl(var(--primary))" className="w-full h-full" animated />
    </div>
  );
};

export const HandPattern = ({
  className,
  opacity = 0.1,
  color = "white",
  size = "md",
  variant = "solid",
  animated = false,
  parallax = false,
  interactive = false,
}: HandPatternProps) => {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    if (!parallax) return;
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [parallax]);

  const parallaxStyle = parallax ? {
    transform: `translateY(${scrollY * 0.1}px)`,
  } : {};
  
  return (
    <div 
      className={cn(
        "pointer-events-none transition-all duration-700",
        sizeMap[size],
        animated && "animate-float",
        className
      )}
      style={{ opacity, ...parallaxStyle }}
    >
      {interactive ? (
        <InteractiveHand className="w-full h-full" />
      ) : (
        <HandSVG 
          className="w-full h-full" 
          color={color} 
          variant={variant}
          animated={animated}
        />
      )}
    </div>
  );
};

// Spectacular hero hand with multiple layers
export const SpectacularHeroHand = ({ className }: { className?: string }) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Background pulse ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/5 animate-ping-slow" />
      </div>
      
      {/* Outer glow layer */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[700px] opacity-[0.03]">
        <HandSVG color="white" variant="glow" className="w-full h-full blur-lg" />
      </div>
      
      {/* Main central hand with neon effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[580px] opacity-[0.08]">
        <HandSVG color="white" variant="neon" className="w-full h-full animate-pulse-slow" animated />
      </div>
      
      {/* Inner sharp hand */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[500px] opacity-[0.04]">
        <HandSVG color="white" variant="solid" className="w-full h-full" />
      </div>
      
      {/* Orbiting hands */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] animate-spin-very-slow">
        <HandPattern 
          className="absolute top-0 left-1/2 -translate-x-1/2" 
          size="lg" 
          opacity={0.05}
          color="white"
          variant="outline"
        />
        <HandPattern 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rotate-180" 
          size="lg" 
          opacity={0.05}
          color="white"
          variant="outline"
        />
        <HandPattern 
          className="absolute top-1/2 left-0 -translate-y-1/2 -rotate-90" 
          size="lg" 
          opacity={0.05}
          color="white"
          variant="outline"
        />
        <HandPattern 
          className="absolute top-1/2 right-0 -translate-y-1/2 rotate-90" 
          size="lg" 
          opacity={0.05}
          color="white"
          variant="outline"
        />
      </div>
      
      {/* Scattered floating hands */}
      <HandPattern 
        className="absolute top-[12%] right-[8%] rotate-[25deg]" 
        size="xl" 
        opacity={0.06}
        color="white"
        variant="outline"
        animated
      />
      <HandPattern 
        className="absolute top-[18%] left-[6%] -rotate-[18deg]" 
        size="lg" 
        opacity={0.05}
        color="white"
        variant="outline"
        animated
      />
      <HandPattern 
        className="absolute bottom-[15%] right-[10%] rotate-[45deg]" 
        size="lg" 
        opacity={0.05}
        color="white"
        variant="outline"
        animated
      />
      <HandPattern 
        className="absolute bottom-[20%] left-[8%] -rotate-[30deg]" 
        size="xl" 
        opacity={0.06}
        color="white"
        variant="outline"
        animated
      />
      
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/20" />
    </div>
  );
};

// Premium background with layered hands
export const HandPatternBackground = ({ className }: { className?: string }) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Large subtle background hand */}
      <div className="absolute -top-24 -right-24 w-[500px] h-[700px] opacity-[0.03] rotate-[15deg]">
        <HandSVG color="hsl(var(--primary))" variant="gradient" className="w-full h-full blur-sm" />
      </div>
      
      {/* Bottom left elegant hand */}
      <div className="absolute -bottom-32 -left-28 w-[400px] h-[550px] opacity-[0.04] -rotate-[20deg]">
        <HandSVG color="hsl(var(--primary))" variant="outline" className="w-full h-full" />
      </div>
      
      {/* Floating accent hands with parallax effect */}
      <HandPattern 
        className="absolute top-1/3 right-[8%] rotate-[30deg]" 
        size="lg" 
        opacity={0.05}
        color="hsl(var(--primary))"
        variant="outline"
        animated
        parallax
      />
      
      <HandPattern 
        className="absolute bottom-1/4 left-[12%] -rotate-[15deg]" 
        size="md" 
        opacity={0.04}
        color="hsl(var(--primary))"
        variant="outline"
        animated
        parallax
      />
      
      {/* Center watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-96 opacity-[0.015]">
        <HandSVG color="hsl(var(--foreground))" variant="solid" className="w-full h-full" />
      </div>
    </div>
  );
};

// Hero background - now uses SpectacularHeroHand
export const HeroHandBackground = SpectacularHeroHand;

// Card decoration with corner hands
export const CardHandDecoration = ({ className, position = "top-right" }: { 
  className?: string; 
  position?: "top-right" | "bottom-left" | "both";
}) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none rounded-inherit", className)}>
      {(position === "top-right" || position === "both") && (
        <HandPattern 
          className="absolute -top-6 -right-6 rotate-[20deg]" 
          size="lg" 
          opacity={0.06}
          color="hsl(var(--primary))"
          variant="outline"
        />
      )}
      {(position === "bottom-left" || position === "both") && (
        <HandPattern 
          className="absolute -bottom-6 -left-6 -rotate-[20deg]" 
          size="lg" 
          opacity={0.06}
          color="hsl(var(--primary))"
          variant="outline"
        />
      )}
    </div>
  );
};

// Section divider with hand motif
export const HandDivider = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative flex items-center justify-center py-12", className)}>
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="relative bg-background px-6">
        <div className="w-16 h-24 opacity-20">
          <HandSVG color="hsl(var(--primary))" variant="solid" className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

// Loading animation with hand
export const HandLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="w-20 h-30 animate-bounce">
        <HandSVG color="hsl(var(--primary))" variant="neon" className="w-full h-full" animated />
      </div>
    </div>
  );
};

export default HandPattern;
