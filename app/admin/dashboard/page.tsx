"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Loader2, 
  LayoutDashboard, 
  LogOut, 
  ArrowLeft, 
  Shield, 
  BarChart3, 
  Users,
  Clock,
  CalendarDays,
  Filter,
  Search,
  Activity,
  Trophy,
  Download,
  Medal,
  MapPin,
  Route,
  PieChart as PieChartIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const API_BASE_URL = "https://api-lakbayan.onrender.com/api"

interface TotalLoginMetric {
  hour: string
  count: number
}

interface UniqueUserMetric {
  hour: string
  unique_users: number
}

interface UserLoginMetric {
  hour: string
  user__username: string
  user__id: number
  count: number
}

interface LeaderboardEntry {
  username: string
  lakbay_points: number
  percentage: number
  verified_terminals: number
  verified_routes: number
}

interface AnalyticsData {
  hourly_logins: TotalLoginMetric[]
  unique_users: UniqueUserMetric[]
  user_activity: UserLoginMetric[]
  leaderboard: LeaderboardEntry[]
}

interface UserData {
  username: string
  is_staff: boolean
  is_superuser: boolean
}

type TimeRange = '24h' | '7d' | '30d' | 'all'
type Interval = '1h' | '6h' | '12h' | '24h'
type MetricItem = TotalLoginMetric | UniqueUserMetric

interface ChartDataPoint {
  label: string
  fullDate: string
  value: number
  originalDate: Date
}

const isArray = (value: unknown): value is unknown[] => Array.isArray(value)

const findArrayInData = (data: unknown): unknown[] => {
  if (isArray(data)) return data
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (isArray(record.contributors)) return record.contributors
    if (isArray(record.results)) return record.results
    if (isArray(record.leaderboard)) return record.leaderboard
    if (isArray(record.data)) return record.data
    
    for (const key in record) {
      if (isArray(record[key])) return record[key]
    }
  }
  return []
}

const formatDateLabel = (date: Date, interval: Interval) => {
  if (interval === '24h') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (interval === '1h') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
  }
  return date.toLocaleTimeString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true })
}

const getRelativeDateHeader = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === now.toDateString()) {
    return "Today"
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

const processChartData = (
  data: MetricItem[], 
  valueKey: 'count' | 'unique_users', 
  range: TimeRange, 
  interval: Interval
): ChartDataPoint[] => {
  if (!data.length) return []

  const now = new Date()
  let cutoff = new Date(0) 

  if (range === '24h') cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  if (range === '7d') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (range === '30d') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const filtered = data.filter(item => {
    const itemDate = new Date(item.hour)
    return itemDate >= cutoff
  })

  const grouped: Record<string, ChartDataPoint> = {}

  filtered.forEach(item => {
    const date = new Date(item.hour)
    let key = ""

    if (interval === '1h') {
      key = date.toISOString() 
    } else if (interval === '24h') {
      key = date.toISOString().split('T')[0]
    } else if (interval === '6h') {
      const q = Math.floor(date.getHours() / 6)
      key = `${date.toISOString().split('T')[0]}-Q${q}`
    } else if (interval === '12h') {
      const h = Math.floor(date.getHours() / 12)
      key = `${date.toISOString().split('T')[0]}-H${h}`
    }

    if (!grouped[key]) {
      grouped[key] = {
        label: key, 
        fullDate: key,
        value: 0,
        originalDate: date
      }
    }

    const record = item as unknown as Record<string, number | string>
    const val = Number(record[valueKey]) || 0
    grouped[key].value += val
    
    if (date < grouped[key].originalDate) {
      grouped[key].originalDate = date
    }
  })

  return Object.values(grouped)
    .sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime())
    .map(item => ({
      ...item,
      label: formatDateLabel(item.originalDate, interval)
    }))
}

const SimpleBarChart = ({ data, color }: { data: ChartDataPoint[], color: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 w-full text-slate-400 bg-slate-50/50 rounded-md border border-dashed border-slate-200">
        <span className="text-xs">No activity in this range</span>
      </div>
    )
  }

  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="w-full pt-4">
      <ScrollArea className="w-full pb-4">
        <div className="flex flex-row items-end gap-2 h-40 min-w-[300px] px-1">
          {data.map((item, i) => (
            <div key={i} className="flex-1 min-w-[30px] flex flex-col items-center gap-2 group h-full justify-end">
              <div className="w-full relative flex flex-col justify-end items-center h-full">
                <div 
                  className={`w-full ${color} rounded-t-sm transition-all duration-500 opacity-90 group-hover:opacity-100 min-h-[4px]`} 
                  style={{ height: `${(item.value / maxVal) * 100}%` }}
                />
                <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                  {item.value} • {item.label}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 text-center leading-tight w-full truncate px-0.5">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

const ContributorsPieChart = ({ data }: { data: LeaderboardEntry[] }) => {
  if (!data || data.length === 0) {
    return (
        <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
            No data for graph
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
      <div className="relative w-40 h-40">
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
           <Trophy className="w-6 h-6 text-slate-300 mb-1" />
           <span className="text-[10px] text-slate-500 font-medium">Top {topData.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-6 w-full px-2">
        {topData.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
                <div className={`w-2.5 h-2.5 rounded-full bg-current ${colors[i % colors.length].replace('text-', 'bg-')}`} />
                <span className="truncate max-w-[80px] text-slate-600 font-medium" title={entry.username}>{entry.username}</span>
                <span className="text-slate-400 ml-auto">{entry.percentage}%</span>
            </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [interval, setInterval] = useState<Interval>('24h')
  const [userSearch, setUserSearch] = useState("")

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    hourly_logins: [],
    unique_users: [],
    user_activity: [] ,
    leaderboard: []
  })

  const fetchAnalytics = useCallback(async (token: string) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` }

      const [resLogins, resUnique, resActivity, resLeaderboard] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/`, { headers }),
        fetch(`${API_BASE_URL}/analytics/unique-users/`, { headers }),
        fetch(`${API_BASE_URL}/analytics/all-logins/`, { headers }),
        fetch(`${API_BASE_URL}/analytics/lakbay-leaderboards/`, { headers })
      ])

      const hourlyData = resLogins.ok ? await resLogins.json() : []
      const uniqueData = resUnique.ok ? await resUnique.json() : []
      const activityData = resActivity.ok ? await resActivity.json() : []
      
      let leaderboardData: LeaderboardEntry[] = []
      
      if (resLeaderboard.ok) {
          const json = await resLeaderboard.json()
          const extractedArray = findArrayInData(json)
          leaderboardData = extractedArray as LeaderboardEntry[]
      }

      setAnalytics({
        hourly_logins: Array.isArray(hourlyData) ? hourlyData : [],
        unique_users: Array.isArray(uniqueData) ? uniqueData : [],
        user_activity: Array.isArray(activityData) ? activityData : [],
        leaderboard: leaderboardData
      })
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const checkAdminAccess = useCallback(() => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem("accessToken")
    const userStr = localStorage.getItem("user")

    if (!token || !userStr) {
      router.replace("/auth")
      return
    }

    try {
      const parsedUser = JSON.parse(userStr)
      if (!parsedUser.is_staff && !parsedUser.is_superuser) {
        router.replace("/") 
        return
      }
      setUser(parsedUser)
      fetchAnalytics(token)
    } catch {
      router.replace("/auth")
    }
  }, [router, fetchAnalytics])

  useEffect(() => {
    checkAdminAccess()
  }, [checkAdminAccess])

  const handleLogout = () => {
    localStorage.clear()
    router.replace("/auth")
  }

  const processedLogins = useMemo(() => 
    processChartData(analytics.hourly_logins, 'count', timeRange, interval), 
    [analytics.hourly_logins, timeRange, interval]
  )

  const processedUnique = useMemo(() => 
    processChartData(analytics.unique_users, 'unique_users', timeRange, interval), 
    [analytics.unique_users, timeRange, interval]
  )

  const filteredAndGroupedActivity = useMemo(() => {
    const now = new Date()
    let cutoff = new Date(0)
    
    if (timeRange === '24h') cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    if (timeRange === '7d') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (timeRange === '30d') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    let filtered = analytics.user_activity.filter(item => new Date(item.hour) >= cutoff)

    if (userSearch.trim()) {
      const lowerSearch = userSearch.toLowerCase()
      filtered = filtered.filter(item => 
        item.user__username.toLowerCase().includes(lowerSearch) || 
        String(item.user__id).includes(lowerSearch)
      )
    }

    filtered.sort((a, b) => new Date(b.hour).getTime() - new Date(a.hour).getTime())

    const grouped: Record<string, UserLoginMetric[]> = {}
    filtered.forEach(item => {
      const dateKey = new Date(item.hour).toDateString()
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(item)
    })

    return grouped
  }, [analytics.user_activity, timeRange, userSearch])

  const uniqueUsersFromList = useMemo(() => {
    const allItems = Object.values(filteredAndGroupedActivity).flat()
    const uniqueIds = new Set(allItems.map(item => item.user__id))
    return uniqueIds.size
  }, [filteredAndGroupedActivity])

  const totalLogins = processedLogins.reduce((acc, curr) => acc + curr.value, 0)
  const totalListEvents = Object.values(filteredAndGroupedActivity)
    .flat()
    .reduce((acc, curr) => acc + curr.count, 0)

  const downloadActivityCSV = () => {
    const flatData = Object.values(filteredAndGroupedActivity).flat()
    
    if (!flatData.length) return
  
    const pointsMap = new Map<string, number>()
    analytics.leaderboard.forEach(user => {
      pointsMap.set(user.username, user.lakbay_points)
    })

    const headers = ["Username", "User ID", "Login Count", "Lakbay Points", "Last Activity"]
    const csvContent = [
      headers.join(","),
      ...flatData.map(row => {
        const points = pointsMap.get(row.user__username) || 0
        return [
          row.user__username,
          row.user__id,
          row.count,
          points,
          `"${new Date(row.hour).toLocaleString()}"`
        ].join(",")
      })
    ].join("\n")
  
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `login_activity_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadLeaderboardCSV = () => {
    const data = analytics.leaderboard
    
    if (!data.length) return
  
    const headers = ["Rank", "Username", "Lakbay Points", "Verified Terminals", "Verified Routes", "Percentage"]
    const csvContent = [
      headers.join(","),
      ...data.map((row, index) => [
        index + 1,
        row.username,
        row.lakbay_points,
        row.verified_terminals,
        row.verified_routes,
        `${row.percentage}%`
      ].join(","))
    ].join("\n")
  
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `lakbay_leaderboard_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      <aside className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">AdminPanel</span>
          </div>

          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-white/90 hover:text-white hover:bg-white/10">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10" onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Map
            </Button>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs text-white">
              {user?.username?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.username || "Admin"}</p>
              <p className="text-xs text-white/50">Administrator</p>
            </div>
          </div>
          <Button variant="destructive" className="w-full" size="sm" onClick={handleLogout}>
            <LogOut className="w-3 h-3 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
            <p className="text-slate-500">Overview of system traffic and user activity.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-2 bg-white border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-sm"
                onClick={downloadActivityCSV}
                disabled={totalListEvents === 0}
            >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Log</span>
            </Button>
            
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                <CalendarDays className="w-4 h-4 text-slate-500" />
                <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
                    <SelectTrigger className="w-[130px] border-none h-7 text-xs font-medium focus:ring-0">
                    <SelectValue placeholder="Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <div className="flex items-center gap-2 px-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <Select value={interval} onValueChange={(v: Interval) => setInterval(v)}>
                    <SelectTrigger className="w-[130px] border-none h-7 text-xs font-medium focus:ring-0">
                    <SelectValue placeholder="Group By" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="1h">Hourly</SelectItem>
                    <SelectItem value="6h">Every 6 Hours</SelectItem>
                    <SelectItem value="12h">Every 12 Hours</SelectItem>
                    <SelectItem value="24h">Daily</SelectItem>
                    </SelectContent>
                </Select>
                </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold">{totalLogins}</span>
                <span className="text-xs text-slate-400">in selected range</span>
              </div>
              <SimpleBarChart 
                data={processedLogins}
                color="bg-blue-500" 
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold">{uniqueUsersFromList}</span>
                <span className="text-xs text-slate-400">distinct users in list</span>
              </div>
              <SimpleBarChart 
                data={processedUnique} 
                color="bg-emerald-500" 
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <Card className="lg:col-span-2 h-full shadow-sm flex flex-col">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-500"/>
                        <CardTitle className="text-lg">User Activity Log</CardTitle>
                        <Badge variant="secondary" className="text-xs font-normal text-slate-600 bg-slate-100 border border-slate-200">
                        {totalListEvents} Events
                        </Badge>
                    </div>
                    <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Search user..."
                        className="pl-9 h-9 text-sm"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                    />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-[500px] w-full pr-4">
                    {Object.keys(filteredAndGroupedActivity).length > 0 ? (
                        <div className="space-y-6">
                        {Object.entries(filteredAndGroupedActivity).map(([dateKey, items]) => (
                            <div key={dateKey} className="relative">
                            <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-2 mb-2 border-b border-slate-200/60 flex items-center gap-2 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {getRelativeDateHeader(dateKey)}
                                </h3>
                            </div>
                            <div className="space-y-1">
                                {items.map((item, i) => (
                                <div key={i} className="group flex items-center justify-between p-3 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3">
                                    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-2.5 rounded-full font-bold text-xs text-slate-700 shadow-sm group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
                                        {item.user__username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900 leading-none group-hover:text-blue-600 transition-colors">
                                        {item.user__username}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono mt-1">
                                        UID: {item.user__id}
                                        </span>
                                    </div>
                                    </div>
                                    
                                    <div className="text-right flex flex-col items-end gap-1">
                                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-5 border-slate-200 bg-white ${item.count > 1 ? 'text-blue-600 border-blue-200 bg-blue-50/50' : 'text-slate-500'}`}>
                                        {item.count} Login{item.count > 1 ? 's' : ''}
                                    </Badge>
                                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3 opacity-50" />
                                        {new Date(item.hour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </span>
                                    </div>
                                </div>
                                ))}
                            </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                            <div className="bg-slate-50 p-4 rounded-full mb-3 border border-slate-100">
                            <Search className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">No activity found</p>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search</p>
                        </div>
                    )}
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="space-y-6 h-full">
                <Card className="shadow-sm border-slate-200 h-full flex flex-col">
                    <CardHeader className="pb-2 border-b border-slate-50 flex-none">
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-purple-500" />
                            <CardTitle className="text-sm font-medium text-slate-700">Contribution Share</CardTitle>
                        </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2 flex-none">
                         <ContributorsPieChart data={analytics.leaderboard} />
                    </CardContent>
                    
                    <div className="border-t border-slate-100 mx-6 my-2"></div>
                    
                    <CardHeader className="pb-2 pt-2 flex-none">
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <CardTitle className="text-sm font-medium text-slate-700">Leaderboard</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                onClick={downloadLeaderboardCSV}
                                disabled={analytics.leaderboard.length === 0}
                                title="Download Leaderboard CSV"
                            >
                                <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-100 font-normal">
                                Lakbay Points
                            </Badge>
                        </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0">
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4 pb-4">
                            {analytics.leaderboard.length > 0 ? analytics.leaderboard.map((user, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shadow-sm
                                    ${i === 0 ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 
                                        i === 1 ? 'bg-slate-50 text-slate-600 border-slate-200' : 
                                        i === 2 ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                                        'bg-white text-slate-400 border-slate-100'}
                                    `}>
                                    {i < 3 ? <Medal className="w-4 h-4" /> : i + 1}
                                    </div>
                                    <div>
                                    <p className="text-sm font-semibold text-slate-900 leading-none">{user.username}</p>
                                    <div className="flex gap-2 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium" title="Verified Terminals">
                                            <MapPin className="w-3 h-3" />
                                            {user.verified_terminals}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium" title="Verified Routes">
                                            <Route className="w-3 h-3" />
                                            {user.verified_routes}
                                        </div>
                                    </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-slate-700">{user.lakbay_points}</span>
                                    <span className="text-[10px] text-slate-400">pts</span>
                                </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center">
                                    <Trophy className="w-8 h-8 mb-2 opacity-20" />
                                    No leaderboard data available
                                </div>
                            )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  )
}