/**
 * Simple Visitor Map Component
 * Self-contained map visualization without external tile dependencies
 */

import { useEffect, useRef } from 'react';
import './SimpleVisitorMap.css';

interface VisitorLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country: string | null;
  visit_count: number;
  unique_visitors: number;
}

interface SimpleVisitorMapProps {
  locations: VisitorLocation[];
  loading?: boolean;
}

export default function SimpleVisitorMap({ locations, loading }: SimpleVisitorMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || locations.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // 2x for retina
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw simple world outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Find max visits for scaling
    const maxVisits = Math.max(...locations.map(loc => loc.visit_count));

    // Draw visitor locations
    locations.forEach(location => {
      const x = ((location.longitude + 180) / 360) * width;
      const y = ((90 - location.latitude) / 180) * height;

      // Calculate size based on visits
      const normalized = location.visit_count / maxVisits;
      const radius = 3 + (normalized * 12); // 3-15px

      // Draw glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
      gradient.addColorStop(0, 'rgba(74, 222, 128, 0.8)');
      gradient.addColorStop(1, 'rgba(74, 222, 128, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw marker
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }, [locations]);

  const formatLocationName = (loc: VisitorLocation): string => {
    const parts = [];
    if (loc.city) parts.push(loc.city);
    if (loc.region && loc.region !== loc.city) parts.push(loc.region);
    if (loc.country) parts.push(loc.country);
    return parts.join(', ') || 'Unknown Location';
  };

  if (loading) {
    return (
      <div className="simple-visitor-map-loading">
        <div className="loading-spinner"></div>
        <p>Loading map data...</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="simple-visitor-map-empty">
        <p>No visitor location data available for this time range</p>
      </div>
    );
  }

  return (
    <div className="simple-visitor-map-wrapper">
      <canvas ref={canvasRef} className="simple-visitor-map-canvas" />
      
      {/* Location list */}
      <div className="location-list">
        {locations.slice(0, 5).map((location, index) => (
          <div key={index} className="location-item">
            <div className="location-marker"></div>
            <div className="location-info">
              <div className="location-name">{formatLocationName(location)}</div>
              <div className="location-stats">
                {location.visit_count.toLocaleString()} visits • {location.unique_visitors.toLocaleString()} unique
              </div>
            </div>
          </div>
        ))}
        {locations.length > 5 && (
          <div className="location-item-more">
            +{locations.length - 5} more locations
          </div>
        )}
      </div>
    </div>
  );
}

