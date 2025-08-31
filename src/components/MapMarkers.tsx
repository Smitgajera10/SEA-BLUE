"use client";
import React from "react";
import type { LatLngTuple } from "leaflet";
import { Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// simple icon (adjust URL/path as needed)
const stormIcon = new L.Icon({
  iconUrl: "/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// types depending on your API shape
type TrackPointArray = number[]; // e.g. [lat, lon] or [lon, lat]
type TrackPointObj = { lat: number; lon: number };
type RawTrackPoint = TrackPointArray | TrackPointObj;

type Storm = {
  id: string;
  name?: string;
  // adjust this to match your real data shape
  track: RawTrackPoint[];
};

export function MapMarkers({ storms }: { storms: Storm[] }) {
  // helper to convert a raw point into LatLngTuple | null
  const toLatLngTuple = (p: RawTrackPoint): LatLngTuple | null => {
    if (Array.isArray(p)) {
      // Only accept arrays with at least 2 numbers
      if (p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number") {
        // IMPORTANT: confirm whether API uses [lat, lon] or [lon, lat]
        // If API is [lon, lat], swap here: return [p[1], p[0]] as LatLngTuple;
        return [p[0], p[1]] as LatLngTuple; // <-- assume [lat, lon]
      }
      return null;
    }
    // object form
    if (p && typeof (p as TrackPointObj).lat === "number" && typeof (p as TrackPointObj).lon === "number") {
      return [(p as TrackPointObj).lat, (p as TrackPointObj).lon] as LatLngTuple;
    }
    return null;
  };

  return (
    <>
      {storms.map((storm) => {
        // normalize + filter invalid points
        const trackPoints: LatLngTuple[] = storm.track
          .map(toLatLngTuple)
          .filter((pt): pt is LatLngTuple => !!pt);

        if (trackPoints.length === 0) return null;

        const lastPoint: LatLngTuple = trackPoints[trackPoints.length - 1];

        return (
          <React.Fragment key={storm.id}>
            <Polyline positions={trackPoints} color="red" weight={3} opacity={0.6} />
            <Marker position={lastPoint} icon={stormIcon}>
              <Popup>
                <div>
                  <strong>{storm.name ?? storm.id}</strong>
                  <div>Last: {lastPoint[0].toFixed(3)}, {lastPoint[1].toFixed(3)}</div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
