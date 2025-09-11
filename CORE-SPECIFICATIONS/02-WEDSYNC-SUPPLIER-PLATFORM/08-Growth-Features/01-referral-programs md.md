# 01-referral-programs.md

## Overview

Automated referral system that transforms satisfied couples into brand ambassadors. Critical for viral growth as wedding referrals have 3x higher conversion rates than cold leads.

## Core Components

### Program Configuration

- **Reward Types**: Monetary credits, percentage discounts, service upgrades, or custom rewards
- **Dual-sided Incentives**: Both referrer and referee receive benefits
- **Milestone Rewards**: Bonus rewards at 3, 5, 10 successful referrals
- **Time-based Validity**: Programs can have expiration dates or be evergreen

### Tracking Mechanism

- **Unique Referral Codes**: Auto-generated alphanumeric codes per couple
- **Custom Landing Pages**: Personalized URLs ([wedsync.com/refer/[supplier]/[code]](http://wedsync.com/refer/[supplier]/[code]))
- **QR Code Generation**: For physical marketing materials
- **Attribution Window**: 90-day default cookie tracking

## Implementation Requirements

### Database Structure

```
// Store referral programs, participants, and conversion tracking
// Link to couple_id, supplier_id, reward fulfillment status
// Track entire referral funnel from invite to conversion
```

### Email Integration

- Automated invitation emails at optimal times (3 months post-wedding)
- Follow-up sequences for non-responders
- Milestone celebration emails
- Reward notification system

## Key Features

- **Fraud Prevention**: Velocity limits, IP checking, manual review queue
- **Analytics Dashboard**: Conversion rates, top referrers, ROI tracking
- **Gamification**: Leaderboards, badges, achievement unlocks
- **Social Sharing**: Pre-filled messages for WhatsApp, Facebook, Instagram

## Success Metrics

- Target 60% of eligible couples receiving invitations
- 35% click-through rate on referral links
- 30% conversion from click to inquiry
- 500%+ ROI on rewards invested