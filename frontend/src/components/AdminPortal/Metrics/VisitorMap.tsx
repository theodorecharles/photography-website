/**
 * VisitorMap Component
 * Displays a map showing visitor locations from analytics data
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './VisitorMap.css';
import { getMarkerRadius, getMarkerOpacity, formatLocationName } from '../../../utils/mapHelpers';
import { SkeletonMap } from './SkeletonLoader';

// Import VisitorLocation from types.ts (canonical location)
import type { VisitorLocation } from './types';

interface VisitorMapProps {
  locations: VisitorLocation[];
  loading?: boolean;
}

export default function VisitorMap({ locations, loading }: VisitorMapProps) {
  const { t } = useTranslation();
  const [maxVisits, setMaxVisits] = useState(0);

  useEffect(() => {
    if (locations.length > 0) {
      const max = Math.max(...locations.map(loc => loc.visit_count));
      setMaxVisits(max);
    }
  }, [locations]);

  // Functions moved to utils/mapHelpers.ts

  if (loading) {
    return <SkeletonMap />;
  }

  if (locations.length === 0) {
    return (
      <div className="visitor-map-empty">
        <p>{t('metrics.map.noLocationData')}</p>
      </div>
    );
  }

  // Center the map on the United States
  const defaultCenter: [number, number] = [39.8, -98.6]; // Center of the United States
  const defaultZoom = 3;

  return (
    <div className="visitor-map-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={false}
        className="visitor-map"
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        {locations.map((location, index) => (
          <CircleMarker
            key={index}
            center={[location.latitude, location.longitude]}
            radius={getMarkerRadius(location.visit_count, maxVisits)}
            fillColor={getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim() || '#3b82f6'}
            color="#ffffff"
            weight={2}
            opacity={getMarkerOpacity(location.visit_count, maxVisits)}
            fillOpacity={getMarkerOpacity(location.visit_count, maxVisits)}
          >
            <Popup>
              <div className="visitor-popup">
                <div className="popup-location">
                  <strong>{formatLocationName(location)}</strong>
                </div>
                <div className="popup-stats">
                  <div className="popup-stat">
                    <span className="stat-label">{t('metrics.map.totalVisits')}:</span>
                    <span className="stat-value">{location.visit_count.toLocaleString()}</span>
                  </div>
                  <div className="popup-stat">
                    <span className="stat-label">{t('metrics.map.uniqueVisitors')}:</span>
                    <span className="stat-value">{location.unique_visitors.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="visitor-map-legend">
        <div className="legend-title">{t('metrics.map.visitorActivity')}</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-marker legend-marker-low"></div>
            <span>{t('metrics.map.low')}</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker legend-marker-medium"></div>
            <span>{t('metrics.map.medium')}</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker legend-marker-high"></div>
            <span>{t('metrics.map.high')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

