"use client"

import { X, Clock, Navigation, Share2, MapPin, Wallet, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMemo, useEffect, useState } from "react"

export interface RouteStep {
  instruction: string
  location?: [number, number]
  distance?: number
  duration?: number
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
  const [navigationStarted, setNavigationStarted] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  
  useEffect(() => {
    setNavigationStarted(false)
    setCurrentStepIndex(0)
  }, [route])
  
  const safeParse = (value: string | number | undefined): number => {
    if (value === undefined || value === null) return 0
    const parsed = typeof value === 'string' ? parseFloat(value) : value
    return isNaN(parsed) ? 0 : parsed
  }

  const totalStepsDistance = route.steps.reduce((sum, step) => sum + safeParse(step.distance), 0)
  const totalStepsDuration = route.steps.reduce((sum, step) => sum + safeParse(step.duration), 0)

  const durationValue = Math.abs(
    safeParse(route.duration) || safeParse(route.time) || totalStepsDuration
  )
  const distanceValue = Math.abs(
    safeParse(route.distance) || totalStepsDistance
  )
  const fareValue = Math.max(11, Math.abs(safeParse(route.fare?.regular)))

  const formattedDuration = useMemo(() => {
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

  const totalSteps = route.steps.length
  const currentStep = route.steps[currentStepIndex]
  const remainingSteps = route.steps.slice(currentStepIndex + 1)
  const remainingDistance = remainingSteps.reduce((total, step) => total + (step.distance ?? 0), 0)
  const remainingDuration = remainingSteps.reduce((total, step) => total + (step.duration ?? 0), 0)

  const formattedRemainingDistance = remainingDistance >= 1 ? `${remainingDistance.toFixed(1)} km` : `${Math.round(remainingDistance * 1000)} m`
  const formattedRemainingDuration = (() => {
    const mins = Math.round(remainingDuration)
    const hrs = Math.floor(mins / 60)
    const rest = mins % 60
    return hrs > 0 ? `${hrs} hr ${rest} min` : `${rest} min`
  })()

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleToggleNavigation = () => {
    setNavigationStarted(!navigationStarted)
    if (!navigationStarted) setCurrentStepIndex(0)
  }

  const handleShare = async () => {
    const routeText = `
🚌 ${route.name}
⏱️ ${formattedDuration}
📍 ${formattedDistance}
💰 ₱${fareValue}

Steps:
${route.steps.map((s, i) => `${i + 1}. ${s.instruction}`).join('\n')}

Find your route at: lakbayan.app
    `.trim()

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Route: ${route.name}`,
          text: routeText,
        })
      } catch (err) {
        console.log('Share failed:', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(routeText)
        alert('Route copied to clipboard!')
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

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

          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{navigationStarted ? 'Navigation active' : 'Route preview'}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{navigationStarted ? `Step ${currentStepIndex + 1} of ${totalSteps}` : `${totalSteps} instructions`}</p>
                </div>
                <div className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white font-semibold">{navigationStarted ? 'Live' : 'Ready'}</div>
              </div>
              {navigationStarted && (
                <p className="text-sm text-slate-600">Current: {currentStep?.instruction}</p>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
              <div className="rounded-2xl bg-white border border-slate-200 px-3 py-3">
                <p className="text-slate-900 font-semibold">{formattedRemainingDuration}</p>
                <p className="mt-1">Remaining time</p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 px-3 py-3">
                <p className="text-slate-900 font-semibold">{formattedRemainingDistance}</p>
                <p className="mt-1">Remaining dist</p>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-3 relative pb-6">
            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-green-500 via-slate-200 to-red-500" />

            {route.steps?.map((step, index) => {
              const isStart = index === 0;
              const isEnd = index === route.steps.length - 1;
              const isWalk = step.instruction.toLowerCase().includes('walk');
              const isActive = navigationStarted && index === currentStepIndex;
              const isCompleted = navigationStarted && index < currentStepIndex;

              return (
                <div 
                  key={index}
                  className={`relative flex gap-4 p-4 rounded-2xl border transition duration-200 ${isActive ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : isCompleted ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-slate-100 bg-white text-slate-800'}`}
                >
                  <div className={`relative z-10 w-10 h-10 flex items-center justify-center rounded-full shrink-0 border-[3px] border-white shadow-sm ${
                    isActive ? 'bg-white text-slate-900' : isStart ? 'bg-green-500 text-white' : isEnd ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isStart || isEnd ? <MapPin className="w-5 h-5 fill-current" /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>

                  <div className="flex-1 py-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm leading-snug ${isWalk ? 'italic' : 'font-semibold'}`}>
                        {step.instruction}
                      </p>
                      {(step.distance !== undefined || step.duration !== undefined) && (
                        <div className="text-right text-[11px] text-slate-500">
                          {step.distance !== undefined && <div>{step.distance >= 1 ? `${step.distance.toFixed(1)} km` : `${Math.round(step.distance * 1000)} m`}</div>}
                          {step.duration !== undefined && <div>{Math.round(step.duration)} min</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <div className="p-5 border-t border-slate-100 bg-white flex flex-col gap-3 shrink-0 pb-8 md:pb-5">
          {navigationStarted ? (
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" size="icon" className="h-12 w-full rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600" onClick={handlePrevStep} disabled={currentStepIndex === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl text-base font-semibold" onClick={handleNextStep} disabled={currentStepIndex === totalSteps - 1}>
                <span>{currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next Step'}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-full rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600" onClick={handleToggleNavigation}>
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200/50 h-12 rounded-xl text-base font-semibold" size="lg" onClick={handleToggleNavigation}>
                <Navigation className="w-4 h-4 mr-2" /> Start Navigation
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600" onClick={handleShare}>
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}