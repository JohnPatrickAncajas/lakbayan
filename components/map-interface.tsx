"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Settings2, X, Compass, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RoutePanel, RouteData, RouteStep } from "@/components/route-panel"
import { ContributionModal } from "@/components/contribution-modal"
import "leaflet/dist/leaflet.css"

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
    latitude: string
    longitude: string
    fare: string
    time: number
  }[]
  mode: {
    mode_name: string
  }
}

interface APITerminal {
  id: number
  name: string
  latitude: string
  longitude: string
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
  steps: { instruction: string; location?: [number, number] }[]
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

function parseTime(time: number): number {
  return time
}

function parseDist(dist: number): number {
  return dist
}

function parseDistanceInput(input: string): number {
    const clean = input.toLowerCase().replace(/\s/g, '');
    if (clean.includes('m') && !clean.includes('km')) {
        return parseFloat(clean) / 1000;
    }
    return parseFloat(clean) || 0;
}

export function MapInterface() {
  const API_BASE_URL = "https://api-lakbayan.onrender.com/api"

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  
  const [map, setMap] = useState<any>(null)
  const [L, setLeaflet] = useState<any>(null)
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null)
  
  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [pinnedStart, setPinnedStart] = useState<Terminal | null>(null)
  const [pinnedEnd, setPinnedEnd] = useState<Terminal | null>(null)
  
  const [isSearching, setIsSearching] = useState(false)
  const [pinningMode, setPinningMode] = useState<'from' | 'to' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  
  const [maxWalkInput, setMaxWalkInput] = useState("2 km")
  const [maxTransfers, setMaxTransfers] = useState(2)

  const [terminalsData, setTerminalsData] = useState<APITerminal[]>([])
  const [ready, setReady] = useState(false)
  
  const userMarkersRef = useRef<any[]>([])
  const routeLayersRef = useRef<any[]>([])
  const terminalPreviewRef = useRef<any[]>([])
  const terminalsDataRef = useRef<APITerminal[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    if (mapInstanceRef.current) return;

    import("leaflet").then((LeafletModule) => {
      if (!isMounted) return;
      if (mapInstanceRef.current) return;
      if (!mapContainerRef.current) return;

      const LeafletLib = LeafletModule.default
      setLeaflet(LeafletLib)

      const newMap = LeafletLib.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([14.5995, 121.0], 12)

      mapInstanceRef.current = newMap
      setMap(newMap)

      LeafletLib.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(newMap)

      LeafletLib.control.zoom({ position: "bottomright" }).addTo(newMap)

      newMap.on('click', (e: any) => {
        const container = mapContainerRef.current
        if (container && !container.classList.contains('cursor-crosshair')) {
             if (terminalPreviewRef.current.length > 0) {
                 terminalPreviewRef.current.forEach(layer => newMap.removeLayer(layer))
                 terminalPreviewRef.current = []
             }
        }
      })
      
      fetchInitialDataSafe(LeafletLib, newMap)
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

    const startIcon = L.divIcon({ className: 'custom-pin-start', html: startHtml, iconSize: [16, 16] })
    const endIcon = L.divIcon({ className: 'custom-pin-end', html: endHtml, iconSize: [16, 16] })

    if (pinnedStart) {
        const m = L.marker([pinnedStart.lat, pinnedStart.lng], {icon: startIcon}).addTo(map);
        userMarkersRef.current.push(m);
        if (!pinnedEnd && !isSearching) map.panTo([pinnedStart.lat, pinnedStart.lng]);
    }

    if (pinnedEnd) {
        const m = L.marker([pinnedEnd.lat, pinnedEnd.lng], {icon: endIcon}).addTo(map);
        userMarkersRef.current.push(m);
        if (!pinnedStart && !isSearching) map.panTo([pinnedEnd.lat, pinnedEnd.lng]);
    }

    if (pinnedStart && pinnedEnd && !selectedRoute && !isSearching) {
        const bounds = L.latLngBounds([
            [pinnedStart.lat, pinnedStart.lng],
            [pinnedEnd.lat, pinnedEnd.lng]
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [pinnedStart, pinnedEnd, map, L]);

  useEffect(() => {
    if (!map || !L) return

    const clickHandler = async (e: any) => {
        if (!pinningMode) return
        
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`)
            const data = await response.json()
            const name = data.display_name || `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
            const coords: Terminal = { id: "pinned", lat: e.latlng.lat, lng: e.latlng.lng, name }

            if (pinningMode === 'from') {
                setFromLocation(name)
                setPinnedStart(coords)
            } else {
                setToLocation(name)
                setPinnedEnd(coords)
            }
        } catch (err) {
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

    return () => {
        map.off('click', clickHandler)
    }
  }, [map, L, pinningMode])

  const fetchRouteGeometry = async (start: {lat: number, lng: number}, end: {lat: number, lng: number}, profile: 'driving' | 'walking') => {
      try {
          const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
          if (!response.ok) return null;
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
              return data.routes[0].geometry.coordinates.map((xy: any) => [xy[1], xy[0]]);
          }
          return null;
      } catch (e) {
          console.error("OSRM Fetch Error", e);
          return null;
      }
  }

  const fetchInitialDataSafe = async (LeafletLib: any, mapInstance: any) => {
    try {
      const token = localStorage.getItem("accessToken")
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const response = await fetch(`${API_BASE_URL}/cached/terminals/`, { headers })
      
      if (!response.ok) throw new Error("Failed to fetch terminal data")
      const data = await response.json()
      
      const terminals = data.terminals as APITerminal[]
      setTerminalsData(terminals)
      terminalsDataRef.current = terminals 

      terminals.forEach(t => {
        addTerminalMarkerSafe(LeafletLib, mapInstance, t)
      })

      setReady(true)
    } catch (e) {
      console.error("API Data Fetch Error:", e)
    }
  }

  const addTerminalMarkerSafe = (LeafletLib: any, mapInstance: any, t: APITerminal) => {
    const iconHtml = `
        <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
          <div style="width:30px;height:30px;background-color:#0f172a;border:2px solid white;border-radius:50%;box-shadow:0 4px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          </div>
          <div style="position:absolute;top:-4px;right:-4px;background-color:#2563eb;color:white;font-size:10px;font-weight:bold;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid white;">
            ${t.routes ? t.routes.length : 0}
          </div>
        </div>
    `

    const icon = LeafletLib.divIcon({
        className: "", 
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    })
    
    const lat = parseFloat(t.latitude)
    const lng = parseFloat(t.longitude)
    const marker = LeafletLib.marker([lat, lng], { icon }).addTo(mapInstance)

    const routesListHtml = t.routes.map(r => {
        if (!r.stops || r.stops.length === 0) return '';
        
        const endStop = r.stops[r.stops.length - 1];
        if (!endStop) return '';

        return `
            <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <div style="margin-top:4px;width:8px;height:8px;border-radius:50%;background-color:#3b82f6;flex-shrink:0;"></div>
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
                ${t.routes.length > 0 ? routesListHtml : '<p style="font-size:12px;color:#94a3b8;font-style:italic;">No routes.</p>'}
            </div>
        </div>
    `

    marker.bindPopup(popupContent, { closeButton: false, maxWidth: 260 })
    
    marker.on('click', async (e: any) => {
        LeafletLib.DomEvent.stopPropagation(e);
        if (terminalPreviewRef.current.length > 0) {
            terminalPreviewRef.current.forEach(layer => mapInstance.removeLayer(layer))
            terminalPreviewRef.current = []
        }
        
        const currentTerminal = terminalsDataRef.current.find(item => item.id === t.id)
        if (!currentTerminal) return

        for (const r of currentTerminal.routes) {
             if (!r.stops || r.stops.length === 0) continue;
             
             const startCoords: [number, number] = [parseFloat(currentTerminal.latitude), parseFloat(currentTerminal.longitude)]
             const endStop = r.stops[r.stops.length - 1]
             const endCoords: [number, number] = [parseFloat(endStop.latitude), parseFloat(endStop.longitude)]
             
             const geometry = await fetchRouteGeometry(
                 { lat: startCoords[0], lng: startCoords[1] }, 
                 { lat: endCoords[0], lng: endCoords[1] }, 
                 'driving'
             )

             const pathCoords = geometry || [startCoords, endCoords]

             const line = LeafletLib.polyline(pathCoords, { color: "#3b82f6", weight: 3, opacity: 0.7 }).addTo(mapInstance)
             const destMarker = LeafletLib.circleMarker(endCoords, { radius: 4, fillColor: "#3b82f6", color: "#fff", weight: 1, fillOpacity: 1 }).addTo(mapInstance)
             
             terminalPreviewRef.current.push(line, destMarker)
        }
    })
  }

  const geocodeLocation = async (locationName: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&countrycodes=ph&format=json&limit=1`
      )
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

      const allSegments: ExpandedRoute[] = []
      
      terminalsData.forEach(terminal => {
          terminal.routes.forEach(route => {
              if (!route.stops || route.stops.length === 0) return;

              const startT: Terminal = { id: terminal.id.toString(), name: terminal.name, lat: parseFloat(terminal.latitude), lng: parseFloat(terminal.longitude) }
              const endStop = route.stops[route.stops.length - 1]
              const endT: Terminal = { id: endStop.id.toString(), name: endStop.stop_name, lat: parseFloat(endStop.latitude), lng: parseFloat(endStop.longitude) }
              
              const baseRoute: ExpandedRoute = {
                  originalId: `${terminal.id}-${route.id}`,
                  name: `${route.mode.mode_name} - ${terminal.name} to ${endStop.stop_name}`,
                  type: route.mode.mode_name,
                  fare: { regular: parseFloat(endStop.fare), discounted: parseFloat(endStop.fare) * 0.8 },
                  distance: (parseFloat(endStop.distance as any) || 0).toFixed(1) + " km",
                  time: endStop.time + " min",
                  start: startT,
                  end: endT,
                  steps: route.stops.map(s => ({ instruction: s.stop_name, location: [parseFloat(s.latitude), parseFloat(s.longitude)] }))
              }

              allSegments.push({ ...baseRoute, steps: baseRoute.steps.map(s => ({...s})) })
              
              allSegments.push({
                  ...baseRoute,
                  name: `${baseRoute.name} (Return)`,
                  start: endT,
                  end: startT,
                  steps: [{ instruction: `Board ${baseRoute.type} at ${endT.name}` }, { instruction: `Travel to ${startT.name}` }]
              })
          })
      })

      let bestPath = null
      let minCost = Infinity 

      for (const segment of allSegments) {
        const d1 = getDistance(fromCoords.lat, fromCoords.lng, segment.start.lat, segment.start.lng)
        const d2 = getDistance(segment.end.lat, segment.end.lng, toCoords.lat, toCoords.lng)
        const totalCost = (d1 * 12) + parseTime(parseInt(segment.time)) + (d2 * 12)

        if (d1 <= maxWalkKm && totalCost < minCost) {
          minCost = totalCost
          bestPath = { type: "direct", segments: [segment], walks: [d1, d2] }
        }
      }

      if (maxTransfers >= 1) {
        for (const r1 of allSegments) {
            const dStart = getDistance(fromCoords.lat, fromCoords.lng, r1.start.lat, r1.start.lng)
            if (dStart > maxWalkKm) continue 

            for (const r2 of allSegments) {
                if (r1.originalId === r2.originalId) continue
                const dTransfer = getDistance(r1.end.lat, r1.end.lng, r2.start.lat, r2.start.lng)
                if (dTransfer > 2) continue 

                const dEnd = getDistance(r2.end.lat, r2.end.lng, toCoords.lat, toCoords.lng)
                const totalCost = (dStart * 12) + parseTime(parseInt(r1.time)) + (dTransfer * 12) + parseTime(parseInt(r2.time)) + (dEnd * 12)
                
                if (totalCost < minCost) {
                    minCost = totalCost
                    bestPath = { type: "transfer", segments: [r1, r2], walks: [dStart, dTransfer, dEnd] }
                }

                if (maxTransfers >= 2) {
                      for (const r3 of allSegments) {
                          if (r2.originalId === r3.originalId || r1.originalId === r3.originalId) continue
                          const dTransfer2 = getDistance(r2.end.lat, r2.end.lng, r3.start.lat, r3.start.lng)
                          if (dTransfer2 > 2) continue
                          
                          const dEnd2 = getDistance(r3.end.lat, r3.end.lng, toCoords.lat, toCoords.lng)
                          const totalCost3 = (dStart * 12) + parseTime(parseInt(r1.time)) + (dTransfer * 12) + parseTime(parseInt(r2.time)) + (dTransfer2 * 12) + parseTime(parseInt(r3.time)) + (dEnd2 * 12)
                          
                          if (totalCost3 < minCost) {
                             minCost = totalCost3
                             bestPath = { type: "multi-transfer", segments: [r1, r2, r3], walks: [dStart, dTransfer, dTransfer2, dEnd2] }
                          }
                      }
                }
            }
        }
      }

      if (bestPath) {
        userMarkersRef.current.forEach(m => map.removeLayer(m));

        const boundsArray: any[] = [];
        const steps: RouteStep[] = []
        let totalFare = 0
        let totalDist = 0

        const drawSegment = async (start: any, end: any, type: 'walk' | 'ride', color: string, dash: string | null) => {
             const profile = type === 'walk' ? 'walking' : 'driving';
             const geometry = await fetchRouteGeometry(start, end, profile);
             
             let layer;
             if (geometry) {
                 layer = L.polyline(geometry, { color, weight: type === 'ride' ? 5 : 4, dashArray: dash, opacity: 0.8 }).addTo(map);
             } else {
                 layer = L.polyline([[start.lat, start.lng], [end.lat, end.lng]], { color, weight: type === 'ride' ? 5 : 4, dashArray: dash, opacity: 0.8 }).addTo(map);
             }
             routeLayersRef.current.push(layer);
             boundsArray.push(...(geometry || [[start.lat, start.lng], [end.lat, end.lng]]));
        }

        await drawSegment(fromCoords, bestPath.segments[0].start, 'walk', '#64748b', '10, 10');
        steps.push({ instruction: `Walk ${bestPath.walks[0].toFixed(1)}km to ${bestPath.segments[0].start.name}`, location: [fromCoords.lat, fromCoords.lng] })
        totalDist += bestPath.walks[0]

        for (let i = 0; i < bestPath.segments.length; i++) {
            const seg = bestPath.segments[i]
            totalFare += seg.fare.regular
            totalDist += parseDist(parseFloat(seg.distance))
            steps.push({ instruction: `Ride ${seg.type} (${seg.name})` })
            
            await drawSegment(seg.start, seg.end, 'ride', '#3b82f6', null);

            if (i < bestPath.segments.length - 1) {
                const transferWalk = bestPath.walks[i+1]
                const nextSeg = bestPath.segments[i+1]
                totalDist += transferWalk
                steps.push({ instruction: `Alight at ${seg.end.name}, Walk ${transferWalk.toFixed(1)}km to ${nextSeg.start.name}`, location: [seg.end.lat, seg.end.lng] })
                
                await drawSegment(seg.end, nextSeg.start, 'walk', '#64748b', '10, 10');
            }
        }

        const lastSeg = bestPath.segments[bestPath.segments.length - 1];
        const lastWalk = bestPath.walks[bestPath.walks.length - 1];
        await drawSegment(lastSeg.end, toCoords, 'walk', '#64748b', '10, 10');
        
        totalDist += lastWalk
        steps.push({ instruction: `Alight at ${lastSeg.end.name}, Walk ${lastWalk.toFixed(1)}km to Destination`, location: [lastSeg.end.lat, lastSeg.end.lng] })

        const startMarkerHtml = `<div style="width:16px;height:16px;background-color:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`
        const endMarkerHtml = `<div style="width:16px;height:16px;background-color:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`
        
        const startMarker = L.marker([fromCoords.lat, fromCoords.lng], {
            icon: L.divIcon({ className: '', html: startMarkerHtml, iconSize: [16,16] })
        }).addTo(map).bindPopup("Start");
        
        const endMarker = L.marker([toCoords.lat, toCoords.lng], {
            icon: L.divIcon({ className: '', html: endMarkerHtml, iconSize: [16,16] })
        }).addTo(map).bindPopup("Destination");
        
        routeLayersRef.current.push(startMarker, endMarker);

        if (boundsArray.length > 0) {
            map.fitBounds(L.latLngBounds(boundsArray), { padding: [50, 50] });
        }

        setSelectedRoute({
            id: `multi-${bestPath.type}`,
            name: `Trip to ${toLocation.split(',')[0]}`,
            type: `${bestPath.segments.length} Ride(s)`,
            fare: { regular: totalFare, discounted: totalFare * 0.8 },
            distance: `${totalDist.toFixed(1)} km`,
            time: `${Math.round(minCost)} min`,
            steps: steps
        } as RouteData)

      } else {
        alert("No suitable transit route found. Calculating direct driving route.")
      }

    } catch (error) {
      console.error(error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleRecenter = () => { if (map) map.setView([14.5995, 121.0], 12) }

  return (
    <div className="relative h-screen pt-16 z-0 bg-slate-50">
      
      <div className="absolute top-20 left-4 right-4 z-[20] md:top-24 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl">
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

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 space-y-2">
               <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-100"></div>
                    <Input
                      placeholder="Start Location"
                      value={fromLocation}
                      onChange={(e) => { setFromLocation(e.target.value); setPinnedStart(null); }}
                      className="pl-8 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      disabled={!ready}
                    />
                  </div>
                  <Button 
                    variant={pinningMode === 'from' ? "destructive" : "secondary"} 
                    size="icon" 
                    className="shrink-0"
                    onClick={() => setPinningMode(pinningMode === 'from' ? null : 'from')}
                    disabled={!ready}
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
               </div>
            </div>

            <div className="flex-1 space-y-2">
               <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-100"></div>
                    <Input
                      placeholder="Destination"
                      value={toLocation}
                      onChange={(e) => { setToLocation(e.target.value); setPinnedEnd(null); }}
                      className="pl-8 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      disabled={!ready}
                    />
                  </div>
                  <Button 
                    variant={pinningMode === 'to' ? "destructive" : "secondary"} 
                    size="icon" 
                    className="shrink-0"
                    onClick={() => setPinningMode(pinningMode === 'to' ? null : 'to')}
                    disabled={!ready}
                  >
                      <MapPin className="w-4 h-4" />
                  </Button>
               </div>
            </div>
            
            <div className="flex gap-2 md:border-l md:pl-3 md:border-slate-200 justify-end">
                <Button variant={showSettings ? "default" : "outline"} size="icon" onClick={() => setShowSettings(!showSettings)} disabled={!ready}>
                    <Settings2 className="w-4 h-4"/>
                </Button>

                <Button className="flex-1 md:w-auto bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSearch} disabled={isSearching || !ready}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin"/> : "Search"}
                </Button>
            </div>
          </div>

          {showSettings && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-5 z-30">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-slate-800">Routing Preferences</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}><X className="w-4 h-4"/></Button>
                </div>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <Label className="text-xs font-semibold text-slate-600">Max Initial Walk (Text Input)</Label>
                        </div>
                        <Input 
                            value={maxWalkInput}
                            onChange={(e) => setMaxWalkInput(e.target.value)}
                            placeholder="e.g. 500m, 1km, 2000 meters"
                            className="bg-slate-50"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Accepts meters (m) or kilometers (km). Default is km.</p>
                    </div>
                    <div>
                        <div className="flex justify-between mb-3">
                            <Label className="text-xs font-semibold text-slate-600">Max Transfers</Label>
                        </div>
                        <div className="flex gap-2">
                             {[0, 1, 2, 3].map(num => (
                                 <Button 
                                    key={num} 
                                    variant={maxTransfers === num ? "default" : "outline"}
                                    size="sm"
                                    className={`flex-1 ${maxTransfers === num ? 'bg-slate-900 text-white' : ''}`}
                                    onClick={() => setMaxTransfers(num)}
                                 >
                                    {num}
                                 </Button>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full h-full relative z-[1]" />

      <div className="absolute bottom-24 right-4 md:bottom-8 md:right-6 z-[20] flex flex-col gap-3">
        <Button size="icon" className="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-100" onClick={handleRecenter}>
            <Compass className="w-5 h-5" />
        </Button>
        <Button 
          size="icon" 
          className="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-xl bg-blue-600 text-white hover:bg-blue-700 border border-blue-500"
          onClick={() => setShowContribute(true)}
        >
            <Plus className="w-5 h-5" />
        </Button>
      </div>

      <ContributionModal 
        isOpen={showContribute} 
        onClose={() => setShowContribute(false)}
        pinnedLocation={pinnedStart || pinnedEnd}
      />

      {selectedRoute && <RoutePanel route={selectedRoute} onClose={() => setSelectedRoute(null)} onStepClick={() => {}}/>}
      
      <div className="absolute bottom-6 left-6 z-[20] bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-slate-200 hidden md:block">
        <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> Live Traffic 
            <span className="w-2 h-2 rounded-full bg-blue-500 ml-2"></span> Verified Terminals
        </p>
      </div>
    </div>
  )
}