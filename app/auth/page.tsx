"use client"

import { useState, useEffect, useCallback } from "react"
import { Eye, EyeOff, Loader2, Lock, Mail, User, AlertCircle, CheckCircle2, ArrowLeft, MapPin, ShieldAlert, LogOut, ArrowRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import Link from "next/link"

const API_BASE_URL = "https://api-lakbayan.onrender.com/api"

interface UserData {
  username: string
  email: string
  id?: number
}

export default function AuthPage() {
  const router = useRouter()
  
  const [viewState, setViewState] = useState<'login' | 'register' | 'profile'>('login')
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [user, setUser] = useState<UserData | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem("accessToken")
    if (!token) {
      setIsPageLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/email-verification/status/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setUser({ username: data.username, email: data.email || data.primary_email })
        setIsVerified(data.email_verified)
        setViewState('profile')
      } else {
        handleLogout() 
      }
    } catch {
      handleLogout()
    } finally {
      setIsPageLoading(false)
    }
  }, [])

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
    setViewState('login')
    setFormData({ username: "", email: "", password: "", confirmPassword: "" })
  }

  if (isPageLoading) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400"/>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518558997970-4dadc805574e?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-5"></div>
      
      <Link href="/" className="absolute top-4 left-4 flex items-center text-slate-600 hover:text-slate-900 transition-colors z-10 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm">
         <ArrowLeft className="w-4 h-4 mr-1" /> Back to Map
      </Link>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative z-10">
        
        <div className="bg-slate-900 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 z-0"></div>
          <div className="relative z-10">
            {viewState === 'profile' && user ? (
               <>
                 <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-white/20">
                    {user.username.charAt(0).toUpperCase()}
                 </div>
                 <h1 className="text-xl font-bold">{user.username}</h1>
                 <p className="text-slate-300 text-sm">{user.email}</p>
               </>
            ) : (
               <>
                <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 backdrop-blur-md border border-white/20">
                    <MapPin className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-1 tracking-tight">LakBayan</h1>
                <p className="text-slate-300 text-sm font-medium">
                    {viewState === 'login' ? "Navigate the Philippines with ease" : "Join the community of travelers"}
                </p>
               </>
            )}
          </div>
        </div>

        <div className="p-8">
            
          {viewState === 'profile' && user ? (
             <div className="space-y-6">
                 {!isVerified ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-amber-900">Email Not Verified</h3>
                                <p className="text-xs text-amber-700 mt-1">
                                    Verify your email to start contributing.
                                </p>
                            </div>
                        </div>
                        <Button 
                            onClick={handleResendVerification} 
                            disabled={isLoading}
                            variant="outline" 
                            size="sm"
                            className="w-full border-amber-300 text-amber-800 hover:bg-amber-100"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Mail className="w-4 h-4 mr-2"/>}
                            Resend Verification Email
                        </Button>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <div>
                            <h3 className="font-semibold text-green-900">Account Verified</h3>
                            <p className="text-sm text-green-700">You are ready to contribute.</p>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4" />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
                
                <div className="grid gap-3">
                     <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800" onClick={() => router.push('/')}>
                        Go to Map <ArrowRight className="w-4 h-4 ml-2" />
                     </Button>
                     
                     <Button variant="outline" className="w-full h-11" onClick={() => router.push('/about')}>
                        About LakBayan <Info className="w-4 h-4 ml-2" />
                     </Button>

                     <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                     </Button>
                </div>
             </div>
          ) : (
          
          <>
            <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-lg">
                <button
                onClick={() => { setViewState('login'); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                    viewState === 'login' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                >
                Login
                </button>
                <button
                onClick={() => { setViewState('register'); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                    viewState === 'register' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                >
                Register
                </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Username</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                    name="username"
                    placeholder="jdelacruz" 
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all" 
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    />
                </div>
                </div>

                {viewState === 'register' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</Label>
                    <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        name="email"
                        type="email" 
                        placeholder="juan@example.com" 
                        className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all" 
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                    />
                    </div>
                </div>
                )}

                <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                    name="password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all" 
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    />
                    <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                </div>
                </div>

                {viewState === 'register' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Confirm Password</Label>
                    <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        name="confirmPassword"
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all" 
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                    />
                    </div>
                </div>
                )}

                {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 animate-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
                )}

                {success && (
                <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-start gap-2 animate-in slide-in-from-top-1">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{success}</span>
                </div>
                )}

                <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {viewState === 'login' ? "Sign In" : "Create Account"}
                </Button>
            </form>

            {viewState === 'login' && (
                <div className="text-center mt-6">
                <Link href="/forgot-password" className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline transition-colors">
                    Forgot your password?
                </Link>
                </div>
            )}
          </>
          )}
        </div>
      </div>
    </div>
  )
}