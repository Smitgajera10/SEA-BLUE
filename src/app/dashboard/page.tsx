"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Waves,
  Wind,
  Activity,
  Bell,
  MapPin,
  Mail,
  Loader2,
  X,
  Info,
  Shield,
  RefreshCw,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GeoSearchComponent } from "@/components/GeoSearchComponent";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Dynamically import react-leaflet bits to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  {
    ssr: false,
  }
);
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);

// ---- Types ----
type HourlyData = {
  time: string[];
  wave_height: number[];
  wind_wave_height: number[];
  swell_wave_height: number[];
};

type MarineResponse = {
  hourly: HourlyData;
  hourly_units: Record<string, string>;
  timezone?: string;
};

type Location = {
  lat: number;
  lon: number;
  name: string;
};

// ---- Risk logic ----
function computeRisk(wave: number, windWave: number) {
  if (wave > 2.5 || windWave > 1.2) return { level: "High", color: "red" };
  if (wave > 1.2 || windWave > 0.6)
    return { level: "Moderate", color: "yellow" };
  return { level: "Low", color: "green" };
}

// Map click listener component
function ClickCatcher({ onPick }: { onPick: (loc: Location) => void }) {
  // Dynamically require to avoid SSR issues
  const { useMapEvents } = require("react-leaflet");
  useMapEvents({
    click(e: any) {
      const { lat, lng } = e.latlng;
      onPick({
        lat,
        lon: lng,
        name: `Point (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      });
    },
  });
  return null;
}

export default function DashboardPage() {
  const [location, setLocation] = useState<Location | null>(null);
  const [data, setData] = useState<MarineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [risk, setRisk] = useState<{
    level: "Low" | "Moderate" | "High";
    color: "green" | "yellow" | "red";
  }>({
    level: "Low",
    color: "green",
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subscribeForm, setSubscribeForm] = useState({
    name: "",
    email: "",
    place: "",
  });

  // Ask for geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: "Your Location",
          }),
        () => setLocation({ lat: 21.14, lon: 72.68, name: "Surat Coast" })
      );
    } else {
      setLocation({ lat: 21.14, lon: 72.68, name: "Surat Coast" });
    }
  }, []);

  // Ask for browser notifications once
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default")
        Notification.requestPermission();
    }
  }, []);

  const handleLocationChange = (newLocation: Location) => {
    setLocation(newLocation);
  };
  // Fetch marine data from API
  const fetchMarine = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coastal-data?lat=${lat}&lon=${lon}`);
      const json: MarineResponse = await res.json();
      setData(json);

      const wave0 = json?.hourly?.wave_height?.[0] ?? 0;
      const windWave0 = json?.hourly?.wind_wave_height?.[0] ?? 0;
      const r = computeRisk(wave0, windWave0);
      setRisk(r as any);

      // Notify if high risk
      if (
        typeof window !== "undefined" &&
        Notification.permission === "granted" &&
        r.level === "High"
      ) {
        new Notification("⚠️ High Coastal Risk", {
          body: `${location?.name}: Wave ${wave0.toFixed(
            1
          )}m | Wind-wave ${windWave0.toFixed(1)}m`,
        });
      }

      setLastUpdated(new Date().toLocaleString());
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!location) return;
    fetchMarine(location.lat, location.lon);
  }, [location]);

  const chartData = useMemo(() => {
    if (!data?.hourly) return [];
    const { time, wave_height, swell_wave_height, wind_wave_height } =
      data.hourly;
    return time.map((t, i) => ({
      time: t.split("T")[1] ?? t,
      wave: wave_height?.[i] ?? 0,
      swell: swell_wave_height?.[i] ?? 0,
      windwave: wind_wave_height?.[i] ?? 0,
    }));
  }, [data]);

  const riskBadgeClasses =
    risk.level === "High"
      ? "bg-red-100 text-red-800 border-red-200"
      : risk.level === "Moderate"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-green-100 text-green-800 border-green-200";

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subscribeForm.name,
          email: subscribeForm.email,
          location: subscribeForm.place || location?.name,
        }),
      });
      if (!res.ok) throw new Error("Subscription failed");
      alert("✅ Subscription successful! You'll receive coastal alerts.");
      setShowSubscribe(false);
    } catch (err) {
      console.error(err);
      alert("❌ Could not subscribe. Check server logs / SMTP config.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/90 bg-white/80 border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center text-white font-bold shadow-md">
              🌊
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Sea-Blue coastal treate alert system
              </h1>
              <p className="text-xs text-slate-500">
                Interactive coastal intelligence for India
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                location && fetchMarine(location.lat, location.lon)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 text-slate-700 px-3 py-2 hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={() => setShowSubscribe(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 hover:from-cyan-600 hover:to-blue-700 transition shadow-md"
            >
              <Bell size={16} />
              Subscribe
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Info Row */}
        {location && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Location */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <MapPin size={18} />
                <span className="font-medium">Location</span>
              </div>
              <div className="text-slate-800 font-bold text-lg">
                {location.name}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {location.lat.toFixed(3)}, {location.lon.toFixed(3)}
              </div>
            </motion.div>

            {/* Wave */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <Waves size={18} />
                <span className="font-medium">Wave Height</span>
              </div>
              <div className="text-slate-800 font-bold text-2xl">
                {data?.hourly?.wave_height?.[0]?.toFixed(1) ?? "-"}{" "}
                <span className="text-sm text-slate-500">m</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Current reading</div>
            </motion.div>

            {/* Wind */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <Wind size={18} />
                <span className="font-medium">Wind Wave</span>
              </div>
              <div className="text-slate-800 font-bold text-2xl">
                {data?.hourly?.wind_wave_height?.[0]?.toFixed(1) ?? "-"}{" "}
                <span className="text-sm text-slate-500">m</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Wind-driven waves
              </div>
            </motion.div>

            {/* Risk */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Activity size={18} />
                  <span className="font-medium">Risk Level</span>
                </div>
                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${riskBadgeClasses}`}
                >
                  {risk.level}
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-3">
                {lastUpdated ? `Updated: ${lastUpdated}` : "—"}
              </div>
            </motion.div>
          </div>
        )}

        {/* Map & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100 lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Interactive Coastal Map
              </h2>
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <Info size={16} /> Click along the coast to fetch data
              </div>
            </div>

            <div className="relative h-[480px]">
              {location && (
                <MapContainer center={[location.lat, location.lon]} zoom={5} className="h-full w-full" scrollWheelZoom>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                  />
                  <Marker position={[location.lat, location.lon]} />
                  <CircleMarker
                    center={[location.lat, location.lon]}
                    radius={18}
                    pathOptions={{
                      color: risk.color === "red" ? "#ef4444" : risk.color === "yellow" ? "#eab308" : "#16a34a",
                      fillOpacity: 0.25,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{location.name}</div>
                        <div className="text-slate-600">Wave: {data?.hourly?.wave_height?.[0]?.toFixed(1) ?? "-"} m</div>
                        <div className="text-slate-600">Wind-wave: {data?.hourly?.wind_wave_height?.[0]?.toFixed(1) ?? "-"} m</div>
                        <div className="mt-1">
                          Risk: <span className={`font-semibold ${risk.level === "High" ? "text-red-600" : risk.level === "Moderate" ? "text-yellow-600" : "text-green-600"}`}>{risk.level}</span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                  <ClickCatcher onPick={(loc) => setLocation(loc)} />
                  {/* Add the new GeoSearchComponent here */}
                  <GeoSearchComponent onLocationFound={handleLocationChange} />
                </MapContainer>
              )}
            </div>
          </div>

          {/* Sidebar with legend & actions */}
          <div className="space-y-5">
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Shield size={18} /> Risk Legend
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 border border-green-100">
                  <span className="h-3 w-3 rounded-full bg-green-500 inline-block flex-shrink-0" />
                  <span className="text-slate-700">
                    Low (≤ 1.2m wave & ≤ 0.6m wind-wave)
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50 border border-yellow-100">
                  <span className="h-3 w-3 rounded-full bg-yellow-500 inline-block flex-shrink-0" />
                  <span className="text-slate-700">
                    Moderate (≤ 2.5m wave or ≤ 1.2m wind-wave)
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-red-50 border border-red-100">
                  <span className="h-3 w-3 rounded-full bg-red-500 inline-block flex-shrink-0" />
                  <span className="text-slate-700">
                    High (&gt; 2.5m wave or &gt; 1.2m wind-wave)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Subscribe Modal */}
      <AnimatePresence>
        {showSubscribe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <Mail size={18} /> Subscribe to Email Alerts
                </div>
                <button
                  onClick={() => setShowSubscribe(false)}
                  className="p-1 rounded-full hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubscribe} className="px-5 py-4 space-y-4">
                <input
                  placeholder="Name"
                  required
                  value={subscribeForm.name}
                  onChange={(e) =>
                    setSubscribeForm({ ...subscribeForm, name: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-400"
                />
                <input
                  placeholder="Email"
                  type="email"
                  required
                  value={subscribeForm.email}
                  onChange={(e) =>
                    setSubscribeForm({
                      ...subscribeForm,
                      email: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-400"
                />
                <input
                  placeholder="Location"
                  value={subscribeForm.place}
                  onChange={(e) =>
                    setSubscribeForm({
                      ...subscribeForm,
                      place: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-400"
                />
                <button
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
                >
                  {submitting ? "Submitting..." : "Subscribe"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
