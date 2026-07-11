'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Hexagon, ArrowRight, Loader2, Check } from 'lucide-react'
import { authApi } from '@/lib/api'
import { setToken, setUser, demoRegister, demoLogin } from '@/lib/auth'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  company: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

const perks = [
  'Upload PDF, DWG, DXF, PNG drawings',
  'AI-powered material extraction',
  'Instant Bill of Quantities',
  'Professional PDF reports',
  'IS Code compliant calculations',
  'Free to start — no credit card needed',
]

export default function SignupPage() {
  const router = useRouter()
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await authApi.register({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        company: data.company,
      })
      // Auto-login after register
      const loginRes = await authApi.login(data.email, data.password)
      setToken(loginRes.data.access_token)
      setUser(loginRes.data.user)
      router.push('/dashboard')
    } catch (err: any) {
      // ── Demo / offline fallback ──
      // If the backend is not running, register & log in locally
      try {
        const mockUser = demoRegister({
          full_name: data.full_name,
          email: data.email,
          password: data.password,
          company: data.company,
        })
        setToken('demo_token_' + Date.now())
        setUser(mockUser as any)
        router.push('/dashboard')
      } catch (demoErr: any) {
        setServerError(demoErr?.message || err?.response?.data?.detail || 'Registration failed. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#121212] flex">
      {/* Left promo */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center bg-violet-600/[0.04] dark:bg-violet-600/[0.06] border-r border-black/[0.06] dark:border-white/[0.06] px-12">
        <div className="max-w-[360px]">
          <div className="w-14 h-14 bg-violet-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-violet-600/30">
            <Hexagon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-3">
            Join 5,000+ engineers
          </h2>
          <p className="text-[15px] text-black/50 dark:text-white/40 mb-8 leading-relaxed">
            BuildWise AI transforms your blueprints into accurate material estimates in minutes.
          </p>
          <ul className="space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-[14px]">
                <div className="w-5 h-5 rounded-full bg-violet-600/15 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-violet-600" />
                </div>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px]"
        >
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <Hexagon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">
              BuildWise<span className="text-violet-400"> AI</span>
            </span>
          </Link>

          <h1 className="text-3xl font-black tracking-tight mb-2">Create your account</h1>
          <p className="text-[15px] text-black/50 dark:text-white/40 mb-7">
            Start estimating construction materials with AI.
          </p>

          {serverError && (
            <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13.5px]">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">
                  Full Name *
                </label>
                <input
                  {...register('full_name')}
                  placeholder="Atharva Kulkarni"
                  className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.08] dark:border-white/[0.08] text-[14px] placeholder:text-black/25 dark:placeholder:text-white/20 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
                {errors.full_name && <p className="mt-1 text-[12px] text-red-500">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">
                  Company
                </label>
                <input
                  {...register('company')}
                  placeholder="Optional"
                  className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.08] dark:border-white/[0.08] text-[14px] placeholder:text-black/25 dark:placeholder:text-white/20 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">
                Email address *
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.08] dark:border-white/[0.08] text-[14px] placeholder:text-black/25 dark:placeholder:text-white/20 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
              />
              {errors.email && <p className="mt-1 text-[12px] text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 pr-11 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.08] dark:border-white/[0.08] text-[14px] placeholder:text-black/25 dark:placeholder:text-white/20 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60">
                  {showPwd ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[12px] text-red-500">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">
                Confirm Password *
              </label>
              <input
                {...register('confirm_password')}
                type="password"
                placeholder="Repeat your password"
                className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.08] dark:border-white/[0.08] text-[14px] placeholder:text-black/25 dark:placeholder:text-white/20 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
              />
              {errors.confirm_password && <p className="mt-1 text-[12px] text-red-500">{errors.confirm_password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-[14px] transition-all shadow-lg shadow-violet-600/25"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>Create Account <ArrowRight className="w-4 h-4" /></>)}
            </button>

            <p className="text-[12px] text-black/30 dark:text-white/25 text-center">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="text-violet-500 hover:underline">Terms</Link> and{' '}
              <Link href="/privacy" className="text-violet-500 hover:underline">Privacy Policy</Link>.
            </p>
          </form>

          <p className="mt-6 text-center text-[13.5px] text-black/40 dark:text-white/30">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
