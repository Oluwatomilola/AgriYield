"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FarmMapProps {
  coordinates?: [number, number]; // Make optional
  farmName: string;
}

export function FarmMap({ coordinates, farmName }: FarmMapProps) {
  // Safe destructuring with fallback
  const [lat, lng] = coordinates || [0, 0];

  // Don't render map if no valid coordinates
  if (!coordinates || coordinates.length !== 2) {
    return (
      <div className="w-full h-[300px] rounded-lg border bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Location data not available</p>
      </div>
    );
  }

  // OpenStreetMap embed URL with marker
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    lng - 0.1
  },${lat - 0.1},${lng + 0.1},${lat + 0.1}&layer=mapnik&marker=${lat},${lng}`;
  const viewOnMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=12/${lat}/${lng}`;

  return (
    <div className="space-y-3">
      <div className="w-full h-[300px] rounded-lg overflow-hidden border bg-muted relative">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          title={`Map showing location of ${farmName}`}
          className="w-full h-full"
        />
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
          </span>
        </div>

        <Button variant="outline" size="sm" asChild>
          <a href={viewOnMapUrl} target="_blank" rel="noopener noreferrer">
            View on OpenStreetMap
            <ExternalLink className="ml-2 h-3 w-3" />
          </a>
        </Button>
      </div>
    </div>
  );
}
