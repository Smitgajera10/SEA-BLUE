import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";

// Import CSS
import "leaflet-geosearch/dist/geosearch.css";

type GeoSearchProps = {
  onLocationFound: (location: any) => void;
};

export const GeoSearchComponent = ({ onLocationFound }: GeoSearchProps) => {
  const map = useMap();

  useEffect(() => {
    // Create the search provider and control
    const provider = new OpenStreetMapProvider();
    const searchControl = new (GeoSearchControl as any)({
      provider: provider,
      style: "bar",
      showMarker: true,
      showPopup: false,
      autoClose: true,
    });

    // Add the control to the map
    map.addControl(searchControl);

    // Listen for the "showlocation" event and update the parent component
    map.on("geosearch/showlocation", (e: any) => {
      onLocationFound({
        lat: e.location.y,
        lon: e.location.x,
        name: e.location.label,
      });
    });

    // Cleanup: remove the control when the component unmounts
    return () => {
      map.removeControl(searchControl);
      map.off("geosearch/showlocation");
    };
  }, [map, onLocationFound]);

  return null;
};