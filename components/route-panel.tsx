"use client"

import { X, Clock, Navigation, Share2, MapPin, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface RouteStep {
  instruction: string
  location?: [number, number]
}

export interface RouteData {
  id: string
  name: string
  type: string
  fare: { regular: number; discounted: number }
  distance: string
  time: string
  steps: RouteStep[]
}

interface RoutePanelProps {
  route: RouteData
  onClose: () => void
  onStepClick?: (location: [number, number]) => void
}

export function RoutePanel({ route, onClose, onStepClick }: RoutePanelProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 md:top-24 md:right-6 md:left-auto md:bottom-6 md:w-96 z-40 flex flex-col md:h-[calc(100vh-8rem)] animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-md md:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col h-[75vh] md:h-full overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 flex-shrink-0 bg-white/50 backdrop-blur-sm relative z-10">
          <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
          
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                  {route.type}
                </Badge>
                <span className="text-xs text-slate-400 font-medium">Best Route</span>
              </div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">{route.name}</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Fare</span>
              <div className="flex items-center gap-1 text-slate-900 font-bold">
                <span className="text-xs">₱</span>{route.fare.regular}
              </div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Time</span>
              <div className="flex items-center gap-1 text-slate-900 font-bold text-sm">
                <Clock className="w-3 h-3 text-blue-500" /> {route.time}
              </div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Dist</span>
              <div className="flex items-center gap-1 text-slate-900 font-bold text-sm">
                <Navigation className="w-3 h-3 text-green-500" /> {route.distance}
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-0 relative pb-4">
            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-100" />

            {route.steps.map((step, index) => {
              const isStart = index === 0;
              const isEnd = index === route.steps.length - 1;
              const isWalk = step.instruction.toLowerCase().includes('walk');

              return (
                <div 
                  key={index}
                  onClick={() => step.location && onStepClick?.(step.location)}
                  className={`relative flex gap-4 p-3 rounded-xl transition-all duration-200 group ${
                    step.location ? "hover:bg-slate-50 cursor-pointer active:scale-[0.99]" : ""
                  }`}
                >
                  <div className={`relative z-10 w-10 h-10 flex items-center justify-center rounded-full shrink-0 border-4 border-white shadow-sm ${
                    isStart ? 'bg-green-500 text-white' : 
                    isEnd ? 'bg-red-500 text-white' : 
                    'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors'
                  }`}>
                    {isStart ? <MapPin className="w-4 h-4" /> : 
                     isEnd ? <MapPin className="w-4 h-4" /> :
                     <span className="text-xs font-bold">{index + 1}</span>
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <p className={`text-sm font-medium leading-snug ${isWalk ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                      {step.instruction}
                    </p>
                    {step.location && (
                      <p className="text-[10px] text-blue-500 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        View location <ArrowRight className="w-3 h-3" />
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-100 bg-white flex gap-3 shrink-0">
          <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200" size="lg">
            <Navigation className="w-4 h-4 mr-2" /> Start
          </Button>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-lg border-slate-200 hover:bg-slate-50">
            <Share2 className="w-4 h-4 text-slate-600" />
          </Button>
        </div>

      </div>
    </div>
  )
}