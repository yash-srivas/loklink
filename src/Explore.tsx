/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, 
  ArrowLeft, 
  Search, 
  SlidersHorizontal, 
  Navigation, 
  CloudOff, 
  Maximize2, 
  Minimize2, 
  X, 
  Briefcase, 
  Star, 
  Layers,
  Phone,
  Check,
  Bookmark
} from 'lucide-react';
import { Button, Card, Input, Badge } from './components/ui';
import { User, Job, WORKER_CATEGORIES } from './types';
import { dbService } from './services/dbService';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { toast } from 'sonner';
import { useAuth } from './App';
import { useTranslation } from './lib/i18n';

// Dynamic color-coding for worker categories
const CATEGORY_COLORS: Record<string, string> = {
  'Electrician': '#27AE60',
  'Plumber': '#1ABC9C',
  'Mason': '#E67E22',
  'Carpenter': '#D35400',
  'Painter': '#3498DB',
  'Domestic Help': '#9B59B6',
  'Cook': '#8E44AD',
  'Caretaker': '#2980B9',
  'Driver': '#34495E',
  'Loader': '#7F8C8D',
  'Mover': '#95A5A6',
  'Tailor': '#F1C40F',
  'Dhobi': '#16A085',
  'Cobbler': '#D35400',
  'Labourer': '#7F8C8D',
  'Pest Control': '#E74C3C',
  'Repair': '#16A085'
};

// Emojis for categories as pin fallback icons
const CATEGORY_EMOJIS: Record<string, string> = {
  'Electrician': '🔌',
  'Plumber': '🔧',
  'Mason': '🧱',
  'Carpenter': '🪚',
  'Painter': '🎨',
  'Domestic Help': '🧹',
  'Cook': '🍲',
  'Caretaker': '👴',
  'Driver': '🛺',
  'Loader': '📦',
  'Mover': '🚛',
  'Tailor': '🪡',
  'Dhobi': '🧺',
  'Cobbler': '👞',
  'Labourer': '🔨',
  'Pest Control': '🐜',
  'Repair': '🛠️'
};

export default function Explore() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t } = useTranslation();
  
  const isSavedPage = window.location.pathname === '/saved';

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('loklink_bookmarks') || '[]');
    } catch {
      return [];
    }
  });

  const toggleBookmark = (id: string) => {
    const isBookmarked = bookmarks.includes(id);
    const next = isBookmarked ? bookmarks.filter(x => x !== id) : [...bookmarks, id];
    setBookmarks(next);
    localStorage.setItem('loklink_bookmarks', JSON.stringify(next));
    if (isBookmarked) {
      toast.success('Removed from saved items!');
    } else {
      toast.success('Saved to bookmarked items!');
    }
  };

  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'light');

  // Layer Mode: 'workers' | 'jobs'
  const [mapMode, setMapMode] = useState<'workers' | 'jobs'>(role === 'worker' ? 'jobs' : 'workers');

  useEffect(() => {
    if (role === 'worker') {
      setMapMode('jobs');
    }
  }, [role]);
  
  const [workers, setWorkers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeWorkerProfile, setActiveWorkerProfile] = useState<User | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Quick hire request triggers inside map
  const [selectedWorkerForRequest, setSelectedWorkerForRequest] = useState<User | null>(null);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const markerClusterGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);

  // Load saved position from localStorage if available
  const getSavedMapPos = (): [number, number] | null => {
    try {
      const saved = localStorage.getItem('loklink_map_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2) {
          return [Number(parsed[0]), Number(parsed[1])];
        }
      }
    } catch (e) {}
    return null;
  };

  const lastPositionRef = useRef<[number, number] | null>(getSavedMapPos());

  const defaultCenter: [number, number] = [15.3647, 75.1240]; // Hubballi center
  const initialZoom = 13;

  // Refs for tracking user and role to prevent stale closures in global map actions
  const userRef = useRef(user);
  const roleRef = useRef(role);
  useEffect(() => {
    userRef.current = user;
    roleRef.current = role;
  }, [user, role]);

  useEffect(() => {
    loadMapData();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleTheme = (e: any) => {
      setCurrentTheme(e.detail);
    };
    window.addEventListener('loklink-theme-changed', handleTheme);

    const handleDbUpdate = () => {
      loadMapData();
    };
    window.addEventListener('loklink-db-updated', handleDbUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('loklink-theme-changed', handleTheme);
      window.removeEventListener('loklink-db-updated', handleDbUpdate);
    };
  }, []);

  const loadMapData = async () => {
    try {
      const allWorkers = await dbService.getWorkers(isSavedPage ? undefined : { isAvailable: true });
      setWorkers(allWorkers);

      const allJobs = await dbService.getJobs(isSavedPage ? undefined : { status: 'open' });
      setJobs(allJobs);
    } catch (e) {
      console.warn("Error loading explore records:", e);
    }
  };

  // Synchronize global custom popup functions
  useEffect(() => {
    (window as any).viewWorkerProfile = (id: string) => {
      navigate(`/profile/${id}`);
    };
    (window as any).claimJobDirectly = async (id: string) => {
      const currentUser = userRef.current;
      const currentRole = roleRef.current;
      if (!currentUser) {
        toast.error('Please log in to claim this job!');
        return;
      }
      try {
        const workerProfile = await dbService.getUserProfile(currentUser.uid);
        if (!workerProfile || workerProfile.role !== 'worker') {
          toast.error('Only workers can accept jobs.');
          return;
        }
        await dbService.acceptJobDirectly(id, currentUser.uid, workerProfile.name);
        toast.success('You claimed this job! It is now active on your dashboard.');
        loadMapData();
      } catch (err) {
        toast.error('Claim failed. Try again.');
      }
    };
    return () => {
      delete (window as any).viewWorkerProfile;
      delete (window as any).claimJobDirectly;
    };
  }, [navigate]);

  // Geolocation
  const handleUseMyLocation = (silent = false) => {
    if ('geolocation' in navigator && mapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const L = (window as any).L;

          const userDotIcon = L.divIcon({
            className: 'user-location-icon',
            html: `
              <div class="relative flex items-center justify-center w-6 h-6 select-none pointer-events-none">
                <div class="absolute w-6 h-6 bg-blue-500 rounded-full opacity-35 animate-ping"></div>
                <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          if (userMarkerRef.current) mapRef.current.removeLayer(userMarkerRef.current);
          if (userAccuracyCircleRef.current) mapRef.current.removeLayer(userAccuracyCircleRef.current);

          userMarkerRef.current = L.marker([latitude, longitude], { icon: userDotIcon }).addTo(mapRef.current);

          userAccuracyCircleRef.current = L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(mapRef.current);

          mapRef.current.flyTo([latitude, longitude], 14, { animate: true, duration: 1.5 });
          lastPositionRef.current = [latitude, longitude];
        },
        () => {
          if (!silent) toast.error('Enable location permission.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      if (!silent) toast.error('Geolocation not supported.');
    }
  };

  // Dynamic Pin Icon Generator
  const getMarkerIcon = (category: string, isJob: boolean, isSelected: boolean) => {
    const L = (window as any).L;
    const pinColor = isJob ? '#EA580C' : (CATEGORY_COLORS[category] || '#16A085');
    const emoji = isJob ? '💼' : (CATEGORY_EMOJIS[category] || '🧑');
    const scaleClass = isSelected ? 'scale-125 z-[100]' : 'hover:scale-110';

    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative flex items-center justify-center w-10 h-12 select-none pointer-events-auto transition-transform ${scaleClass}">
          <svg class="absolute w-full h-full text-current shadow-lg" style="color: ${pinColor}" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <span class="relative z-10 text-sm mb-4">${emoji}</span>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
    });
  };

  // Filter lists based on Search Queries
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      if (isSavedPage && !bookmarks.includes(w.id)) return false;
      if (selectedCategory !== 'All' && !w.skills?.includes(selectedCategory)) return false;
      if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [workers, searchQuery, selectedCategory, isSavedPage, bookmarks]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (isSavedPage && !bookmarks.includes(j.id)) return false;
      if (selectedCategory !== 'All' && j.skillRequired !== selectedCategory) return false;
      if (searchQuery && !j.title.toLowerCase().includes(searchQuery.toLowerCase()) && !j.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [jobs, searchQuery, selectedCategory, isSavedPage, bookmarks]);

  // Leaflet map initialization
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapRef.current) return;

    const initialCenter = lastPositionRef.current || defaultCenter;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
    }).setView(initialCenter, initialZoom);

    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark 
      ? 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
    }).addTo(map);
    tileLayerRef.current = tiles;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('moveend', () => {
      const center = map.getCenter();
      lastPositionRef.current = [center.lat, center.lng];
      localStorage.setItem('loklink_map_pos', JSON.stringify([center.lat, center.lng]));
    });

    mapRef.current = map;

    markerClusterGroupRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
    });
    map.addLayer(markerClusterGroupRef.current);

    handleUseMyLocation(true);

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
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

  // Hot-swapping map tile modes reactively on theme switches
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !tileLayerRef.current) return;

    try {
      mapRef.current.removeLayer(tileLayerRef.current);
    } catch (e) {}

    const isDark = document.documentElement.classList.contains('dark') || currentTheme === 'dark';
    const tileUrl = isDark 
      ? 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);
    tileLayerRef.current = tiles;
  }, [currentTheme]);

  // Sync markers whenever layers or active records change
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !markerClusterGroupRef.current) return;

    markerClusterGroupRef.current.clearLayers();
    markersRef.current = {};

    if (mapMode === 'workers') {
      filteredWorkers.forEach(w => {
        const lat = w.location?.lat || defaultCenter[0];
        const lng = w.location?.lng || defaultCenter[1];

        const marker = L.marker([lat, lng], {
          icon: getMarkerIcon(w.skills?.[0] || 'Labourer', false, activeWorkerProfile?.id === w.id)
        });

        const popupContent = `
          <div class="p-2 font-sans w-52 text-stone-900 leading-tight">
            <h3 class="font-extrabold text-sm mb-1 leading-tight text-stone-950">${w.name}</h3>
            <div class="flex items-center gap-1.5 mb-2">
              <span class="text-[9px] font-black uppercase bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-100">${w.skills?.[0] || 'Helper'}</span>
              <span class="text-[9px] font-bold text-stone-400">${w.experience} Yrs Exp</span>
            </div>
            <div class="flex items-center gap-1 text-orange-500 font-extrabold text-xs mb-3">
              ★ <span class="text-orange-600">${w.rating && w.rating > 0 ? w.rating : 'New'}</span> 
              <span class="text-stone-300 font-normal">| ₹${w.dailyWage}/Day</span>
            </div>
            <button onclick="window.viewWorkerProfile('${w.id}')" class="w-full h-8 text-[10px] font-black uppercase bg-stone-900 hover:bg-black text-white rounded-xl cursor-pointer shadow-sm">
              View Worker
            </button>
          </div>
        `;

        marker.bindPopup(popupContent, { closeButton: false, className: 'custom-leaflet-popup' });
        marker.on('click', () => {
          setActiveWorkerProfile(w);
          if (window.innerWidth < 1024) marker.closePopup();
        });

        markerClusterGroupRef.current.addLayer(marker);
        markersRef.current[w.id] = marker;
      });
    } else {
      // Map Mode: Jobs
      filteredJobs.forEach(job => {
        const lat = job.location?.lat || defaultCenter[0];
        const lng = job.location?.lng || defaultCenter[1];

        const marker = L.marker([lat, lng], {
          icon: getMarkerIcon(job.skillRequired, true, false)
        });

        const canAccept = role === 'worker';
        const acceptButton = canAccept 
          ? `<button onclick="window.claimJobDirectly('${job.id}')" class="w-full h-8 text-[10px] font-black uppercase bg-green-600 hover:bg-green-700 text-white rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1">
              Claim Job for ₹${job.wage}
             </button>`
          : `<p class="text-[10px] text-stone-400 font-bold text-center italic">Claiming open for workers only</p>`;

        const popupContent = `
          <div class="p-3 font-sans w-56 text-stone-900 leading-tight">
            <Badge variant="warning" class="text-[8px] px-1.5 py-0.5 rounded-sm font-black mb-1 block w-fit">${job.skillRequired.toUpperCase()}</Badge>
            <h3 class="font-extrabold text-sm mb-1 leading-tight text-stone-950">${job.title}</h3>
            <p class="text-xs text-stone-500 font-medium line-clamp-2 mb-3">${job.description}</p>
            ${acceptButton}
          </div>
        `;

        marker.bindPopup(popupContent, { closeButton: false, className: 'custom-leaflet-popup' });
        markerClusterGroupRef.current.addLayer(marker);
        markersRef.current[job.id] = marker;
      });
    }
  }, [mapMode, filteredWorkers, filteredJobs]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 350);
    }
  }, [isCollapsed]);

  const activeWorker = activeWorkerProfile;

  return (
    <div className="h-screen flex flex-col bg-stone-100 dark:bg-stone-950 overflow-hidden relative font-sans">
      
      {/* Header */}
      <header className="bg-white/72 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-100 dark:border-stone-800 px-4 py-3.5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-xl font-black tracking-tight text-stone-900 dark:text-white font-display">
            {isSavedPage ? 'Saved Items' : 'Explore LOKLINK'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Layer Mode Swapping Toggle */}
          {role !== 'worker' && (
            <div className="bg-stone-100/80 dark:bg-stone-800/80 p-1 rounded-2xl flex items-center gap-1 border border-stone-200/40 dark:border-stone-700/50 backdrop-blur-md">
              <button
                onClick={() => {
                  setMapMode('workers');
                  setActiveWorkerProfile(null);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                  mapMode === 'workers' ? "bg-white dark:bg-stone-700 text-orange-600 dark:text-orange-400 shadow-sm" : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
                )}
              >
                Workers Layer
              </button>
              <button
                onClick={() => {
                  setMapMode('jobs');
                  setActiveWorkerProfile(null);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                  mapMode === 'jobs' ? "bg-white dark:bg-stone-700 text-orange-600 dark:text-orange-400 shadow-sm" : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
                )}
              >
                Open Jobs Map
              </button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 h-9 px-4 cursor-pointer"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-orange-650 hover:bg-orange-50 dark:hover:bg-orange-950/20 h-10 w-10 cursor-pointer"
            onClick={handleUseMyLocation}
          >
            <Navigation size={18} />
          </Button>
        </div>
      </header>

      {/* Exploration Pane */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-black text-center uppercase tracking-widest z-30 flex items-center justify-center gap-2">
            <CloudOff size={14} />
            <span>Map caching active. Coordinates are approximate.</span>
          </div>
        )}

        {/* Map Canvas */}
        <div
          className={cn(
            "w-full bg-stone-200 transition-all duration-300 ease-in-out relative overflow-hidden border-b border-stone-100 dark:border-stone-850",
            isCollapsed ? "h-0" : "flex-1"
          )}
        >
          <div ref={mapContainerRef} className="w-full h-full z-0" />
        </div>

        {/* Trade category scroll filters */}
        <div className="bg-white border-b border-stone-100 p-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0 z-20 dark:bg-stone-900 dark:border-stone-800">
          <Button
            variant={selectedCategory === 'All' ? 'primary' : 'outline'}
            size="sm"
            className="rounded-full whitespace-nowrap px-5"
            onClick={() => setSelectedCategory('All')}
          >
            All Trades
          </Button>
          {WORKER_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'primary' : 'outline'}
              size="sm"
              className="rounded-full whitespace-nowrap px-5"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Floating search input */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20 pointer-events-none">
          <div className="relative group pointer-events-auto shadow-xl shadow-stone-900/5 rounded-full">
            <Input
              placeholder={mapMode === 'workers' ? "Search available workers..." : "Search open job keywords..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-10 rounded-full h-14 bg-white/95 dark:bg-stone-900/95 border-transparent focus:ring-4 focus:ring-orange-500/10 focus-visible:border-orange-500/30"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-400">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom results sheet or desktop side view */}
        <div className="flex-1 bg-stone-50 dark:bg-stone-950 overflow-y-auto p-4 no-scrollbar z-10 flex flex-col">
          <div className="max-w-3xl mx-auto w-full space-y-4">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">
              {isSavedPage 
                ? `${mapMode === 'workers' ? filteredWorkers.length : filteredJobs.length} Bookmarked Tradespeople & Jobs Saved`
                : (mapMode === 'workers' 
                  ? `${filteredWorkers.length} Available Trade Specialists Nearby` 
                  : `${filteredJobs.length} Open Job Posts Map Markers`)
              }
            </span>
            
            {mapMode === 'workers' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredWorkers.map(w => (
                  <Card
                    key={w.id}
                    onClick={() => {
                      setActiveWorkerProfile(w);
                      if (mapRef.current && w.location?.lat && w.location?.lng) {
                        mapRef.current.flyTo([w.location.lat, w.location.lng], 14);
                      }
                    }}
                    className={cn(
                      "p-5 space-y-4 hover:border-orange-200 transition-all cursor-pointer bg-white border-2 dark:bg-stone-900",
                      activeWorkerProfile?.id === w.id ? "border-orange-600 shadow-xl" : "border-transparent"
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-stone-100">
                          <img src={w.avatarUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-black text-stone-950 dark:text-white leading-tight truncate">{w.name}</h4>
                          <span className="text-[10px] text-stone-400 font-bold uppercase">{w.area}</span>
                        </div>
                      </div>
                      <Badge variant="warning" className="text-[9px] font-black">{w.skills?.[0]}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-stone-50 dark:border-stone-850">
                      <span className="text-stone-400">Exp: {w.experience} Yrs</span>
                      <span className="text-orange-600">₹{w.dailyWage} / Day</span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredJobs.map(job => (
                  <Card
                    key={job.id}
                    className="p-6 bg-white space-y-3 dark:bg-stone-900 relative border border-stone-100 dark:border-stone-800"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <Badge variant="warning" className="text-[9px] font-black px-2 py-0.5 uppercase">{job.skillRequired}</Badge>
                      <span className="text-orange-600 font-black text-sm">₹{job.wage}/Day</span>
                    </div>
                    <h3 className="font-display font-black text-stone-900 dark:text-white">{job.title}</h3>
                    <p className="text-xs text-stone-500 font-medium line-clamp-2">{job.description}</p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-stone-50 dark:border-stone-850">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{job.location.area}</span>
                      {role === 'worker' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="rounded-xl text-xs bg-green-600 hover:bg-green-700 text-white font-bold h-9"
                          onClick={() => (window as any).claimJobDirectly(job.id)}
                        >
                          Claim Post
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Worker Sheet Overlay (Mobile Sheet fallback) */}
        <AnimatePresence>
          {activeWorker && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-6 left-4 right-4 z-30 lg:hidden"
            >
              <Card className="p-5 bg-white dark:bg-stone-900 rounded-[32px] shadow-2xl border border-stone-100 dark:border-stone-800 flex gap-4 items-center">
                <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-stone-100 dark:border-stone-700">
                  <img src={activeWorker.avatarUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-stone-900 dark:text-white truncate leading-tight mb-0.5">{activeWorker.name}</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase">{activeWorker.skills?.[0]} • ₹{activeWorker.dailyWage}/Day</p>
                  <div className="flex items-center gap-1.5 text-orange-650 font-black text-xs mt-1">
                    <Star size={12} fill="currentColor" />
                    <span>{activeWorker.rating || 'New'}</span>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => toggleBookmark(activeWorker.id)}
                    className={cn(
                      "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center",
                      bookmarks.includes(activeWorker.id) 
                        ? "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/40 dark:border-orange-800" 
                        : "bg-white border-stone-200 text-stone-400 dark:bg-stone-800 dark:border-stone-700"
                    )}
                  >
                    <Bookmark size={14} fill={bookmarks.includes(activeWorker.id) ? "currentColor" : "none"} />
                  </button>
                  <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => navigate(`/profile/${activeWorker.id}`)}>
                    View
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setActiveWorkerProfile(null)}>
                    <X size={18} />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Worker Side Drawer (Desktop Fallback) */}
        <AnimatePresence>
          {activeWorker && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="hidden lg:block absolute top-6 right-6 bottom-6 w-96 bg-white rounded-[40px] shadow-2xl border border-stone-100 z-30 overflow-y-auto no-scrollbar dark:bg-stone-900 dark:border-stone-800"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <Badge variant="warning" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest">
                    Available Pro
                  </Badge>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBookmark(activeWorker.id)}
                      className={cn(
                        "p-2.5 rounded-full border transition-all cursor-pointer flex items-center justify-center",
                        bookmarks.includes(activeWorker.id) 
                          ? "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/40 dark:border-orange-850" 
                          : "bg-white border-stone-200 text-stone-400 hover:text-stone-600 dark:bg-stone-800 dark:border-stone-700"
                      )}
                    >
                      <Bookmark size={16} fill={bookmarks.includes(activeWorker.id) ? "currentColor" : "none"} />
                    </button>
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 flex items-center justify-center" onClick={() => setActiveWorkerProfile(null)}>
                      <X size={20} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-44 w-full bg-stone-50 rounded-[32px] overflow-hidden border border-stone-100 relative shadow-inner">
                    <img src={activeWorker.avatarUrl} alt="" className="w-full h-full object-contain p-4" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">{activeWorker.name}</h2>
                    <p className="text-sm text-stone-500 font-bold uppercase tracking-widest">{activeWorker.skills?.join(', ')} • {activeWorker.area}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-b border-stone-100 dark:border-stone-800 py-4 text-center">
                    <div>
                      <span className="text-[10px] text-stone-400 font-black uppercase block tracking-wider">Wage expectation</span>
                      <span className="text-orange-600 font-black text-lg">₹{activeWorker.dailyWage} / Day</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-black uppercase block tracking-wider">Experience</span>
                      <span className="text-stone-700 dark:text-stone-300 font-black text-lg">{activeWorker.experience} Years</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <a 
                    href={`tel:${activeWorker.phone}`}
                    className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-700 text-white text-lg font-bold shadow-xl shadow-orange-100/50"
                  >
                    <Phone size={18} />
                    <span>Call Specialist</span>
                  </a>
                  <Button variant="outline" className="w-full h-14 rounded-2xl gap-3 text-lg border-stone-200" onClick={() => navigate(`/profile/${activeWorker.id}`)}>
                    View Full Profile & Reviews
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
