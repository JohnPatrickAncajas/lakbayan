"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Settings2, Compass, Loader2, Plus, UserCircle, Clock, Banknote, Ruler, LogOut, Info, LogIn, Menu, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { RoutePanel, RouteData, RouteStep } from "@/components/route-panel"
import { ContributionModal } from "@/components/contribution-modal"
import "leaflet/dist/leaflet.css"

import type { Map, Layer, Marker, Polyline, CircleMarker, LeafletMouseEvent } from "leaflet"
import type * as Leaflet from "leaflet"

interface Terminal {
  id: string
  name: string
  lat: number
  lng: number
}

interface RouteFare {
  regular: number
  discounted: number
}

interface APIRoute {
  id: number
  description: string
  destination_name?: string
  stops: {
    id: number
    stop_name: string
    latitude: string | number
    longitude: string | number
    fare: string | number
    time: number
    distance?: string | number
  }[]
  mode: {
    mode_name: string
  }
  geometry?: [number, number][]
  polyline?: {
    type: string
    coordinates: number[][]
  }
}

interface APITerminal {
  id: number
  name: string
  latitude: string | number
  longitude: string | number
  city: { name: string }
  routes: APIRoute[]
}

interface ExpandedRoute {
  originalId: string
  name: string
  type: string
  fare: RouteFare
  time: string
  distance: string
  start: Terminal
  end: Terminal
  steps: RouteStep[]
  geometry?: [number, number][]
}

interface BestPath {
    type: string;
    segments: ExpandedRoute[];
    walks: number[];
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

function parseDistanceInput(input: string): number {
    const clean = input.toLowerCase().replace(/\s/g, '');
    if (clean.includes('m') && !clean.includes('km')) {
        return parseFloat(clean) / 1000;
    }
    return parseFloat(clean) || 0;
}

function processGeoJsonCoordinates(coords: unknown): [number, number][] {
  if (!Array.isArray(coords)) return [];

  return (coords as unknown[])
    .map((coord) => {
      if (Array.isArray(coord) && coord.length >= 2) {
        const lng = Number(coord[0]); 
        const lat = Number(coord[1]);

        if (!isNaN(lat) && !isNaN(lng)) {
          return [lat, lng] as [number, number];
        }
      }
      return null;
    })
    .filter((c): c is [number, number] => c !== null);
}

function getModeColor(mode: string) {
    const m = mode.toLowerCase();
    if (m.includes("bus")) return "#ef4444"; 
    if (m.includes("train") || m.includes("lrt") || m.includes("mrt") || m.includes("rail")) return "#f59e0b"; 
    if (m.includes("jeep")) return "#22c55e"; 
    if (m.includes("tricycle") || m.includes("trike")) return "#8b5cf6"; 
    if (m.includes("motorcycle") || m.includes("habal")) return "#ec4899"; 
    return "#3b82f6";
}

function getModeIconHtml(mode: string) {
    const m = mode.toLowerCase();
    let path = "";
    const bg = getModeColor(mode);

    if (m.includes("bus")) {
        path = `<path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" /><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" /><circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="17" cy="18" r="2" />`;
    } else if (m.includes("train") || m.includes("lrt") || m.includes("mrt")) {
        path = `<rect x="4" y="3" width="16" height="16" rx="2" /><path d="M4 11h16" /><path d="M12 3v8" /><path d="m8 19-2 3" /><path d="m18 22-2-3" />`;
    } else if (m.includes("jeep")) {
        path = `<path d="M4 16h16" /><path d="M4 16v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" /><path d="M2 16h20" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />`;
    } else if (m.includes("tricycle") || m.includes("trike")) {
        path = `<circle cx="16" cy="17" r="3" /><circle cx="7" cy="17" r="3" /><path d="M16 17V9l-6 6" /><path d="M11 9h-2a2 2 0 0 0-2 2v2" /><path d="M7 17h9" />`;
    } else {
        path = `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />`;
    }

    return `
        <div style="width:32px;height:32px;background-color:${bg};border:2px solid white;border-radius:50%;box-shadow:0 3px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${path}
            </svg>
        </div>
    `;
}

export function MapInterface() {
  const API_BASE_URL = "https://api-lakbayan.onrender.com/api"

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const [map, setMap] = useState<Map | null>(null)
  const [L, setLeaflet] = useState<typeof Leaflet | null>(null)
  
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null)
  
  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [pinnedStart, setPinnedStart] = useState<Terminal | null>(null)
  const [pinnedEnd, setPinnedEnd] = useState<Terminal | null>(null)
  const [contributionLocation, setContributionLocation] = useState<Terminal | null>(null)
  
  const [isSearching, setIsSearching] = useState(false)
  const [pinningMode, setPinningMode] = useState<'from' | 'to' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState("User")
  
  const [maxWalkInput, setMaxWalkInput] = useState("2 km")
  const [transfersInput, setTransfersInput] = useState("2")
  const [sortBy, setSortBy] = useState<'time' | 'fare' | 'distance'>('time')
  const [selectedModes, setSelectedModes] = useState<string[]>(['bus', 'train', 'jeep', 'tricycle'])

  const [terminalsData, setTerminalsData] = useState<APITerminal[]>([])
  const [ready, setReady] = useState(false)
  
  const userMarkersRef = useRef<Marker[]>([])
  const routeLayersRef = useRef<(Layer | Marker | CircleMarker)[]>([])
  const terminalPreviewRef = useRef<(Polyline | CircleMarker)[]>([])
  const terminalMarkersRef = useRef<Marker[]>([])

  const availableModes = [
      { id: 'bus', label: 'Bus', color: 'bg-red-500' },
      { id: 'jeep', label: 'Jeep', color: 'bg-green-500' },
      { id: 'train', label: 'Train', color: 'bg-amber-500' },
      { id: 'tricycle', label: 'Tricycle', color: 'bg-purple-500' },
  ]

  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    setIsLoggedIn(!!token)
    
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.username) setUsername(user.username)
      } catch (e) {
        console.error("Failed to parse user data", e)
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    setIsLoggedIn(false)
    setIsProfileOpen(false)
    window.location.reload()
  }

  const toggleMode = (mode: string) => {
      setSelectedModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])
  }

  useEffect(() => {
      if (!map || !L || terminalsData.length === 0) return;
      
      const renderMarkers = () => {
          terminalMarkersRef.current.forEach(marker => {
              map.removeLayer(marker);
          });
          terminalMarkersRef.current = [];

          terminalsData.forEach(t => {
              const activeRoutes = t.routes ? t.routes.filter(r => 
                  selectedModes.some(m => r.mode.mode_name.toLowerCase().includes(m))
              ) : [];
              
              if (activeRoutes.length > 0) {
                  addTerminalMarker(L, map, t, activeRoutes);
              }
          });
      };

      const timer = setTimeout(renderMarkers, 100);
      return () => clearTimeout(timer);

  }, [selectedModes, map, L, terminalsData])

  const addTerminalMarker = (LeafletLib: typeof Leaflet, mapInstance: Map, t: APITerminal, activeRoutes: APIRoute[]) => {
      let primaryMode = '';
      
      if (activeRoutes.length > 0) {
        const modeCounts: { [key: string]: number } = {};
        activeRoutes.forEach(r => {
          const mode = r.mode.mode_name.toLowerCase();
          modeCounts[mode] = (modeCounts[mode] || 0) + 1;
        });
        primaryMode = Object.keys(modeCounts).reduce((a, b) => modeCounts[a] > modeCounts[b] ? a : b, '');
      }

      const iconHtml = getModeIconHtml(primaryMode);

      const icon = LeafletLib.divIcon({
          className: "", 
          html: `<div style="position:relative;">${iconHtml}<div style="position:absolute;top:-4px;right:-4px;background-color:#2563eb;color:white;font-size:10px;font-weight:bold;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid white;">${activeRoutes.length}</div></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
      })
      
      const lat = parseFloat(t.latitude.toString())
      const lng = parseFloat(t.longitude.toString())
      
      if(isNaN(lat) || isNaN(lng)) return;

      const marker = LeafletLib.marker([lat, lng], { icon, zIndexOffset: 100 }).addTo(mapInstance)
      terminalMarkersRef.current.push(marker);

      const routesListHtml = activeRoutes.map(r => {
          if (!r.stops || r.stops.length === 0) return '';
          const endStop = r.stops[r.stops.length - 1];
          return `
              <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                  <div style="margin-top:4px;width:8px;height:8px;border-radius:50%;background-color:${getModeColor(r.mode.mode_name)};flex-shrink:0;"></div>
                  <div>
                      <p style="font-size:12px;font-weight:600;color:#1e293b;margin:0;">${endStop.stop_name}</p>
                      <p style="font-size:10px;color:#64748b;margin:0;text-transform:uppercase;">${r.mode.mode_name} • ₱${endStop.fare}</p>
                  </div>
              </div>
          `
      }).join('');

      const popupContent = `
          <div style="min-width:200px;font-family:sans-serif;">
              <div style="padding-bottom:8px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;">
                  <h3 style="font-weight:bold;font-size:14px;color:#0f172a;margin:0;">${t.name}</h3>
                  <p style="font-size:12px;color:#64748b;margin:0;">${t.city.name}</p>
              </div>
              <div style="max-height:150px;overflow-y:auto;">
                  ${activeRoutes.length > 0 ? routesListHtml : '<p style="font-size:12px;color:#94a3b8;font-style:italic;">No active routes.</p>'}
              </div>
          </div>
      `

      marker.bindPopup(popupContent, { closeButton: false, maxWidth: 260 })
      
      marker.on('click', (e: LeafletMouseEvent) => {
          LeafletLib.DomEvent.stopPropagation(e);
          
          if (routeLayersRef.current.length > 0) {
              routeLayersRef.current.forEach(layer => mapInstance.removeLayer(layer));
              routeLayersRef.current = [];
              setSelectedRoute(null);
          }

          if (terminalPreviewRef.current.length > 0) {
              terminalPreviewRef.current.forEach(layer => mapInstance.removeLayer(layer))
              terminalPreviewRef.current = []
          }
          
          for (const r of activeRoutes) {
               if (!r.stops || r.stops.length === 0) continue;
               
               const endStop = r.stops[r.stops.length - 1]
               const endCoords: [number, number] = [parseFloat(endStop.latitude.toString()), parseFloat(endStop.longitude.toString())]
               
               let pathCoords: [number, number][] = []

               if (r.polyline && r.polyline.coordinates && r.polyline.coordinates.length > 0) {
                   pathCoords = processGeoJsonCoordinates(r.polyline.coordinates);
               } else if (r.geometry && r.geometry.length > 0) {
                   pathCoords = r.geometry
               }

               const lineColor = getModeColor(r.mode.mode_name);
               
               if (pathCoords.length > 0) {
                   const line = LeafletLib.polyline(pathCoords, { color: lineColor, weight: 4, opacity: 0.8 }).addTo(mapInstance)
                   terminalPreviewRef.current.push(line)
               } else {
                   const simpleLine = LeafletLib.polyline([[lat, lng], endCoords], { color: lineColor, weight: 4, dashArray: '10, 10', opacity: 0.6 }).addTo(mapInstance)
                   terminalPreviewRef.current.push(simpleLine)
               }
               
               r.stops.forEach(stop => {
                   const stopCoords: [number, number] = [parseFloat(stop.latitude.toString()), parseFloat(stop.longitude.toString())];
                   const stopMarker = LeafletLib.circleMarker(stopCoords, { 
                       radius: 4, fillColor: "#fff", color: lineColor, weight: 2, fillOpacity: 1 
                   }).addTo(mapInstance)
                   stopMarker.bindTooltip(stop.stop_name, { permanent: false, direction: 'top', className: 'text-xs font-bold' });
                   terminalPreviewRef.current.push(stopMarker)
               })

               const destMarker = LeafletLib.circleMarker(endCoords, { radius: 6, fillColor: lineColor, color: "#fff", weight: 3, fillOpacity: 1 }).addTo(mapInstance)
               terminalPreviewRef.current.push(destMarker)
          }
      })
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    let isMounted = true;
    if (mapInstanceRef.current) return;

    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        const headers: HeadersInit = { "Content-Type": "application/json" }
        if (token) headers["Authorization"] = `Bearer ${token}`

        const response = await fetch(`${API_BASE_URL}/cached/terminals/`, { headers })
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("accessToken")
            localStorage.removeItem("user")
            setIsLoggedIn(false)
            return
        }

        if (!response.ok) throw new Error("Failed to fetch terminal data")
        const data = await response.json()
        
        if (isMounted) {
            const terminals = data.terminals as APITerminal[]
            setTerminalsData(terminals)
            setReady(true)
        }

      } catch (e) {
        console.error("API Data Fetch Error:", e)
      }
    }

    import("leaflet").then((LeafletModule) => {
      if (!isMounted) return;
      if (mapInstanceRef.current) return;
      if (!mapContainerRef.current) return;

      const LeafletLib = LeafletModule.default
      setLeaflet(() => LeafletLib)

      const newMap = LeafletLib.map(mapContainerRef.current, { zoomControl: false }).setView([14.5995, 121.0], 12)
      mapInstanceRef.current = newMap
      setMap(() => newMap)

      LeafletLib.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(newMap)

      LeafletLib.control.zoom({ position: "bottomright" }).addTo(newMap)

      newMap.on('click', () => {
        const container = mapContainerRef.current
        if (container && !container.classList.contains('cursor-crosshair')) {
             if (terminalPreviewRef.current.length > 0) {
                 terminalPreviewRef.current.forEach(layer => newMap.removeLayer(layer))
                 terminalPreviewRef.current = []
             }
        }
      })
      
      fetchInitialData()
    })

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        setMap(null)
      }
    }
  }, [])

  useEffect(() => {
    if (!map || !L) return;
    userMarkersRef.current.forEach(m => map.removeLayer(m));
    userMarkersRef.current = [];

    const startHtml = `<div style="width:16px;height:16px;background-color:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`
    const endHtml = `<div style="width:16px;height:16px;background-color:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`
    const contribHtml = `<div style="width:16px;height:16px;background-color:#f59e0b;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`

    if (pinnedStart) {
        const m = L.marker([pinnedStart.lat, pinnedStart.lng], {icon: L.divIcon({ className: 'custom-pin-start', html: startHtml, iconSize: [16, 16] })}).addTo(map);
        userMarkersRef.current.push(m);
    }
    if (pinnedEnd) {
        const m = L.marker([pinnedEnd.lat, pinnedEnd.lng], {icon: L.divIcon({ className: 'custom-pin-end', html: endHtml, iconSize: [16, 16] })}).addTo(map);
        userMarkersRef.current.push(m);
    }
    if (contributionLocation) {
        const m = L.marker([contributionLocation.lat, contributionLocation.lng], {icon: L.divIcon({ className: 'custom-pin-contrib', html: contribHtml, iconSize: [16, 16] })}).addTo(map);
        userMarkersRef.current.push(m);
        if (!isSearching) map.panTo([contributionLocation.lat, contributionLocation.lng]);
    }
    if ((pinnedStart || pinnedEnd) && !contributionLocation && !isSearching) {
        if (pinnedStart && !pinnedEnd) map.panTo([pinnedStart.lat, pinnedStart.lng]);
        if (!pinnedStart && pinnedEnd) map.panTo([pinnedEnd.lat, pinnedEnd.lng]);
        if (pinnedStart && pinnedEnd && !selectedRoute) {
            const bounds = L.latLngBounds([[pinnedStart.lat, pinnedStart.lng], [pinnedEnd.lat, pinnedEnd.lng]]);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
  }, [pinnedStart, pinnedEnd, contributionLocation, map, L, isSearching, selectedRoute]);

  useEffect(() => {
    if (!map || !L) return
    const clickHandler = async (e: LeafletMouseEvent) => {
        if (!pinningMode) return
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`)
            const data = await response.json()
            const name = data.display_name || `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
            const coords: Terminal = { id: "pinned", lat: e.latlng.lat, lng: e.latlng.lng, name }
            if (pinningMode === 'from') { setFromLocation(name); setPinnedStart(coords); } 
            else { setToLocation(name); setPinnedEnd(coords); }
        } catch {
            const fallbackName = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
            const coords = { id: "pinned", lat: e.latlng.lat, lng: e.latlng.lng, name: fallbackName };
            if (pinningMode === 'from') { setFromLocation(fallbackName); setPinnedStart(coords); }
            else { setToLocation(fallbackName); setPinnedEnd(coords); }
        } finally {
            setPinningMode(null)
        }
    }
    map.on('click', clickHandler)
    if (mapContainerRef.current) {
        if (pinningMode) mapContainerRef.current.classList.add('cursor-crosshair')
        else mapContainerRef.current.classList.remove('cursor-crosshair')
    }
    return () => { map.off('click', clickHandler) }
  }, [map, L, pinningMode])

  const fetchRouteGeometry = async (start: {lat: number, lng: number}, end: {lat: number, lng: number}, profile: 'driving' | 'walking') => {
      try {
          const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
          if (!response.ok) return null;
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
              return data.routes[0].geometry.coordinates.map((xy: [number, number]) => [xy[1], xy[0]] as [number, number]);
          }
          return null;
      } catch (e) {
          console.error("OSRM Fetch Error", e);
          return null;
      }
  }

  const geocodeLocation = async (locationName: string) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&countrycodes=ph&format=json&limit=1`)
      const data = await response.json()
      if (data && data.length > 0) {
        return {
          id: "geocoded",
          lat: Number.parseFloat(data[0].lat),
          lng: Number.parseFloat(data[0].lon),
          name: data[0].display_name,
        }
      }
      return null
    } catch {
      return null
    }
  }

  const handleSearch = async () => {
    if (!fromLocation || !toLocation || !map || !L || !ready) return
    setIsSearching(true)
    
    if (routeLayersRef.current.length > 0) {
      routeLayersRef.current.forEach(layer => map.removeLayer(layer))
      routeLayersRef.current = []
    }
    if (terminalPreviewRef.current.length > 0) {
        terminalPreviewRef.current.forEach(layer => map.removeLayer(layer))
        terminalPreviewRef.current = []
    }
    setContributionLocation(null);
    setSelectedRoute(null)

    try {
      let fromCoords = pinnedStart
      if (!fromCoords || fromLocation !== fromCoords.name) fromCoords = await geocodeLocation(fromLocation)
      let toCoords = pinnedEnd
      if (!toCoords || toLocation !== toCoords.name) toCoords = await geocodeLocation(toLocation)

      if (!fromCoords || !toCoords) {
        alert("Locations not found.")
        setIsSearching(false)
        return
      }

      const maxWalkKm = parseDistanceInput(maxWalkInput);
      const limitTransfers = parseInt(transfersInput) || 2;
      const allSegments: ExpandedRoute[] = []
      
      terminalsData.forEach(terminal => {
          terminal.routes.forEach(route => {
              if (!route.stops || route.stops.length === 0) return;
              if (!selectedModes.some(m => route.mode.mode_name.toLowerCase().includes(m))) return;

              const startT: Terminal = { id: terminal.id.toString(), name: terminal.name, lat: parseFloat(terminal.latitude.toString()), lng: parseFloat(terminal.longitude.toString()) }
              const endStop = route.stops[route.stops.length - 1]
              const endT: Terminal = { id: endStop.id.toString(), name: endStop.stop_name, lat: parseFloat(endStop.latitude.toString()), lng: parseFloat(endStop.longitude.toString()) }
              
              let geometry: [number, number][] | undefined = undefined;
              if (route.polyline && route.polyline.coordinates && route.polyline.coordinates.length > 0) {
                  geometry = processGeoJsonCoordinates(route.polyline.coordinates);
              } else if (route.geometry && route.geometry.length > 0) {
                  geometry = route.geometry;
              }

              const endStopFare = parseFloat(endStop.fare.toString()) || 0;
              const endStopDist = parseFloat(`${endStop.distance || 0}`);

              const baseRoute: ExpandedRoute = {
                  originalId: `${terminal.id}-${route.id}`,
                  name: `${route.mode.mode_name} - ${terminal.name} to ${endStop.stop_name}`,
                  type: route.mode.mode_name,
                  fare: { regular: endStopFare, discounted: endStopFare * 0.8 },
                  distance: endStopDist.toFixed(1) + " km",
                  time: endStop.time + " min",
                  start: startT,
                  end: endT,
                  steps: route.stops.map(s => ({ instruction: s.stop_name, location: [parseFloat(s.latitude.toString()), parseFloat(s.longitude.toString())] })),
                  geometry: geometry
              }

              allSegments.push(baseRoute)
              
              const returnGeometry = geometry ? [...geometry].reverse() as [number, number][] : undefined;

              allSegments.push({
                  ...baseRoute,
                  name: `${baseRoute.name} (Return)`,
                  start: endT,
                  end: startT,
                  steps: [{ instruction: `Board ${baseRoute.type} at ${endT.name}` }, { instruction: `Travel to ${startT.name}` }],
                  geometry: returnGeometry 
              })
          })
      })

      let bestPath: BestPath | null = null
      let bestScore = Infinity 

      for (const segment of allSegments) {
        const d1 = getDistance(fromCoords.lat, fromCoords.lng, segment.start.lat, segment.start.lng)
        const d2 = getDistance(segment.end.lat, segment.end.lng, toCoords.lat, toCoords.lng)
        const totalWalk = d1 + d2;
        
        if (totalWalk <= maxWalkKm) {
            const timeVal = parseInt(segment.time);
            const distVal = parseFloat(segment.distance);
            const fareVal = segment.fare.regular;
            
            let score = 0;
            if (sortBy === 'time') score = timeVal + (totalWalk * 12); 
            else if (sortBy === 'fare') score = fareVal + (totalWalk * 10); 
            else score = distVal + totalWalk;

            if (score < bestScore) {
                bestScore = score
                bestPath = { type: "direct", segments: [segment], walks: [d1, d2] }
            }
        }
      }

      if (limitTransfers >= 1) {
        for (const r1 of allSegments) {
            const dStart = getDistance(fromCoords.lat, fromCoords.lng, r1.start.lat, r1.start.lng)
            for (const r2 of allSegments) {
                if (r1.originalId === r2.originalId) continue
                const dTransfer = getDistance(r1.end.lat, r1.end.lng, r2.start.lat, r2.start.lng)
                const dEnd = getDistance(r2.end.lat, r2.end.lng, toCoords.lat, toCoords.lng)
                const totalWalk = dStart + dTransfer + dEnd;

                if (totalWalk <= maxWalkKm) {
                    const timeVal = parseInt(r1.time) + parseInt(r2.time);
                    const fareVal = r1.fare.regular + r2.fare.regular;
                    const distVal = parseFloat(r1.distance) + parseFloat(r2.distance);

                    let score = 0;
                    if (sortBy === 'time') score = timeVal + (totalWalk * 12);
                    else if (sortBy === 'fare') score = fareVal + (totalWalk * 10);
                    else score = distVal + totalWalk;

                    if (score < bestScore) {
                        bestScore = score
                        bestPath = { type: "transfer", segments: [r1, r2], walks: [dStart, dTransfer, dEnd] }
                    }
                }
                
                if (limitTransfers >= 2) {
                      for (const r3 of allSegments) {
                          if (r2.originalId === r3.originalId || r1.originalId === r3.originalId) continue
                          const dTransfer2 = getDistance(r2.end.lat, r2.end.lng, r3.start.lat, r3.start.lng)
                          const dEnd2 = getDistance(r3.end.lat, r3.end.lng, toCoords.lat, toCoords.lng)
                          const totalWalk3 = dStart + dTransfer + dTransfer2 + dEnd2;

                          if (totalWalk3 <= maxWalkKm) {
                              const timeVal3 = parseInt(r1.time) + parseInt(r2.time) + parseInt(r3.time);
                              const fareVal3 = r1.fare.regular + r2.fare.regular + r3.fare.regular;
                              const distVal3 = parseFloat(r1.distance) + parseFloat(r2.distance) + parseFloat(r3.distance);

                              let score3 = 0;
                              if (sortBy === 'time') score3 = timeVal3 + (totalWalk3 * 12);
                              else if (sortBy === 'fare') score3 = fareVal3 + (totalWalk3 * 10);
                              else score3 = distVal3 + totalWalk3;

                              if (score3 < bestScore) {
                                 bestScore = score3
                                 bestPath = { type: "multi-transfer", segments: [r1, r2, r3], walks: [dStart, dTransfer, dTransfer2, dEnd2] }
                              }
                          }
                      }
                }
            }
        }
      }

      if (bestPath) {
        userMarkersRef.current.forEach(m => map.removeLayer(m));
        const boundsArray: Array<[number, number]> = [];
        const steps: RouteStep[] = []
        let totalFare = 0
        let totalDist = 0

        const drawSegment = async (segment: ExpandedRoute | null, start: {lat: number, lng: number}, end: {lat: number, lng: number}, type: 'walk' | 'ride', color: string, dash: string | null) => {
              let geometry: [number, number][] | null = null;
              
              if (type === 'ride' && segment?.geometry && segment.geometry.length > 0) {
                  geometry = segment.geometry;
              } else {
                  const profile = type === 'walk' ? 'walking' : 'driving';
                  geometry = await fetchRouteGeometry(start, end, profile);
              }
              
              let layer;
              if (geometry) {
                  layer = L.polyline(geometry, { color, weight: type === 'ride' ? 5 : 4, dashArray: dash || undefined, opacity: 0.8 }).addTo(map);
              } else {
                  layer = L.polyline([[start.lat, start.lng], [end.lat, end.lng]], { color, weight: type === 'ride' ? 5 : 4, dashArray: dash || undefined, opacity: 0.8 }).addTo(map);
              }
              routeLayersRef.current.push(layer);
              
              if (geometry) {
                  boundsArray.push(...geometry);
              } else {
                  boundsArray.push([start.lat, start.lng], [end.lat, end.lng]);
              }
        }

        await drawSegment(null, fromCoords, bestPath.segments[0].start, 'walk', '#64748b', '10, 10');
        steps.push({ instruction: `Walk ${bestPath.walks[0].toFixed(1)}km to ${bestPath.segments[0].start.name}`, location: [fromCoords.lat, fromCoords.lng] })
        totalDist += bestPath.walks[0]

        for (let i = 0; i < bestPath.segments.length; i++) {
            const seg = bestPath.segments[i]
            totalFare += seg.fare.regular
            totalDist += parseFloat(seg.distance)
            steps.push({ instruction: `Ride ${seg.type} (${seg.name})` })
            
            const modeColor = getModeColor(seg.type);
            const modeIconHtml = getModeIconHtml(seg.type);
            const modeIcon = L.divIcon({ className: '', html: modeIconHtml, iconSize: [32, 32], iconAnchor: [16, 16] });
            const modeMarker = L.marker([seg.start.lat, seg.start.lng], { icon: modeIcon }).addTo(map);
            routeLayersRef.current.push(modeMarker);

            await drawSegment(seg, seg.start, seg.end, 'ride', modeColor, null);
            
            if (seg.steps && seg.steps.length > 0) {
                  seg.steps.forEach(step => {
                      if (step.location) {
                          const stopMarker = L.circleMarker(step.location, {
                              radius: 4, fillColor: "white", color: modeColor, weight: 2, fillOpacity: 1
                          }).addTo(map)
                          stopMarker.bindTooltip(step.instruction, { direction: "top", offset: [0, -5], className: "font-sans text-xs font-bold" })
                          routeLayersRef.current.push(stopMarker)
                      }
                  })
            }

            if (i < bestPath.segments.length - 1) {
                const transferWalk = bestPath.walks[i+1]
                const nextSeg = bestPath.segments[i+1]
                totalDist += transferWalk
                steps.push({ instruction: `Alight at ${seg.end.name}, Walk ${transferWalk.toFixed(1)}km to ${nextSeg.start.name}`, location: [seg.end.lat, seg.end.lng] })
                await drawSegment(null, seg.end, nextSeg.start, 'walk', '#64748b', '10, 10');
            }
        }

        const lastSeg = bestPath.segments[bestPath.segments.length - 1];
        const lastWalk = bestPath.walks[bestPath.walks.length - 1];
        await drawSegment(null, lastSeg.end, toCoords, 'walk', '#64748b', '10, 10');
        
        totalDist += lastWalk
        steps.push({ instruction: `Alight at ${lastSeg.end.name}, Walk ${lastWalk.toFixed(1)}km to Destination`, location: [lastSeg.end.lat, lastSeg.end.lng] })

        const startMarker = L.marker([fromCoords.lat, fromCoords.lng], {
            icon: L.divIcon({ className: '', html: `<div style="width:16px;height:16px;background-color:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`, iconSize: [16,16] })
        }).addTo(map).bindPopup("Start");
        
        const endMarker = L.marker([toCoords.lat, toCoords.lng], {
            icon: L.divIcon({ className: '', html: `<div style="width:16px;height:16px;background-color:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`, iconSize: [16,16] })
        }).addTo(map).bindPopup("Destination");
        
        routeLayersRef.current.push(startMarker, endMarker);

        if (boundsArray.length > 0) {
            map.fitBounds(boundsArray, { padding: [50, 50] });
        }

        setSelectedRoute({
            id: `multi-${bestPath.type}`,
            name: `Trip to ${toLocation.split(',')[0]}`,
            type: `${bestPath.segments.length} Ride(s)`,
            fare: { regular: totalFare, discounted: totalFare * 0.8 },
            distance: `${totalDist.toFixed(1)} km`,
            time: `${Math.round(bestScore - (totalDist * 10))} min`, 
            steps: steps
        } as RouteData)

      } else {
        alert("No suitable transit route found.")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleRecenter = () => { if (map) map.setView([14.5995, 121.0], 12) }

  const handleSelectOnMap = () => {
    setShowContribute(false)
    setPinningMode(null)
    setTimeout(() => {
        const tempHandler = (e: LeafletMouseEvent) => {
             const coords = { id: "pinned", lat: e.latlng.lat, lng: e.latlng.lng, name: "Selected Location" }
             setContributionLocation(coords)
             setShowContribute(true)
             map?.off('click', tempHandler)
             if (mapContainerRef.current) mapContainerRef.current.classList.remove('cursor-crosshair')
        }
        if (map) {
            map.on('click', tempHandler)
            if (mapContainerRef.current) mapContainerRef.current.classList.add('cursor-crosshair')
        }
    }, 100)
  }

  return (
    <div className="relative h-screen pt-0 z-0 bg-slate-50 overflow-hidden">
      
      <div className="absolute top-4 right-4 z-[40]">
        <div className="relative">
            <Button 
                className="w-10 h-10 rounded-full bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xl"
                size="icon"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
                {isLoggedIn ? <UserCircle className="w-6 h-6" /> : <Menu className="w-6 h-6"/>}
            </Button>

            {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {isLoggedIn ? (
                        <>
                            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                                <p className="text-xs font-semibold text-slate-500">Account</p>
                                <p className="text-sm font-medium text-slate-900 truncate">{username}</p>
                            </div>
                            <Link href="/auth" className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                <UserCircle className="w-4 h-4 mr-2" /> Profile
                            </Link>
                            <Link href="/about" className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                <Info className="w-4 h-4 mr-2" /> About
                            </Link>
                            <button onClick={handleLogout} className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100 transition-colors">
                                <LogOut className="w-4 h-4 mr-2" /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/auth" className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                                <LogIn className="w-4 h-4 mr-2" /> Login
                            </Link>
                            <Link href="/about" className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                <Info className="w-4 h-4 mr-2" /> About
                            </Link>
                        </>
                    )}
                </div>
            )}
        </div>
      </div>

      <div className="absolute top-4 left-4 right-16 md:top-8 md:left-8 md:right-auto md:w-[400px] z-[30]">
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-3 md:p-4 border border-slate-200 relative">
          
          {pinningMode && (
             <div className="mb-3 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-center animate-pulse">
                <MapPin className="w-3 h-3 mr-2"/> Tap map to select location
             </div>
          )}
          
          {!ready && (
              <div className="mb-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin"/> Loading data...
              </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="space-y-2">
               <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-100"></div>
                    <Input placeholder="Start Location" value={fromLocation} onChange={(e) => { setFromLocation(e.target.value); setPinnedStart(null); }} className="pl-8 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm" onKeyDown={(e) => e.key === "Enter" && handleSearch()} disabled={!ready}/>
                  </div>
                  <Button variant={pinningMode === 'from' ? "destructive" : "secondary"} size="icon" className="shrink-0 w-10 h-10" onClick={() => setPinningMode(pinningMode === 'from' ? null : 'from')} disabled={!ready}>
                    <MapPin className="w-4 h-4" />
                  </Button>
               </div>

               <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-100"></div>
                    <Input placeholder="Destination" value={toLocation} onChange={(e) => { setToLocation(e.target.value); setPinnedEnd(null); }} className="pl-8 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm" onKeyDown={(e) => e.key === "Enter" && handleSearch()} disabled={!ready}/>
                  </div>
                  <Button variant={pinningMode === 'to' ? "destructive" : "secondary"} size="icon" className="shrink-0 w-10 h-10" onClick={() => setPinningMode(pinningMode === 'to' ? null : 'to')} disabled={!ready}>
                      <MapPin className="w-4 h-4" />
                  </Button>
               </div>
            </div>
            
            <div className="flex gap-2">
                <Button variant={showSettings ? "default" : "outline"} size="icon" className="w-10 h-10 shrink-0" onClick={() => setShowSettings(!showSettings)} disabled={!ready}>
                    <Settings2 className="w-4 h-4"/>
                </Button>

                <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-10" onClick={handleSearch} disabled={isSearching || !ready}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin"/> : "Find Route"}
                </Button>
            </div>
          </div>

          {showSettings && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200 max-h-[60vh] overflow-y-auto">
                <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-2 block">Prioritize</Label>
                    <div className="flex gap-1">
                        <Button variant={sortBy === 'time' ? "default" : "ghost"} size="sm" className="flex-1 h-8 text-xs" onClick={() => setSortBy('time')}>
                            <Clock className="w-3 h-3 mr-1" /> Fastest
                        </Button>
                        <Button variant={sortBy === 'fare' ? "default" : "ghost"} size="sm" className="flex-1 h-8 text-xs" onClick={() => setSortBy('fare')}>
                            <Banknote className="w-3 h-3 mr-1" /> Cheapest
                        </Button>
                        <Button variant={sortBy === 'distance' ? "default" : "ghost"} size="sm" className="flex-1 h-8 text-xs" onClick={() => setSortBy('distance')}>
                            <Ruler className="w-3 h-3 mr-1" /> Shortest
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                         <Label className="text-xs font-semibold text-slate-600 mb-1 block">Max Walk</Label>
                         <Input value={maxWalkInput} onChange={(e) => setMaxWalkInput(e.target.value)} className="h-8 text-xs"/>
                    </div>
                    <div>
                         <Label className="text-xs font-semibold text-slate-600 mb-1 block">Max Transfers</Label>
                         <Input type="number" min="0" max="10" value={transfersInput} onChange={(e) => setTransfersInput(e.target.value)} className="h-8 text-xs"/>
                    </div>
                </div>

                <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-2 flex items-center"><Filter className="w-3 h-3 mr-1"/> Transport Modes</Label>
                    <div className="flex flex-wrap gap-2">
                        {availableModes.map(mode => (
                            <Badge 
                                key={mode.id}
                                variant="outline"
                                className={`cursor-pointer transition-colors ${selectedModes.includes(mode.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                onClick={() => toggleMode(mode.id)}
                            >
                                {mode.label}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full h-full relative z-[1]" />

      <div className="absolute bottom-24 right-4 md:bottom-8 md:right-8 z-[20] flex flex-col gap-3">
        <Button size="icon" className="w-12 h-12 rounded-full shadow-xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-100" onClick={handleRecenter}>
            <Compass className="w-6 h-6" />
        </Button>
        <Button size="icon" className="w-12 h-12 rounded-full shadow-xl bg-blue-600 text-white hover:bg-blue-700 border border-blue-500" onClick={() => setShowContribute(true)}>
            <Plus className="w-6 h-6" />
        </Button>
      </div>

      <ContributionModal 
        isOpen={showContribute} 
        onClose={() => {
            setShowContribute(false);
            setContributionLocation(null);
        }}
        pinnedLocation={contributionLocation || pinnedStart || pinnedEnd}
        onSelectOnMap={handleSelectOnMap}
      />

      {selectedRoute && <RoutePanel route={selectedRoute} onClose={() => setSelectedRoute(null)} onStepClick={() => {}}/>}
      
      <div className="absolute bottom-6 left-6 z-[20] bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-slate-200 hidden md:block">
        <p className="text-xs font-medium text-slate-500 flex items-center gap-3">
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Jeepney</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Bus</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span> Train</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span> Tricycle</span>
        </p>
      </div>
    </div>
  )
}