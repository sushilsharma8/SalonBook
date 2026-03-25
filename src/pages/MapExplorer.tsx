import { useEffect, useState, useCallback, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { GoogleGenAI } from '@google/genai';
import { MapPin, Star, Navigation, Search, Sparkles, Loader2 } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }; // SF default

function MapContent() {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [center, setCenter] = useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const [places, setPlaces] = useState<google.maps.places.Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.Place | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  
  // AI State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(newCenter);
          setLoadingLocation(false);
        },
        () => {
          setLoadingLocation(false); // Fallback to default
        }
      );
    } else {
      setLoadingLocation(false);
    }
  }, []);

  // Search nearby salons when center changes
  useEffect(() => {
    if (!placesLib || loadingLocation) return;
    
    const searchNearby = async () => {
      try {
        const { places } = await placesLib.Place.searchNearby({
          locationRestriction: { center, radius: 5000 },
          includedPrimaryTypes: ['beauty_salon', 'hair_care', 'spa'],
          fields: ['id', 'displayName', 'location', 'formattedAddress', 'rating', 'userRatingCount', 'photos'],
          maxResultCount: 15,
        });
        setPlaces(places);
      } catch (err) {
        console.error('Error fetching nearby places:', err);
      }
    };
    
    searchNearby();
  }, [placesLib, center, loadingLocation]);

  const handleMarkerClick = useCallback(async (place: google.maps.places.Place) => {
    setSelectedPlace(place);
    if (place.location) map?.panTo(place.location);
  }, [map]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || !GEMINI_KEY) return;
    
    setAiLoading(true);
    setAiResponse('');
    setGroundingLinks([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiQuery,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: center.lat,
                longitude: center.lng
              }
            }
          }
        }
      });
      
      setAiResponse(response.text || 'No response from AI.');
      
      // Extract grounding links
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const links = chunks.map((chunk: any) => {
          if (chunk.web) return { title: chunk.web.title, uri: chunk.web.uri };
          if (chunk.maps) return { title: chunk.maps.title, uri: chunk.maps.uri };
          return null;
        }).filter(Boolean);
        setGroundingLinks(links);
      }
    } catch (err) {
      console.error('AI Error:', err);
      setAiResponse('Sorry, I encountered an error while searching.');
    } finally {
      setAiLoading(false);
    }
  };

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar - Hidden on mobile unless list mode is active */}
      <div className={`w-full md:w-96 bg-white shadow-xl z-10 flex flex-col h-full overflow-hidden border-r border-stone-200 transition-all duration-300 ${viewMode === 'list' ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-4 md:p-6 border-b border-stone-100 bg-stone-50 shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 font-display flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-stone-900" /> Nearby Salons
          </h2>
          <p className="text-stone-500 text-xs md:text-sm mt-1">Discover the best spots around you</p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-700 font-semibold">{places.length} places</span>
            <button
              onClick={() => setSelectedPlace(null)}
              className="text-stone-500 hover:text-stone-900 font-semibold"
            >
              Clear selection
            </button>
          </div>
        </div>
        
        {/* AI Assistant Panel */}
        <div className="p-4 md:p-6 border-b border-stone-100 bg-indigo-50/50 shrink-0">
          <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center mb-3">
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" /> Ask AI Assistant
          </h3>
          <form onSubmit={handleAskAI} className="relative">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="e.g. Best curly hair salon nearby?"
              className="w-full pl-4 pr-10 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white shadow-sm"
            />
            <button 
              type="submit" 
              disabled={aiLoading || !aiQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </form>
          
          {aiResponse && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm text-sm text-stone-700 leading-relaxed max-h-40 md:max-h-48 overflow-y-auto custom-scrollbar">
              {aiResponse}
              {groundingLinks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-indigo-50 space-y-2">
                  <p className="text-xs font-bold text-indigo-900 uppercase">Sources:</p>
                  {groundingLinks.map((link, i) => (
                    <a key={i} href={link.uri} target="_blank" rel="noreferrer" className="block text-indigo-600 hover:underline text-xs truncate">
                      {link.title || link.uri}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Places List */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 custom-scrollbar">
          {places.length === 0 && !loadingLocation && (
            <div className="text-center py-10 text-stone-500">
              No salons found nearby. Try moving the map.
            </div>
          )}
          {places.map(place => (
            <div 
              key={place.id}
              onClick={() => {
                handleMarkerClick(place);
                if (window.innerWidth < 768) setViewMode('map');
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedPlace?.id === place.id ? 'border-stone-900 bg-stone-50 shadow-md ring-1 ring-stone-300' : 'border-stone-200 hover:border-stone-300 bg-white'}`}
            >
              <h4 className="font-bold text-stone-900">{place.displayName}</h4>
              <p className="text-xs text-stone-500 mt-1 line-clamp-1">{place.formattedAddress}</p>
              {place.rating && (
                <div className="flex items-center mt-2 text-sm font-medium text-stone-700">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-current mr-1" />
                  {place.rating} <span className="text-stone-400 ml-1 font-normal">({place.userRatingCount})</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className={`flex-1 h-full relative ${viewMode === 'map' ? 'block' : 'hidden md:block'}`}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          center={center}
          onCenterChanged={(ev) => setCenter(ev.detail.center)}
          defaultZoom={13}
          mapId="SALON_EXPLORER_MAP"
          // @ts-ignore
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
        >
          {/* User Location Marker */}
          <AdvancedMarker position={center} zIndex={100}>
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
          </AdvancedMarker>

          {/* Salon Markers */}
          {places.map(place => (
            <AdvancedMarker 
              key={place.id} 
              position={place.location}
              onClick={() => handleMarkerClick(place)}
            >
              <Pin 
                background={selectedPlace?.id === place.id ? '#1c1917' : '#ef4444'} 
                borderColor={selectedPlace?.id === place.id ? '#1c1917' : '#b91c1c'} 
                glyphColor="#fff" 
              />
            </AdvancedMarker>
          ))}

          {/* Info Window */}
          {selectedPlace?.location && (
            <InfoWindow 
              position={selectedPlace.location} 
              onCloseClick={() => setSelectedPlace(null)}
              pixelOffset={[0, -30]}
            >
              <div className="p-1 max-w-[200px]">
                <h3 className="font-bold text-stone-900 text-sm mb-1">{selectedPlace.displayName}</h3>
                <p className="text-xs text-stone-500 mb-2 line-clamp-2">{selectedPlace.formattedAddress}</p>
                {selectedPlace.rating && (
                  <div className="flex items-center text-xs font-medium text-stone-700 mb-2">
                    <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                    {selectedPlace.rating} ({selectedPlace.userRatingCount})
                  </div>
                )}
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(selectedPlace.formattedAddress || selectedPlace.displayName || '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center bg-stone-900 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
                >
                  Get Directions
                </a>
              </div>
            </InfoWindow>
          )}
        </Map>

        {/* Mobile View Toggle */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:hidden z-20">
          <button 
            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            className="bg-stone-900 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center space-x-2 border border-stone-800"
          >
            {viewMode === 'map' ? (
              <>
                <Search className="w-4 h-4" />
                <span>Show List</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                <span>Show Map</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MapExplorer() {
  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-stone-50 font-sans p-4">
        <div className="text-center max-w-lg bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">Google Maps API Key Required</h2>
          <p className="text-stone-600 mb-6">To view nearby salons on the map, you need to configure your Google Maps API key.</p>
          
          <div className="text-left bg-stone-50 p-6 rounded-2xl border border-stone-100 mb-6">
            <p className="font-bold text-stone-900 mb-2">Step 1: Get an API Key</p>
            <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block mb-4">
              Google Cloud Console &rarr;
            </a>
            
            <p className="font-bold text-stone-900 mb-2">Step 2: Add to AI Studio</p>
            <ul className="text-sm text-stone-600 space-y-2 list-disc pl-4">
              <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right)</li>
              <li>Select <strong>Secrets</strong></li>
              <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
              <li>Paste your key and press Enter</li>
            </ul>
          </div>
          <p className="text-sm text-stone-500 italic">The app will rebuild automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <MapContent />
    </APIProvider>
  );
}
