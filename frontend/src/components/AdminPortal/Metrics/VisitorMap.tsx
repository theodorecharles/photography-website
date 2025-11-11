/**
 * VisitorMap Component
 * Displays a map showing visitor locations from analytics data
 */

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './VisitorMap.css';

interface VisitorLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country: string | null;
  visit_count: number;
  unique_visitors: number;
}

interface VisitorMapProps {
  locations: VisitorLocation[];
  loading?: boolean;
}

export default function VisitorMap({ locations, loading }: VisitorMapProps) {
  const [maxVisits, setMaxVisits] = useState(0);

  useEffect(() => {
    if (locations.length > 0) {
      const max = Math.max(...locations.map(loc => loc.visit_count));
      setMaxVisits(max);
    }
  }, [locations]);

  // Calculate marker size based on visit count
  const getMarkerRadius = (visitCount: number): number => {
    if (maxVisits === 0) return 8;
    const minRadius = 6;
    const maxRadius = 30;
    const normalized = visitCount / maxVisits;
    return minRadius + (normalized * (maxRadius - minRadius));
  };

  // Calculate marker opacity based on visit count
  const getMarkerOpacity = (visitCount: number): number => {
    if (maxVisits === 0) return 0.6;
    const normalized = visitCount / maxVisits;
    return 0.4 + (normalized * 0.5);
  };

  // Format location name for popup
  const formatLocationName = (loc: VisitorLocation): string => {
    const parts = [];
    if (loc.city) parts.push(loc.city);
    if (loc.region && loc.region !== loc.city) parts.push(loc.region);
    if (loc.country) parts.push(loc.country);
    return parts.join(', ') || 'Unknown Location';
  };

  if (loading) {
    return (
      <div className="visitor-map-loading">
        <div className="loading-spinner"></div>
        <p>Loading map data...</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="visitor-map-empty">
        <p>No visitor location data available for this time range</p>
      </div>
    );
  }

  const defaultCenter: [number, number] = [20, 0]; // Center of world
  const defaultZoom = 2;

  return (
    <div className="visitor-map-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={false}
        className="visitor-map"
        style={{ height: '500px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {locations.map((location, index) => (
          <CircleMarker
            key={index}
            center={[location.latitude, location.longitude]}
            radius={getMarkerRadius(location.visit_count)}
            fillColor={getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#4ade80'}
            color="#ffffff"
            weight={2}
            opacity={getMarkerOpacity(location.visit_count)}
            fillOpacity={getMarkerOpacity(location.visit_count)}
          >
            <Popup>
              <div className="visitor-popup">
                <div className="popup-location">
                  <strong>{formatLocationName(location)}</strong>
                </div>
                <div className="popup-stats">
                  <div className="popup-stat">
                    <span className="stat-label">Total Visits:</span>
                    <span className="stat-value">{location.visit_count.toLocaleString()}</span>
                  </div>
                  <div className="popup-stat">
                    <span className="stat-label">Unique Visitors:</span>
                    <span className="stat-value">{location.unique_visitors.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
