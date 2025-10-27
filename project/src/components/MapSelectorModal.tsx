import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lon: number) => void;
  initialCoords?: [number, number];
}

function LocationFinder({ onMapClick, selectedPosition }: {
    onMapClick: (latlng: L.LatLng) => void,
    selectedPosition: L.LatLngTuple | null
}) {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
     if (selectedPosition) {
        map.flyTo(selectedPosition, map.getZoom());
     }
  }, [selectedPosition, map]);

  return selectedPosition === null ? null : <Marker position={selectedPosition} icon={icon}></Marker>;
}

const MapSelectorModal: React.FC<MapSelectorModalProps> = ({
    isOpen, onClose, onLocationSelect, initialCoords
}) => {
  const [selectedPosition, setSelectedPosition] = useState<L.LatLngTuple | null>(initialCoords || null);

  const handleMapClick = (latlng: L.LatLng) => {
    setSelectedPosition([latlng.lat, latlng.lng]);
  };

  const handleConfirm = () => {
    if (selectedPosition) {
      onLocationSelect(selectedPosition[0], selectedPosition[1]);
      onClose();
    }
  };

  if (!isOpen) return null;

  const centerCoords: L.LatLngTuple = selectedPosition || initialCoords || [-15.79, -47.88];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-2xl h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Selecione a Localização no Mapa</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-grow relative">
           <MapContainer
              key={centerCoords.join(',')}
              center={centerCoords}
              zoom={selectedPosition ? 13 : 4}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%", position: 'absolute' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationFinder onMapClick={handleMapClick} selectedPosition={selectedPosition} />
           </MapContainer>
        </div>

        <div className="p-3 border-t border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm text-gray-300 bg-gray-600 hover:bg-gray-500">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPosition}
            className="px-4 py-2 rounded text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Localização
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapSelectorModal;
