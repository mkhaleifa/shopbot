// app/lib/supabase.ts
// All database operations live here.
// RAG search, order lookup, ticket creation, chat history.
// ─────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js"
import { InferenceClient } from "@huggingface/inference"

// ─── Clients ─────────────────────────────────────────────────────────────────
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Service key for inserts (tickets, messages)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const hf = new InferenceClient(process.env.HF_TOKEN!)


// ─── RAG: embed a query and find relevant knowledge base docs ─────────────────
export async function searchKnowledge(query: string, topK = 4) {
  // 1. Embed the user's question
  const raw = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: query,
  })
  const embedding = Array.isArray((raw as any)[0]) ? (raw as any)[0] : raw

  // 2. Search Supabase vector store
  const { data, error } = await supabase.rpc("match_knowledge", {
    query_embedding: embedding,
    match_count:     topK,
  })

  if (error) throw new Error(`RAG search failed: ${error.message}`)
  return data as Array<{
    id: number; title: string; content: string;
    category: string; similarity: number
  }>
}


// ─── Order lookup ─────────────────────────────────────────────────────────────
export async function getOrder(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId.toUpperCase())
    .single()

  if (error || !data) return null
  return data as {
    id: string; customer_name: string; customer_email: string
    product: string; quantity: number; status: string
    tracking: string | null; total_usd: number; created_at: string
  }
}


// ─── Ticket creation ──────────────────────────────────────────────────────────
export async function createTicket(params: {
  orderId?:      string
  customerName:  string
  customerEmail: string
  subject:       string
  description:   string
  priority:      "low" | "medium" | "high"
}) {
  const ticketRef = `TKT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const { data, error } = await supabaseAdmin
    .from("tickets")
    .insert({
      ticket_ref:     ticketRef,
      order_id:       params.orderId || null,
      customer_name:  params.customerName,
      customer_email: params.customerEmail,
      subject:        params.subject,
      description:    params.description,
      priority:       params.priority,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create ticket: ${error.message}`)
  return { ticketRef, ...data }
}


// ─── Chat history ─────────────────────────────────────────────────────────────
export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
) {
  await supabaseAdmin.from("chat_messages").insert({ session_id: sessionId, role, content })
}

export async function getSessionMessages(sessionId: string) {
  const { data } = await supabaseAdmin
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
  return data ?? []
}

export async function createSession() {
  const { data } = await supabaseAdmin
    .from("chat_sessions")
    .insert({})
    .select()
    .single()
  return data?.id as string
}