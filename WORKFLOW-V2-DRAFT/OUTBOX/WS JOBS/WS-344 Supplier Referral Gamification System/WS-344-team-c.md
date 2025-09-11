# TEAM C - ROUND 1: WS-344 - Supplier-to-Supplier Referral & Gamification System
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build integration systems for QR code generation, billing system reward credits, email notifications, and real-time leaderboard updates
**FEATURE ID:** WS-344 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating seamless integrations that handle viral growth while maintaining system reliability

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/services/integrations/
cat $WS_ROOT/wedsync/src/services/qr-generator.ts | head -20
cat $WS_ROOT/wedsync/src/services/billing-integration.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integrations
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query specific areas relevant to integration patterns
await mcp__serena__search_for_pattern("stripe.*integration");
await mcp__serena__find_symbol("emailService", "", true);
await mcp__serena__get_symbols_overview("src/services");
```

### B. EXISTING INTEGRATION PATTERNS (MANDATORY)
```typescript
// CRITICAL: Load current integration patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/services/email/email-service.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/services/stripe/billing-service.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/integrations");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to integration development
ref_search_documentation("QR code generation Node.js libraries best practices");
ref_search_documentation("Stripe billing integration referral credits");
ref_search_documentation("real-time leaderboard updates architecture");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "This referral integration system has multiple failure points: 1) QR code generation could fail during peak usage, 2) Billing integration must handle partial failures gracefully, 3) Email notifications need queuing for bulk sends, 4) Real-time updates must not block critical operations, 5) Integration health monitoring is essential for viral growth periods.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down integration components, track dependencies
2. **integration-specialist** - Use existing patterns for consistency  
3. **security-compliance-officer** - Ensure secure third-party integrations
4. **code-quality-guardian** - Maintain integration patterns and error handling
5. **test-automation-architect** - Comprehensive integration testing
6. **documentation-chronicler** - Evidence-based integration documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **API key protection** - All external service keys in environment variables
- [ ] **Input sanitization** - Validate all data before external service calls
- [ ] **Rate limiting integration** - Prevent abuse of external services
- [ ] **Webhook validation** - Verify webhook signatures from external services
- [ ] **Error logging sanitization** - Never log sensitive API keys or tokens
- [ ] **Timeout handling** - Prevent hanging requests to external services
- [ ] **Circuit breaker pattern** - Handle external service failures gracefully

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**YOUR SPECIFIC DELIVERABLES:**

### 1. QR Code Generation Service
```typescript
// Location: /src/services/qr-generator.ts
export class QRGeneratorService {
  private readonly qrCode: any;
  private readonly storage: SupabaseClient;
  
  constructor() {
    this.qrCode = require('qrcode');
    this.storage = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  async generateReferralQR(
    referralLink: string, 
    supplierId: string,
    options: QRCodeOptions = {}
  ): Promise<QRCodeResult> {
    try {
      // Wedding-themed styling
      const qrOptions = {
        errorCorrectionLevel: 'M' as const,
        type: 'image/png' as const,
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#1F2937', // Wedding dark gray
          light: '#FFFFFF'
        },
        width: 256,
        ...options
      };
      
      // Generate QR code as buffer
      const qrBuffer = await this.qrCode.toBuffer(referralLink, qrOptions);
      
      // Upload to Supabase Storage
      const fileName = `qr-codes/referral-${supplierId}-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await this.storage
        .storage
        .from('public-assets')
        .upload(fileName, qrBuffer, {
          contentType: 'image/png',
          cacheControl: '3600'
        });
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = this.storage
        .storage
        .from('public-assets')
        .getPublicUrl(fileName);
      
      return {
        success: true,
        qrCodeUrl: urlData.publicUrl,
        fileName,
        size: qrBuffer.length
      };
      
    } catch (error) {
      await this.logError('qr_generation_failed', { supplierId, error });
      throw new IntegrationError('Failed to generate QR code', error);
    }
  }
  
  async generateBatchQRCodes(requests: QRBatchRequest[]): Promise<QRBatchResult> {
    // Handle bulk QR generation for viral periods
    const results = await Promise.allSettled(
      requests.map(req => this.generateReferralQR(req.link, req.supplierId))
    );
    
    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results.map((r, i) => ({
        request: requests[i],
        result: r.status === 'fulfilled' ? r.value : null,
        error: r.status === 'rejected' ? r.reason : null
      }))
    };
  }
  
  private async logError(event: string, metadata: any) {
    // Integration-specific error logging
    console.error(`[QRGenerator] ${event}:`, metadata);
  }
}
```

### 2. Billing Integration Service (Reward Credits)
```typescript
// Location: /src/services/billing-integration.ts
export class BillingIntegrationService {
  private readonly stripe: Stripe;
  private readonly supabase: SupabaseClient;
  
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    this.supabase = createServiceRoleClient();
  }
  
  async creditReferralReward(
    supplierId: string, 
    rewardType: 'month_free' | 'tier_upgrade',
    referralId: string
  ): Promise<BillingResult> {
    try {
      // Get supplier's current subscription
      const { data: org } = await this.supabase
        .from('organizations')
        .select('stripe_customer_id, stripe_subscription_id, subscription_tier')
        .eq('id', supplierId)
        .single();
        
      if (!org?.stripe_subscription_id) {
        throw new BillingError('No active subscription found');
      }
      
      // Get current subscription from Stripe
      const subscription = await this.stripe.subscriptions.retrieve(
        org.stripe_subscription_id
      );
      
      if (rewardType === 'month_free') {
        // Add credit for one month at current tier
        const monthlyAmount = this.calculateMonthlyAmount(subscription);
        
        // Create credit balance in Stripe
        await this.stripe.customers.createBalanceTransaction(
          org.stripe_customer_id,
          {
            amount: monthlyAmount,
            currency: 'gbp',
            description: `Referral reward - 1 month free (Referral ID: ${referralId})`
          }
        );
        
        // Record in our system
        await this.supabase
          .from('billing_credits')
          .insert({
            organization_id: supplierId,
            credit_type: 'referral_reward',
            amount_pence: monthlyAmount,
            description: 'Referral conversion reward',
            referral_id: referralId,
            stripe_balance_transaction: 'created',
            created_at: new Date().toISOString()
          });
          
        return {
          success: true,
          creditAmount: monthlyAmount,
          description: '1 month free credit applied'
        };
      }
      
    } catch (error) {
      await this.logBillingError('reward_credit_failed', { 
        supplierId, 
        rewardType, 
        referralId, 
        error 
      });
      throw error;
    }
  }
  
  async processMilestoneReward(
    supplierId: string,
    milestone: string,
    conversionsCount: number
  ): Promise<BillingResult> {
    const milestoneRewards = {
      '5_conversions': { months: 1, description: '5 conversions milestone' },
      '10_conversions': { months: 2, description: '10 conversions milestone' },
      '25_conversions': { months: 3, description: '25 conversions milestone' },
      '50_conversions': { months: 6, description: '50 conversions milestone' },
      '100_conversions': { type: 'lifetime_discount', percentage: 20 }
    };
    
    const reward = milestoneRewards[milestone];
    if (!reward) return { success: false, error: 'Invalid milestone' };
    
    // Process milestone-specific rewards
    if (reward.type === 'lifetime_discount') {
      return this.applyLifetimeDiscount(supplierId, reward.percentage);
    } else {
      return this.creditMultipleMonths(supplierId, reward.months, reward.description);
    }
  }
  
  private calculateMonthlyAmount(subscription: Stripe.Subscription): number {
    // Calculate monthly cost in pence
    const price = subscription.items.data[0]?.price;
    if (!price) throw new BillingError('No price found');
    
    if (price.recurring?.interval === 'month') {
      return price.unit_amount || 0;
    } else if (price.recurring?.interval === 'year') {
      return Math.round((price.unit_amount || 0) / 12);
    }
    
    throw new BillingError('Unsupported billing interval');
  }
  
  private async logBillingError(event: string, metadata: any) {
    console.error(`[BillingIntegration] ${event}:`, metadata);
    // Could integrate with error tracking service here
  }
}
```

### 3. Email Notification Service
```typescript
// Location: /src/services/email/referral-notifications.ts
export class ReferralNotificationService {
  private readonly resend: Resend;
  private readonly emailQueue: Queue;
  
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY!);
    this.emailQueue = new Queue('referral-emails');
  }
  
  async sendReferralRewardNotification(
    supplierId: string,
    reward: ReferralReward
  ): Promise<EmailResult> {
    const emailData = {
      to: await this.getSupplierEmail(supplierId),
      from: 'WedSync Referrals <referrals@wedsync.com>',
      subject: '🎉 Referral Reward Earned - Free Month Added!',
      template: 'referral-reward',
      templateData: {
        supplierName: await this.getSupplierName(supplierId),
        rewardDescription: reward.description,
        referredSupplier: reward.referredSupplierName,
        monthsEarned: reward.monthsEarned,
        nextSteps: 'Your credit has been automatically applied to your next invoice.'
      }
    };
    
    // Queue email for reliable delivery
    await this.emailQueue.add('send-referral-notification', emailData);
    
    return { success: true, queued: true };
  }
  
  async sendMilestoneAchievementEmail(
    supplierId: string,
    milestone: MilestoneAchievement
  ): Promise<EmailResult> {
    const emailData = {
      to: await this.getSupplierEmail(supplierId),
      from: 'WedSync Community <community@wedsync.com>',
      subject: `🏆 Milestone Achieved: ${milestone.title}!`,
      template: 'milestone-achievement',
      templateData: {
        supplierName: await this.getSupplierName(supplierId),
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        rewardEarned: milestone.reward,
        totalConversions: milestone.totalConversions,
        leaderboardRank: milestone.currentRank
      }
    };
    
    await this.emailQueue.add('send-milestone-notification', emailData);
    return { success: true, queued: true };
  }
  
  async sendLeaderboardUpdateEmail(
    supplierId: string,
    rankingUpdate: RankingUpdate
  ): Promise<EmailResult> {
    // Weekly leaderboard position updates
    if (rankingUpdate.rankImprovement > 0) {
      const emailData = {
        to: await this.getSupplierEmail(supplierId),
        from: 'WedSync Leaderboards <leaderboard@wedsync.com>',
        subject: `📈 You moved up ${rankingUpdate.rankImprovement} spots this week!`,
        template: 'leaderboard-update',
        templateData: {
          supplierName: await this.getSupplierName(supplierId),
          currentRank: rankingUpdate.currentRank,
          previousRank: rankingUpdate.previousRank,
          category: rankingUpdate.category,
          conversionsThisWeek: rankingUpdate.newConversions,
          totalConversions: rankingUpdate.totalConversions
        }
      };
      
      await this.emailQueue.add('send-leaderboard-update', emailData);
    }
    
    return { success: true, queued: true };
  }
  
  private async getSupplierEmail(supplierId: string): Promise<string> {
    const { data } = await supabase
      .from('organizations')
      .select('contact_email')
      .eq('id', supplierId)
      .single();
      
    return data?.contact_email || '';
  }
  
  private async getSupplierName(supplierId: string): Promise<string> {
    const { data } = await supabase
      .from('organizations')
      .select('business_name')
      .eq('id', supplierId)
      .single();
      
    return data?.business_name || '';
  }
}
```

### 4. Real-time Updates Service
```typescript
// Location: /src/services/realtime/referral-updates.ts
export class ReferralRealtimeService {
  private readonly supabase: SupabaseClient;
  private readonly redis: Redis;
  
  constructor() {
    this.supabase = createServiceRoleClient();
    this.redis = new Redis(process.env.REDIS_URL!);
  }
  
  async broadcastLeaderboardUpdate(
    category: string,
    location?: string
  ): Promise<void> {
    // Get updated leaderboard data
    const leaderboardData = await this.getLeaderboardData(category, location);
    
    // Broadcast via Supabase Realtime
    const channel = `leaderboard:${category}${location ? `:${location}` : ''}`;
    await this.supabase
      .channel(channel)
      .send({
        type: 'broadcast',
        event: 'leaderboard_update',
        payload: leaderboardData
      });
      
    // Cache for performance
    await this.redis.setex(
      `leaderboard:${channel}`,
      300, // 5 minutes
      JSON.stringify(leaderboardData)
    );
  }
  
  async notifyReferralProgress(
    referralId: string,
    newStage: string,
    metadata: any
  ): Promise<void> {
    // Get referral details
    const { data: referral } = await this.supabase
      .from('supplier_referrals')
      .select('referrer_id, referred_email')
      .eq('id', referralId)
      .single();
      
    if (!referral) return;
    
    // Notify referrer of progress
    await this.supabase
      .channel(`supplier:${referral.referrer_id}`)
      .send({
        type: 'broadcast',
        event: 'referral_progress',
        payload: {
          referralId,
          stage: newStage,
          referredEmail: referral.referred_email,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      });
  }
  
  async subscribeToReferralUpdates(
    supplierId: string,
    callback: (update: ReferralUpdate) => void
  ): Promise<RealtimeChannel> {
    const channel = this.supabase
      .channel(`supplier:${supplierId}`)
      .on('broadcast', { event: 'referral_progress' }, callback)
      .on('broadcast', { event: 'reward_earned' }, callback)
      .on('broadcast', { event: 'milestone_achieved' }, callback);
      
    await channel.subscribe();
    return channel;
  }
  
  private async getLeaderboardData(
    category: string, 
    location?: string
  ): Promise<LeaderboardData> {
    // Implementation to fetch current leaderboard
    let query = this.supabase
      .from('referral_leaderboard')
      .select(`
        *,
        organizations (
          business_name,
          business_location,
          business_category,
          logo_url
        )
      `)
      .eq('period_type', 'all_time')
      .order('paid_conversions', { ascending: false })
      .limit(50);
      
    if (location) {
      query = query.ilike('organizations.business_location', `%${location}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return {
      category,
      location,
      entries: data || [],
      lastUpdated: new Date().toISOString()
    };
  }
}
```

### 5. Integration Health Monitoring
```typescript
// Location: /src/services/integration-health.ts
export class IntegrationHealthService {
  private readonly integrations = [
    { name: 'QR Generation', service: 'qrcode' },
    { name: 'Stripe Billing', service: 'stripe' },
    { name: 'Email Service', service: 'resend' },
    { name: 'Realtime Updates', service: 'supabase' }
  ];
  
  async checkAllIntegrations(): Promise<HealthReport> {
    const results = await Promise.allSettled(
      this.integrations.map(async (integration) => {
        const start = Date.now();
        const healthy = await this.checkIntegration(integration.service);
        const responseTime = Date.now() - start;
        
        return {
          name: integration.name,
          service: integration.service,
          healthy,
          responseTime,
          timestamp: new Date().toISOString()
        };
      })
    );
    
    const healthChecks = results.map(r => 
      r.status === 'fulfilled' ? r.value : { 
        healthy: false, 
        error: r.reason 
      }
    );
    
    return {
      overall: healthChecks.every(h => h.healthy),
      checks: healthChecks,
      timestamp: new Date().toISOString()
    };
  }
  
  private async checkIntegration(service: string): Promise<boolean> {
    try {
      switch (service) {
        case 'qrcode':
          // Test QR generation
          return await this.testQRGeneration();
        case 'stripe':
          // Test Stripe connectivity
          return await this.testStripeConnection();
        case 'resend':
          // Test email service
          return await this.testEmailService();
        case 'supabase':
          // Test realtime connectivity
          return await this.testSupabaseRealtime();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Health check failed for ${service}:`, error);
      return false;
    }
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] **QR Generator Service** - Wedding-themed QR codes with Supabase storage
- [ ] **Billing Integration** - Stripe credit application for referral rewards
- [ ] **Email Notifications** - Automated emails for rewards and milestones
- [ ] **Realtime Updates** - Live leaderboard and referral progress updates
- [ ] **Integration Health** - Monitoring service for all external integrations
- [ ] **Error Handling** - Circuit breaker patterns for external failures
- [ ] **Rate Limiting** - Protection against external service abuse
- [ ] **Integration Tests** - End-to-end testing of all service integrations

## 💾 WHERE TO SAVE YOUR WORK
- Services: $WS_ROOT/wedsync/src/services/integrations/
- QR Generator: $WS_ROOT/wedsync/src/services/qr-generator.ts
- Billing: $WS_ROOT/wedsync/src/services/billing-integration.ts
- Email: $WS_ROOT/wedsync/src/services/email/referral-notifications.ts
- Realtime: $WS_ROOT/wedsync/src/services/realtime/referral-updates.ts
- Tests: $WS_ROOT/wedsync/__tests__/integrations/

## 🏁 COMPLETION CHECKLIST
- [ ] **Files created and verified** - All integration services exist
- [ ] **TypeScript compilation** - No errors with npm run typecheck
- [ ] **QR generation working** - Test QR codes generated and stored
- [ ] **Billing integration tested** - Stripe credits applied successfully
- [ ] **Email queue operational** - Notifications queued and delivered
- [ ] **Realtime updates flowing** - Live updates broadcasting
- [ ] **Health monitoring active** - All integrations monitored
- [ ] **Error handling robust** - Graceful failure handling
- [ ] **Integration tests passing** - End-to-end flows verified

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for Team C Integration work on the WS-344 Supplier Referral & Gamification System!**