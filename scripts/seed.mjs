import { createClient } from '@supabase/supabase-js'
import { InferenceClient } from "@huggingface/inference"

import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Initialize Hugging Face Inference
// You'll need to add HUGGING_FACE_ACCESS_TOKEN to your .env
const hf = new InferenceClient(process.env.HF_TOKEN)
const faqs = [
  {
    title: "Refund Policy",
    content: "You can request a refund within 30 days.",
    category: "returns"
  },
  {
    title: "Shipping Time",
    content: "Shipping takes 3-5 days.",
    category: "shipping"
  }
]

console.log("Seeding via Hugging Face API...")

for (const item of faqs) {
  // Use the featureExtraction method
  const embedding = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: item.content,
  })


 

  // The HF API returns a standard array, so no need for Array.from()
  const { error } = await supabase.from("knowledge_base").insert({
    title: item.title,
    content: item.content,
    category: item.category,
    embedding: embedding 
  })

  if (error) {
    console.error(`Error inserting ${item.title}:`, error)
  } else {
    console.log(`Successfully inserted: ${item.title}`)
  }
}

console.log("Done!")