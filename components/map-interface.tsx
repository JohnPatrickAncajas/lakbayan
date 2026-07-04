"use client"

import { MapPin, Settings2, Compass, Loader2, Plus, UserCircle, Clock, Banknote, Ruler, LogOut, Info, LogIn, Menu, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { RoutePanel } from "@/components/route-panel"
import { ContributionModal } from "@/components/contribution-modal"
import { useMapInterface } from "./use-map-interface"

export function MapInterface() {
  const {
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
  } = useMapInterface()

  return (
    <div className="relative h-screen pt-0 z-0 bg-slate-50 overflow-hidden">
      <div className="absolute top-4 right-4 z-[40]">
        <div className="relative">
          <Button
            className="w-10 h-10 rounded-full bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xl"
            size="icon"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            {isLoggedIn ? <UserCircle className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
              <MapPin className="w-3 h-3 mr-2" /> Tap map to select location
            </div>
          )}

          {!ready && (
            <div className="mb-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading data...
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-100"></div>
                  <Input
                    placeholder="Start Location"
                    value={fromLocation}
                    onChange={(e) => { updateFromLocation(e.target.value); setPinningMode(null) }}
                    className="pl-8 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    disabled={!ready}
                  />
                </div>
                <Button
                  variant={pinningMode === 'from' ? "destructive" : "secondary"}
                  size="icon"
                  className="shrink-0 w-10 h-10"
                  onClick={() => setPinningMode(pinningMode === 'from' ? null : 'from')}
                  disabled={!ready}
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>

              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-100"></div>
                  <Input
                    placeholder="Destination"
                    value={toLocation}
                    onChange={(e) => { updateToLocation(e.target.value); setPinningMode(null) }}
                    className="pl-8 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    disabled={!ready}
                  />
                </div>
                <Button
                  variant={pinningMode === 'to' ? "destructive" : "secondary"}
                  size="icon"
                  className="shrink-0 w-10 h-10"
                  onClick={() => setPinningMode(pinningMode === 'to' ? null : 'to')}
                  disabled={!ready}
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={showSettings ? "default" : "outline"}
                size="icon"
                className="w-10 h-10 shrink-0"
                onClick={() => setShowSettings(!showSettings)}
                disabled={!ready}
              >
                <Settings2 className="w-4 h-4" />
              </Button>

              <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-10" onClick={handleSearch} disabled={isSearching || !ready}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Route"}
              </Button>
            </div>

            {suggestionMessage && (
              <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
                <strong>Suggestion:</strong> {suggestionMessage}
              </div>
            )}
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
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block" title="Total walk budget for the whole trip">Max Walk</Label>
                  <Input value={maxWalkInput} onChange={(e) => setMaxWalkInput(e.target.value)} className="h-8 text-xs" title="Total walk budget for the whole trip" />
                  <p className="mt-1 text-[11px] text-slate-500">Total walking allowed across all legs.</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block" title="Maximum number of transfers allowed for a route">Max Transfers</Label>
                  <Input type="number" min="0" max="10" value={transfersInput} onChange={(e) => setTransfersInput(e.target.value)} className="h-8 text-xs" title="Maximum number of transfers allowed" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block" title="Maximum distance for a single walk leg">Max Single Walk</Label>
                  <Input value={maxWalkLegInput} onChange={(e) => setMaxWalkLegInput(e.target.value)} className="h-8 text-xs" title="Maximum distance for a single walk leg" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block" title="Maximum walk distance allowed between transfers">Max Transfer Walk</Label>
                  <Input value={maxTransferWalkInput} onChange={(e) => setMaxTransferWalkInput(e.target.value)} className="h-8 text-xs" title="Maximum walk distance allowed between transfers" />
                </div>
              </div>

              <div className="text-[11px] text-slate-500">Keep transfer walks short to encourage riding over long walking connections.</div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-2 flex items-center"><Filter className="w-3 h-3 mr-1" /> Transport Modes</Label>
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
                <div className="text-[11px] text-slate-500 mt-2">Tap a mode to include or exclude it from the search. All available modes from your data will appear here.</div>
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
        onClose={closeContributionModal}
        pinnedLocation={contributionLocation || pinnedStart || pinnedEnd}
        onSelectOnMap={handleSelectOnMap}
      />

      {selectedRoute && <RoutePanel route={selectedRoute} onClose={() => setSelectedRoute(null)} />}

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
