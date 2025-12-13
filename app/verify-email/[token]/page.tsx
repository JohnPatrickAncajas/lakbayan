"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VerifyEmailPage() {
  const params = useParams()
  const router = useRouter()
  
  const rawToken = params?.token as string
  const fullToken = rawToken ? decodeURIComponent(rawToken) : null

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [debugMsg, setDebugMsg] = useState<string>('')

  useEffect(() => {
    if (!fullToken) {
      setStatus('error')
      setDebugMsg('No token found.')
      return
    }

    const verify = async () => {
        try {
            const res1 = await fetch(`https://api-lakbayan.onrender.com/verify-email/${fullToken}/`)
            if (res1.ok) {
                setStatus('success')
                return
            }

            const parts = fullToken.split(':')
            if (parts.length >= 2) {
                const uid = parts[0]
                const token = parts.slice(1).join(':')
                
                const res2 = await fetch('https://api-lakbayan.onrender.com/api/users/activation/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid, token })
                })

                if (res2.ok) {
                    setStatus('success')
                    return
                }
            }

            // STRATEGY 3: Standard Allauth (POST with key)
            const res3 = await fetch('https://api-lakbayan.onrender.com/api/auth/registration/verify-email/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: fullToken })
            })

            if (res3.ok) {
                setStatus('success')
                return
            }

            const text = await res1.text()
            throw new Error(`${res1.status} ${res1.statusText}: ${text.slice(0, 50)}...`)

        } catch (err: unknown) {
            setStatus('error')
            setDebugMsg(err instanceof Error ? err.message : 'An unknown error occurred')
        }
    }

    verify()
  }, [fullToken])

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
              {debugMsg}
            </p>
            <Button variant="outline" onClick={() => router.push('/auth')}>Back to Login</Button>
          </>
        )}
      </div>
    </div>
  )
}