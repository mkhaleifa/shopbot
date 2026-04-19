// app/api/chat/route.ts

import { streamText, tool, convertToCoreMessages } from "ai"
import { createGroq }            from "@ai-sdk/groq"
import { z }                     from "zod"
import {
  searchKnowledge,
  getOrder,
  createTicket,
  saveMessage,
  createSession,
} from "@/app/lib/supabase"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

// ── Helper: safely extract plain text from message content ────────────────────
function extractText(content: string | any[]): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("")
  }
  return ""
}

export async function POST(req: Request) {
  const { messages, sessionId: existingSession } = await req.json()

  const modelMessages =  convertToCoreMessages(messages)

  // ── Session management ──────────────────────────────────────────────────────
  let sessionId = existingSession
  if (!sessionId) {
    sessionId = await createSession()
  }

  // ── RAG: search knowledge base with the latest user message ────────────────
  const latestUserMessage = [...modelMessages].reverse().find(
    (m) => m.role === "user"
  )

  const userText = latestUserMessage ? extractText(latestUserMessage.content) : ""
  let ragContext = ""

  if (userText) {
    try {
      const docs = await searchKnowledge(userText, 3)
      if (docs.length > 0) {
        ragContext = docs
          .filter(d => d.similarity > 0.35)
          .map(d => `[${d.category.toUpperCase()}] ${d.title}:\n${d.content}`)
          .join("\n\n---\n\n")
      }
    } catch (err) {
      console.error("RAG search failed:", err)
    }
  }

  // ── System prompt — injected with RAG context ───────────────────────────────
  const systemPrompt = `You are ShopBot, a friendly and efficient customer support assistant for TechDesk — an online store selling electronics and computer accessories.

Your personality: warm, professional, concise. Never robotic.

 ${ragContext ? `RELEVANT KNOWLEDGE BASE DOCUMENTS (use these to answer accurately):
---
 ${ragContext}
---
Base your answers on these documents when relevant. Cite the policy naturally in your response.` : ""}

CAPABILITIES:
- Look up any order using its order ID (format: ORD-XXXXX)
- Create support tickets for issues that need follow-up
- Answer questions about shipping, returns, payments, products, warranties

RULES:
- Always greet the user warmly on the first message
- If asked about an order, use the lookupOrder tool — never guess order details
- If a customer seems frustrated or their issue cannot be resolved in chat, offer to create a support ticket
- For refunds and returns, always check the order status first
- Keep responses under 3 paragraphs unless listing steps
- If you don't know something, say so honestly and offer to create a ticket

SESSION ID: ${sessionId} (use this for context only, don't mention it to the user)`

  // ── Tool definitions ────────────────────────────────────────────────────────
  // FIX #1: v4 uses 'parameters' instead of 'inputSchema', and infers types automatically (no more <any, any>)
  const tools = {

    lookupOrder: tool({
      description: "Look up a customer's order by order ID. Use this whenever a customer asks about their order status, tracking, or delivery.",
      parameters: z.object({
        orderId: z.string(),
      }),
      execute: async ({ orderId }) => {
        const order = await getOrder(orderId)
        if (!order) {
          return { found: false, orderId, message: "Order not found. Please check the order ID and try again." }
        }
        return {
          found:         true,
          orderId:       order.id,
          product:       order.product,
          quantity:      order.quantity,
          status:        order.status,
          tracking:      order.tracking,
          totalUsd:      order.total_usd,
          customerName:  order.customer_name,
          placedDate:    new Date(order.created_at).toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric"
          }),
        }
      },
    }),

    createSupportTicket: tool({
      description: "Create a support ticket for issues that need follow-up from the support team. Use when: the customer is frustrated, the issue can't be resolved in chat, or they explicitly ask for a ticket.",
      parameters: z.object({
        customerName:  z.string(),
        customerEmail: z.string().describe("A valid customer email address"),
        subject:       z.string(),
        description:   z.string(),
        orderId:       z.string().optional(),
        priority:      z.enum(["low", "medium", "high"]),
      }),
      execute: async (params) => {
        try {
          const ticket = await createTicket({
            orderId:       params.orderId,
            customerName:  params.customerName,
            customerEmail: params.customerEmail,
            subject:       params.subject,
            description:   params.description,
            priority:      params.priority,
          })
          return {
            success:    true,
            ticketRef:  ticket.ticketRef,
            message:    `Ticket ${ticket.ticketRef} created successfully. Our team will respond within 24 hours.`,
          }
        } catch {
          return { success: false, message: "Failed to create ticket. Please try again." }
        }
      },
    }),

    checkReturnEligibility: tool({
      description: "Check if an order is eligible for return based on its status and purchase date.",
      parameters: z.object({
        orderId: z.string(),
      }),
      execute: async ({ orderId }) => {
        const order = await getOrder(orderId)
        if (!order) return { eligible: false, reason: "Order not found" }

        if (order.status === "cancelled") {
          return { eligible: false, reason: "Order was already cancelled", status: order.status }
        }
        if (order.status === "processing") {
          return { eligible: false, reason: "Order is still processing — you can request cancellation instead", status: order.status }
        }

        const daysSincePurchase = Math.floor(
          (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        const eligible = daysSincePurchase <= 30

        return {
          eligible,
          orderId:          order.id,
          product:          order.product,
          status:           order.status,
          daysSincePurchase,
          reason: eligible
            ? `Eligible for return (${30 - daysSincePurchase} days remaining in return window)`
            : `Return window has expired (${daysSincePurchase - 30} days past the 30-day limit)`,
        }
      },
    }),
  }

  // ── Save user message to Supabase ───────────────────────────────────────────
  if (userText) {
    await saveMessage(sessionId, "user", userText).catch(() => {})
  }

  // ── Stream the response ─────────────────────────────────────────────────────
  const result = streamText({
    model:    groq("llama-3.3-70b-versatile"),
    system:   systemPrompt,
    messages: modelMessages,
    tools,
    onFinish: async ({ text }) => {
      if (text) {
        await saveMessage(sessionId, "assistant", text).catch(() => {})
      }
    },
  })

  // FIX #2: Pass headers directly inside v4's toDataStreamResponse()
  return result.toDataStreamResponse({
    headers: {
      "x-session-id": sessionId, 
    },
  })
}