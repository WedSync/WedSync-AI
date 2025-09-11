# 07-referral-module.md

## Overview

Referral program automation with tracking, rewards, and viral growth mechanics.

## Configuration

```
interface ReferralModule {
  programId: string
  timing: {
    initialAsk: number // Days after wedding
    reminderSchedule: number[]
    anniversaryBoost: boolean
  }
  rewards: {
    referrer: RewardConfig
    referee: RewardConfig
    milestones: MilestoneReward[]
  }
}
```

## Referral Mechanics

- **Unique Codes**: Per-client tracking
- **Custom URLs**: Branded landing pages
- **QR Codes**: Physical sharing
- **Social Integration**: One-click sharing

## Tracking System

```
// Attribution tracking
interface ReferralTracking {
  referrerId: string
  refereeId: string
  channel: 'email' | 'social' | 'direct'
  conversionStage: 'clicked' | 'signed_up' | 'booked'
  rewardStatus: 'pending' | 'earned' | 'redeemed'
}
```

## Reward Distribution

- Automatic credit application
- Milestone notifications
- Leaderboard updates
- Commission calculations

## Viral Optimization

- A/B test messaging
- Optimal timing detection
- Channel performance
- Network effect tracking

## Scale Tier Features

- Advanced analytics
- Custom reward tiers
- White-label programs
- API access for integration