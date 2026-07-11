'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { User, Shield, Briefcase, Mail, Phone, Loader2, Key } from 'lucide-react'
import { profileApi } from '@/lib/api'
import { getUser, setUser } from '@/lib/auth'

export default function ProfilePage() {
  const user = getUser()

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [company, setCompany] = useState(user?.company || '')
  const [phone, setPhone] = useState(user?.phone || '')

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [profileMsg, setProfileMsg] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [isError, setIsError] = useState(false)

  const updateProfileMutation = useMutation({
    mutationFn: () => profileApi.update({ full_name: fullName, company, phone }),
    onSuccess: (res) => {
      setUser(res.data)
      setProfileMsg('Profile updated successfully!')
      setIsError(false)
    },
    onError: (err: any) => {
      setProfileMsg(err?.response?.data?.detail || 'Failed to update profile')
      setIsError(true)
    },
  })

  const changePwdMutation = useMutation({
    mutationFn: () => profileApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPwdMsg('Password updated successfully!')
      setIsError(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err: any) => {
      setPwdMsg(err?.response?.data?.detail || 'Failed to change password')
      setIsError(true)
    },
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg('')
    updateProfileMutation.mutate()
  }

  const handlePwdSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMsg('')
    if (newPassword !== confirmPassword) {
      setPwdMsg("New passwords don't match")
      setIsError(true)
      return
    }
    changePwdMutation.mutate()
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Account Profile</h2>
        <p className="text-[14px] text-black/40 dark:text-white/35 mt-1">
          Manage your personal details and account credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-white text-xl font-bold mb-3">
            {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <h3 className="font-bold text-[15px]">{user?.full_name}</h3>
          <p className="text-xs text-black/40 dark:text-white/30 capitalize mt-0.5">{user?.role} Profile</p>
          <div className="w-full border-t border-black/[0.05] dark:border-white/[0.05] pt-4 mt-4 space-y-2 text-left text-[12px] text-black/65 dark:text-white/40">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet-500" />
              <span className="truncate">{user?.email}</span>
            </div>
            {user?.company && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-violet-500" />
                <span className="truncate">{user.company}</span>
              </div>
            )}
          </div>
        </div>

        {/* Profile Edit Form */}
        <div className="md:col-span-2 bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-5">
          <h3 className="font-bold text-[14.5px]">Personal Information</h3>
          {profileMsg && (
            <div className={`px-4 py-2.5 rounded-xl border text-[13px] ${isError ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
              {profileMsg}
            </div>
          )}
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-black/60 dark:text-white/50 mb-1">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-black/60 dark:text-white/50 mb-1">Company / Organization</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-black/60 dark:text-white/50 mb-1">Phone Number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
            </div>
            <button type="submit" disabled={updateProfileMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-[13px] font-semibold transition-all">
              {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>

      {/* Security settings */}
      <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Key className="w-4.5 h-4.5 text-violet-500" />
          <h3 className="font-bold text-[14.5px]">Change Password</h3>
        </div>
        {pwdMsg && (
          <div className={`px-4 py-2.5 rounded-xl border text-[13px] ${isError ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
            {pwdMsg}
          </div>
        )}
        <form onSubmit={handlePwdSubmit} className="space-y-4 max-w-[400px]">
          <div>
            <label className="block text-[12px] font-semibold text-black/60 dark:text-white/50 mb-1">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-black/60 dark:text-white/50 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-black/60 dark:text-white/50 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
          </div>
          <button type="submit" disabled={changePwdMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-[13px] font-semibold transition-all">
            {changePwdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
