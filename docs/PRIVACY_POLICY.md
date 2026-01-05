# Privacy Policy

**Last Updated:** January 4, 2025
**Effective Date:** January 4, 2025

---

## Introduction

At PersonalLog, we take your privacy seriously. This Privacy Policy explains how we handle your data. **TL;DR: We don't collect or store your personal data. Everything stays on your device.**

### Our Privacy Promise

**PersonalLog is built as a local-first, privacy-by-design application.**

✅ **Your data stays on your device** - We don't have access to it
✅ **No account required** - Use without providing any personal information
✅ **No tracking** - We don't track your usage
✅ **No analytics** - We don't analyze your behavior
✅ **No ads** - We don't serve ads or sell your data
✅ **Open source** - Our code is public for inspection

---

## Table of Contents

1. [What Data We Collect](#what-data-we-collect)
2. [What Data We DON'T Collect](#what-data-we-dont-collect)
3. How Your Data is Stored
4. [How Your Data is Used]
5. [Third-Party Services]
6. [Data Sharing]
7. [Data Security]
8. [Your Rights]
9. [Children's Privacy]
10. [International Data Transfers]
11. [Changes to This Policy]
12. [Contact Us]

---

## 1. What Data We Collect

### Personal Data: NONE ✅

**We do NOT collect:**
- Your name
- Your email address
- Your phone number
- Your location
- Your IP address (we don't have servers to track this)
- Your conversations
- Your knowledge base
- Your personal files
- Your AI API keys

### Optional Technical Data

We may collect the following ONLY if you explicitly opt-in:

#### 1.1. Crash Reports (Optional)

**What:**
- Error messages
- Stack traces
- Browser version
- Operating system

**When:**
- Only if you enable crash reporting
- Only when the application crashes

**Why:**
- To fix bugs and improve stability

**How to Disable:**
- Settings → Advanced → Disable crash reporting

**Personal Data:** None - Completely anonymized

#### 1.2. Performance Metrics (Optional)

**What:**
- Application load time
- Feature usage (anonymized)
- Error rates
- Performance statistics

**When:**
- Only if you enable analytics
- Only anonymized, aggregated data

**Why:**
- To optimize performance
- To improve user experience

**How to Disable:**
- Settings → Advanced → Disable analytics

**Personal Data:** None - Completely anonymized

#### 1.3. GitHub Data (If You Contribute)

**What:**
- Your GitHub username (public)
- Your contributions (public)
- Your issues and pull requests (public)

**When:**
- Only if you interact with our GitHub repository

**Why:**
- To accept contributions
- To track issues and features

**Personal Data:** Public GitHub profile information only

---

## 2. What Data We DON'T Collect

### We DO NOT Collect: ✅

❌ **Personal Information**
- Name, email, phone, address
- Demographics
- Account credentials

❌ **Usage Data**
- Which conversations you have
- What you talk to AI about
- Your knowledge base content
- Your search history
- Your files

❌ **Behavioral Data**
- How you use the application
- What features you use
- When you use the application
- Click patterns, navigation

❌ **Location Data**
- Your IP address
- Your geographic location
- Your device location

❌ **Identifier Data**
- Device fingerprinting
- Browser fingerprinting
- Tracking cookies
- Local storage tracking

❌ **AI Data**
- Your AI API keys (stored only on your device)
- Your AI conversations
- Your AI usage patterns

---

## 3. How Your Data is Stored

### 3.1. Local-First Architecture

**PersonalLog is designed as a local-first application:**

#### Data Storage Location

**All your data is stored on your device:**

- **Browser Storage:** IndexedDB (within your browser)
- **Location:** Your device's browser data directory
- **Control:** You have full control

**What is stored locally:**

✅ Conversations with AI
✅ Knowledge base entries
✅ AI contacts and settings
✅ User preferences
✅ Plugin data
✅ AI API keys (encrypted)
✅ Themes and customizations

#### We Do NOT Store:

❌ **We do NOT have servers** that store your data
❌ **We do NOT have access** to your local storage
❌ **We do NOT have backups** of your data
❌ **We do NOT have databases** with your information

### 3.2. IndexedDB Storage

**How it works:**
- **Browser-Based:** Data stored in your browser's IndexedDB
- **Per-Origin:** Data is tied to the domain (personallog.app or localhost)
- **Size Limit:** Typically 50MB to several GB (depends on browser)
- **Persistence:** Data persists until you clear it

**Clearing Your Data:**
- **Browser Settings:** Clear site data
- **Application:** Uninstall the PWA
- **Manual:** Delete IndexedDB for the origin

**We CANNOT:**
- Access your IndexedDB data
- Delete your IndexedDB data
- Recover your IndexedDB data

### 3.3. AI API Keys

**How API Keys are Stored:**
- **Location:** IndexedDB (encrypted)
- **Encryption:** Encrypted at rest
- **Transmission:** Sent directly to AI provider (never to us)

**We NEVER:**
❌ See your API keys
❌ Store your API keys on our servers
❌ Have access to your AI accounts
❌ Use your API keys

**Security:**
- Encrypted in browser storage
- Never transmitted to our servers
- Sent only to AI providers over HTTPS

### 3.4. Sync and Collaboration (Optional Features)

**If you use sync or collaboration features:**

#### Sync (Self-Hosted or LAN)
- **Encryption:** End-to-end encryption
- **Server:** You control the server (if self-hosted)
- **We:** Do not have access to synced data

#### Collaboration (Sharing)
- **Storage:** Encrypted at rest
- **Transmission:** Encrypted in transit
- **Access:** Only people you authorize

**We STILL do NOT:**
- Store your shared data
- Have access to shared content
- Monitor shared conversations

---

## 4. How Your Data is Used

### 4.1. Our Use of Data

**Since we don't collect your personal data, we don't use it.**

**What we do:**
✅ Provide the software application
✅ Maintain the open-source codebase
✅ Fix bugs and improve features
✅ Provide documentation and support
✅ Accept community contributions

**What we DON'T do:**
❌ Analyze your conversations
❌ Read your knowledge base
❌ Track your behavior
❌ Sell your data
❌ Show you ads
❌ Profile you

### 4.2. Optional Data Usage

**If you opt-in to crash reports or analytics:**

**We use anonymized data to:**
- Fix bugs and crashes
- Improve performance
- Optimize the application
- Understand usage patterns (aggregated only)

**We DO NOT:**
- Sell this data
- Share this data (except in anonymized aggregate form)
- Link it to your identity

---

## 5. Third-Party Services

### 5.1. AI Providers

**When you use AI features, your device communicates directly with AI providers:**

**Providers may include:**
- OpenAI (openai.com)
- Anthropic (anthropic.com)
- Google (ai.google.dev)
- Mistral AI (mistral.ai)
- Groq (groq.com)
- And others

**What AI providers may collect:**
- Your API key (to authenticate you)
- Your messages (to process)
- Your IP address (for their security)
- Usage data (for billing)

**Relationship:**
- **Your relationship** with AI providers is **direct**
- **We are NOT involved** in your AI provider interactions
- **AI provider terms** govern their data use

**Our recommendation:** Review each AI provider's privacy policy.

### 5.2. Sync Servers (If You Use Sync)

**Self-Hosted:**
- **You control** the server
- **Your data** is encrypted end-to-end
- **We have no access**

**LAN Sync:**
- **Your local network** only
- **No internet** transmission
- **We have no access**

### 5.3. GitHub (If You Contribute)

**If you contribute via GitHub:**
- **GitHub's privacy policy** applies
- **Your public contributions** are... public
- **We do not control** GitHub's data practices

### 5.4. Open Source Libraries

**PersonalLog uses open-source libraries:**
- Each library has its own license and privacy policy
- We do not use libraries that track users
- We do not use libraries that send data to third parties
- See `package.json` for a complete list

---

## 6. Data Sharing

### 6.1. We Do NOT Sell Your Data ✅

**We never:**
- Sell your personal data
- Rent your personal data
- Trade your personal data
- Monetize your personal data

### 6.2. We Do NOT Share Your Data ✅

**We never share your data with:**
- Advertisers
- Data brokers
- Other companies
- Government agencies (unless legally required)

### 6.3. Voluntary Sharing

**You may choose to:**
- Share conversations (collaboration feature)
- Export and share data manually
- Post content publicly (your choice)
- Contribute code or feedback (GitHub)

**In these cases:**
- **You control** what is shared
- **You decide** who sees it
- **We are not involved** unless you interact with our GitHub

### 6.4. Legal Requirements

**If legally required (rare):**
- We may comply with lawful legal demands
- We will notify you if possible
- We will challenge overbroad requests
- **However:** Since we don't have your data, there's nothing to request

---

## 7. Data Security

### 7.1. Our Security Practices

**Since we don't store your data, our security responsibility is limited.**

**What we do:**
✅ **Secure Development:**
- Code reviews
- Security testing
- Vulnerability scanning
- Best practices

✅ **Secure Distribution:**
- HTTPS for all downloads
- Signed commits (GitHub)
- Verified builds
- Integrity checks

✅ **Transparent:**
- Open source code
- Public issue tracking
- Public security policy
- Community review

### 7.2. Your Security Responsibilities

**Since your data is on your device, you are responsible for:**

✅ **Device Security:**
- Keep your device secure
- Use a password/biometrics
- Keep your OS updated
- Use antivirus software

✅ **Browser Security:**
- Keep your browser updated
- Use secure browser settings
- Clear data when needed
- Be cautious of extensions

✅ **API Key Security:**
- Never share your API keys
- Rotate keys periodically
- Monitor API usage
- Revoke compromised keys

✅ **Backup Security:**
- Backup your data regularly
- Encrypt backups
- Store backups securely
- Test backup restoration

### 7.3. Encryption

**Where encryption is used:**

✅ **API Keys:**
- Encrypted in IndexedDB
- Encrypted in transit (HTTPS)

✅ **Sync (if used):**
- End-to-end encryption
- Encrypted at rest
- Encrypted in transit

✅ **Sharing (if used):**
- Password-protected shares
- Encrypted storage
- Encrypted transmission

---

## 8. Your Rights

### 8.1. Your Privacy Rights

**Because we don't collect your data, you have full control:**

✅ **Access:** You have direct access to all your data
✅ **Portability:** Export your data in multiple formats
✅ **Deletion:** Delete your data anytime
✅ **Correction:** Edit any data directly
✅ **Opt-Out:** Disable optional analytics/crash reports

### 8.2. Data Access

**You can access all your data:**
- **Conversations:** All stored in your browser
- **Knowledge Base:** All stored in your browser
- **Settings:** Accessible via Settings
- **Exports:** Export anytime

**We do NOT need to provide access** - you already have it.

### 8.3. Data Portability

**Export your data:**
- **Format:** JSON, Markdown, CSV, HTML, YAML, PDF
- **Scope:** All data or selected
- **How:** Settings → Data → Export
- **Frequency:** As often as you want

**Use exported data to:**
- Backup your data
- Move to another device
- Import into other tools
- Analyze your data yourself

### 8.4. Data Deletion

**Delete your data:**

**Option 1: Clear Browser Data**
1. Open browser settings
2. Find "Site Data" or "Privacy"
3. Find personallog.app
4. Clear data

**Option 2: Uninstall PWA**
1. Open browser settings
2. Find installed applications/PWAs
3. Uninstall PersonalLog
4. Clear site data

**Option 3: Application Settings**
1. Settings → Data → Delete All Data
2. Confirm deletion
3. Data permanently removed

**We CANNOT delete your data** because we don't have it.

### 8.5. Opt-Out of Optional Data

**Disable crash reports:**
- Settings → Advanced → Disable crash reporting

**Disable analytics:**
- Settings → Advanced → Disable analytics

**Both are OFF by default.**

---

## 9. Children's Privacy

### 9.1. Age Requirement

**PersonalLog is not intended for children under 13.**

**If you are under 13:**
- Do not use PersonalLog
- Do not provide any personal information
- Get parental permission if you must use it

**If you are a parent:**
- Supervise your children's use
- Understand AI provider terms
- Monitor API key usage and costs

### 9.2. No Children's Data

**We do NOT collect data from children:**
- We don't collect personal data from anyone
- We don't know if users are children
- We don't target children
- We don't market to children

**AI providers** may have their own policies for children.

---

## 10. International Data Transfers

### 10.1. No Cross-Border Transfers

**Since we don't collect or store data:**
- No data is transferred to other countries
- No data is processed on servers outside your jurisdiction
- Your data stays on your device

### 10.2. AI Providers

**AI providers may process data in other countries:**
- OpenAI (USA)
- Anthropic (USA)
- Google (USA/Global)
- Others may have different locations

**Your relationship with AI providers** is governed by their terms.

**Recommendation:** Review AI provider privacy policies.

---

## 11. Changes to This Privacy Policy

### 11.1. We May Update This Policy

**We reserve the right to update this Privacy Policy:**
- To reflect changes in our practices
- To comply with legal requirements
- To clarify our policies

### 11.2. Notification of Changes

**We will notify users of material changes:**
- **Posting:** Updated policy on GitHub
- **In-App:** Notification in the application (if applicable)
- **Date:** "Last Updated" date at the top

### 11.3. Your Choices

**If you don't agree with changes:**
- **Stop Using:** Discontinue use of PersonalLog
- **Delete Data:** Remove your data from your device
- **Export Data:** Export before discontinuing

**Continued use constitutes acceptance.**

---

## 12. Contact Us

### 12.1. Privacy Questions

**Questions about this Privacy Policy?**

**Contact Methods:**
- **GitHub Issues:** [https://github.com/SuperInstance/PersonalLog/issues](https://github.com/SuperInstance/PersonalLog/issues)
- **Label:** Use `privacy` label
- **Response Time:** Typically within 48 hours

### 12.2. Data Requests

**Since we don't have your data:**
- We cannot fulfill data access requests (you already have access)
- We cannot fulfill data deletion requests (you control deletion)
- We cannot provide data copies (export it yourself)

**For data you control:**
- See Section 8: Your Rights

### 12.3. Privacy Complaints

**If you believe your privacy has been violated:**

**1. Contact Us First:**
- Use GitHub Issues with `privacy` label
- Describe the concern
- We will investigate

**2. Regulatory Authorities:**
- You may also contact your local data protection authority
- EU: GDPR supervisory authority
- US: FTC or state Attorney General
- Other: Your local equivalent

### 12.4. Data Protection Officer

**We do NOT have a Data Protection Officer because:**
- We do not collect personal data at scale
- We do not process personal data
- We are not a data controller or processor

**For AI providers:** Contact their DPO directly.

---

## 13. Privacy by Design

### 13.1. Our Privacy Philosophy

**Privacy is not an afterthought - it's foundational.**

**Design Principles:**
✅ **Local-First:** Data stays on device by default
✅ **User Control:** You control your data
✅ **Transparency:** Open source, inspectable code
✅ **Minimization:** We collect nothing
✅ **Security:** Encryption where applicable

### 13.2. Technical Architecture

**How we protect your privacy:**

**Client-Side Application:**
- All processing happens in your browser
- No central server processing your data
- No database with your information

**Direct AI Integration:**
- Your device → AI provider (direct)
- Not: Your device → Our servers → AI provider
- We never see your AI communications

**Open Source:**
- Code is public for inspection
- Community can verify privacy claims
- No hidden tracking or data collection

---

## 14. GDPR Rights (EU Users)

### 14.1. GDPR Compliance

**For users in the European Union:**

**Since we don't collect your data, most GDPR rights don't apply.**

**However, we respect:**

✅ **Right to Access:** You have direct access (Section 8.2)
✅ **Right to Portability:** Export functionality (Section 8.3)
✅ **Right to Erasure:** Delete your data (Section 8.4)
✅ **Right to Rectification:** Edit directly in the app
✅ **Right to Object:** Disable optional features (Section 8.5)

### 14.2. Legal Basis for Processing

**We do NOT process your personal data.**

**If you opt-in to crash reports or analytics:**
- **Legal Basis:** Your consent (Article 6(1)(a) GDPR)
- **Withdrawal:** Disable anytime (Section 8.5)
- **Data:** Anonymized only, not personal data

### 14.3. Data Transfers Outside EEA

**We do NOT transfer data outside the EEA:**
- We don't have your data to transfer
- Your data stays on your device

**AI providers** may transfer data. Check their policies.

---

## 15. California Privacy Rights (CCPA)

### 15.1. CCPA Compliance

**For California residents:**

**Since we don't sell your personal data, the CCPA mostly doesn't apply.**

**Specifically:**

✅ **We Do NOT Sell Personal Data** (CCPA Right to Opt-Out)
✅ **We Do NOT Collect Personal Data** (beyond what's necessary)
✅ **We Do NOT Track Users** (Do Not Sell: true by default)

### 15.2. Your California Rights

**Under the CCPA, you have the right to:**

✅ **Know:** What data is collected (NONE)
✅ **Delete:** Your data (you control this)
✅ **Opt-Out:** Of data sales (N/A - we don't sell)
✅ **Non-Discrimination:** For exercising privacy rights

---

## 16. Other Jurisdictions

### 16.1. Global Privacy

**Our privacy approach works globally:**

**Because we:**
- Don't collect personal data
- Don't track users
- Don't sell data
- Store everything locally

**We comply with:**
- GDPR (EU)
- CCPA (California)
- PIPEDA (Canada)
- LGPD (Brazil)
- And most other privacy laws

**By design:** Not collecting data means not violating privacy laws.

---

## 17. Disclaimer

**This Privacy Policy applies to:**
- The PersonalLog software application
- Our GitHub repository and website
- Our services (if any)

**This Privacy Policy does NOT apply to:**
- AI providers (they have their own policies)
- Third-party libraries (they have their own policies)
- GitHub (see GitHub's privacy policy)
- Any services you use independently

**We are not responsible for:**
- Third-party privacy practices
- AI provider data handling
- Your security practices
- Your device security

---

## 18. Summary

**In short:**

✅ **We don't collect your personal data**
✅ **Everything is stored on your device**
✅ **We don't track you**
✅ **We don't sell your data**
✅ **You have full control**
✅ **You can export or delete anytime**
✅ **The code is open source for inspection**

**Your privacy is our priority by design.**

---

## 19. Contact & Updates

**Questions? Contact us:**
- **GitHub:** [https://github.com/SuperInstance/PersonalLog/issues](https://github.com/SuperInstance/PersonalLog/issues)
- **Label:** `privacy`

**Policy Version:** 1.0.0
**Last Updated:** January 4, 2025

**To review changes:**
- Check the "Last Updated" date
- Review GitHub commit history
- Watch the repository for updates

---

**This Privacy Policy is designed to be transparent, user-friendly, and compliant with major privacy regulations while reflecting our local-first, privacy-by-design architecture.**

**[End of Privacy Policy]**
