"use client";

import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapCircleProps {
  center: google.maps.LatLngLiteral;
  radius: number;
}

export const MapCircle = ({ center, radius }: MapCircleProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const circle = new google.maps.Circle({
      map, center, radius,
      strokeColor: '#007BFF', strokeOpacity: 0.8, strokeWeight: 2,
      fillColor: '#007BFF', fillOpacity: 0.2,
    });

    return () => circle.setMap(null);
  }, [map, center, radius]);

  return null;
};
