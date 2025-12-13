"use client"

import { X, Clock, Navigation, Share2, MapPin, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMemo } from "react"

export interface RouteStep {
  instruction: string
  location?: [number, number]
}

export interface RouteData {
  id: string
  name: string
  type: string
  fare: { regular: number; discounted: number }
  distance: string | number 
  time?: string | number
  duration?: string | number
  steps: RouteStep[]
}

interface RoutePanelProps {
  route: RouteData
  onClose: () => void
}

export function RoutePanel({ route, onClose }: RoutePanelProps) {
  
  const safeParse = (value: string | number | undefined): number => {
    if (value === undefined || value === null) return 0
    const parsed = typeof value === 'string' ? parseFloat(value) : value
    return isNaN(parsed) ? 0 : parsed
  }

  const durationValue = Math.abs(safeParse(route.time) || safeParse(route.duration))
  const distanceValue = Math.abs(safeParse(route.distance)) 
  const fareValue = Math.abs(safeParse(route.fare?.regular))

  const formattedDuration = useMemo(() => {
    // FIX: Apply Math.abs() directly to the value used in duration calculation
    const durationMins = Math.abs(durationValue);
    
    const hrs = Math.floor(durationMins / 60)
    const mins = Math.floor(durationMins % 60)
    
    if (hrs > 0) return `${hrs} hr ${mins} min`
    return `${mins} min`
  }, [durationValue])

  const formattedDistance = useMemo(() => {
    if (distanceValue >= 1) {
      return `${distanceValue.toFixed(2)} km`
    }
    if (distanceValue > 0) {
        const meters = Math.round(distanceValue * 1000);
        return `${Math.round(meters / 10) * 10} m`;
    }
    return `0 m`;
  }, [distanceValue])

  const eta = useMemo(() => {
    const now = new Date()
    const arrivalTime = new Date(now.getTime() + durationValue * 60000)
    
    return arrivalTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })
  }, [durationValue])

  return (
    <div className="fixed inset-x-0 bottom-0 md:top-24 md:right-6 md:left-auto md:bottom-6 md:w-96 z-40 flex flex-col md:h-[calc(100vh-8rem)] animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-md md:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col h-[75vh] md:h-full overflow-hidden">
        
        <div className="p-5 border-b border-slate-100 flex-shrink-0 bg-white/50 backdrop-blur-sm relative z-10">
          <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
          
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 border-none shadow-sm px-3">
                  {route.type}
                </Badge>
                {durationValue > 0 && durationValue < 60 && (
                    <span className="text-[10px] uppercase tracking-wider text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">Fastest</span>
                )}
              </div>
              <h3 className="font-bold text-xl text-slate-900 leading-tight">{route.name}</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Arrive by <span className="text-slate-900">{eta}</span>
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Fare
              </span>
              <div className="flex items-baseline text-slate-900 font-bold text-lg">
                <span className="text-xs mr-0.5 font-medium text-slate-500">₱</span>
                {fareValue}
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Time
              </span>
              <div className="text-slate-900 font-bold text-lg leading-none">
                {formattedDuration}
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Navigation className="w-3 h-3" /> Dist
              </span>
              <div className="text-slate-900 font-bold text-lg leading-none">
                {formattedDistance}
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-0 relative pb-6">
            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-green-500 via-slate-200 to-red-500" />

            {route.steps?.map((step, index) => {
              const isStart = index === 0;
              const isEnd = index === route.steps.length - 1;
              const isWalk = step.instruction.toLowerCase().includes('walk');

              return (
                <div 
                  key={index}
                  className="relative flex gap-4 p-3 rounded-xl transition-all duration-200"
                >
                  <div className={`relative z-10 w-10 h-10 flex items-center justify-center rounded-full shrink-0 border-[3px] border-white shadow-sm ${
                    isStart ? 'bg-green-500 text-white' : 
                    isEnd ? 'bg-red-500 text-white' : 
                    'bg-slate-100 text-slate-500 transition-colors'
                  }`}>
                    {isStart || isEnd ? <MapPin className="w-5 h-5 fill-current" /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>

                  <div className="flex-1 py-1">
                    <p className={`text-sm leading-snug ${isWalk ? 'text-slate-500 italic font-medium' : 'text-slate-800 font-semibold'}`}>
                      {step.instruction}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0 pb-8 md:pb-5">
          <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200/50 h-12 rounded-xl text-base font-semibold" size="lg">
            <Navigation className="w-4 h-4 mr-2" /> Start Navigation
          </Button>
          <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

      </div>
    </div>
  )
}