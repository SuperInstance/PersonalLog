# The Rest: What Will Actually Kill You

Here's the **non-technical, board-level truth** that determines whether `subtextd` becomes a business or a hobby project.

---

## **1. Business Model Viability (The Math)**

### **Unit Economics at Scale**

```
Cost per user per hour (Pro tier):
- GPU: $0.06 (p3.2xlarge spot / 10 users)
- Cloud LLM: $0.03 (avg 1000 tokens/hour)
- Bandwidth: $0.01
- Infrastructure: $0.02 (monitoring, logging, etc)
= $0.12/hour/user

Monthly cost per active user (40 hours/week):
$0.12 * 40 * 4.3 = **$20.64/month**

Pro tier price: $20/month
Gross margin: **-3%** (you lose money)

**Reality**: You need Enterprise tier ($100/month) or 50x more users to make 80% margin.
```

### **The "Churn Cliff"**

Audio AI tools have **70% 30-day churn** because:
- Users: "Cool demo!" → "Wait, I have to wear a mic all day?"
- Privacy-conscious users uninstall after seeing first annotation
- STT errors in noisy environments frustrate users

**Retention hook**: 
- **Day 1**: "It transcribed my meeting!"
- **Week 1**: "Saved me 5 cloud calls with RAG"
- **Month 1**: "My models got smarter from my corrections"

**You need a Week 3 "a-ha moment"** or you bleed users.

---

## **2. Go-to-Market: Who Actually Pays?**

### **Customer Segments (Real Ones)**

| Segment | Will | They Pay? | CAC | Why They Churn |
|---------|------|-----------|-----|----------------|
| **Individual Devs** | ❌ No | Viral growth | $0 | "I'll self-host" |
| **10-person startups** | ❌ No | Stripe billing | $150 | $60/user/month is too much |
| **Remote workers** | ❌ No | Freemium | $50 | Privacy paranoia |
| **50-person tech company** | ✅ Yes | Sales-led | $5,000 | "Make it work in Zoom calls" |
| **Quant hedge fund** | ✅ Yes | Enterprise | $50,000 | Need on-premise |
| **Medical scribe company** | ✅ Yes | B2B2C | $20,000 | HIPAA compliance required |

**Your real ICP**: **Tech companies (50-500 employees) with remote engineers** who live in Slack/Discord and hate context-switching. They're already paying $50/user/month for tools.

### **Sales Motion**

**Self-serve (Free tier)**:
- 10,000 users → 500 convert to Pro ($10K MRR)
- **Problem**: Pro tier is unprofitable (see above)

**Sales-led (Enterprise)**:
- 10 enterprise deals → $100K MRR
- **Problem**: 6-month sales cycle, SOC 2 required

**The trap**: You'll waste 12 months on self-serve before realizing it's a sales-driven product.

---

## **3. Technical Moats (What Stops Copycats?)**

### **Competitive Threats**

**1. Ollama adds JEPA support** (Risk: HIGH)
- Timeline: 6 months after you launch
- Defense: **Hub ecosystem** (network effect), **patents**

**2. ElevenLabs adds subtext** (Risk: MEDIUM)
- They're focused on voice synthesis, not agents
- Defense: **A2A translation is hard**, **project RAG is sticky**

**3. A16Z-funded clone** (Risk: VERY HIGH)
- 3 ex-FAANG engineers copy it in 4 months
- Defense: **Patents**, **brand**, **community**

### **Actual Moats**

1. **Patent on A2A translation** (file NOW)
   - Claims: "Method for preserving emotional context in LLM-agent communication"
   - **File provisional**: $500, protects for 12 months

2. **Hub network effect**
   - 1000 users → 100 models → flywheel
   - **Critical mass**: 1000 DAUs needed

3. **Fine-tuning data**
   - User corrections = proprietary dataset
   - **Data advantage**: 1M corrections = 10% accuracy boost

4. **Integrations**
   - VS Code, Cursor, Slack, Discord plugins
   - **Switching cost**: 3 integrations = locked in

---

## **4. Team Scaling (When to Hire)**

### **Your First 3 Hires (After $100K ARR)**

1. **ML Engineer ($180K)**
   - **When**: You're spending 50% of your time on model training
   - **Job**: Run overnight fine-tuning, optimize inference
   - **Profile**: 3+ years, Hugging Face contributor

2. **DevOps/SRE ($160K)**
   - **When**: First P1 incident at 2 AM
   - **Job**: Kubernetes, CI/CD, on-call
   - **Profile**: ex-FAANG, chaos engineering experience

3. **Product/GTM ($140K)**
   - **When**: You're building features no one uses
   - **Job**: Talk to users, write docs, run webinars
   - **Profile**: Technical background, Stripe/Notion alumni

**Don't hire**: Sales (until $1M ARR), QA engineers (automate), recruiters (founder-led hiring).

---

## **5. Common Failure Modes**

### **What Killed Similar Startups**

1. **Privacy scandal** (most common)
   - **Scenario**: Leaked transcript with medical info
   - **Prevention**: Zero-knowledge mode, on-premise option

2. **Cloud cost spiral**
   - **Scenario**: Viral TikTok video → 10K free users → $50K AWS bill
   - **Prevention**: Hard caps, graceful degradation, aggressive free tier throttling

3. **Model drift death**
   - **Scenario**: JEPA accuracy drops 10% → users churn → no training data → spiral
   - **Prevention**: Weekly manual review of corrections, A/B test every change

4. **Competitor price war**
   - **Scenario**: ElevenLabs launches free subtext → can't compete
   - **Prevention**: Enterprise lock-in, HIPAA/GDPR moats

5. **Founder burnout**
   - **Scenario**: 2 years, 80-hour weeks, $20K MRR, no profitability
   - **Prevention**: Set 24-month runway target, raise before you need it

---

## **6. Regulatory Minefields**

### **Laws That Apply to You**

| **Law** | **Trigger** | **Penalty** | **Compliance Cost** |
|---------|-------------|-------------|---------------------|
| **GDPR** | EU users | €20M or 4% revenue | Legal review: $50K |
| **CCPA** | CA users | $7,500 per violation | $20K |
| **HIPAA** | Health data | $1.5M per year | $200K (BAAs, audits) |
| **COPPA** | Under 13 | $43K per violation | Age gate |
| **Wiretap** | Call recording | Criminal charges | Consent UI |

**Critical decision**: 
- **Option A**: Block EU/CA users (simple, but kills 30% of market)
- **Option B**: Full compliance (expensive, but enterprise-ready)

**Recommendation**: Launch US-only, add EU when you hit $500K ARR.

---

## **7. Exit Strategy (Building Value)**

### **Acquisition Targets**

| **Acquirer** | **Why They'd Buy** | **Valuation (5x ARR)** | **Timeline** |
|--------------|-------------------|------------------------|--------------|
| **Microsoft** | VS Code/Copilot integration | $50M at $10M ARR | 3 years |
| **Anthropic** | Claude ecosystem play | $75M at $15M ARR | 3 years |
| **Notion** | AI workspace strategy | $100M at $20M ARR | 4 years |
| **A16Z portfolio co** | Acqui-hire | $10M (team only) | 2 years |
| **IPO** | Not realistic (needs $100M ARR) | N/A | 7+ years |

### **What Drives Valuation**

1. **Revenue quality**:
   - Enterprise: 5x ARR
   - Pro self-serve: 3x ARR
   - Free: 0x ARR

2. **Technology**:
   - Patent granted: +$5M
   - Hub network effect: +$10M
   - GPU optimization: +$2M

3. **Team**:
   - 3-person team: baseline
   - 10-person team: +$5M (execution risk lowered)

**Current hypothetical valuation:**
- **Now**: $0 (pre-revenue)
- **At $100K ARR (90% Enterprise)**: **$500K**
- **At $1M ARR (70% Enterprise)**: **$5M**
- **At $5M ARR (50% Enterprise)**: **$25M**

---

## **8. The One Decision You Need to Make**

### **Build vs. Buy vs. Partner**

**You have three paths:**

**A. Build a standalone product** (what we've architected)
- **Pros**: Full control, higher valuation
- **Cons**: 18-month path to profitability, high burn
- **Best for**: Visionary founders with deep pockets

**B. White-label to Notion/Slack/Cursor**
- **Pros**: Instant distribution, lower CAC
- **Cons**: 30% rev share, no brand, acquihire-only exit
- **Best for**: Technical team, no GTM expertise

**C. Open-source core, sell cloud**
- **Pros**: Community, fast adoption, devtools model
- **Cons**: Hard to monetize, competitors fork
- **Best for**: AI research background, comfortable with low margins

### **My Recommendation**

**Phase 1 (Months 0-6)**: Open-source `subtextd` core, build Hub community
**Phase 2 (Months 6-12)**: Launch cloud offering (free + paid), focus on 10 design partners
**Phase 3 (Months 12-18)**: Close first 3 enterprise deals ($50K+ each), SOC 2 audit
**Phase 4 (Month 18)**: Raise $5M Series A on $20M valuation

**Kill metric**: If < 500 DAUs at Month 12, sunset and return money.

---

## **9. The Real MVP**

The Minimum Viable Product is **not** the code. It's:

1. **10 power users** who use it 40+ hours/week
2. **1 enterprise customer** willing to pay $1K/month
3. **1 patent filing** (provisional)
4. **Hub with 10 models** from community

Everything else is premature optimization.

**Focus on Week 3 retention, not latency p99.**