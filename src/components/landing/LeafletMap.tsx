import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import { MapPin } from "lucide-react";
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

interface RoleConfig {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  label: { ar: string; en: string };
}

interface LeafletMapProps {
  businesses: Business[];
  roleConfig: Record<string, RoleConfig>;
  language: string;
}

const getIconPath = (role: string) => {
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

const createCustomIcon = (role: string, color: string) => {
  return divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px ${color}66;
        border: 3px solid white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${getIconPath(role)}
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

const MapBoundsController = ({ businesses }: { businesses: Business[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (businesses.length > 0) {
      const validBusinesses = businesses.filter(b => b.lat && b.lng);
      if (validBusinesses.length > 0) {
        const bounds = validBusinesses.map(b => [b.lat!, b.lng!] as [number, number]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [businesses, map]);
  
  return null;
};

const LeafletMap = ({ businesses, roleConfig, language }: LeafletMapProps) => {
  return (
    <MapContainer
      center={[24.7136, 46.6753]}
      zoom={3}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapBoundsController businesses={businesses} />
      
      {businesses.map((business) => (
        business.lat && business.lng && (
          <Marker
            key={business.id}
            position={[business.lat, business.lng]}
            icon={createCustomIcon(business.role, roleConfig[business.role]?.color || "#888")}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const config = roleConfig[business.role];
                    const IconComponent = config?.icon;
                    return IconComponent ? (
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: config.color + "20" }}
                      >
                        <IconComponent className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                    ) : null;
                  })()}
                  <div>
                    <h3 className="font-bold text-gray-900">{business.name}</h3>
                    <p className="text-xs text-gray-500">
                      {roleConfig[business.role]?.label[language as "ar" | "en"]}
                    </p>
                  </div>
                </div>
                {business.city && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {business.city}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};

export default LeafletMap;
