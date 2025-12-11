"use client"

import { useState, useEffect } from "react"
import { X, Bus, Loader2, CheckCircle2, AlertCircle, MapPin } from "lucide-react"
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

export function ContributionModal({ isOpen, onClose, pinnedLocation, onSelectOnMap }: ContributionModalProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'route'>('terminal')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    city: "1", 
    lat: "",
    lng: ""
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus('idle')

    try {
      const token = localStorage.getItem("accessToken")
      if (!token) throw new Error("You must be logged in to contribute.")

      const endpoint = activeTab === 'terminal' 
        ? "https://api-lakbayan.onrender.com/api/contribute/terminal/" 
        : "https://api-lakbayan.onrender.com/api/contribute/route/"

      const body = activeTab === 'terminal' ? {
        name: formData.name,
        description: formData.description,
        latitude: parseFloat(formData.lat),
        longitude: parseFloat(formData.lng),
        city: parseInt(formData.city)
      } : {
        
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
        throw new Error(data.detail || "Failed to submit contribution")
      }

      setStatus('success')
      setMessage("Contribution submitted for admin verification!")
      setTimeout(() => {
        onClose()
        setStatus('idle')
        setFormData({ name: "", description: "", city: "1", lat: "", lng: "" })
      }, 2000)

    } catch (error: unknown) {
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setMessage(errorMessage)
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
            <Bus className="w-5 h-5 text-blue-400" />
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
            disabled 
            title="Coming soon"
          >
            Add Route (Soon)
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="What routes are available here? Landmarks?" 
                  className="resize-none h-24"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {status === 'error' && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {message}
                </div>
              )}

              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Contribution
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}