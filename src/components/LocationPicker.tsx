import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';
import { Button, Input } from './ui';
import { toast } from 'sonner';

// Simple in-memory caches for Nominatim requests
const geocodeCache: Record<string, { lat: number; lng: number }> = {};
const reverseCache: Record<string, string> = {};

interface LocationPickerProps {
  value: { lat?: number; lng?: number; area: string; landmark?: string };
  onChange: (data: { lat: number; lng: number; area: string; landmark: string }) => void;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addressText, setAddressText] = useState(value.area || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const defaultCenter: [number, number] = [20.5937, 78.9629]; // Center of India

  // Initialize Leaflet Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapRef.current) return;

    // Use current value coordinates, fallback to default center
    const initialCenter: [number, number] =
      value.lat && value.lng ? [value.lat, value.lng] : defaultCenter;
    const initialZoom = value.lat && value.lng ? 13 : 5;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false, // Disable scroll zoom on mobile/default to prevent conflict
    }).setView(initialCenter, initialZoom);

    // CartoDB Voyager tiles - warm, clean, readable
    L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
    }).addTo(map);

    // Zoom controls at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    // Custom teardrop pin SVG icon
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative flex items-center justify-center w-8 h-10 select-none animate-bounce">
          <svg class="absolute w-full h-full text-orange-600 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <div class="relative z-10 w-2.5 h-2.5 bg-white rounded-full mb-3 shadow-inner"></div>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
    });

    // Create marker
    const marker = L.marker(initialCenter, {
      draggable: true,
      icon: customIcon,
    }).addTo(map);

    markerRef.current = marker;

    // Listen to drag events
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      handleCoordsChange(position.lat, position.lng);
    });

    // Listen to map clicks to place marker manually
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      handleCoordsChange(lat, lng);
    });

    // Keep map sizes synchronized using ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map view if parent coordinates change externally
  useEffect(() => {
    if (mapRef.current && markerRef.current && value.lat && value.lng) {
      const currentPos = markerRef.current.getLatLng();
      if (currentPos.lat !== value.lat || currentPos.lng !== value.lng) {
        markerRef.current.setLatLng([value.lat, value.lng]);
        mapRef.current.setView([value.lat, value.lng], 13);
      }
    }
  }, [value.lat, value.lng]);

  // Handle coordinates update, reverse geocode, and notify parent
  const handleCoordsChange = async (lat: number, lng: number) => {
    setIsLoading(true);
    const resolvedArea = await reverseGeocode(lat, lng);
    setIsLoading(false);
    
    setAddressText(resolvedArea);
    onChange({
      lat,
      lng,
      area: resolvedArea,
      landmark: value.landmark || '',
    });
  };

  // Reverse Geocode using Nominatim API (cache results to avoid repeat hits)
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (reverseCache[cacheKey]) {
      return reverseCache[cacheKey];
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'LOKLINK/1.0',
          },
        }
      );
      const data = await response.json();
      if (data && data.display_name) {
        // Extract a clean short address (e.g. Suburb, City)
        const address = data.address;
        const sub = address.suburb || address.neighbourhood || address.residential || '';
        const city = address.city || address.town || address.county || '';
        const cleanAddress = [sub, city].filter(Boolean).join(', ') || data.display_name.split(',')[0];
        reverseCache[cacheKey] = cleanAddress;
        return cleanAddress;
      }
    } catch (e) {
      console.error('Reverse geocode error:', e);
    }
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  // Geocode Search using Nominatim API
  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoading(true);

    if (geocodeCache[queryText.toLowerCase()]) {
      const cached = geocodeCache[queryText.toLowerCase()];
      updateMapPosition(cached.lat, cached.lng, queryText);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&limit=1&countrycodes=in`,
        {
          headers: {
            'User-Agent': 'LOKLINK/1.0',
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        geocodeCache[queryText.toLowerCase()] = { lat: latitude, lng: longitude };
        updateMapPosition(latitude, longitude, queryText);
      } else {
        toast.error('Location not found. Try adding a city name.');
      }
    } catch (e) {
      console.error('Geocode error:', e);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Geocode search with 400ms Debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(val);
    }, 400);
  };

  const updateMapPosition = (lat: number, lng: number, areaName: string) => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.flyTo([lat, lng], 13, { animate: true, duration: 1.5 });
      setAddressText(areaName);
      onChange({
        lat,
        lng,
        area: areaName,
        landmark: value.landmark || '',
      });
    }
  };

  // Get current geolocation using navigator
  const handleUseMyLocation = () => {
    if ('geolocation' in navigator) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateMapPosition(latitude, longitude, 'Current Location');
          handleCoordsChange(latitude, longitude);
        },
        (error) => {
          setIsLoading(false);
          if (error.code === error.PERMISSION_DENIED) {
            toast.error('Location permission denied. Please allow it in settings.');
          } else {
            toast.error('Failed to get location. Try searching instead.');
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Geocode Search Input */}
      <div className="relative group">
        <Input
          placeholder="Search location (e.g. Indiranagar, Bangalore)..."
          value={searchQuery}
          onChange={handleSearchInputChange}
          className="pl-11 pr-24 rounded-2xl h-12 bg-stone-50 border-stone-200 focus:bg-white"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-orange-600" size={18} />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isLoading && <Loader2 className="animate-spin text-stone-400" size={16} />}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleUseMyLocation}
            className="h-8 w-8 rounded-xl text-orange-600 hover:bg-orange-50 shrink-0"
            title="Use current location"
          >
            <Navigation size={16} />
          </Button>
        </div>
      </div>

      {/* Mini Embedded Map Container */}
      <div className="relative rounded-[28px] overflow-hidden border border-stone-100 shadow-inner bg-stone-50">
        <div
          ref={mapContainerRef}
          className="w-full h-[200px] z-10"
        />
        {!mapRef.current && (
          <div className="absolute inset-0 bg-stone-50 flex items-center justify-center text-xs font-bold text-stone-400 uppercase tracking-widest gap-2">
            <Loader2 className="animate-spin text-orange-500" size={16} />
            <span>Loading Map...</span>
          </div>
        )}
      </div>

      {/* Geocoded Address Output & Landmark */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Resolved Area</span>
          <Input
            readOnly
            placeholder="Resolved from map..."
            value={addressText}
            className="bg-stone-50 text-stone-600 font-medium h-12 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Landmark</span>
          <Input
            placeholder="e.g. Near Post Office"
            value={value.landmark || ''}
            onChange={(e) =>
              onChange({
                lat: value.lat || defaultCenter[0],
                lng: value.lng || defaultCenter[1],
                area: addressText,
                landmark: e.target.value,
              })
            }
            className="h-12 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
