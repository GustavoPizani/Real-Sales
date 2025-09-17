"use client"; // ✅ Garante que o componente é executado no lado do cliente

import React, { useState, useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useApiIsLoaded,
} from '@vis.gl/react-google-maps';
import { MapCircle } from './map-circle';

interface GoogleMapsPickerProps {
  latitude: number;
  longitude: number;
  radius: number;
  onLocationChange: (location: { lat: number; lng: number }) => void;
}

function PlaceAutocomplete({ onPlaceSelect }: { onPlaceSelect: (place: google.maps.places.PlaceResult) => void }) {
  const [placeAutocomplete, setPlaceAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const map = useMap(); // ✅ Hook para obter a instância do mapa
  
  useEffect(() => {
    if (!placeAutocomplete && inputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        fields: ['geometry.location', 'name'],
        types: ['address'],
        componentRestrictions: { country: 'br' },
      });
      setPlaceAutocomplete(autocomplete);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          onPlaceSelect(place);
        }
      });
    }
  }, [placeAutocomplete, onPlaceSelect]);

  useEffect(() => {
    if (map && placeAutocomplete) {
      placeAutocomplete.bindTo('bounds', map);
    }
  }, [map, placeAutocomplete]); // ✅ Adiciona 'map' como dependência

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 w-[90%]">
      <input
        ref={inputRef}
        placeholder="Digite um endereço"
        className="w-full p-2 rounded-md border shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

export function GoogleMapsPicker({ latitude, longitude, radius, onLocationChange }: GoogleMapsPickerProps) {
  const position = useMemo(() => ({ lat: latitude, lng: longitude }), [latitude, longitude]);
  const hasPosition = latitude !== 0 && longitude !== 0;
  
  // ✅ Novo estado para controlar o centro e o zoom do mapa de forma independente do pino
  const [mapCenter, setMapCenter] = useState(
    hasPosition ? position : { lat: -23.55, lng: -46.63 }
  );
  const [mapZoom, setMapZoom] = useState(hasPosition ? 15 : 10);

  const isApiLoaded = useApiIsLoaded();

  // ✅ Atualiza o centro e o zoom do mapa quando as props de latitude/longitude mudam
  useEffect(() => {
    if (hasPosition) {
      setMapCenter(position);
      setMapZoom(15);
    }
  }, [position, hasPosition]);

  // ✅ Callback para quando a câmera do mapa muda (arrastar, zoom do usuário)
  const handleCameraChanged = React.useCallback((event: any) => {
    setMapCenter(event.detail.center);
    setMapZoom(event.detail.zoom);
  }, []);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places']}>
      <div className="relative h-[300px] w-full rounded-md overflow-hidden border mt-1">
        <Map
          // ✅ Usa o estado local para o centro e zoom do mapa
          center={mapCenter}
          zoom={mapZoom}
          mapId="REAL_SALES_MAP_ID"
          gestureHandling={'greedy'}
          zoomControl={true} // ✅ Habilita os controles de zoom e o scroll
          streetViewControl={false} // Opcional: remove o boneco do Street View
          onDblclick={(e) => {
            if (e.detail.latLng) {
              onLocationChange(e.detail.latLng);
              setMapCenter(e.detail.latLng); // ✅ Move o mapa para o local do duplo clique
              setMapZoom(15); // ✅ Ajusta o zoom
            }
          }}
          onCameraChanged={handleCameraChanged} // ✅ Atualiza o estado do centro/zoom do mapa
        >
          {hasPosition && <AdvancedMarker position={position} />} {/* O pino continua na posição da prop */}
          {hasPosition && radius > 0 && <MapCircle center={position} radius={radius} />}
        </Map>
        {isApiLoaded && <PlaceAutocomplete onPlaceSelect={(place) => { // ✅ Conecta a busca de endereço
          const location = place.geometry?.location?.toJSON();
          if (location) {
            onLocationChange(location); // Atualiza a posição do pino
            setMapCenter(location); // ✅ Move o mapa para o endereço buscado
            setMapZoom(15); // ✅ Ajusta o zoom
          }
        }} />}
      </div>
    </APIProvider>
  );
}
