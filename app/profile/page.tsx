"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, Lock, Mail, User, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

const API_BASE_URL = "https://api-lakbayan.onrender.com/api"

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError(null)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const endpoint = isLogin ? "/accounts/login/" : "/accounts/register/"
      const payload = isLogin 
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

      setSuccess(isLogin ? "Login successful!" : "Account created! Please check your email for verification.")
      
      setTimeout(() => {
        router.push("/") 
      }, 1500)

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Something went wrong")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        
        <div className="bg-slate-900 p-6 text-white text-center">
          <h1 className="text-2xl font-bold mb-1">LakBayan</h1>
          <p className="text-slate-300 text-sm">
            {isLogin ? "Welcome back, Traveler" : "Join the Community"}
          </p>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                !isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  name="username"
                  placeholder="jdelacruz" 
                  className="pl-10" 
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    name="email"
                    type="email" 
                    placeholder="juan@example.com" 
                    className="pl-10" 
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="pl-10" 
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    name="confirmPassword"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10" 
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {isLogin && (
             <p className="text-center mt-4 text-xs text-muted-foreground cursor-pointer hover:underline">
               Forgot your password?
             </p>
          )}
        </div>
      </div>
    </div>
  )
}