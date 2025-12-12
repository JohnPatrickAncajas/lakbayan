"use client"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }

    fetch(`https://lakbayan-backend.onrender.com/api/accounts/verify-email/?token=${token}`)
      .then(res => {
        if (res.ok) setStatus('success')
        else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
        {status === 'loading' && <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600"/>}
        
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600"/>
            <h1 className="text-xl font-bold">Email Verified!</h1>
            <Button onClick={() => router.push('/auth')}>Go to Login</Button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-red-600"/>
            <h1 className="text-xl font-bold">Verification Failed</h1>
            <p className="text-sm text-slate-500">Invalid or expired token.</p>
            <Button variant="outline" onClick={() => router.push('/auth')}>Back to Login</Button>
          </>
        )}
      </div>
    </div>
  )
}