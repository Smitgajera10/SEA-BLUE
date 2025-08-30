// src/components/MapMarkers.tsx
"use client";

import { useEffect, useState } from "react";
import { Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

type SevereStormEvent = {
  id: string;
  title: string;
  geometry: {
    coordinates: number[];
    date: string;
  }[];
};

export function MapMarkers() {
  const [severeStorms, setSevereStorms] = useState<SevereStormEvent[]>([]);
  const [stormIcon, setStormIcon] = useState<any>(null);

  // Define the custom storm icon inside the client component to avoid SSR errors
  useEffect(() => {
    if (typeof window !== "undefined") {
      const icon = new L.Icon({
        iconUrl: '/storm-icon.png',
        iconSize: [25, 25],
      });
      setStormIcon(icon);
    }
  }, []);

  // Fetch severe storm data from your API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        setSevereStorms(data.severeStorms || []);
      } catch (err) {
        console.error("Failed to fetch severe storms:", err);
      }
    };
    fetchEvents();
  }, []);

  if (!stormIcon) return null; // Don't render until the icon is loaded

  return (
    <>
      {severeStorms.map((storm) => {
        // Extract all coordinates for the polyline
        const trackPoints = storm.geometry.map((point) => [
          point.coordinates[1],
          point.coordinates[0],
        ]);
        
        // Get the last point for the marker
        const lastPoint = trackPoints[trackPoints.length - 1];

        return (
          <div key={storm.id}>
            {/* Draw the polyline to show the storm track */}
            <Polyline positions={trackPoints} color="red" weight={3} opacity={0.6} />

            {/* Place a marker at the last known position */}
            <Marker position={lastPoint} icon={stormIcon}>
              <Popup>
                <div className="font-semibold">{storm.title}</div>
                <div className="text-xs text-slate-500">
                  Last Update: {new Date(storm.geometry[storm.geometry.length - 1].date).toLocaleString()}
                </div>
              </Popup>
            </Marker>
          </div>
        );
      })}
    </>
  );
}