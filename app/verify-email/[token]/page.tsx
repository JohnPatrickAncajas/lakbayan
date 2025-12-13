"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VerifyEmailPage() {
  const params = useParams()
  const router = useRouter()
  
  const rawToken = params?.token as string
  const token = rawToken ? decodeURIComponent(rawToken) : null

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [debugMsg, setDebugMsg] = useState<string>('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setDebugMsg('No token found')
      return
    }

    fetch(`https://api-lakbayan.onrender.com/verify-email/?token=${token}`)
      .then(async res => {
        if (res.ok) {
          setStatus('success')
        } else {
          setStatus('error')
          setDebugMsg(`${res.status} ${res.statusText}`)
        }
      })
      .catch(err => {
        setStatus('error')
        setDebugMsg(err.message)
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
        {status === 'loading' && <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600"/>}
        
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600"/>
            <h1 className="text-xl font-bold">Email Verified!</h1>
            <p className="text-sm text-slate-500">Thank you for verifying your email.</p>
            <Button onClick={() => router.push('/auth')}>Go to Login</Button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-red-600"/>
            <h1 className="text-xl font-bold">Verification Failed</h1>
            <p className="text-xs text-red-500 bg-red-50 p-2 rounded font-mono break-all">
              {debugMsg || "Invalid or expired token."}
            </p>
            <Button variant="outline" onClick={() => router.push('/auth')}>Back to Login</Button>
          </>
        )}
      </div>
    </div>
  )
}