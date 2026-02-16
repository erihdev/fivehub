import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Leaf, Truck, Flame, Coffee, Settings } from "lucide-react";

const FiveFingersPillars = () => {
  const { language } = useLanguage();

  const pillars = [
    { ar: "المزارع", en: "Farms", Icon: Leaf, href: "/auth?role=farm", color: "#22c55e" },
    { ar: "الموردين", en: "Suppliers", Icon: Truck, href: "/auth?role=supplier", color: "#3b82f6" },
    { ar: "المحامص", en: "Roasters", Icon: Flame, href: "/auth?role=roaster", color: "#f97316" },
    { ar: "المقاهي", en: "Cafes", Icon: Coffee, href: "/auth?role=cafe", color: "#eab308" },
    { ar: "الصيانة", en: "Maintenance", Icon: Settings, href: "/auth?role=maintenance", color: "#64748b" },
  ];

  // Positions for icons on each finger tip based on the exact logo design
  const fingerPositions = [
    { top: "8%", left: "12%" },    // Finger 1 - Farms (pinky)
    { top: "-2%", left: "30%" },   // Finger 2 - Suppliers
    { top: "-8%", left: "50%" },   // Finger 3 - Roasters (tallest - middle)
    { top: "-2%", left: "70%" },   // Finger 4 - Cafes
    { top: "8%", left: "88%" },    // Finger 5 - Maintenance (thumb)
  ];

  return (
    <div className="relative flex flex-col items-center animate-fade-up">
      {/* Hand container with the exact logo */}
      <div className="relative w-[280px] md:w-[360px] lg:w-[420px] h-[320px] md:h-[420px] lg:h-[500px]">
        {/* The 5-finger hand SVG matching the brand */}
        <svg 
          viewBox="0 0 100 120" 
          className="w-full h-full drop-shadow-[0_0_40px_rgba(255,255,255,0.5)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="hand-glow-main" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Five fingers hand SVG */}
          <g 
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#hand-glow-main)"
          >
            {/* Five fingers - different heights */}
            <path d="M15 28 L15 55" />   {/* Pinky - shortest */}
            <path d="M32 15 L32 60" />   {/* Ring finger */}
            <path d="M50 8 L50 65" />    {/* Middle finger - tallest */}
            <path d="M68 15 L68 60" />   {/* Index finger */}
            <path d="M85 28 L85 55" />   {/* Thumb - shortest */}
            
            {/* Palm - curved bottom connecting all fingers */}
            <path d="M15 55 C15 85 30 100 50 100 C70 100 85 85 85 55" />
          </g>
        </svg>

        {/* Interactive Icons on each finger tip with labels */}
        {pillars.map((pillar, index) => (
          <Link
            key={index}
            to={pillar.href}
            className="absolute group cursor-pointer transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ 
              top: fingerPositions[index].top, 
              left: fingerPositions[index].left,
            }}
          >
            {/* Label above icon */}
            <div className="mb-1 whitespace-nowrap">
              <span className="text-white text-[10px] md:text-xs lg:text-sm font-bold drop-shadow-lg">
                {language === "ar" ? pillar.ar : pillar.en}
              </span>
            </div>
            
            <div className="relative">
              {/* Glow ring */}
              <div 
                className="absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-70 transition-all duration-300 scale-150"
                style={{ backgroundColor: pillar.color }}
              />
              
              {/* Icon container */}
              <div 
                className="relative w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center border-2 border-white/60 group-hover:border-white group-hover:scale-110 transition-all duration-300 shadow-lg backdrop-blur-sm"
                style={{ backgroundColor: pillar.color }}
              >
                <pillar.Icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FiveFingersPillars;