'use client'

import { useTheme } from '@/providers/ThemeProvider'
import { useState, useEffect } from 'react'
import { Sun, Moon, Bell, Shield, Languages, Ruler, Eye, Loader2, Sparkles, KeyRound, CheckCircle2, AlertCircle, EyeOff } from 'lucide-react'
import { getGeminiApiKey, setGeminiApiKey, validateGeminiKey } from '@/lib/floor-plan-ai/gemini-analyzer'
import type { GeminiModel } from '@/lib/floor-plan-ai/gemini-analyzer'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Settings states
  const [unit, setUnit] = useState('metric')
  const [lang, setLang] = useState('en')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [processAlerts, setProcessAlerts] = useState(true)

  // AI Engine states
  const [geminiKey, setGeminiKeyState] = useState('')
  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [geminiModel, setGeminiModel] = useState<GeminiModel>('gemini-3.5-flash')
  const [testingKey, setTestingKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<'untested' | 'valid' | 'invalid'>('untested')

  // Ensure theme is mounted to prevent hydration mismatches
  useEffect(() => {
    setMounted(true)
    const savedUnit = localStorage.getItem('bw-pref-unit') || 'metric'
    const savedLang = localStorage.getItem('bw-pref-lang') || 'en'
    const savedModel = (localStorage.getItem('bw_gemini_model') as GeminiModel) || 'gemini-3.5-flash'
    setUnit(savedUnit)
    setLang(savedLang)
    setGeminiModel(savedModel)
    const key = getGeminiApiKey()
    setGeminiKeyState(key)
    setGeminiKeyInput(key)
    if (key) setKeyStatus('untested')
  }, [])

  const handleTestAndSaveKey = async () => {
    if (!geminiKeyInput.trim()) return
    setTestingKey(true)
    setKeyStatus('untested')
    const valid = await validateGeminiKey(geminiKeyInput.trim(), geminiModel)
    setKeyStatus(valid ? 'valid' : 'invalid')
    if (valid) {
      setGeminiApiKey(geminiKeyInput.trim())
      setGeminiKeyState(geminiKeyInput.trim())
    }
    setTestingKey(false)
  }

  const handleModelChange = (m: GeminiModel) => {
    setGeminiModel(m)
    localStorage.setItem('bw_gemini_model', m)
  }

  const handleClearKey = () => {
    setGeminiApiKey('')
    setGeminiKeyState('')
    setGeminiKeyInput('')
    setKeyStatus('untested')
  }


  const handleUnitChange = (val: string) => {
    setUnit(val)
    localStorage.setItem('bw-pref-unit', val)
  }

  const handleLangChange = (val: string) => {
    setLang(val)
    localStorage.setItem('bw-pref-lang', val)
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="max-w-[640px] mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Application Settings</h2>
        <p className="text-[14px] text-black/40 dark:text-white/35 mt-1">
          Customize design theme, calculation units, languages, notifications, and AI engine.
        </p>
      </div>


      <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-6 divide-y divide-black/[0.05] dark:divide-white/[0.05]">
        {/* Theme Preferences */}
        <div className="flex items-center justify-between pb-6 gap-4">

          <div className="space-y-0.5">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-500" /> Interface Theme
            </h3>
            <p className="text-[12px] text-black/40 dark:text-white/30">Select dark mode, light mode, or system themes</p>
          </div>
          <div className="flex bg-black/[0.04] dark:bg-white/[0.04] p-1 rounded-2xl">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all ${
                theme === 'light' ? 'bg-white dark:bg-[#252530] shadow-sm text-violet-600' : 'text-black/50 dark:text-white/40'
              }`}
            >
              <Sun className="w-4 h-4" /> Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all ${
                theme === 'dark' ? 'bg-white dark:bg-[#252530] shadow-sm text-violet-600' : 'text-black/50 dark:text-white/40'
              }`}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
          </div>
        </div>

        {/* Calculation Units */}
        <div className="flex items-center justify-between py-6 gap-4">
          <div className="space-y-0.5">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <Ruler className="w-4 h-4 text-violet-500" /> Engineering Units
            </h3>
            <p className="text-[12px] text-black/40 dark:text-white/30">Set default metrics used in takeoff calculations</p>
          </div>
          <select
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13px] focus:outline-none focus:border-violet-500 transition-all font-semibold"
          >
            <option value="metric">Metric (m, m³, kg)</option>
            <option value="imperial">Imperial (ft, yard, lb)</option>
          </select>
        </div>

        {/* Language Preferences */}
        <div className="flex items-center justify-between py-6 gap-4">
          <div className="space-y-0.5">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <Languages className="w-4 h-4 text-violet-500" /> System Language
            </h3>
            <p className="text-[12px] text-black/40 dark:text-white/30">Set preferred language for report templates</p>
          </div>
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13px] focus:outline-none focus:border-violet-500 transition-all font-semibold"
          >
            <option value="en">English (US/UK)</option>
            <option value="es">Español</option>
            <option value="mr">Marathi</option>
            <option value="hi">Hindi</option>
          </select>
        </div>

        {/* Email Alerts Toggle */}
        <div className="flex items-center justify-between py-6 gap-4">
          <div className="space-y-0.5">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <Bell className="w-4 h-4 text-violet-500" /> Process Notifications
            </h3>
            <p className="text-[12px] text-black/40 dark:text-white/30">Alert when AI completes estimation runs</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={processAlerts}
              onChange={() => setProcessAlerts(!processAlerts)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-black/[0.1] dark:bg-white/[0.1] rounded-full peer peer-focus:ring-2 peer-focus:ring-violet-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
          </label>
        </div>

        {/* Email Alerts Toggle */}
        <div className="flex items-center justify-between pt-6 gap-4">
          <div className="space-y-0.5">
            <h3 className="text-[14px] font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-500" /> Email Reports
            </h3>
            <p className="text-[12px] text-black/40 dark:text-white/30">Receive PDF files directly to your inbox</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={() => setEmailAlerts(!emailAlerts)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-black/[0.1] dark:bg-white/[0.1] rounded-full peer peer-focus:ring-2 peer-focus:ring-violet-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
          </label>
        </div>
      </div>
    </div>
  )
}
