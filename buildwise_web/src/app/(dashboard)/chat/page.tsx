'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, User, Loader2, Bot, HelpCircle } from 'lucide-react'
import { aiApi } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  'What is the standard concrete mix ratio for M25 grade?',
  'How do I calculate steel reinforcement quantity for a slab?',
  'What is the standard brick size and mortar ratio under IS codes?',
  'How to convert 1:100 scale on drawing blueprint to meters?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your BuildWise AI Engineering Assistant. Ask me anything about building material estimation, concrete mix designs, steel reinforcement calculations, or IS code guidelines.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text: string) => {
    if (!text.trim()) return

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await aiApi.chat(text)
      const reply = res.data.response || res.data.reply || 'Sorry, I encountered an issue processing your query.'
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: 'Error: Could not connect to AI assistant backend service. Make sure your server is online.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] overflow-hidden">
      {/* Head */}
      <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
        <div className="w-9 h-9 bg-violet-600/10 rounded-xl flex items-center justify-center text-violet-600">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-[14.5px] font-bold">AI Assistant</h2>
          <p className="text-[11.5px] text-black/35 dark:text-white/25">Civil Engineering Expert Copilot</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-600 flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[75%] p-4 rounded-3xl text-[13.5px] leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-sm'
                  : 'bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] rounded-bl-sm text-black/80 dark:text-white/90'
              }`}
            >
              <p className="whitespace-pre-line">{msg.content}</p>
              <span className={`block text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/40' : 'text-black/30 dark:text-white/20'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                U
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3.5 justify-start">
            <div className="w-8 h-8 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-600 flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] p-4 rounded-3xl rounded-bl-sm flex items-center gap-2 text-xs text-black/45 dark:text-white/35">
              <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested prompts list when no conversation exists or just below */}
      {messages.length === 1 && (
        <div className="px-6 py-3 border-t border-black/[0.04] dark:border-white/[0.04]">
          <span className="text-[11px] text-black/35 dark:text-white/25 flex items-center gap-1 mb-2 font-semibold">
            <HelpCircle className="w-3.5 h-3.5" /> Suggested Queries
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-left px-3.5 py-2 rounded-xl border border-black/[0.06] dark:border-white/[0.06] hover:border-violet-500/20 bg-black/[0.01] dark:bg-white/[0.01] hover:bg-violet-600/[0.02] text-[12px] text-black/60 dark:text-white/50 truncate transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(input)
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask about concrete, mix designs, scaling blueprint annotations..."
            className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500 transition-all placeholder:text-black/30 dark:placeholder:text-white/20"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-11 h-11 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white flex items-center justify-center transition-all shadow-md shadow-violet-600/10"
          >
            <Send className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </button>
        </form>
      </div>
    </div>
  )
}
