'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Hexagon, ArrowLeft, ArrowRight, Loader2, Mail, Check } from 'lucide-react'
import { authApi } from '@/lib/api'

const schema = z.object({ email: z.string().email('Enter a valid email') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await authApi.forgotPassword(data.email)
      setSent(true)
    } catch (err: any) {
      setServerError(err?.response?.data?.detail || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#121212] flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px]"
      >
        <Link href="/login" className="inline-flex items-center gap-2 text-[13px] text-black/40 dark:text-white/30 hover:text-black/70 dark:hover:text-white/70 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div className="w-14 h-14 bg-violet-600/10 rounded-3xl flex items-center justify-center mb-6">
          <Mail className="w-7 h-7 text-violet-600" />
        </div>

        {!sent ? (
          <>
            <h1 className="text-3xl font-black tracking-tight mb-2">Forgot password?</h1>
            <p className="text-[15px] text-black/50 dark:text-white/40 mb-8">
              Enter your email and we&apos;ll send you a reset link.
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
                  className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.08] dark:border-white/[0.08] text-[14px] placeholder:text-black/25 dark:placeholder:text-white/20 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
                {errors.email && <p className="mt-1 text-[12px] text-red-500">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-[14px] transition-all shadow-lg shadow-violet-600/25"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>Send Reset Link <ArrowRight className="w-4 h-4" /></>)}
              </button>
            </form>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <div className="w-14 h-14 bg-green-500/15 rounded-3xl flex items-center justify-center mb-6">
              <Check className="w-7 h-7 text-green-500" />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Check your inbox</h1>
            <p className="text-[15px] text-black/50 dark:text-white/40 mb-6">
              We sent a password reset link to{' '}
              <span className="font-semibold text-black dark:text-white">{getValues('email')}</span>.
              Check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[14px] transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
