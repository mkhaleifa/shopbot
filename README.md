🛍️ ShopBot — AI Customer Support Chatbot

ShopBot is an AI-powered customer support chatbot built with Next.js, Supabase, and Groq.
It helps users get instant answers, track orders, and create support tickets using real-time data and intelligent search (RAG).

🚀 Features
💬 AI Chat (powered by Groq)
🧠 RAG (Retrieval-Augmented Generation) using vector search
📦 Order tracking system
🎫 Support ticket creation
🗂️ Chat history (session-based memory)
⚡ Fast and scalable backend with Supabase


🏗️ Tech Stack
Frontend: Next.js (App Router) + Tailwind CSS
Backend: Next.js API routes
Database: Supabase (PostgreSQL + pgvector)

AI Models:
Chat → Groq (LLaMA / Mixtral)
Embeddings → Hugging Face (MiniLM)

📂 Project Structure
shopbot/
├── app/
│   ├── api/chat/route.ts     # Chat API (AI + tools)
│   ├── components/           # UI components
│   └── lib/supabase.ts       # DB + RAG + tools
├── scripts/seed.mjs          # Seed knowledge base
├── supabase/schema.sql       # Database schema
├── .env.local                # Environment variables

⚙️ Setup Instructions
cd shopbot
2. Install dependencies
npm install
3. Setup Supabase
Create a new project
Open SQL Editor
Run:
supabase/schema.sql
4. Add environment variables

Create .env.local:

GROQ_API_KEY=your_groq_key

SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

HF_TOKEN=your_huggingface_token
5. Seed knowledge base
node scripts/seed.mjs
6. Run the app
npm run dev

Open:
http://localhost:3000

🧠 How It Works
User sends a message
Query is embedded using Hugging Face MiniLM
Supabase finds relevant documents (RAG)
Context is sent to Groq model
AI responds with accurate, contextual answers
🔧 Available Tools
Order Lookup: Retrieve order status by ID
Ticket Creation: Generate support tickets
Knowledge Search: Answer FAQs using vector search
📌 Example Use Cases
“Where is my order ORD-10022?”
“What is your refund policy?”
“I want to open a support ticket”

🚀 Future Improvements
Streaming responses
Authentication (Supabase Auth)
Admin dashboard
Real product database integration
🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

