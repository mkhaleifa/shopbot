"use client"
// app/components/ChatMessage.tsx
// Renders one message — handles text, tool calls, and tool results.
// ─────────────────────────────────────────────────────────────────

import type { Message } from "@ai-sdk/react"

// ── Order status badge ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  processing: { label: "Processing",  color: "#f59e0b" },
  shipped:    { label: "Shipped",     color: "#3b82f6" },
  delivered:  { label: "Delivered",  color: "#10b981" },
  cancelled:  { label: "Cancelled",  color: "#ef4444" },
}

function OrderCard({ data }: { data: any }) {
  if (!data.found) {
    return (
      <div className="tool-card tool-card--error">
        <p className="tool-card__label">Order not found</p>
        <p className="tool-card__sub">{data.message}</p>
      </div>
    )
  }
  const st = STATUS_CONFIG[data.status] ?? { label: data.status, color: "#888" }
  return (
    <div className="tool-card">
      <div className="tool-card__header">
        <span className="tool-card__icon">📦</span>
        <span className="tool-card__title">Order {data.orderId}</span>
        <span className="tool-card__badge" style={{ background: st.color + "22", color: st.color }}>
          {st.label}
        </span>
      </div>
      <div className="tool-card__row"><span>Product</span><strong>{data.product}</strong></div>
      <div className="tool-card__row"><span>Quantity</span><strong>{data.quantity}</strong></div>
      <div className="tool-card__row"><span>Total</span><strong>${data.totalUsd}</strong></div>
      <div className="tool-card__row"><span>Placed</span><strong>{data.placedDate}</strong></div>
      {data.tracking && (
        <div className="tool-card__row"><span>Tracking</span><strong className="tool-card__mono">{data.tracking}</strong></div>
      )}
    </div>
  )
}

function TicketCard({ data }: { data: any }) {
  return (
    <div className={`tool-card ${data.success ? "tool-card--success" : "tool-card--error"}`}>
      <div className="tool-card__header">
        <span className="tool-card__icon">{data.success ? "✓" : "✗"}</span>
        <span className="tool-card__title">
          {data.success ? `Ticket ${data.ticketRef} created` : "Ticket creation failed"}
        </span>
      </div>
      <p className="tool-card__sub">{data.message}</p>
    </div>
  )
}

function ReturnCard({ data }: { data: any }) {
  return (
    <div className={`tool-card ${data.eligible ? "tool-card--success" : "tool-card--warn"}`}>
      <div className="tool-card__header">
        <span className="tool-card__icon">{data.eligible ? "✓" : "✗"}</span>
        <span className="tool-card__title">Return eligibility — {data.orderId}</span>
      </div>
      <p className="tool-card__sub">{data.reason}</p>
      {data.product && (
        <div className="tool-card__row"><span>Product</span><strong>{data.product}</strong></div>
      )}
    </div>
  )
}

function ToolResult({ toolName, result }: { toolName: string; result: any }) {
  if (toolName === "lookupOrder")           return <OrderCard data={result} />
  if (toolName === "createSupportTicket")   return <TicketCard data={result} />
  if (toolName === "checkReturnEligibility") return <ReturnCard data={result} />
  return (
    <div className="tool-card">
      <pre style={{ fontSize: 11, color: "var(--text2)" }}>{JSON.stringify(result, null, 2)}</pre>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div className={`msg msg--${message.role}`}>
      <div className="msg__avatar">{isUser ? "You" : "SB"}</div>
      <div className="msg__body">
        {message.parts?.map((part, i) => {
          if (part.type === "text") {
            return (
              <div key={i} className="msg__text">
                {part.text.split("\n").map((line, j) =>
                  line.trim() ? <p key={j}>{line}</p> : <br key={j} />
                )}
              </div>
            )
          }
          if (part.type === "tool-invocation") {
            const { toolName, state } = part.toolInvocation
            if (state === "call") {
              return (
                <div key={i} className="tool-calling">
                  <span className="tool-calling__dot" />
                  {toolName === "lookupOrder"             && "Looking up order..."}
                  {toolName === "createSupportTicket"     && "Creating support ticket..."}
                  {toolName === "checkReturnEligibility"  && "Checking return eligibility..."}
                </div>
              )
            }
            if (state === "result" && part.toolInvocation.result) {
              return <ToolResult key={i} toolName={toolName} result={part.toolInvocation.result} />
            }
          }
          return null
        }) ?? (
          <div className="msg__text"><p>{message.content}</p></div>
        )}
      </div>
    </div>
  )
}