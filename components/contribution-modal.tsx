"use client"

import { useState, useEffect } from "react"
import { X, Bus, Loader2, CheckCircle2, AlertCircle, MapPin, Waypoints } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ContributionModalProps {
  isOpen: boolean
  onClose: () => void
  pinnedLocation: { lat: number; lng: number; name: string } | null
  onSelectOnMap: () => void
}

interface TransportMode {
  id: number
  name: string
  fare_type: string
}

interface TerminalOption {
  id: number
  name: string
  city: { name: string }
}

export function ContributionModal({ isOpen, onClose, pinnedLocation, onSelectOnMap }: ContributionModalProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'route'>('terminal')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingData, setIsFetchingData] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState("")

  const [modes, setModes] = useState<TransportMode[]>([])
  const [terminals, setTerminals] = useState<TerminalOption[]>([])

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    city: "1", 
    lat: "",
    lng: "",
    terminal_id: "",
    destination_name: "",
    mode_id: "",
    route_desc: ""
  })

  useEffect(() => {
    if (pinnedLocation) {
      setFormData(prev => ({
        ...prev,
        lat: pinnedLocation.lat.toFixed(6),
        lng: pinnedLocation.lng.toFixed(6)
      }))
    }
  }, [pinnedLocation])

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsFetchingData(true)
        try {
          const [modesRes, terminalsRes] = await Promise.all([
            fetch("https://api-lakbayan.onrender.com/api/transport-modes/"),
            fetch("https://api-lakbayan.onrender.com/api/cached/terminals/")
          ])

          if (modesRes.ok) {
            const modesData = await modesRes.json()
            const filteredModes = modesData.filter((m: TransportMode) => !m.name.toLowerCase().includes("uv"))
            setModes(filteredModes)
          }

          if (terminalsRes.ok) {
            const terminalsData = await terminalsRes.json()
            setTerminals(terminalsData.terminals || [])
          }
        } catch (error) {
          console.error("Failed to fetch form data", error)
        } finally {
          setIsFetchingData(false)
        }
      }

      fetchData()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus('idle')

    try {
      const token = localStorage.getItem("accessToken")
      if (!token) throw new Error("You must be logged in to contribute.")

      const isTerminal = activeTab === 'terminal'
      const endpoint = isTerminal
        ? "https://api-lakbayan.onrender.com/api/contribute/terminal/" 
        : "https://api-lakbayan.onrender.com/api/contribute/route/"

      const body = isTerminal ? {
        name: formData.name,
        description: formData.description,
        latitude: parseFloat(formData.lat),
        longitude: parseFloat(formData.lng),
        city: parseInt(formData.city)
      } : {
        terminal: parseInt(formData.terminal_id),
        destination_name: formData.destination_name,
        mode: parseInt(formData.mode_id),
        description: formData.route_desc,
        polyline: null
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.code === "EMAIL_VERIFICATION_REQUIRED") {
            throw new Error("Please verify your email address before contributing.")
        }
        throw new Error(data.detail || JSON.stringify(data) || "Failed to submit contribution")
      }

      setStatus('success')
      setMessage(isTerminal ? "Terminal submitted for verification!" : "Route submitted for verification!")
      
      setTimeout(() => {
        onClose()
        setStatus('idle')
        setFormData(prev => ({ ...prev, name: "", description: "", destination_name: "", route_desc: "" }))
      }, 2000)

    } catch (error: unknown) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-white">
            {activeTab === 'terminal' ? <Bus className="w-5 h-5 text-blue-400" /> : <Waypoints className="w-5 h-5 text-green-400" />}
            <h2 className="font-bold text-lg">Contribute Data</h2>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-1 bg-slate-100 flex gap-1 shrink-0">
          <button 
            onClick={() => setActiveTab('terminal')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'terminal' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Add Terminal
          </button>
          <button 
            onClick={() => setActiveTab('route')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'route' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Add Route
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Success!</h3>
                <p className="text-slate-500">{message}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {activeTab === 'terminal' ? (
                <>
                  <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">
                    <strong>Note:</strong> A Terminal is just the location. To specify if its for Jeepneys, Buses, etc., add a <strong>Route</strong> to it after creating it.
                  </div>

                  <div className="space-y-2">
                    <Label>Terminal Name</Label>
                    <Input 
                      placeholder="e.g. Pacita Complex Terminal" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>Location Coordinates</Label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">Lat</span>
                        <Input 
                          className="pl-8 font-mono text-xs" 
                          placeholder="0.000000"
                          value={formData.lat}
                          onChange={e => setFormData({...formData, lat: e.target.value})}
                          required
                          type="number"
                          step="any"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">Lng</span>
                        <Input 
                          className="pl-8 font-mono text-xs" 
                          placeholder="0.000000" 
                          value={formData.lng}
                          onChange={e => setFormData({...formData, lng: e.target.value})}
                          required
                          type="number"
                          step="any"
                        />
                      </div>
                    </div>

                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={onSelectOnMap}
                    >
                        <MapPin className="w-4 h-4 mr-2"/>
                        Tap map to select location
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select value={formData.city} onValueChange={(v) => setFormData({...formData, city: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select City" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Biñan</SelectItem>
                        <SelectItem value="2">Santa Rosa</SelectItem>
                        <SelectItem value="3">Calamba</SelectItem>
                        <SelectItem value="4">San Pedro</SelectItem>
                        <SelectItem value="5">Cabuyao</SelectItem>
                        <SelectItem value="7">Caloocan</SelectItem>
                        <SelectItem value="6">Manila</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Landmarks, waiting area details, etc." 
                      className="resize-none h-24"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Select Terminal</Label>
                    <Select value={formData.terminal_id} onValueChange={(v) => setFormData({...formData, terminal_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder={isFetchingData ? "Loading terminals..." : "Select verified terminal"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {terminals.map(t => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.name} <span className="text-slate-400 text-xs">({t.city.name})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Destination Name</Label>
                    <Input 
                      placeholder="e.g. Gil Puyat LRT Station" 
                      value={formData.destination_name}
                      onChange={e => setFormData({...formData, destination_name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Transport Mode</Label>
                    <Select value={formData.mode_id} onValueChange={(v) => setFormData({...formData, mode_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder={isFetchingData ? "Loading modes..." : "Select Mode"} />
                      </SelectTrigger>
                      <SelectContent>
                        {modes.map(mode => (
                          <SelectItem key={mode.id} value={mode.id.toString()}>
                            {mode.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Route Description</Label>
                    <Textarea 
                      placeholder="Describe the route path, landmarks, or special instructions." 
                      className="resize-none h-24"
                      value={formData.route_desc}
                      onChange={e => setFormData({...formData, route_desc: e.target.value})}
                    />
                  </div>
                </>
              )}

              {status === 'error' && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {message}
                </div>
              )}

              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={isLoading || isFetchingData}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit {activeTab === 'terminal' ? 'Terminal' : 'Route'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}