# WedSync MVP - Product Requirements Document
**Version:** 1.0  
**Date:** January 13, 2025  
**Author:** John (Product Manager)  
**Status:** ACTIVE DEVELOPMENT

---

## 📋 Executive Summary

### **The Problem**
Wedding vendors (photographers, venues, florists) waste 10+ hours per wedding on administrative tasks:
- Collecting the same information multiple times
- Managing forms across different systems  
- Manually updating multiple platforms
- Chasing couples for missing details
- Coordinating with other vendors inefficiently

### **The Solution**
WedSync is a B2B SaaS platform that centralizes wedding vendor operations through:
1. **Smart Form Management** - Import existing PDFs, auto-populate data
2. **Vendor Collaboration** - Share core wedding details automatically
3. **Journey Automation** - Trigger emails/SMS based on wedding timeline
4. **CRM Integration** - Sync with existing tools (Tave, HoneyBook)

### **Target Market**
- **Primary:** Wedding photographers (147,000 in US/UK)
- **Secondary:** Wedding venues, planners, florists
- **Sweet Spot:** Solo operators and small teams (1-5 people)
- **Geographic Focus:** English-speaking markets first

---

## 🎯 MVP Scope Definition

### **Core Features (MUST HAVE for Launch)**

#### 1. **PDF Form Import** ⭐ KILLER FEATURE
- **What:** Upload existing PDF contracts/forms → Convert to digital forms
- **Why Unique:** No competitor offers this
- **User Value:** Save 2-3 hours per wedding immediately
- **Technical:** OCR + AI field detection
- **Success Metric:** 80% field accuracy on import

#### 2. **Multi-Tenant Form Builder**
- **What:** Drag-drop form creation with conditional logic
- **Why Critical:** Core platform functionality
- **User Value:** Replace TypeForm/JotForm (save $50/month)
- **Technical:** React components with validation
- **Success Metric:** Form creation < 5 minutes

#### 3. **Client Portal**
- **What:** Couples access all vendor forms in one place
- **Why Critical:** Viral growth mechanism
- **User Value:** Couples see ALL their vendors
- **Technical:** Separate subdomain per vendor
- **Success Metric:** 30% couple activation rate

#### 4. **Core Fields System**
- **What:** Shared data auto-populates across all forms
- **Why Critical:** Main time-saving feature
- **Fields:** Names, venue, date, guest count, timeline
- **Technical:** Real-time sync via Supabase
- **Success Metric:** Zero duplicate data entry

#### 5. **Basic Journey Automation**
- **What:** Send emails/SMS at specific timeline points
- **Why Critical:** Automation = subscription value
- **Example:** "2 weeks before wedding: Send final details form"
- **Technical:** Cron jobs + SendGrid/Twilio
- **Success Metric:** 90% delivery rate

---

## 📊 Pricing Tiers (MVP Launch) - UPDATED 5-TIER STRUCTURE

### **FREE TIER** (After 30-day Professional trial)
- £0/month
- 1 form only (created during trial)
- 1 login only
- "Powered by WedSync" branding
- No PDF import, no automation
- **Goal:** Trial conversion driver

### **STARTER** (£19/month)
- 2 logins
- Unlimited forms
- PDF import enabled ✅
- Remove branding
- Email-only automation
- Basic directory listing
- **Goal:** 20% of customers

### **PROFESSIONAL** (£49/month) ⭐ SWEET SPOT
- 3 logins
- AI chatbot for FAQs
- Full automation (Email + SMS + WhatsApp)
- Review collection system
- Premium directory listing
- Marketplace selling
- **Goal:** 60% of customers here

### **SCALE** (£79/month)
- 5 logins with roles
- Post-wedding automation
- Referral system
- API access
- Priority support
- Featured directory
- **Goal:** 15% of customers

### **ENTERPRISE** (£149/month)
- Unlimited logins
- Venue-specific features
- White-label options
- Phone support
- Custom integrations
- **Goal:** 5% of customers

---

## 🗓️ Development Timeline

### **Phase 1: Foundation** (Weeks 1-2)
- [ ] Finalize tech stack decision
- [ ] Set up authentication system
- [ ] Create multi-tenant database structure
- [ ] Build basic UI components
- [ ] Deploy staging environment

### **Phase 2: Core Features** (Weeks 3-6)
- [ ] Form builder (drag-drop)
- [ ] Form submission handling
- [ ] Client portal basics
- [ ] Core fields implementation
- [ ] Mobile responsive design

### **Phase 3: Killer Feature** (Weeks 7-8)
- [ ] PDF upload interface
- [ ] OCR integration
- [ ] Field mapping AI
- [ ] Form generation from PDF
- [ ] Testing with real contracts

### **Phase 4: Automation** (Weeks 9-10)
- [ ] Journey builder UI
- [ ] Email integration (SendGrid)
- [ ] SMS integration (Twilio)
- [ ] Trigger system
- [ ] Template library

### **Phase 5: Polish** (Weeks 11-12)
- [ ] Payment integration (Stripe)
- [ ] Onboarding flow
- [ ] Analytics dashboard
- [ ] Performance optimization
- [ ] Security audit

---

## 🎨 User Experience Requirements

### **Vendor Onboarding (First 10 Minutes)**
1. **Sign up** (30 seconds)
   - Email + password only
   - OR Google/Microsoft OAuth
   
2. **Business setup** (2 minutes)
   - Business name
   - Service type (photographer/venue/etc)
   - Location
   
3. **Import first form** (3 minutes)
   - Upload existing PDF
   - Review detected fields
   - Make adjustments
   
4. **Send to client** (1 minute)
   - Add couple's email
   - Customize message
   - Send
   
5. **Success moment** (30 seconds)
   - See form delivered
   - Preview client view
   - Understand value

### **Mobile Requirements**
- **Minimum viewport:** 375px (iPhone SE)
- **Touch targets:** 48x48px minimum
- **Offline capability:** Form viewing/basic edits
- **Performance:** < 3 second load on 3G

---

## 🔧 Technical Requirements

### **Architecture Decision** ⚠️ CRITICAL
**Recommendation:** Use Next.js + Supabase (abandon Django)
- **Why:** Faster development, better real-time, modern stack
- **Migration:** Export Django models → Supabase schema

### **Core Stack**
- **Frontend:** Next.js 15.4.3 (App Router)
- **Database:** Supabase (PostgreSQL)
- **UI:** Untitled UI + Magic UI + Tailwind CSS
- **Forms:** React Hook Form + Zod
- **Payments:** Stripe
- **Email:** SendGrid
- **SMS:** Twilio
- **OCR:** Google Cloud Vision API
- **Hosting:** Vercel

### **Performance Targets**
- Page load: < 2 seconds
- API response: < 200ms
- Form save: < 500ms
- PDF processing: < 30 seconds
- Uptime: 99.9%

---

## 📈 Success Metrics

### **Launch Goals (Month 1)**
- 100 vendors sign up
- 50 vendors on paid plans
- 500 forms created
- 1,000 couples invited
- $2,500 MRR

### **Growth Metrics (Month 6)**
- 1,000 vendors
- 500 paid ($25K MRR)
- 10,000 forms
- 25,000 couples
- Viral coefficient > 1.5

### **Key Performance Indicators**
- **Activation:** Import first form < 10 minutes
- **Retention:** Month 2 retention > 80%
- **Virality:** Each vendor invites 10+ couples
- **Revenue:** Average revenue per user > $50
- **Support:** Tickets < 5% of users

---

## 🚨 Risk Mitigation

### **Technical Risks**
- **PDF Import Accuracy**
  - Mitigation: Manual override options
  - Fallback: Template library
  
- **Saturday Wedding Day Failures**
  - Mitigation: Read-only mode on Saturdays
  - Fallback: Offline PDF export

- **Data Loss**
  - Mitigation: Hourly backups
  - Fallback: 30-day recovery period

### **Business Risks**
- **Competitor Response**
  - HoneyBook could add PDF import
  - Mitigation: Patent application + fast execution
  
- **Low Conversion**
  - Mitigation: Extended 30-day trial
  - Fallback: Freemium model adjustment

---

## 🏁 Definition of Done (MVP)

### **Feature Complete**
- [ ] All 5 core features working
- [ ] Mobile responsive
- [ ] Payment processing live
- [ ] 10 vendors beta testing

### **Quality Standards**
- [ ] 90% unit test coverage
- [ ] Zero critical bugs
- [ ] Page speed score > 90
- [ ] Security audit passed

### **Business Ready**
- [ ] Terms of Service complete
- [ ] Privacy Policy GDPR compliant
- [ ] Support documentation
- [ ] Pricing page live

---

## 📝 Appendix

### **Competitor Analysis**
- **HoneyBook:** $9B valuation, complex, expensive
- **Tave:** Photographer-focused, no collaboration
- **Dubsado:** Generic CRM, not wedding-specific
- **17hats:** Outdated UI, limited automation

### **Unique Value Proposition**
"The only platform that imports your existing forms and automatically shares wedding details between all vendors - saving 10+ hours per wedding"

### **Go-to-Market Strategy**
1. **Launch:** Facebook wedding photographer groups
2. **Growth:** Referral program (3 months free)
3. **Scale:** Wedding venue partnerships
4. **Enterprise:** White-label for chains

---

**Next Steps:**
1. Approve this PRD
2. Finalize tech stack decision  
3. Begin Phase 1 development
4. Set up tracking/analytics
5. Recruit 10 beta testers

---

*This document is a living specification and will be updated as we learn from users*