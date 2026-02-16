import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { translateOrigin } from "@/lib/countryTranslations";
import "leaflet/dist/leaflet.css";

interface OriginData {
  origin: string;
  count: number;
  avgPrice: number;
  avgScore: number;
  suppliers: string[];
}

interface OriginCoord {
  lat: number;
  lng: number;
  flag: string;
  color: string;
}

interface InteractiveMapProps {
  originsData: OriginData[];
  originCoordinates: Record<string, OriginCoord>;
  selectedOrigin: string | null;
  onSelectOrigin: (origin: string | null) => void;
  language: "ar" | "en";
}

const InteractiveMap = ({
  originsData,
  originCoordinates,
  selectedOrigin,
  onSelectOrigin,
  language,
}: InteractiveMapProps) => {
  const getOriginCoords = (origin: string) => originCoordinates[origin] || null;

  return (
    <MapContainer
      center={[15, 30]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {originsData.map((origin) => {
        const coords = getOriginCoords(origin.origin);
        if (!coords) return null;
        return (
          <CircleMarker
            key={origin.origin}
            center={[coords.lat, coords.lng]}
            radius={Math.min(30, 10 + origin.count * 2)}
            pathOptions={{
              fillColor: coords.color,
              fillOpacity: selectedOrigin === origin.origin ? 0.9 : 0.6,
              color: selectedOrigin === origin.origin ? "#000" : coords.color,
              weight: selectedOrigin === origin.origin ? 3 : 2,
            }}
            eventHandlers={{
              click: () => onSelectOrigin(selectedOrigin === origin.origin ? null : origin.origin),
            }}
          >
            <Popup>
              <div className="text-center p-2" dir="rtl">
                <h3 className="font-bold text-lg mb-2">
                  {coords.flag} {translateOrigin(origin.origin, language)}
                </h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>المحاصيل:</strong> {origin.count}
                  </p>
                  <p>
                    <strong>الموردون:</strong> {origin.suppliers.length}
                  </p>
                  <p>
                    <strong>متوسط السعر:</strong> {origin.avgPrice.toFixed(0)} ريال
                  </p>
                  <p>
                    <strong>متوسط التقييم:</strong> {origin.avgScore.toFixed(1)}
                  </p>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

export default InteractiveMap;
