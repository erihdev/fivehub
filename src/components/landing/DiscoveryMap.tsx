import { useState, useEffect, useMemo, useRef } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Search, Sprout, Package, Flame, Coffee, Wrench, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Business {
  id: string;
  name: string;
  role: string;
  city: string | null;
  country: string | null;
  lat?: number;
  lng?: number;
}

// City coordinates for mapping (Saudi cities + others)
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  // Saudi Arabia cities
  "جازان": { lat: 16.8892, lng: 42.5611 },
  "جدة": { lat: 21.5433, lng: 39.1728 },
  "الرياض": { lat: 24.7136, lng: 46.6753 },
  "الدمام": { lat: 26.4207, lng: 50.0888 },
  "مكة": { lat: 21.3891, lng: 39.8579 },
  "المدينة": { lat: 24.5247, lng: 39.5692 },
  "الطائف": { lat: 21.2703, lng: 40.4158 },
  "تبوك": { lat: 28.3838, lng: 36.5550 },
  "أبها": { lat: 18.2164, lng: 42.5053 },
  "خميس مشيط": { lat: 18.3060, lng: 42.7291 },
  "الخبر": { lat: 26.2172, lng: 50.1971 },
  "نجران": { lat: 17.4933, lng: 44.1277 },
  // Countries fallback
  "Saudi Arabia": { lat: 24.7136, lng: 46.6753 },
  "السعودية": { lat: 24.7136, lng: 46.6753 },
  "UAE": { lat: 25.2048, lng: 55.2708 },
  "الإمارات": { lat: 25.2048, lng: 55.2708 },
  "Egypt": { lat: 30.0444, lng: 31.2357 },
  "مصر": { lat: 30.0444, lng: 31.2357 },
  "Ethiopia": { lat: 9.145, lng: 40.4897 },
  "إثيوبيا": { lat: 9.145, lng: 40.4897 },
  "Colombia": { lat: 4.711, lng: -74.0721 },
  "كولومبيا": { lat: 4.711, lng: -74.0721 },
  "Yemen": { lat: 15.3694, lng: 44.191 },
  "اليمن": { lat: 15.3694, lng: 44.191 },
  "Kenya": { lat: -0.0236, lng: 37.9062 },
  "كينيا": { lat: -0.0236, lng: 37.9062 },
};

const roleConfig = {
  farm: {
    icon: Sprout,
    color: "#10B981",
    label: { ar: "مزرعة", en: "Farm" },
  },
  supplier: {
    icon: Package,
    color: "#3B82F6",
    label: { ar: "مورد", en: "Supplier" },
  },
  roaster: {
    icon: Flame,
    color: "#F97316",
    label: { ar: "محمصة", en: "Roaster" },
  },
  cafe: {
    icon: Coffee,
    color: "#EC4899",
    label: { ar: "مقهى", en: "Cafe" },
  },
  maintenance: {
    icon: Wrench,
    color: "#64748B",
    label: { ar: "صيانة", en: "Maintenance" },
  },
};

const getIconSvg = (role: string) => {
  switch (role) {
    case "farm":
      return '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>';
    case "supplier":
      return '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>';
    case "roaster":
      return '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>';
    case "cafe":
      return '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>';
    case "maintenance":
      return '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';
    default:
      return '';
  }
};

const createMarkerIcon = (role: string, color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 12px;
        height: 12px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 8px ${color}88, 0 0 16px ${color}44;
        border: 2px solid rgba(255,255,255,0.8);
        cursor: pointer;
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};


const DiscoveryMap = () => {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        // Fetch from user_roles with profiles
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id, role, company_name, city")
          .eq("status", "approved")
          .in("role", ["farm", "supplier", "roaster", "cafe", "maintenance"]);

        if (rolesData) {
          const mappedBusinesses: Business[] = rolesData.map((item, index) => {
            // Try to get coordinates from city first, then fallback to random Saudi city
            let coords = item.city ? cityCoordinates[item.city] : null;
            
            if (!coords) {
              // Fallback to random Saudi city
              const saudiCities = ["جازان", "جدة", "الرياض", "الدمام", "مكة", "أبها"];
              const randomCity = saudiCities[Math.floor(Math.random() * saudiCities.length)];
              coords = cityCoordinates[randomCity];
            }
            
            return {
              id: item.user_id,
              name: item.company_name || `${roleConfig[item.role as keyof typeof roleConfig]?.label[language] || item.role} #${index + 1}`,
              role: item.role,
              city: item.city,
              country: "السعودية",
              lat: coords.lat + (Math.random() - 0.5) * 0.1,
              lng: coords.lng + (Math.random() - 0.5) * 0.1,
            };
          });
          setBusinesses(mappedBusinesses);
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, [language]);

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const matchesRole = !selectedRole || b.role === selectedRole;
      const matchesSearch = !searchQuery || 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.city?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [businesses, selectedRole, searchQuery]);

  // Initialize and update map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    // Initialize map
    mapInstanceRef.current = L.map(mapRef.current, {
      center: [24.7136, 46.6753],
      zoom: 3,
      scrollWheelZoom: true,
    });

    // Add dark tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when filtered businesses change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    filteredBusinesses.forEach(business => {
      if (!business.lat || !business.lng) return;
      
      const config = roleConfig[business.role as keyof typeof roleConfig];
      if (!config) return;

      const marker = L.marker([business.lat, business.lng], {
        icon: createMarkerIcon(business.role, config.color),
      });

      marker.bindPopup(`
        <div class="p-2 min-w-[180px]">
          <div class="flex items-center gap-2 mb-1">
            <div class="w-6 h-6 rounded-full flex items-center justify-center" style="background-color: ${config.color}20">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${config.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${getIconSvg(business.role)}
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-gray-900 text-sm">${business.name}</h3>
              <p class="text-xs text-gray-500">${config.label[language]}</p>
            </div>
          </div>
          ${business.city ? `<p class="text-xs text-gray-600 mt-1">📍 ${business.city}</p>` : ''}
        </div>
      `);

      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [filteredBusinesses, language]);

  // Stats
  const stats = useMemo(() => {
    return Object.keys(roleConfig).reduce((acc, role) => {
      acc[role] = businesses.filter(b => b.role === role).length;
      return acc;
    }, {} as Record<string, number>);
  }, [businesses]);

  return (
    <section className="relative bg-[#0a0a0a] py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {isRtl ? "اكتشف شركاء القهوة" : "Discover Coffee Partners"}
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            {isRtl 
              ? "ابحث عن المحامص والموردين والمزارع والمقاهي حول العالم"
              : "Find roasters, suppliers, farms, and cafes worldwide"
            }
          </p>
        </div>

        {/* Compact Filter Bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button
            onClick={() => setSelectedRole(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !selectedRole
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isRtl ? "الكل" : "All"} ({businesses.length})
          </button>
          {Object.entries(roleConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedRole(selectedRole === key ? null : key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedRole === key
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: config.color }}
              />
              {config.label[language]} ({stats[key] || 0})
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="text"
              placeholder={isRtl ? "ابحث بالاسم أو المدينة..." : "Search by name or city..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-full text-sm focus:ring-1 focus:ring-white/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative h-[450px] md:h-[550px] rounded-xl overflow-hidden border border-white/5">
          <div ref={mapRef} className="h-full w-full" />
          
          {/* Results Badge */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium z-[1000]">
            {filteredBusinesses.length} {isRtl ? "شريك" : "partners"}
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 z-[1000]">
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(roleConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-white/80">{config.label[language]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[1000]">
              <div className="text-white text-sm">
                {isRtl ? "جاري التحميل..." : "Loading..."}
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredBusinesses.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <MapPin className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {isRtl ? "لم يتم العثور على نتائج" : "No results found"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DiscoveryMap;
