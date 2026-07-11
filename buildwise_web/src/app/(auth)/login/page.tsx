'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Hexagon, ArrowRight, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { setToken, setUser, demoLogin } from '@/lib/auth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await authApi.login(data.email, data.password)
      setToken(res.data.access_token)
      setUser(res.data.user)
      router.push('/dashboard')
    } catch (err: any) {
      // ── Demo / offline fallback ──
      try {
        const mockUser = demoLogin(data.email, data.password)
        setToken('demo_token_' + Date.now())
        setUser(mockUser as any)
        router.push('/dashboard')
      } catch (demoErr: any) {
        setServerError(demoErr?.message || 'Invalid email or password')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#121212] flex">
      {/* Left — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <Hexagon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">
              BuildWise<span className="text-violet-400"> AI</span>
            </span>
          </Link>

          <h1 className="text-3xl font-black tracking-tight mb-2">Welcome back</h1>
          <p className="text-[15px] text-black/50 dark:text-white/40 mb-8">
            Sign in to continue to your dashboard.
          </p>

          {serverError && (
            <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13.5px]">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.08] dark:border-white/[0.08] text-[14px] placeholder:text-black/25 dark:placeholder:text-white/20 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
              />
              {errors.email && (
                <p className="mt-1 text-[12px] text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.08] dark:border-white/[0.08] text-[14px] placeholder:text-black/25 dark:placeholder:text-white/20 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4.5 h-4.5 w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[12px] text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-[13px] text-violet-600 dark:text-violet-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-[14px] transition-all shadow-lg shadow-violet-600/25"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[13.5px] text-black/40 dark:text-white/30">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
              Sign up free
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right — promo panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center bg-violet-600/[0.04] dark:bg-violet-600/[0.06] border-l border-black/[0.06] dark:border-white/[0.06] px-12">
        <div className="max-w-[380px] text-center space-y-6">
          <div className="w-16 h-16 bg-violet-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-violet-600/30">
            <Hexagon className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">
            AI-Powered Estimation
          </h2>
          <p className="text-[15px] text-black/50 dark:text-white/40 leading-relaxed">
            Upload your building plan and instantly get a complete Bill of Quantities, material schedule, and cost breakdown in minutes.
          </p>
          <div className="grid grid-cols-2 gap-3 text-left mt-8">
            {[
              ['98%', 'Accuracy Rate'],
              ['3x', 'Faster Than Manual'],
              ['17+', 'Material Types'],
              ['5K+', 'Engineers Worldwide'],
            ].map(([val, label]) => (
              <div key={label} className="bg-white dark:bg-[#1E1E24] rounded-2xl p-4 border border-black/[0.06] dark:border-white/[0.06]">
                <p className="text-2xl font-black text-violet-600">{val}</p>
                <p className="text-[12px] text-black/40 dark:text-white/30 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
