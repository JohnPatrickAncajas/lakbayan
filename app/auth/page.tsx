"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  ShieldAlert, 
  LogOut, 
  ArrowRight, 
  Info, 
  FileText, 
  Bus, 
  Waypoints, 
  Shield, 
  BarChart3, 
  LayoutDashboard, 
  ChevronRight,
  Trophy,
  Medal,
  Route,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

const API_BASE_URL = "https://api-lakbayan.onrender.com/api"

interface UserData {
  username: string
  email: string
  id?: number
  is_staff?: boolean
  is_superuser?: boolean
}

interface TerminalContribution {
  name: string
  description: string
  latitude: string
  longitude: string
  city: number
  verified?: boolean
}

interface RouteContribution {
  terminal: number
  destination_name: string
  mode: number
  description: string
  verified?: boolean
}

interface ContributionsSummary {
  terminals: {
    data: TerminalContribution[]
    total: number
    verified: number
    pending: number
  }
  routes: {
    data: RouteContribution[]
    total: number
    verified: number
    pending: number
  }
  summary: {
    total_contributions: number
    verified_contributions: number
  }
}

interface LeaderboardEntry {
  username: string
  lakbay_points: number
  percentage: number
  verified_terminals: number
  verified_routes: number
}

const ContributorsPieChart = ({ data }: { data: LeaderboardEntry[] }) => {
  if (!data || data.length === 0) {
    return (
        <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
            No data available
        </div>
    )
  }

  const topData = data.slice(0, 5)
  let cumulativePercent = 0

  const colors = [
    'text-yellow-400', 
    'text-slate-400', 
    'text-orange-400', 
    'text-blue-400', 
    'text-emerald-400'
  ]

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {topData.map((entry, i) => {
            const percent = entry.percentage || 0
            const radius = 40
            const circumference = 2 * Math.PI * radius
            const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`
            const strokeDashoffset = -((cumulativePercent / 100) * circumference)
            
            cumulativePercent += percent
            
            return (
              <circle
                key={i}
                r={radius}
                cx="50"
                cy="50"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className={`${colors[i % colors.length]} hover:opacity-80 transition-opacity cursor-pointer`}
              >
                <title>{entry.username}: {percent}%</title>
              </circle>
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
           <Trophy className="w-5 h-5 text-slate-300 mb-1" />
           <span className="text-[10px] text-slate-500 font-medium">Top {topData.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-4 w-full px-4">
        {topData.map((entry, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-2 h-2 rounded-full bg-current ${colors[i % colors.length].replace('text-', 'bg-')}`} />
                <span className="truncate max-w-[80px] text-slate-600 font-medium" title={entry.username}>{entry.username}</span>
                <span className="text-slate-400 ml-auto">{entry.percentage}%</span>
            </div>
        ))}
      </div>
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  
  const [viewState, setViewState] = useState<'login' | 'register' | 'profile'>('login')
  const [activeTab, setActiveTab] = useState<'terminals' | 'routes'>('terminals')
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [user, setUser] = useState<UserData | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [contributions, setContributions] = useState<ContributionsSummary | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/lakbay-leaderboards/`)
        if (response.ok) {
            const json = await response.json()
            let data: LeaderboardEntry[] = []
            
            if (json.contributors && Array.isArray(json.contributors)) {
                data = json.contributors
            } else if (Array.isArray(json)) {
                data = json
            }
            setLeaderboard(data)
        }
    } catch (error) {
        console.error(error)
    }
  }, [])

  const fetchContributions = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/my-contributions/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setContributions(data)
      }
    } catch (error) {
      console.error(error)
    }
  }, [])

  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem("accessToken")
    const storedUserStr = localStorage.getItem("user")
    
    if (!token) {
      setIsPageLoading(false)
      return
    }

    try {
      let localUser: UserData | null = null
      if (storedUserStr) {
         try { localUser = JSON.parse(storedUserStr) } catch {}
      }

      const response = await fetch(`${API_BASE_URL}/email-verification/status/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        
        const updatedUser: UserData = {
            username: data.username,
            email: data.email || data.primary_email,
            is_staff: localUser?.is_staff || false,
            is_superuser: localUser?.is_superuser || false
        }

        setUser(updatedUser)
        setIsVerified(data.email_verified)
        setViewState('profile')
        fetchContributions(token)
        fetchLeaderboard()
      } else {
        handleLogout() 
      }
    } catch {
      handleLogout()
    } finally {
      setIsPageLoading(false)
    }
  }, [fetchContributions, fetchLeaderboard])

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError(null)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (viewState === 'register' && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const endpoint = viewState === 'login' ? "/accounts/login/" : "/accounts/register/"
      const payload = viewState === 'login'
        ? { username: formData.username, password: formData.password }
        : { 
            username: formData.username, 
            email: formData.email, 
            password: formData.password, 
            password_confirm: formData.confirmPassword 
          }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.username) throw new Error(data.username[0])
        if (data.email) throw new Error(data.email[0])
        if (data.password) throw new Error(data.password[0])
        if (data.detail) throw new Error(data.detail)
        throw new Error("Authentication failed")
      }

      localStorage.setItem("accessToken", data.access_token)
      localStorage.setItem("refreshToken", data.refresh_token)
      localStorage.setItem("user", JSON.stringify(data.user))

      if (viewState === 'login') {
        setUser(data.user)
        checkAuthStatus()
      } else {
        setSuccess("Account created! Please check your email.")
        setTimeout(() => {
            setViewState('login')
            setSuccess(null)
        }, 2000)
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    const token = localStorage.getItem("accessToken")

    try {
      const response = await fetch(`${API_BASE_URL}/email-verification/resend/`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess("Verification email sent! Check your inbox.")
      } else {
        if (response.status === 429) {
             throw new Error("Please wait a few minutes before trying again.")
        }
        throw new Error(data.message || "Failed to resend email")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    setUser(null)
    setContributions(null)
    setLeaderboard([])
    setViewState('login')
    setFormData({ username: "", email: "", password: "", confirmPassword: "" })
  }

  const handleViewOnMap = (lat: string, lng: string) => {
    router.push(`/?lat=${lat}&lng=${lng}&zoom=16`)
  }

  if (isPageLoading) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400"/>
        </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex bg-white">
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative justify-center items-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518558997970-4dadc805574e?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 text-center text-white p-8">
            <div className="mx-auto w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8 backdrop-blur-md border border-white/20 shadow-2xl">
                <MapPin className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-6xl font-bold mb-6 tracking-tight">LakBayan</h1>
            <p className="text-xl text-slate-300 font-light max-w-md mx-auto leading-relaxed">
                Navigate the Philippines with community-driven transport data.
            </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen relative bg-white lg:bg-slate-50">
        <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col justify-center items-center p-6 md:p-12">
                <div className="w-full max-w-md space-y-8 bg-white lg:bg-transparent rounded-2xl lg:rounded-none p-6 lg:p-0 shadow-xl lg:shadow-none border border-slate-100 lg:border-none">
                    
                    <div className="lg:hidden text-center space-y-2 mb-8">
                        <div className="mx-auto w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                            <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">LakBayan</h1>
                    </div>

                    {viewState === 'profile' && user ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center space-y-4 relative">
                                <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-4xl font-bold text-slate-700 border-4 border-white shadow-lg relative">
                                    {user.username.charAt(0).toUpperCase()}
                                    {(user.is_staff || user.is_superuser) && (
                                        <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-1.5 border-4 border-white">
                                            <Shield className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{user.username}</h2>
                                    <p className="text-slate-500 font-medium text-sm">{user.email}</p>
                                    {(user.is_staff || user.is_superuser) && (
                                        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Administrator
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(user.is_staff || user.is_superuser) && (
                                <div 
                                    onClick={() => router.push('/admin/dashboard')}
                                    className="bg-slate-900 rounded-xl p-5 shadow-xl relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl border border-slate-800"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl transition-opacity group-hover:opacity-100 opacity-50"></div>
                                    
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-600/20 p-3 rounded-lg border border-blue-500/30">
                                                <LayoutDashboard className="w-6 h-6 text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold text-lg">Admin Dashboard</h3>
                                                <p className="text-slate-400 text-xs mt-0.5 font-medium">Access system analytics & logs</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-full group-hover:bg-white/10 transition-colors">
                                            <ChevronRight className="w-5 h-5 text-slate-300" />
                                        </div>
                                    </div>
                                    
                                    <div className="mt-5 pt-4 border-t border-white/10 flex gap-6">
                                        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                                            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Live Analytics
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                                            <User className="w-3.5 h-3.5 text-blue-400" /> User Management
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isVerified ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-amber-100 p-2 rounded-full shrink-0">
                                            <ShieldAlert className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-amber-900">Email Not Verified</h3>
                                            <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                                                Please verify your email address to unlock contribution features.
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleResendVerification} 
                                        disabled={isLoading}
                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm font-medium"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Mail className="w-4 h-4 mr-2"/>}
                                        Resend Verification Email
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {contributions && (
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2 font-bold text-slate-800">
                                                    <FileText className="w-4 h-4" /> My Contributions
                                                </div>
                                                <span className="text-xs bg-slate-900 text-white px-2.5 py-1 rounded-full font-bold">
                                                    {contributions.summary.total_contributions} Total
                                                </span>
                                            </div>

                                            <div className="w-full">
                                                <div className="flex border-b border-slate-200">
                                                    <button 
                                                        onClick={() => setActiveTab('terminals')}
                                                        className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'terminals' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                                    >
                                                        Terminals ({contributions.terminals.total})
                                                    </button>
                                                    <button 
                                                        onClick={() => setActiveTab('routes')}
                                                        className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'routes' ? 'bg-white text-green-600 border-b-2 border-green-600' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                                    >
                                                        Routes ({contributions.routes.total})
                                                    </button>
                                                </div>
                                                
                                                <ScrollArea className="h-[280px] bg-slate-50/30">
                                                    {activeTab === 'terminals' ? (
                                                        contributions.terminals.data.length > 0 ? (
                                                            <div className="divide-y divide-slate-100">
                                                                {contributions.terminals.data.map((term, i) => (
                                                                    <div key={i} className="p-4 bg-white hover:bg-slate-50 transition-colors flex justify-between items-start gap-3">
                                                                        <div className="space-y-1.5 w-full">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="p-1.5 bg-blue-100 rounded-md">
                                                                                        <Bus className="w-3.5 h-3.5 text-blue-600" />
                                                                                    </div>
                                                                                    <span className="font-semibold text-sm text-slate-900">{term.name}</span>
                                                                                </div>
                                                                                {term.verified ? (
                                                                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-emerald-200">Verified</span>
                                                                                ) : (
                                                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-amber-200">Pending</span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 line-clamp-2 pl-9">{term.description}</p>
                                                                        </div>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="outline" 
                                                                            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 shrink-0 shadow-sm"
                                                                            title="View location on map"
                                                                            onClick={() => handleViewOnMap(term.latitude, term.longitude)}
                                                                        >
                                                                            <MapPin className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 space-y-3">
                                                                <div className="bg-slate-100 p-4 rounded-full">
                                                                    <Bus className="w-6 h-6 text-slate-300" />
                                                                </div>
                                                                <span className="text-sm font-medium">No terminals contributed yet.</span>
                                                            </div>
                                                        )
                                                    ) : (
                                                        contributions.routes.data.length > 0 ? (
                                                            <div className="divide-y divide-slate-100">
                                                                {contributions.routes.data.map((route, i) => (
                                                                    <div key={i} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                                                                        <div className="flex items-center justify-between mb-1.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="p-1.5 bg-green-100 rounded-md">
                                                                                    <Waypoints className="w-3.5 h-3.5 text-green-600" />
                                                                                </div>
                                                                                <span className="font-semibold text-sm text-slate-900">To: {route.destination_name}</span>
                                                                            </div>
                                                                            {route.verified ? (
                                                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-emerald-200">Verified</span>
                                                                            ) : (
                                                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-amber-200">Pending</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-slate-500 line-clamp-2 pl-9">{route.description}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 space-y-3">
                                                                <div className="bg-slate-100 p-4 rounded-full">
                                                                    <Waypoints className="w-6 h-6 text-slate-300" />
                                                                </div>
                                                                <span className="text-sm font-medium">No routes contributed yet.</span>
                                                            </div>
                                                        )
                                                    )}
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    )}

                                    {/* Community Leaderboard */}
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2 font-bold text-slate-800">
                                                <Trophy className="w-4 h-4 text-amber-500" /> Community Leaderboard
                                            </div>
                                            <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-100 font-normal text-xs">
                                                Lakbay Points
                                            </Badge>
                                        </div>
                                        <div className="p-4 grid grid-cols-1 gap-4">
                                            {leaderboard.length > 0 ? (
                                                <>
                                                    <div className="bg-slate-50/50 rounded-lg border border-slate-100">
                                                        <ContributorsPieChart data={leaderboard} />
                                                    </div>
                                                    <ScrollArea className="h-[200px]">
                                                        <div className="space-y-1">
                                                            {leaderboard.map((entry, i) => (
                                                                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`
                                                                            w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border
                                                                            ${i === 0 ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 
                                                                              i === 1 ? 'bg-slate-50 text-slate-600 border-slate-200' : 
                                                                              i === 2 ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                                                                              'bg-white text-slate-400 border-slate-100'}
                                                                        `}>
                                                                            {i < 3 ? <Medal className="w-3 h-3" /> : i + 1}
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-sm font-semibold text-slate-700 block">{entry.username}</span>
                                                                            <div className="flex gap-2 text-[10px] text-slate-400">
                                                                                <span className="flex items-center gap-0.5"><MapPin className="w-2 h-2"/> {entry.verified_terminals}</span>
                                                                                <span className="flex items-center gap-0.5"><Route className="w-2 h-2"/> {entry.verified_routes}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-700">{entry.lakbay_points} <span className="text-[9px] font-normal text-slate-400">pts</span></span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </>
                                            ) : (
                                                <div className="text-center py-8 text-slate-400 text-xs">
                                                    Loading leaderboard...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-50 text-green-600 text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in border border-green-100">
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <span className="font-medium">{success}</span>
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in border border-red-100">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span className="font-medium">{error}</span>
                                </div>
                            )}
                            
                            <div className="grid gap-3 pt-4 border-t border-slate-100">
                                <Button className="w-full h-12 text-base bg-slate-900 hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all" onClick={() => router.push('/')}>
                                    Go to Map <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" className="w-full h-11 border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-medium" onClick={() => router.push('/about')}>
                                        About <Info className="w-4 h-4 ml-2" />
                                    </Button>

                                    <Button variant="ghost" className="w-full h-11 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium" onClick={handleLogout}>
                                        Sign Out <LogOut className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    {viewState === 'login' ? "Welcome back" : "Create an account"}
                                </h2>
                                <p className="text-slate-500">
                                    {viewState === 'login' ? "Enter your details to sign in to your account" : "Enter your details below to create your account"}
                                </p>
                            </div>

                            <div className="bg-slate-100 p-1.5 rounded-xl flex shadow-inner">
                                <button
                                    onClick={() => { setViewState('login'); setError(null); setSuccess(null); }}
                                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                        viewState === 'login' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    }`}
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => { setViewState('register'); setError(null); setSuccess(null); }}
                                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                        viewState === 'register' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    }`}
                                >
                                    Register
                                </button>
                            </div>

                            <form onSubmit={handleAuth} className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">Username</Label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <Input 
                                            name="username"
                                            placeholder="jdelacruz" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all" 
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                {viewState === 'register' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                        <Label className="text-slate-700 font-medium">Email</Label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            <Input 
                                                name="email"
                                                type="email" 
                                                placeholder="juan@example.com" 
                                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all" 
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">Password</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <Input 
                                            name="password"
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="••••••••" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all" 
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </div>

                                {viewState === 'register' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                        <Label className="text-slate-700 font-medium">Confirm Password</Label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            <Input 
                                                name="confirmPassword"
                                                type="password" 
                                                placeholder="••••••••" 
                                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all" 
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in border border-red-100">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span className="font-medium">{error}</span>
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-green-50 text-green-600 text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in border border-green-100">
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        <span className="font-medium">{success}</span>
                                    </div>
                                )}

                                <Button className="w-full h-12 text-base bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all" type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {viewState === 'login' ? "Sign In" : "Create Account"}
                                </Button>
                            </form>

                            {viewState === 'login' && (
                                <div className="text-center">
                                    <Link href="/forgot-password" className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline transition-colors">
                                        Forgot your password?
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}