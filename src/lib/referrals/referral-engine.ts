import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';

export interface CreateProgramRequest {
  name: string;
  rewardType: 'monetary' | 'percentage' | 'upgrade' | 'custom';
  referrerRewardAmount: number;
  refereeRewardAmount: number;
  milestoneRewards?: Record<number, number>;
  attributionWindowDays?: number;
  expiresAt?: string;
}

export interface ConversionData {
  referredEmail: string;
  coupleId?: string;
}

export interface ClickMetadata {
  ipAddress: string;
  userAgent: string;
}

export interface FraudScore {
  isFraud: boolean;
  score: number;
  reasons: string[];
}

export class ReferralEngine {
  async createProgram(supplierId: string, programData: CreateProgramRequest) {
    const supabase = await createClient();

    // Create program and generate initial codes for existing couples
    const { data: program, error: programError } = await supabase
      .from('referral_programs')
      .insert({
        supplier_id: supplierId,
        name: programData.name,
        reward_type: programData.rewardType,
        referrer_reward_amount: programData.referrerRewardAmount,
        referee_reward_amount: programData.refereeRewardAmount,
        milestone_rewards: programData.milestoneRewards || {},
        attribution_window_days: programData.attributionWindowDays || 90,
        expires_at: programData.expiresAt || null,
      })
      .select()
      .single();

    if (programError) throw programError;

    // Generate codes for existing couples of this supplier
    const { data: couples } = await supabase
      .from('couples')
      .select('id')
      .eq('supplier_id', supplierId);

    if (couples && couples.length > 0) {
      const codes = [];
      for (const couple of couples) {
        try {
          const code = await this.generateReferralCode(couple.id, program.id);
          codes.push(code);
        } catch (error) {
          console.error(
            `Failed to generate code for couple ${couple.id}:`,
            error,
          );
        }
      }
    }

    return program;
  }

  async sendInvitations(programId: string, timing: 'immediate' | 'delayed') {
    const supabase = await createClient();

    // Send invitations at optimal times (3 months post-wedding)
    const { data: program } = await supabase
      .from('referral_programs')
      .select('*, supplier_id')
      .eq('id', programId)
      .single();

    if (!program) throw new Error('Program not found');

    // Get couples who completed weddings 3 months ago for optimal timing
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: eligibleCouples } = await supabase
      .from('couples')
      .select('id, email, name, wedding_date')
      .eq('supplier_id', program.supplier_id)
      .lt('wedding_date', threeMonthsAgo.toISOString())
      .is('referral_invitation_sent', null);

    let invitationsSent = 0;
    if (eligibleCouples) {
      for (const couple of eligibleCouples) {
        try {
          // Get or create referral code
          let { data: existingCode } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('couple_id', couple.id)
            .eq('program_id', programId)
            .single();

          if (!existingCode) {
            existingCode = await this.generateReferralCode(
              couple.id,
              programId,
            );
          }

          // Send invitation email (integration with email service)
          // This would integrate with your email service
          console.log(
            `Would send invitation to ${couple.email} with code ${existingCode.code}`,
          );

          // Mark as sent
          await supabase
            .from('couples')
            .update({ referral_invitation_sent: new Date().toISOString() })
            .eq('id', couple.id);

          invitationsSent++;
        } catch (error) {
          console.error(
            `Failed to send invitation to couple ${couple.id}:`,
            error,
          );
        }
      }
    }

    // Update analytics
    await supabase.from('referral_analytics').upsert({
      program_id: programId,
      date: new Date().toISOString().split('T')[0],
      invitations_sent: invitationsSent,
    });

    return invitationsSent;
  }

  async trackClick(code: string, metadata: ClickMetadata) {
    const supabase = await createClient();

    // Record click with fraud prevention checks
    const { data: referralCode } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (!referralCode) {
      throw new Error('Invalid referral code');
    }

    // Check if code is still active
    if (referralCode.status !== 'active') {
      throw new Error('Referral code is not active');
    }

    // Create conversion record with click timestamp
    const { data: conversion, error } = await supabase
      .from('referral_conversions')
      .insert({
        referral_code_id: referralCode.id,
        referred_email: '', // Will be filled during actual conversion
        click_timestamp: new Date().toISOString(),
        ip_address: metadata.ipAddress,
        user_agent: metadata.userAgent,
      })
      .select()
      .single();

    if (error) throw error;

    return conversion;
  }

  async processConversion(code: string, referredData: ConversionData) {
    const supabase = await createClient();

    // Handle conversion, calculate rewards, trigger notifications
    const { data: referralCode } = await supabase
      .from('referral_codes')
      .select('*, referral_programs!inner(*)')
      .eq('code', code)
      .single();

    if (!referralCode) {
      throw new Error('Invalid referral code');
    }

    // Find recent click from same email/source
    const { data: recentClick } = await supabase
      .from('referral_conversions')
      .select('*')
      .eq('referral_code_id', referralCode.id)
      .is('conversion_timestamp', null)
      .order('click_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (recentClick) {
      // Update existing record with conversion
      const fraudResult = await this.detectFraud(
        referralCode.id,
        recentClick.ip_address,
        recentClick.user_agent,
      );

      if (!fraudResult.isFraud) {
        const program = referralCode.referral_programs;
        const rewardAmount = program.referrer_reward_amount;

        const { data: conversion, error } = await supabase
          .from('referral_conversions')
          .update({
            referred_email: referredData.referredEmail,
            referred_couple_id: referredData.coupleId || null,
            conversion_timestamp: new Date().toISOString(),
            reward_amount: rewardAmount,
          })
          .eq('id', recentClick.id)
          .select()
          .single();

        if (error) throw error;

        // Update total conversions count
        await supabase
          .from('referral_codes')
          .update({
            total_conversions: referralCode.total_conversions + 1,
          })
          .eq('id', referralCode.id);

        return conversion;
      } else {
        console.warn('Fraudulent conversion detected:', fraudResult);
        throw new Error('Conversion blocked due to fraud detection');
      }
    } else {
      // Create new conversion record
      const { data: conversion, error } = await supabase
        .from('referral_conversions')
        .insert({
          referral_code_id: referralCode.id,
          referred_email: referredData.referredEmail,
          referred_couple_id: referredData.coupleId || null,
          conversion_timestamp: new Date().toISOString(),
          reward_amount: referralCode.referral_programs.referrer_reward_amount,
        })
        .select()
        .single();

      if (error) throw error;
      return conversion;
    }
  }

  async detectFraud(
    referralCodeId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<FraudScore> {
    return detectFraudulentConversion(referralCodeId, ipAddress, userAgent);
  }
}

// ACTUAL CODE PATTERN TO FOLLOW:
export async function generateReferralCode(
  coupleId: string,
  programId: string,
) {
  const supabase = await createClient();

  // Step 1: Generate unique 8-character code
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    code = nanoid(8).toUpperCase();
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('code', code)
      .single();

    isUnique = !existing;
  }

  // Step 2: Create landing page URL
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('slug')
    .eq(
      'id',
      (
        await supabase
          .from('referral_programs')
          .select('supplier_id')
          .eq('id', programId)
          .single()
      ).data?.supplier_id,
    )
    .single();

  const landingPageUrl = `https://wedsync.com/refer/${supplier?.slug}/${code}`;

  // Step 3: Generate QR code
  const qrCodeUrl = await generateQRCode(landingPageUrl);

  // Step 4: Store in database
  const { data, error } = await supabase
    .from('referral_codes')
    .insert({
      code,
      program_id: programId,
      couple_id: coupleId,
      landing_page_url: landingPageUrl,
      qr_code_url: qrCodeUrl,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

// ACTUAL CODE PATTERN TO FOLLOW:
export async function detectFraudulentConversion(
  referralCodeId: string,
  ipAddress: string,
  userAgent: string,
): Promise<{ isFraud: boolean; score: number; reasons: string[] }> {
  const supabase = await createClient();

  const reasons: string[] = [];
  let score = 0;

  // Check 1: Multiple conversions from same IP in 24 hours
  const { count: ipCount } = await supabase
    .from('referral_conversions')
    .select('id', { count: 'exact' })
    .eq('ip_address', ipAddress)
    .gte(
      'created_at',
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );

  if ((ipCount || 0) > 3) {
    score += 40;
    reasons.push('Multiple conversions from same IP');
  }

  // Check 2: Conversion without click (direct URL manipulation)
  const { data: recentClick } = await supabase
    .from('referral_conversions')
    .select('click_timestamp')
    .eq('referral_code_id', referralCodeId)
    .eq('ip_address', ipAddress)
    .gte('click_timestamp', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30 min window
    .single();

  if (!recentClick) {
    score += 60;
    reasons.push('Conversion without recent click');
  }

  // Check 3: Suspicious user agent patterns
  if (!userAgent || userAgent.includes('bot') || userAgent.length < 20) {
    score += 30;
    reasons.push('Suspicious user agent');
  }

  return {
    isFraud: score >= 70,
    score,
    reasons,
  };
}

export async function generateQRCode(landingUrl: string): Promise<string> {
  try {
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(landingUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#010599FF',
        light: '#FFBF60FF',
      },
    });

    // In a real implementation, you would upload this to cloud storage
    // For now, return the data URL
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw error;
  }
}

// Service: QRCodeGenerator
export class QRCodeGenerator {
  async generateReferralQR(landingUrl: string): Promise<string> {
    // Generate QR code for physical marketing materials
    return generateQRCode(landingUrl);
  }
}
