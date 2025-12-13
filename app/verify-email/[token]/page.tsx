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
        const allauthUrl = `https://api-lakbayan.onrender.com/accounts/confirm-email/${fullToken}/`

        try {
            let res = await fetch(allauthUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json, text/html' }
            })

            if (res.ok) {
                setStatus('success')
                return
            }

            res = await fetch(allauthUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) 
            })

            if (res.ok) {
                setStatus('success')
                return
            }

            const jsonUrl = 'https://lakbayan-backend.onrender.com/api/auth/registration/verify-email/'
            const jsonRes = await fetch(jsonUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: fullToken })
            })

            if (jsonRes.ok) {
                setStatus('success')
                return
            }

            setStatus('error')
            setDebugMsg(`Server rejected the key. Status: ${res.status}`)

        } catch (err: unknown) {
            setStatus('error')
            if (err instanceof Error) {
                setDebugMsg(err.message)
            } else {
                setDebugMsg("Connection failed")
            }
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
            <p className="text-sm text-slate-500">Your account is active.</p>
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