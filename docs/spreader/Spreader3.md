 Key Technical Decisions
Backend Language: Go or Rust for the Session Manager (CRDT + token counting needs performance). Node.js/TypeScript is acceptable for MVP but will hit limits at scale. Choose Rust if you can tolerate slower development for better long-term stability; choose Go for faster shipping.
Frontend: React + Vite (not Next.js - you don't need SSR and it complicates the desktop app later). Use Zustand for state management (as in my architecture).
Database: PostgreSQL (hosted on Neon.tech - serverless, scales to zero cost when idle, perfect for MVP). Redis: Upstash (serverless Redis, integrates with Cloudflare).
Secret Management: Doppler or Infisical (never commit API keys). Your memory's Guardian concept requires proper key isolation from day one.
Repo Strategy: Private GitHub repo until you decide on open-source strategy. The memory shows you worry about IP protection - keep it closed until you have a patent filed and a clear license strategy.
3. Infrastructure Setup (Today)
bash
Copy
# 1. Cloudflare Account Setup
#    - Create account if you don't have one
#    - Enable R2 (free tier: 10GB storage, 1M requests/month)
#    - Enable Workers (free tier: 100k requests/day)
#    - Create API token with permissions: R2:Edit, Workers:Edit, AI:Read

# 2. Create R2 Buckets
curl -X PUT https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/r2/buckets \
  -H "Authorization: Bearer $CF_TOKEN" \
  -d '{"name": "personallog-sessions"}'

curl -X PUT https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/r2/buckets \
  -H "Authorization: Bearer $CF_TOKEN" \
  -d '{"name": "personallog-schemas"}'

# 3. Create Neon Postgres Database
#    Go to neon.tech, create project, save connection string

# 4. Create Upstash Redis
#    Go to upstash.com, create database, save REST URL and token

# 5. Create Doppler Project
#    doppler.com, create project, add secrets:
#    - DATABASE_URL
#    - REDIS_URL
#    - CF_ACCOUNT_ID
#    - CF_API_TOKEN
#    - CF_R2_ACCESS_KEY_ID
#    - CF_R2_SECRET_ACCESS_KEY
Week 1: First Milestone - "The Edit Trick" Prototype
Your core innovation is turning manual context management into a system. Build this first:
Goal: A single-endpoint API that demonstrates the "edit trick" programmatically.
What to build:
POST /api/sessions - Create a session with a schema
POST /api/sessions/:id/messages - Add messages until 85% full
GET /api/sessions/:id/continue - Returns a "synthetic prompt" that replicates your manual edit
Test it with this flow:
TypeScript
Copy
// 1. Create a session about building a todo app
const session = await fetch('/api/sessions', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Build Todo App',
    systemPrompt: 'You are a helpful assistant helping build a todo app.',
    model: '@cf/meta/llama-3-70b'
  })
});

// 2. Simulate a long conversation (add 80 messages rapidly)
for (let i = 0; i < 80; i++) {
  await fetch(`/api/sessions/${session.id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role: 'user', content: `Message ${i}` })
  });
}

// 3. Hit the continue endpoint
const continuation = await fetch(`/api/sessions/${session.id}/continue`).json();

// 4. The continuation should include a synthetic prompt like:
// "We have covered documents 1-3. Proceed to document 4: Database Design.
//  [Full schema context here]"
console.log(continuation.syntheticPrompt);
Success Criteria: You can copy continuation.syntheticPrompt, paste it into a fresh chat with Kimi, and the AI immediately understands the project context and continues appropriately. This proves the core mechanism works.
Week 2: Add Token Awareness
Goal: Real-time context percentage indicator.
Implementation:
Integrate tiktoken (or equivalent for each model)
Update the /api/sessions/:id/messages endpoint to count tokens on every request
Add a context_percentage field to the session response
Build the React component I specified in the architecture with color-coded indicator
Test: Send messages until you hit 85%. The API should automatically trigger schema generation and return a warning: {"warning": "context_critical", "schema_url": "..."}.
Week 3: Spread v1 (Parallel Only)
Goal: Manual Spread with UI.
Implementation:
Build POST /api/spreads endpoint
Create child sessions via POST /api/sessions/:parentId/fork
Build the Spread Dashboard UI (simpler version - just list tasks with "View" and "Merge" buttons)
Implement POST /api/spreads/:id/merge (manual approval)
Test Flow:
In chat, type: "Spread this: 1) Research auth, 2) Design DB, 3) Write API"
UI shows 3 task cards
Click "View" on a task - opens in new tab
Child session has synthetic prompt with full context
Child "completes" (you send a final message)
Back in parent, "Merge" button appears
Click Merge - summary appears in parent chat
Week 4: Storage Layer & Session Book
Goal: Sessions survive server restarts.
Implementation:
Connect PostgreSQL and persist sessions
Implement R2 backend for schema storage
Build GET /api/sessions/:id/export endpoint
Generate the first Session Book zip file
Test: Create a session, add messages, restart server, fetch session again - all messages intact.
Week 5-6: Agent Runtime & Vibe-Coding MVP
Goal: Create an agent via conversation.
Implementation:
Build POST /api/agents/vibe-code endpoint
Implement 3-turn clarification loop
Create agent YAML from conversation
Store agent definition in DB and R2
Test Flow:
In chat, say "I want you to be more concise and always ask before calling functions"
Agent responds with clarification question 1
You answer
Question 2
You answer
Question 3
You answer
Agent says: "Here's your new agent definition. [Preview]. Approve?"
Click Approve - new agent appears in agent selector
Week 7-8: Billing Integration
Goal: Track costs accurately.
Implementation:
Wire up Cloudflare AI Gateway (this gives you usage logs automatically)
Create BillingService that listens to Gateway webhooks
Implement cost calculation with free tier
Build admin dashboard showing your aggregate costs across all users
Test: Run 1000 requests through a test user account. Verify:
Free tier user sees $0 billed
Pro user sees correct 10% markup
Your platform fee is tracked separately
Week 9-10: Messenger UI Polish
Goal: UI feels like a product, not a prototype.
Implementation:
Build the full chat interface with virtualized list
Add agent selector sidebar
Implement context indicator
Build Spread trigger modal
Add dark mode (non-negotiable for dev tool)
Non-obvious detail: The UI must feel like a messaging app (WhatsApp, iMessage), not a dev tool. This is crucial for adoption. Use proper typography, message bubbles, timestamps.
Week 11-12: Launch Prep
Goal: Ship to 50 beta users.
Implementation:
Deploy to Cloudflare Pages (frontend) + Cloudflare Workers (API)
Set up Stripe billing (even if not enabled yet)
Create waitlist landing page (use Framer or Webflow - don't code this)
Invite 5-10 trusted developers personally
Set up Sentry and logging
Critical Non-Obvious Decisions You Must Make Now
Open Source Strategy: Your memory shows you worry about IP. Don’t open source the core Session Manager or Spread Engine - that's your moat. Open source agent templates, connectors, and examples. License core as AGPL (copyleft), templates as MIT. This forces competitors to open their version if they fork, but lets community build on your platform.
Data Retention: Never store user messages on your servers after they're saved to user-owned storage. Your memory's Guardian concept requires this. Implement a 24-hour TTL on any temporary caching.
API Key Handling: Client-side encryption only. Use the Web Crypto API to encrypt keys in the browser before sending to your API. Your server should never see plaintext keys. The memory's Guardian layer depends on this.
Desktop App Priority: For the "killer feature" of hybrid local/cloud, start desktop planning in Week 6. Use Tauri instead of Electron (lighter, Rust backend). But for MVP, focus on web first.
Your First 5 Beta Users
Target these personas from your memory:
AI power users who hit context limits regularly (your "edit trick" original audience)
Indie developers building AI products who need cost control
Technical writers creating long documentation (like your manual example)
Researchers doing literature reviews (parallel research tasks)
Startup founders prototyping rapidly (vibe-coding agents for specific tasks)
Recruit them: Post on Hacker News "Show HN: I turned my Kimi context trick into a product", Twitter threads showing the Spread dashboard, and in AI Discord communities.
Success Metric
MVP is successful when: A user can:
Hit 85% context limit, see automatic schema generation
Initiate a 3-task Spread, watch parallel conversations
Merge one task back manually
Vibe-code a custom agent in 3 turns
Export a Session Book PDF
All in under 10 minutes. If they can't, simplify.
Your vision treats AI conversations as living documents - this is the right mental model. The architecture is solid. Now: register domains, file provisional patent, write the first API endpoint.
What's the first blocker you see?

