"use client"
// app/page.tsx — ShopBot customer support UI
// Sidebar (branding + quick actions) + main chat area
// ─────────────────────────────────────────────────────────────────

import { useChat }    from "@ai-sdk/react"
import { useRef, useEffect, useState, useCallback } from "react"
import ChatMessage    from "./components/ChatMessage"

const QUICK_ACTIONS = [
  { label: "Track an order",         prompt: "I'd like to track my order" },
  { label: "Return an item",         prompt: "I want to return an item I purchased" },
  { label: "Shipping information",   prompt: "What are your shipping options and delivery times?" },
  { label: "Report damaged item",    prompt: "I received a damaged item and need help" },
  { label: "Create support ticket",  prompt: "I need to create a support ticket for an issue" },
  { label: "Refund status",          prompt: "When will I receive my refund?" },
]

export default function Home() {
  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const {
    messages, input, handleInputChange,
    handleSubmit, status, setInput, append,
  } = useChat({
    api: "/api/chat",
    body:    { sessionId },
    onResponse: (res) => {
      const sid = res.headers.get("x-session-id")
      if (sid && !sessionId) setSessionId(sid)
    },
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendQuick = useCallback((prompt: string) => {
    append({ role: "user", content: prompt })
    inputRef.current?.focus()
  }, [append])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    handleSubmit(e)
  }

  return (
    <div className="shell">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="brand__logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#2563eb"/>
              <path d="M7 10h14M7 14h9M7 18h11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="brand__name">TechDesk</span>
          </div>
          <div className="brand__badge">Support</div>
        </div>

        <div className="sidebar__section">
          <p className="sidebar__label">Quick actions</p>
          {QUICK_ACTIONS.map((a, i) => (
            <button key={i} className="quick-btn" onClick={() => sendQuick(a.prompt)}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="sidebar__section sidebar__section--bottom">
          <div className="sidebar__status">
            <span className="status-dot" />
            <span>AI support active</span>
          </div>
          {sessionId && (
            <p className="sidebar__session">
              Session: {sessionId.slice(0, 8)}…
            </p>
          )}
          <p className="sidebar__footer">
            Powered by Groq · Vercel AI SDK · Supabase
          </p>
        </div>
      </aside>

      {/* ── Main chat ── */}
      <main className="chat">

        {/* Header */}
        <header className="chat__header">
          <div className="chat__header-info">
            <div className="chat__avatar">SB</div>
            <div>
              <p className="chat__name">ShopBot</p>
              <p className="chat__sub">Customer Support · Usually replies instantly</p>
            </div>
          </div>
          <div className="chat__header-pills">
            <span className="pill pill--rag">RAG</span>
            <span className="pill pill--tools">Tools</span>
            <span className="pill pill--stream">Live</span>
          </div>
        </header>

        {/* Messages */}
        <div className="chat__messages">

          {/* Welcome state */}
          {messages.length === 0 && (
            <div className="welcome">
              <div className="welcome__icon">💬</div>
              <h2 className="welcome__title">Hi there! I'm ShopBot.</h2>
              <p className="welcome__desc">
                I can help you track orders, process returns, answer
                questions about shipping and policies, and create support
                tickets — all in real time.
              </p>
              <p className="welcome__hint">Try one of the quick actions on the left, or type your question below.</p>
            </div>
          )}

          {/* Message list */}
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="msg msg--assistant">
              <div className="msg__avatar">SB</div>
              <div className="msg__body">
                <div className="typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat__input-wrap">
          <form className="chat__form" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              className="chat__input"
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message… (e.g. track order ORD-10022)"
              disabled={isLoading}
              autoFocus
            />
            <button className="chat__send" type="submit" disabled={isLoading || !input.trim()}>
              {isLoading
                ? <span className="spinner" />
                : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9h14M9 2l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>
          </form>
          <p className="chat__hint">
            Try: "Where is order ORD-10022?" · "Can I return ORD-10021?" · "What is your refund policy?"
          </p>
        </div>

      </main>
    </div>
  )
}