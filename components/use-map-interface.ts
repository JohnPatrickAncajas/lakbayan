"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Layer, Marker, Polyline, CircleMarker, LeafletMouseEvent } from "leaflet"
import type * as Leaflet from "leaflet"
import type { RouteData, RouteStep } from "@/components/route-panel"

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
    time: number | string
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
  walkToBoard?: number
  walkFromAlight?: number
  boardIndex?: number
  stops?: { name: string; lat: number; lng: number }[]
}

interface BestPath {
  type: string
  segments: ExpandedRoute[]
  walks: number[]
}

interface SearchStop {
  lat: number
  lng: number
  stopName: string
  time: number
  fare: number
  distance: number
  index: number
  routeKey: string
  terminal: APITerminal
  route: APIRoute
  geometry?: [number, number][]
}

interface SearchState {
  routeKey: string
  boardIndex: number
  alightIndex: number
  transfers: number
  score: number
  priority?: number
  walks: number[]
  segments: ExpandedRoute[]
}

const pause = () => new Promise(resolve => setTimeout(resolve, 0))

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const deg2rad = (deg: number) => deg * (Math.PI / 180)

const parseDistanceInput = (input: string): number => {
  const clean = input.toLowerCase().replace(/\s/g, "")
  if (clean.includes("m") && !clean.includes("km")) {
    return parseFloat(clean) / 1000
  }
  return parseFloat(clean) || 0
}

const processGeoJsonCoordinates = (coords: unknown): [number, number][] => {
  if (!Array.isArray(coords)) return []

  return (coords as unknown[])
    .map((coord) => {
      if (Array.isArray(coord) && coord.length >= 2) {
        const lng = Number(coord[0])
        const lat = Number(coord[1])

        if (!isNaN(lat) && !isNaN(lng)) {
          return [lat, lng] as [number, number]
        }
      }
      return null
    })
    .filter((c): c is [number, number] => c !== null)
}

function findClosestGeometryIndex(geometry: number[][], point: { lat: number; lng: number }) {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY

  for (let i = 0; i < geometry.length; i++) {
    const coord = geometry[i]
    if (!Array.isArray(coord) || coord.length < 2) continue
    const [lat, lng] = coord as [number, number]
    const dist = getDistance(point.lat, point.lng, lat, lng)
    if (dist < bestDistance) {
      bestDistance = dist
      bestIndex = i
    }
  }

  return bestIndex
}

function trimRouteGeometry(geometry: number[][], start: { lat: number; lng: number }, end: { lat: number; lng: number }): [number, number][] {
  if (!geometry || geometry.length === 0) return []

  const startIndex = findClosestGeometryIndex(geometry, start)
  const endIndex = findClosestGeometryIndex(geometry, end)
  if (startIndex === endIndex) return [[start.lat, start.lng], [end.lat, end.lng]]

  const sliceStart = Math.max(0, Math.min(startIndex, endIndex) - 1)
  const sliceEnd = Math.min(geometry.length - 1, Math.max(startIndex, endIndex) + 1)
  let trimmed = geometry.slice(sliceStart, sliceEnd + 1) as [number, number][]

  if (trimmed.length === 0) return [[start.lat, start.lng], [end.lat, end.lng]]
  if (startIndex > endIndex) trimmed = trimmed.reverse()

  const normalized = [...trimmed]
  normalized[0] = [start.lat, start.lng]
  normalized[normalized.length - 1] = [end.lat, end.lng]

  return normalized
}

const buildRouteStopList = (terminal: APITerminal, route: APIRoute): SearchStop[] => {
  const routeKey = `${terminal.id}-${route.id}`
  const geometry = route.polyline && route.polyline.coordinates && route.polyline.coordinates.length > 0
    ? processGeoJsonCoordinates(route.polyline.coordinates)
    : route.geometry && route.geometry.length > 0
      ? route.geometry
      : undefined

  return route.stops.flatMap((stop, index) => {
    const lat = parseFloat(stop.latitude.toString())
    const lng = parseFloat(stop.longitude.toString())
    const time = Math.abs(parseFloat(stop.time.toString()) || 0)
    const fare = Math.abs(parseFloat(stop.fare.toString()) || 0)
    const distance = Math.abs(parseDistanceInput(stop.distance ? stop.distance.toString() : '0'))
    if (isNaN(lat) || isNaN(lng)) return []
    return [{
      lat,
      lng,
      stopName: stop.stop_name,
      time,
      fare,
      distance,
      index,
      routeKey,
      terminal,
      route,
      geometry,
    }]
  })
}

const createRouteSegment = (
  terminal: APITerminal,
  route: APIRoute,
  stops: SearchStop[],
  boardIndex: number,
  alightIndex: number,
  geometry?: [number, number][]
) => {
  if (boardIndex >= alightIndex) return null
  const boardStop = stops[boardIndex]
  const alightStop = stops[alightIndex]
  const rideTime = Math.abs(alightStop.time - boardStop.time)
  const rawFareDiff = Math.abs(alightStop.fare - boardStop.fare)
  const rideFare = rawFareDiff > 0 ? rawFareDiff : Math.max(Math.abs(alightStop.fare), Math.abs(boardStop.fare))
  const rideDistance = Math.abs(alightStop.distance - boardStop.distance)
  const sectionGeometry = geometry && geometry.length > 0 ? trimRouteGeometry(geometry, boardStop, alightStop) : undefined
  const routeName = `${route.mode.mode_name} • ${terminal.name} → ${route.destination_name || alightStop.stopName}`
  const steps: RouteStep[] = [
    { instruction: `Board ${route.mode.mode_name} at ${boardStop.stopName}`, location: [boardStop.lat, boardStop.lng] },
    { instruction: `Ride to ${alightStop.stopName}` },
    { instruction: `Alight at ${alightStop.stopName}`, location: [alightStop.lat, alightStop.lng] },
  ]

  return {
    originalId: `${terminal.id}-${route.id}-${boardIndex}-${alightIndex}`,
    name: routeName,
    type: route.mode.mode_name,
    fare: { regular: rideFare, discounted: parseFloat((rideFare * 0.8).toFixed(2)) },
    time: rideTime.toString(),
    distance: rideDistance.toFixed(1),
    start: { id: `${boardStop.index}`, name: boardStop.stopName, lat: boardStop.lat, lng: boardStop.lng },
    end: { id: `${alightStop.index}`, name: alightStop.stopName, lat: alightStop.lat, lng: alightStop.lng },
    steps,
    geometry: sectionGeometry,
    walkToBoard: 0,
    walkFromAlight: 0,
    boardIndex,
    stops: stops.slice(boardIndex, alightIndex + 1).map(stop => ({ name: stop.stopName, lat: stop.lat, lng: stop.lng })),
  } as ExpandedRoute
}

interface ModeProfile {
  label: string
  timeWeight: number
  walkPenalty: number
  fareWeight: number
  distanceWeight: number
  transferPenalty: number
  rideRewardFactor: number
}

const MODE_PROFILES: Record<string, ModeProfile> = {
  bus: { label: 'Bus', timeWeight: 1.0, walkPenalty: 140, fareWeight: 0.16, distanceWeight: 0.65, transferPenalty: 70, rideRewardFactor: 0.5 },
  train: { label: 'Train', timeWeight: 0.85, walkPenalty: 130, fareWeight: 0.12, distanceWeight: 0.55, transferPenalty: 55, rideRewardFactor: 0.45 },
  jeep: { label: 'Jeep', timeWeight: 1.05, walkPenalty: 150, fareWeight: 0.2, distanceWeight: 0.72, transferPenalty: 82, rideRewardFactor: 0.58 },
  tricycle: { label: 'Tricycle', timeWeight: 1.2, walkPenalty: 170, fareWeight: 0.24, distanceWeight: 0.9, transferPenalty: 105, rideRewardFactor: 0.68 },
  default: { label: 'Transit', timeWeight: 1.0, walkPenalty: 145, fareWeight: 0.18, distanceWeight: 0.7, transferPenalty: 80, rideRewardFactor: 0.52 },
}

const getModeProfile = (modeName: string): ModeProfile => {
  const normalized = modeName.toLowerCase()
  if (normalized.includes('bus')) return MODE_PROFILES.bus
  if (normalized.includes('train') || normalized.includes('lrt') || normalized.includes('mrt') || normalized.includes('rail')) return MODE_PROFILES.train
  if (normalized.includes('jeep')) return MODE_PROFILES.jeep
  if (normalized.includes('tricycle') || normalized.includes('trike')) return MODE_PROFILES.tricycle
  return MODE_PROFILES.default
}

const getTransferPenalty = (fromModeName: string, toModeName: string) => {
  const from = fromModeName.toLowerCase()
  const to = toModeName.toLowerCase()

  if (from.includes('train') || from.includes('lrt') || from.includes('mrt') || from.includes('rail')) {
    if (to.includes('train') || to.includes('lrt') || to.includes('mrt') || to.includes('rail')) return 0.08
    if (to.includes('bus')) return 0.16
    if (to.includes('jeep')) return 0.24
    if (to.includes('tricycle') || to.includes('trike')) return 0.34
  }

  if (from.includes('bus')) {
    if (to.includes('bus')) return 0.08
    if (to.includes('jeep')) return 0.12
    if (to.includes('train') || to.includes('lrt') || to.includes('mrt') || to.includes('rail')) return 0.2
    if (to.includes('tricycle') || to.includes('trike')) return 0.28
  }

  if (from.includes('jeep')) {
    if (to.includes('jeep')) return 0.06
    if (to.includes('bus')) return 0.1
    if (to.includes('train') || to.includes('lrt') || to.includes('mrt') || to.includes('rail')) return 0.22
    if (to.includes('tricycle') || to.includes('trike')) return 0.3
  }

  if (from.includes('tricycle') || from.includes('trike')) {
    if (to.includes('tricycle') || to.includes('trike')) return 0.1
    if (to.includes('bus')) return 0.16
    if (to.includes('jeep')) return 0.2
    if (to.includes('train') || to.includes('lrt') || to.includes('mrt') || to.includes('rail')) return 0.35
  }

  return 0.14
}

const computeScore = (segment: ExpandedRoute, walkDistance: number, sortBy: 'time' | 'fare' | 'distance', transfers: number) => {
  const profile = getModeProfile(segment.type)
  const timeVal = Math.abs(parseFloat(segment.time))
  const distVal = Math.abs(parseFloat(segment.distance))
  const fareVal = segment.fare.regular
  const transferPenalty = transfers * profile.transferPenalty
  const rideReward = Math.min(12, Math.abs(distVal) * profile.rideRewardFactor + (transfers === 0 ? 3 : 0))
  const walkPenalty = walkDistance * profile.walkPenalty * (transfers > 0 ? 1.1 : 1)

  if (sortBy === 'time') return timeVal * profile.timeWeight + walkPenalty + transferPenalty - rideReward
  if (sortBy === 'fare') return fareVal * profile.fareWeight + walkPenalty + transferPenalty - rideReward
  return distVal * profile.distanceWeight + walkPenalty + transferPenalty - rideReward
}

const getModeColor = (mode: string) => {
  const m = mode.toLowerCase()
  if (m.includes("bus")) return "#ef4444"
  if (m.includes("train") || m.includes("lrt") || m.includes("mrt") || m.includes("rail")) return "#f59e0b"
  if (m.includes("jeep")) return "#22c55e"
  if (m.includes("tricycle") || m.includes("trike")) return "#8b5cf6"
  if (m.includes("motorcycle") || m.includes("habal")) return "#ec4899"
  return "#3b82f6"
}

const getModeIconHtml = (mode: string) => {
  const m = mode.toLowerCase()
  let path = ""
  const bg = getModeColor(mode)

  if (m.includes("bus")) {
    path = `<path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" /><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" /><circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="17" cy="18" r="2" />`
  } else if (m.includes("train") || m.includes("lrt") || m.includes("mrt")) {
    path = `<rect x="4" y="3" width="16" height="16" rx="2" /><path d="M4 11h16" /><path d="M12 3v8" /><path d="m8 19-2 3" /><path d="m18 22-2-3" />`
  } else if (m.includes("jeep")) {
    path = `<path d="M4 16h16" /><path d="M4 16v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" /><path d="M2 16h20" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />`
  } else if (m.includes("tricycle") || m.includes("trike")) {
    path = `<circle cx="16" cy="17" r="3" /><circle cx="7" cy="17" r="3" /><path d="M16 17V9l-6 6" /><path d="M11 9h-2a2 2 0 0 0-2 2v2" /><path d="M7 17h9" />`
  } else {
    path = `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />`
  }

  return `
        <div style="width:32px;height:32px;background-color:${bg};border:2px solid white;border-radius:50%;box-shadow:0 3px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${path}
            </svg>
        </div>
    `
}

const formatDuration = (minutes: number) => {
  const safeMinutes = Math.abs(Math.round(minutes))
  const hrs = Math.floor(safeMinutes / 60)
  const mins = Math.floor(safeMinutes % 60)
  if (hrs > 0) return `${hrs} hr ${mins} min`
  return `${mins} min`
}

const formatDistance = (value: string | number | undefined) => {
  const km = Math.abs(parseDistanceInput(value ? value.toString() : '0'))
  if (km >= 1) {
    return `${km.toFixed(1)} km`
  }
  const meters = Math.round(km * 1000)
  return `${meters} m`
}

export function useMapInterface() {
  const API_BASE_URL = "https://api-lakbayan.onrender.com/api"

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Leaflet.Map | null>(null)
  const [map, setMap] = useState<Leaflet.Map | null>(null)
  const [L, setLeaflet] = useState<typeof Leaflet | null>(null)

  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null)
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null)

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
  const [authChecked, setAuthChecked] = useState(false)
  const [username, setUsername] = useState("User")

  const [maxWalkInput, setMaxWalkInput] = useState("2 km")
  const [maxWalkLegInput, setMaxWalkLegInput] = useState("1 km")
  const [maxTransferWalkInput, setMaxTransferWalkInput] = useState("0.5 km")
  const [transfersInput, setTransfersInput] = useState("2")
  const [sortBy, setSortBy] = useState<'time' | 'fare' | 'distance'>('time')
  const [selectedModes, setSelectedModes] = useState<string[]>(['bus', 'train', 'jeep', 'tricycle'])

  const [terminalsData, setTerminalsData] = useState<APITerminal[]>([])
  const [ready, setReady] = useState(false)

  const userMarkersRef = useRef<Marker[]>([])
  const routeLayersRef = useRef<(Layer | Marker | CircleMarker)[]>([])
  const terminalPreviewRef = useRef<(Polyline | CircleMarker)[]>([])
  const terminalMarkersRef = useRef<Marker[]>([])

  const availableModes = useMemo(() => {
    const modeMap = new Map<string, { id: string; label: string; color: string }>()
    terminalsData.forEach(t => {
      t.routes?.forEach(route => {
        const id = route.mode.mode_name.toLowerCase().trim()
        if (!modeMap.has(id)) {
          modeMap.set(id, { id, label: route.mode.mode_name, color: getModeColor(route.mode.mode_name) })
        }
      })
    })
    const order = ['bus', 'jeep', 'train', 'tricycle']
    return Array.from(modeMap.values()).sort((a, b) => {
      const ai = order.indexOf(a.id)
      const bi = order.indexOf(b.id)
      if (ai === -1 && bi === -1) return a.label.localeCompare(b.label)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [terminalsData])

  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    setIsLoggedIn(!!token)
    setAuthChecked(true)

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

  useEffect(() => {
    if (authChecked && !isLoggedIn) {
      router.push('/auth')
    }
  }, [authChecked, isLoggedIn, router])

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
    if (availableModes.length === 0) return
    setSelectedModes(prev => {
      const next = [...prev]
      availableModes.forEach(mode => {
        if (!next.includes(mode.id)) next.push(mode.id)
      })
      return next
    })
  }, [availableModes])

  useEffect(() => {
    if (!map || !L || terminalsData.length === 0) return

    const renderMarkers = () => {
      terminalMarkersRef.current.forEach(marker => {
        map.removeLayer(marker)
      })
      terminalMarkersRef.current = []

      terminalsData.forEach(t => {
        const activeRoutes = t.routes ? t.routes.filter(r => {
          if (!selectedModes.some(m => r.mode.mode_name.toLowerCase().includes(m))) return false
          if (!r.stops || r.stops.length < 2) return false
          return true
        }) : []

        if (activeRoutes.length > 0) {
          addTerminalMarker(L, map, t, activeRoutes)
        }
      })
    }

    const timer = setTimeout(renderMarkers, 100)
    return () => clearTimeout(timer)

  }, [selectedModes, map, L, terminalsData])

  const addTerminalMarker = (LeafletLib: typeof Leaflet, mapInstance: Leaflet.Map, t: APITerminal, activeRoutes: APIRoute[]) => {
    let primaryMode = ''

    if (activeRoutes.length > 0) {
      const modeCounts: { [key: string]: number } = {}
      activeRoutes.forEach(r => {
        const mode = r.mode.mode_name.toLowerCase()
        modeCounts[mode] = (modeCounts[mode] || 0) + 1
      })
      primaryMode = Object.keys(modeCounts).reduce((a, b) => modeCounts[a] > modeCounts[b] ? a : b, '')
    }

    const iconHtml = getModeIconHtml(primaryMode)

    const icon = LeafletLib.divIcon({
      className: "",
      html: `<div style="position:relative;">${iconHtml}<div style="position:absolute;top:-4px;right:-4px;background-color:#2563eb;color:white;font-size:10px;font-weight:bold;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid white;">${activeRoutes.length}</div></div></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    })

    const lat = parseFloat(t.latitude.toString())
    const lng = parseFloat(t.longitude.toString())

    if (isNaN(lat) || isNaN(lng)) return

    const marker = LeafletLib.marker([lat, lng], { icon, zIndexOffset: 100 }).addTo(mapInstance)
    terminalMarkersRef.current.push(marker)

    const routesListHtml = activeRoutes.map(r => {
      if (!r.stops || r.stops.length < 2) return ''

      const endStop = r.stops[r.stops.length - 1]
      const fare = Math.abs(parseFloat(endStop.fare.toString()) || 0).toFixed(2)
      const time = formatDuration(parseFloat(endStop.time.toString()) || 0)
      const distance = formatDistance(endStop.distance)

      return `
              <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                  <div style="margin-top:4px;width:8px;height:8px;border-radius:50%;background-color:${getModeColor(r.mode.mode_name)};flex-shrink:0;"></div>
                  <div style="flex:1;">
                      <p style="font-size:12px;font-weight:600;color:#1e293b;margin:0;">${r.destination_name || endStop.stop_name}</p>
                      <p style="font-size:10px;color:#64748b;margin:0;text-transform:uppercase;">${r.mode.mode_name} • 
                        <span style="font-weight:bold;color:#4f46e5;">₱${fare}</span> • 
                        <span style="font-weight:bold;color:#10b981;">${time}</span> • 
                        <span style="font-weight:bold;color:#f59e0b;">${distance}</span>
                      </p>
                  </div>
              </div>
          `
    }).join('')

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
      LeafletLib.DomEvent.stopPropagation(e)

      if (routeLayersRef.current.length > 0) {
        routeLayersRef.current.forEach(layer => mapInstance.removeLayer(layer))
        routeLayersRef.current = []
        setSelectedRoute(null)
      }

      if (terminalPreviewRef.current.length > 0) {
        terminalPreviewRef.current.forEach(layer => mapInstance.removeLayer(layer))
        terminalPreviewRef.current = []
      }

      for (const r of activeRoutes) {
        if (!r.stops || r.stops.length === 0) continue

        const endStop = r.stops[r.stops.length - 1]
        const endCoords: [number, number] = [parseFloat(endStop.latitude.toString()), parseFloat(endStop.longitude.toString())]

        let pathCoords: [number, number][] = []

        if (r.polyline && r.polyline.coordinates && r.polyline.coordinates.length > 0) {
          pathCoords = processGeoJsonCoordinates(r.polyline.coordinates)
        } else if (r.geometry && r.geometry.length > 0) {
          pathCoords = r.geometry
        }

        const lineColor = getModeColor(r.mode.mode_name)

        if (pathCoords.length > 0) {
          const trimmedPath = trimRouteGeometry(pathCoords, { lat, lng }, { lat: endCoords[0], lng: endCoords[1] })
              const line = LeafletLib.polyline(trimmedPath as [number, number][], { color: lineColor, weight: 4, opacity: 0.8 }).addTo(mapInstance)
          terminalPreviewRef.current.push(line)
        } else {
                  const simpleLine = LeafletLib.polyline([[lat, lng], endCoords] as [number, number][], { color: lineColor, weight: 4, dashArray: '10, 10', opacity: 0.6 }).addTo(mapInstance)
          terminalPreviewRef.current.push(simpleLine)
        }

        r.stops.forEach(stop => {
          const stopCoords: [number, number] = [parseFloat(stop.latitude.toString()), parseFloat(stop.longitude.toString())]
          const stopMarker = LeafletLib.circleMarker(stopCoords, {
            radius: 4, fillColor: "#fff", color: lineColor, weight: 2, fillOpacity: 1
          }).addTo(mapInstance)
          stopMarker.bindTooltip(stop.stop_name, { permanent: false, direction: 'top', className: 'text-xs font-bold' })
          terminalPreviewRef.current.push(stopMarker)
        })

        const destMarker = LeafletLib.circleMarker(endCoords, { radius: 6, fillColor: lineColor, color: "#fff", weight: 3, fillOpacity: 1 }).addTo(mapInstance)
        terminalPreviewRef.current.push(destMarker)
      }
    })
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    let isMounted = true
    if (mapInstanceRef.current) return

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
      if (!isMounted) return
      if (mapInstanceRef.current) return
      if (!mapContainerRef.current) return

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
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        setMap(null)
      }
    }
  }, [])

  useEffect(() => {
    if (!map || !L) return
    userMarkersRef.current.forEach(m => map.removeLayer(m))
    userMarkersRef.current = []

    const startHtml = `<div style="width:16px;height:16px;background-color:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`
    const endHtml = `<div style="width:16px;height:16px;background-color:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`
    const contribHtml = `<div style="width:16px;height:16px;background-color:#f59e0b;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`

    if (pinnedStart) {
      const m = L.marker([pinnedStart.lat, pinnedStart.lng], { icon: L.divIcon({ className: 'custom-pin-start', html: startHtml, iconSize: [16, 16] }) }).addTo(map)
      userMarkersRef.current.push(m)
    }
    if (pinnedEnd) {
      const m = L.marker([pinnedEnd.lat, pinnedEnd.lng], { icon: L.divIcon({ className: 'custom-pin-end', html: endHtml, iconSize: [16, 16] }) }).addTo(map)
      userMarkersRef.current.push(m)
    }
    if (contributionLocation) {
      const m = L.marker([contributionLocation.lat, contributionLocation.lng], { icon: L.divIcon({ className: 'custom-pin-contrib', html: contribHtml, iconSize: [16, 16] }) }).addTo(map)
      userMarkersRef.current.push(m)
      if (!isSearching) map.panTo([contributionLocation.lat, contributionLocation.lng])
    }
    if ((pinnedStart || pinnedEnd) && !contributionLocation && !isSearching) {
      if (pinnedStart && !pinnedEnd) map.panTo([pinnedStart.lat, pinnedStart.lng])
      if (!pinnedStart && pinnedEnd) map.panTo([pinnedEnd.lat, pinnedEnd.lng])
      if (pinnedStart && pinnedEnd && !selectedRoute) {
        const bounds = L.latLngBounds([[pinnedStart.lat, pinnedStart.lng], [pinnedEnd.lat, pinnedEnd.lng]])
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [pinnedStart, pinnedEnd, contributionLocation, map, L, isSearching, selectedRoute])

  useEffect(() => {
    if (!map || !L) return
    const clickHandler = async (e: LeafletMouseEvent) => {
      if (!pinningMode) return
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`)
        const data = await response.json()
        const name = data.display_name || `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
        const coords: Terminal = { id: "pinned", lat: e.latlng.lat, lng: e.latlng.lng, name }
        if (pinningMode === 'from') { setFromLocation(name); setPinnedStart(coords) }
        else { setToLocation(name); setPinnedEnd(coords) }
      } catch {
        const fallbackName = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`
        const coords = { id: "pinned", lat: e.latlng.lat, lng: e.latlng.lng, name: fallbackName }
        if (pinningMode === 'from') { setFromLocation(fallbackName); setPinnedStart(coords) }
        else { setToLocation(fallbackName); setPinnedEnd(coords) }
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

  const fetchRouteGeometry = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }, profile: 'driving' | 'walking') => {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`)
      if (!response.ok) return null
      const data = await response.json()
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates.map((xy: [number, number]) => [xy[1], xy[0]] as [number, number])
      }
      return null
    } catch (e) {
      console.error("OSRM Fetch Error", e)
      return null
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

  const pickPreferredBoardingStop = (routeEntries: { stop: SearchStop; walk: number }[]) => {
    if (routeEntries.length === 0) return null

    routeEntries.sort((a, b) => a.stop.index - b.stop.index || a.walk - b.walk)
    const earliestEntry = routeEntries[0]
    if (!earliestEntry) return null

    const earliestWalk = earliestEntry.walk
    const maxAllowedWalk = Math.max(earliestWalk + 0.15, earliestWalk * 1.2)
    const feasibleEntries = routeEntries.filter(entry => entry.walk <= maxAllowedWalk)

    if (feasibleEntries.length === 0) return null

    const earliestFeasible = feasibleEntries[0]
    if (!earliestFeasible) return null

    const earliestStopIndex = earliestFeasible.stop.index

    const betterLaterOption = feasibleEntries.find(entry => {
      if (entry.stop.index === earliestStopIndex) return false
      return entry.walk <= earliestWalk + 0.08
    })

    if (betterLaterOption) return betterLaterOption.stop

    return earliestFeasible.stop
  }

  const handleSearch = async () => {
    if (!fromLocation || !toLocation || !map || !L || !ready) return
    if (!isLoggedIn) {
      router.push('/auth')
      return
    }
    setIsSearching(true)

    if (routeLayersRef.current.length > 0) {
      routeLayersRef.current.forEach(layer => map.removeLayer(layer))
      routeLayersRef.current = []
    }
    if (terminalPreviewRef.current.length > 0) {
      terminalPreviewRef.current.forEach(layer => map.removeLayer(layer))
      terminalPreviewRef.current = []
    }
    setContributionLocation(null)
    setSelectedRoute(null)
    setSuggestionMessage(null)

    try {
      let fromCoords = pinnedStart
      if (!fromCoords || fromLocation !== fromCoords.name) fromCoords = await geocodeLocation(fromLocation)
      let toCoords = pinnedEnd
      if (!toCoords || toLocation !== toCoords.name) toCoords = await geocodeLocation(toLocation)

      if (!fromCoords || !toCoords) {
        setSuggestionMessage("Locations not found. Please check your From/To entries and try again.")
        setIsSearching(false)
        return
      }

      const maxWalkKm = parseDistanceInput(maxWalkInput)
      const maxWalkLegKm = parseDistanceInput(maxWalkLegInput)
      const maxTransferWalkKm = parseDistanceInput(maxTransferWalkInput)
      const parsedTransfers = parseInt(transfersInput, 10)
      const limitTransfers = Number.isNaN(parsedTransfers) ? 2 : parsedTransfers
      const allStops: SearchStop[] = []
      const stopsByRoute = new Map<string, SearchStop[]>()
      let closestCandidate: { route: ExpandedRoute; totalWalk: number } | null = null
      const updateClosestCandidate = (candidate: { route: ExpandedRoute; totalWalk: number }) => {
        if (!closestCandidate || candidate.totalWalk < closestCandidate.totalWalk) {
          closestCandidate = candidate
        }
      }

      terminalsData.forEach(terminal => {
        terminal.routes.forEach(route => {
          if (!route.stops || route.stops.length < 2) return
          if (!selectedModes.some(m => route.mode.mode_name.toLowerCase().includes(m))) return
          const routeStops = buildRouteStopList(terminal, route)
          if (routeStops.length < 2) return
          stopsByRoute.set(routeStops[0]?.routeKey ?? `${terminal.id}-${route.id}`, routeStops)
          allStops.push(...routeStops)
        })
      })

      await pause()
      if (allStops.length === 0) {
        setSuggestionMessage("No available routes for the selected transport modes. Try enabling more modes or increasing max walk.")
        setIsSearching(false)
        return
      }

      const originStopsByRoute = new Map<string, { stop: SearchStop; walk: number }[]>()
      allStops.forEach(stop => {
        const walkToBoard = getDistance(fromCoords.lat, fromCoords.lng, stop.lat, stop.lng)
        if (walkToBoard > maxWalkLegKm) return
        const list = originStopsByRoute.get(stop.routeKey) ?? []
        list.push({ stop, walk: walkToBoard })
        originStopsByRoute.set(stop.routeKey, list)
      })

      const originStops = Array.from(originStopsByRoute.values())
        .map(routeEntries => pickPreferredBoardingStop(routeEntries))
        .filter((stop): stop is SearchStop => stop !== null)
        .sort((a, b) => a.index - b.index || getDistance(fromCoords.lat, fromCoords.lng, a.lat, a.lng) - getDistance(fromCoords.lat, fromCoords.lng, b.lat, b.lng))

      const queue: SearchState[] = []
      const bestStateScore = new Map<string, number>()
      let bestPath: BestPath | null = null
      let bestScore = Infinity

      const estimateWalkPenalty = (walkDistance: number) => {
        if (sortBy === 'time') return walkDistance * 95
        if (sortBy === 'fare') return walkDistance * 110
        return walkDistance * 24
      }

      const estimateStatePriority = (routeStops: SearchStop[], state: SearchState) => {
        const currentStop = routeStops[state.alightIndex]
        const finishDistance = getDistance(currentStop.lat, currentStop.lng, toCoords.lat, toCoords.lng)
        return state.score + estimateWalkPenalty(finishDistance) + state.transfers * 12
      }

      const enqueueState = (state: SearchState) => {
        const key = `${state.routeKey}:${state.boardIndex}:${state.alightIndex}:${state.transfers}`
        const routeStops = stopsByRoute.get(state.routeKey)
        if (!routeStops) return
        const priority = estimateStatePriority(routeStops, state)
        if ((bestStateScore.get(key) ?? Infinity) <= priority) return
        bestStateScore.set(key, priority)
        queue.push({ ...state, priority })
      }

      originStops.forEach(stop => {
        const routeStops = stopsByRoute.get(stop.routeKey)
        if (!routeStops) return
        for (let nextIndex = stop.index + 1; nextIndex < routeStops.length; nextIndex++) {
          const segment = createRouteSegment(stop.terminal, stop.route, routeStops, stop.index, nextIndex, stop.geometry)
          if (!segment) continue
          const walkToBoard = getDistance(fromCoords.lat, fromCoords.lng, segment.start.lat, segment.start.lng)
          const walkToDestination = getDistance(segment.end.lat, segment.end.lng, toCoords.lat, toCoords.lng)
          const totalWalk = walkToBoard + walkToDestination
          updateClosestCandidate({ route: segment, totalWalk })
          if (walkToBoard > maxWalkLegKm || walkToDestination > maxWalkLegKm || totalWalk > maxWalkKm) continue
          const score = computeScore(segment, totalWalk, sortBy, 0)
          const finishScore = score
          if (finishScore < bestScore) {
            bestScore = finishScore
            bestPath = { type: "direct", segments: [segment], walks: [walkToBoard, walkToDestination] }
          }
          enqueueState({ routeKey: stop.routeKey, boardIndex: stop.index, alightIndex: nextIndex, transfers: 0, score, walks: [walkToBoard], segments: [segment] })
        }
      })

      let iteration = 0
      while (queue.length > 0) {
        if (++iteration % 100 === 0) await pause()
        queue.sort((a, b) => (a.priority ?? a.score) - (b.priority ?? b.score))
        const state = queue.shift()
        if (!state) break
        const routeStops = stopsByRoute.get(state.routeKey)
        if (!routeStops) continue
        const currentStop = routeStops[state.alightIndex]
        const estimatePriority = estimateStatePriority(routeStops, state)
        if (estimatePriority >= bestScore) continue
        const finishDistance = getDistance(currentStop.lat, currentStop.lng, toCoords.lat, toCoords.lng)
        const totalWalkSoFar = state.walks.reduce((sum, value) => sum + value, 0) + finishDistance
        updateClosestCandidate({ route: state.segments[state.segments.length - 1], totalWalk: totalWalkSoFar })
        if (finishDistance <= maxWalkLegKm && totalWalkSoFar <= maxWalkKm) {
          const finishScore = state.score + estimateWalkPenalty(finishDistance)
          if (finishScore < bestScore) {
            bestScore = finishScore
            bestPath = { type: state.transfers === 0 ? "direct" : state.transfers === 1 ? "transfer" : "multi-transfer", segments: state.segments, walks: [...state.walks, finishDistance] }
          }
        }
        if (state.transfers >= limitTransfers) continue
        const transferStops = allStops
          .filter(stop => stop.routeKey !== state.routeKey)
          .map(transferStop => {
            const transferWalk = getDistance(currentStop.lat, currentStop.lng, transferStop.lat, transferStop.lng)
            const compatibilityPenalty = getTransferPenalty(currentStop.route?.mode.mode_name ?? '', transferStop.route?.mode.mode_name ?? '')
            return { transferStop, transferWalk, compatibilityPenalty }
          })
          .filter(({ transferWalk }) => transferWalk <= maxTransferWalkKm && transferWalk <= maxWalkLegKm)
          .sort((a, b) => a.transferWalk + a.compatibilityPenalty - (b.transferWalk + b.compatibilityPenalty) || a.transferWalk - b.transferWalk)
          .slice(0, 18)
          .map(({ transferStop }) => transferStop)

        transferStops.forEach(transferStop => {
          const transferWalk = getDistance(currentStop.lat, currentStop.lng, transferStop.lat, transferStop.lng)
          const nextRouteStops = stopsByRoute.get(transferStop.routeKey)
          if (!nextRouteStops) return
          for (let nextIndex = transferStop.index + 1; nextIndex < nextRouteStops.length; nextIndex++) {
            const segment = createRouteSegment(transferStop.terminal, transferStop.route, nextRouteStops, transferStop.index, nextIndex, transferStop.geometry)
            if (!segment) continue
            const score = state.score + computeScore(segment, transferWalk, sortBy, state.transfers + 1)
            const key = `${transferStop.routeKey}:${transferStop.index}:${nextIndex}:${state.transfers + 1}`
            if ((bestStateScore.get(key) ?? Infinity) <= score) continue
            enqueueState({ routeKey: transferStop.routeKey, boardIndex: transferStop.index, alightIndex: nextIndex, transfers: state.transfers + 1, score, walks: [...state.walks, transferWalk], segments: [...state.segments, segment] })
          }
        })
      }

      if (!bestPath && closestCandidate !== null) {
        const candidate = closestCandidate as { route: ExpandedRoute; totalWalk: number }
        const seg = candidate.route
        const candFare = Math.max(11, Math.abs(Number(seg.fare?.regular) || 0))
        const candDist = Math.abs(Number(parseFloat(String(seg.distance || '0')) || 0))
        const candTime = Math.round(Math.abs(Number(parseFloat(String(seg.time || '0')) || 0)))

        setSelectedRoute({
          id: seg.originalId || `suggest-${seg.name}`,
          name: seg.name,
          type: seg.type,
          fare: { regular: candFare, discounted: Number((candFare * 0.8).toFixed(2)) },
          distance: Number(candDist.toFixed(1)),
          time: candTime,
          duration: candTime,
          steps: seg.steps ?? [],
        } as RouteData)

        setSuggestionMessage(`No route found within ${maxWalkInput}. Showing closest option with ${candidate.totalWalk.toFixed(1)} km walking. Adjust walk limits or transfers to find alternatives.`)
      } else {
        setSuggestionMessage(null)
      }

      if (bestPath) {
        userMarkersRef.current.forEach(m => map.removeLayer(m))
        const segmentGeometries = await Promise.all(bestPath.segments.map(seg => seg.geometry ? Promise.resolve(seg.geometry) : fetchRouteGeometry(seg.start, seg.end, 'driving')))
        const boundsArray: Array<[number, number]> = []
        const steps: RouteStep[] = []
        let totalFare = 0
        let totalDist = 0
        let totalTime = 0

        const drawSegment = async (
          segment: ExpandedRoute | null,
          start: { lat: number; lng: number },
          end: { lat: number; lng: number },
          type: 'walk' | 'ride',
          color: string,
          dash: string | null,
          weight?: number,
          opacity?: number,
          geometry?: [number, number][]
        ) => {
          const lineWeight = weight ?? (type === 'ride' ? 6 : 3)
          const lineOpacity = opacity ?? (type === 'ride' ? 1 : 0.35)
          let routeGeometry: [number, number][]

          if (type === 'walk') {
            const walkGeometry = await fetchRouteGeometry(start, end, 'walking')
            routeGeometry = walkGeometry && walkGeometry.length > 0 ? walkGeometry : [[start.lat, start.lng], [end.lat, end.lng]]
          } else {
            routeGeometry = geometry && geometry.length > 0
              ? geometry
              : segment?.geometry && segment.geometry.length > 0
                ? segment.geometry
                : [[start.lat, start.lng], [end.lat, end.lng]]
          }

          if (geometry && geometry.length > 0) {
            routeGeometry = trimRouteGeometry(geometry as [number, number][], start, end)
          } else if (segment?.geometry && segment.geometry.length > 0) {
            routeGeometry = trimRouteGeometry(segment.geometry, start, end)
          }

          if (type === 'ride') {
            const backLayer = L.polyline(routeGeometry, { color: '#2563eb', weight: lineWeight + 4, opacity: 0.18, dashArray: dash || undefined }).addTo(map)
            routeLayersRef.current.push(backLayer)
          }
          const layer = L.polyline(routeGeometry, { color, weight: lineWeight, dashArray: dash || undefined, opacity: lineOpacity }).addTo(map)
          routeLayersRef.current.push(layer)
          boundsArray.push(...routeGeometry)
        }

        const walk1Dist = bestPath.walks[0]
        const walk1Duration = walk1Dist * 12
        if (walk1Dist > 0.03) {
          await drawSegment(null, fromCoords, bestPath.segments[0].start, 'walk', '#94a3b8', '4, 8', 3, 0.25)
          steps.push({ instruction: `Walk ${walk1Dist.toFixed(1)}km to ${bestPath.segments[0].start.name}`, distance: walk1Dist, duration: walk1Duration, location: [bestPath.segments[0].start.lat, bestPath.segments[0].start.lng] })
          totalDist += walk1Dist
          totalTime += walk1Duration
        } else {
          steps.push({ instruction: `Board ${bestPath.segments[0].type} at ${bestPath.segments[0].start.name}`, location: [bestPath.segments[0].start.lat, bestPath.segments[0].start.lng] })
        }

        for (let i = 0; i < bestPath.segments.length; i++) {
          const seg = bestPath.segments[i]
          const rideDistance = Math.abs(parseFloat(seg.distance))
          const rideDuration = Math.abs(parseFloat(seg.time))
          totalFare += Math.abs(seg.fare.regular)
          totalDist += rideDistance
          totalTime += rideDuration
          steps.push({ instruction: `Ride ${seg.type} (${seg.name})`, distance: rideDistance, duration: rideDuration, location: [seg.start.lat, seg.start.lng] })
          const modeColor = getModeColor(seg.type)
          const modeIconHtml = getModeIconHtml(seg.type)
          const modeIcon = L.divIcon({ className: '', html: modeIconHtml, iconSize: [32, 32], iconAnchor: [16, 16] })
          const iconLocation = [seg.start.lat, seg.start.lng]
          const modeMarker = L.marker(iconLocation as [number, number], { icon: modeIcon }).addTo(map)
          routeLayersRef.current.push(modeMarker)
          await drawSegment(seg, seg.start, seg.end, 'ride', modeColor, null, undefined, undefined, segmentGeometries[i] ?? undefined)
          if (seg.stops && seg.stops.length > 0) {
            seg.stops.forEach(station => {
              const stopMarker = L.circleMarker([station.lat, station.lng], { radius: 3, fillColor: '#ffffff', color: modeColor, weight: 2, fillOpacity: 1 }).addTo(map)
              stopMarker.bindTooltip(station.name, { direction: 'top', offset: [0, -5], className: 'font-sans text-xs font-bold' })
              routeLayersRef.current.push(stopMarker)
            })
          }
          if (seg.steps && seg.steps.length > 0) {
            seg.steps.forEach(step => {
              if (step.location) {
                const stopMarker = L.circleMarker(step.location, { radius: 4, fillColor: 'white', color: modeColor, weight: 2, fillOpacity: 1 }).addTo(map)
                stopMarker.bindTooltip(step.instruction, { direction: 'top', offset: [0, -5], className: 'font-sans text-xs font-bold' })
                routeLayersRef.current.push(stopMarker)
              }
            })
          }
          if (i < bestPath.segments.length - 1) {
            const transferWalk = bestPath.walks[i + 1]
            const transferDuration = transferWalk * 12
            const nextSeg = bestPath.segments[i + 1]
            totalDist += transferWalk
            totalTime += transferDuration
            steps.push({ instruction: `Alight at ${seg.end.name}, Walk ${transferWalk.toFixed(1)}km to ${nextSeg.start.name}`, distance: transferWalk, duration: transferDuration, location: [seg.end.lat, seg.end.lng] })
            await drawSegment(null, seg.end, nextSeg.start, 'walk', '#64748b', '10, 10')
          }
        }

        const lastWalk = bestPath.walks[bestPath.walks.length - 1]
        const lastSeg = bestPath.segments[bestPath.segments.length - 1]
        const lastWalkDuration = lastWalk * 12
        if (lastWalk > 0.03) {
          await drawSegment(null, lastSeg.end, toCoords, 'walk', '#94a3b8', '4, 8', 3, 0.25)
          totalDist += lastWalk
          totalTime += lastWalkDuration
          steps.push({ instruction: `Alight at ${lastSeg.end.name}, Walk ${lastWalk.toFixed(1)}km to Destination`, distance: lastWalk, duration: lastWalkDuration, location: [lastSeg.end.lat, lastSeg.end.lng] })
        } else {
          steps.push({ instruction: `Finish at Destination`, location: [lastSeg.end.lat, lastSeg.end.lng] })
        }

        const endMarker = L.marker([toCoords.lat, toCoords.lng], { icon: L.divIcon({ className: '', html: `<div style="width:16px;height:16px;background-color:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`, iconSize: [16, 16] }) }).addTo(map).bindPopup('Destination')
        routeLayersRef.current.push(endMarker)

        if (boundsArray.length > 0) {
          map.fitBounds(boundsArray, { padding: [50, 50] })
        }

        const finalTimeMins = Math.round(totalTime)
        const finalFare = Math.max(11, totalFare)

        setSelectedRoute({
          id: `multi-${bestPath.type}`,
          name: `Trip to ${toLocation.split(',')[0]}`,
          type: `${bestPath.segments.length} Ride(s)`,
          fare: { regular: finalFare, discounted: Number((finalFare * 0.8).toFixed(2)) },
          distance: Number(totalDist.toFixed(1)),
          time: finalTimeMins,
          duration: finalTimeMins,
          steps: steps,
        } as RouteData)
      } else {
        if (!closestCandidate) {
          setSuggestionMessage("No suitable transit route found. Try widening walking limits or allowing more transfers.")
        }
        setIsSearching(false)
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

  const updateFromLocation = (value: string) => {
    setFromLocation(value)
    setPinnedStart(null)
  }

  const updateToLocation = (value: string) => {
    setToLocation(value)
    setPinnedEnd(null)
  }

  const closeContributionModal = () => {
    setShowContribute(false)
    setContributionLocation(null)
  }

  return {
    mapContainerRef,
    ready,
    isSearching,
    showSettings,
    showContribute,
    selectedRoute,
    suggestionMessage,
    fromLocation,
    toLocation,
    username,
    isProfileOpen,
    isLoggedIn,
    maxWalkInput,
    maxWalkLegInput,
    maxTransferWalkInput,
    transfersInput,
    sortBy,
    selectedModes,
    availableModes,
    pinningMode,
    pinnedStart,
    pinnedEnd,
    contributionLocation,
    handleLogout,
    handleSearch,
    handleRecenter,
    handleSelectOnMap,
    toggleMode,
    setFromLocation,
    setToLocation,
    setPinningMode,
    setShowSettings,
    setShowContribute,
    setIsProfileOpen,
    setSelectedRoute,
    setMaxWalkInput,
    setMaxWalkLegInput,
    setMaxTransferWalkInput,
    setTransfersInput,
    setSortBy,
    updateFromLocation,
    updateToLocation,
    closeContributionModal,
  }
}
