import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Listing } from '@shared/schema';

// Fix Leaflet marker icons
// See: https://github.com/PaulLeCam/react-leaflet/issues/453
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface MapListingType extends Listing {
  sellerId: number;
  sellerName?: string;
}

interface MapViewProps {
  listings: MapListingType[];
  height?: string;
  width?: string;
  center?: [number, number]; // [latitude, longitude]
  zoom?: number;
  showPopups?: boolean;
}

export function MapView({
  listings,
  height = '500px',
  width = '100%',
  center = [-30.5595, 22.9375], // Default center of South Africa
  zoom = 5,
  showPopups = true,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Optimize marker filtering and bounds calculation with memoization
  const validMarkers = useMemo(() => 
    listings.filter(listing => listing.latitude && listing.longitude),
    [listings]
  );

  useEffect(() => {
    if (mapRef.current && validMarkers.length > 0) {
      // Only recalculate bounds if we have markers
      const bounds = L.latLngBounds(
        validMarkers.map((marker) => [marker.latitude!, marker.longitude!])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [validMarkers]);

  return (
    <div style={{ height, width }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validMarkers.map((listing) => (
          <Marker 
            key={listing.id} 
            position={[listing.latitude!, listing.longitude!]}
          >
            {showPopups && (
              <Popup>
                <div>
                  <h3 className="font-semibold">{listing.title}</h3>
                  <p>{listing.description.substring(0, 100)}...</p>
                  <p className="mt-2 text-sm">
                    <strong>Price:</strong> {listing.price} {listing.currency} | <strong>Quantity:</strong> {listing.quantity} {listing.unit}
                  </p>
                  {listing.sellerName && (
                    <p className="text-sm"><strong>Seller:</strong> {listing.sellerName}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{listing.location}</p>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}