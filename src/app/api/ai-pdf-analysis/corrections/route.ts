/**
 * WS-242: AI PDF Analysis System - Corrections API
 * Team D: AI/ML Engineering & Optimization
 *
 * API endpoint for processing user corrections and feedback
 * Implements continuous learning from wedding supplier input
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiPDFAnalysisService } from '@/lib/ai/pdf-analysis/ai-pdf-analysis-service';
import { UserCorrection, UserFeedback } from '@/lib/ai/pdf-analysis/types';

export async function POST(request: NextRequest) {
  try {
    console.log('AI PDF Analysis Corrections API called');

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type and data' },
        { status: 400 },
      );
    }

    if (type === 'corrections') {
      // Process user corrections for model improvement
      if (!Array.isArray(data)) {
        return NextResponse.json(
          { error: 'Corrections data must be an array' },
          { status: 400 },
        );
      }

      console.log(`Processing ${data.length} user corrections...`);
      const learningUpdate = await aiPDFAnalysisService.processCorrections(
        data as UserCorrection[],
      );

      return NextResponse.json({
        success: true,
        learning_update: learningUpdate,
        message: `Processed ${learningUpdate.corrections_processed} corrections with ${learningUpdate.model_updates_applied} model updates`,
      });
    } else if (type === 'feedback') {
      // Process user feedback for training data generation
      if (!Array.isArray(data)) {
        return NextResponse.json(
          { error: 'Feedback data must be an array' },
          { status: 400 },
        );
      }

      console.log(`Processing ${data.length} user feedback items...`);
      const feedbackResult = await aiPDFAnalysisService.submitFeedback(
        data as UserFeedback[],
      );

      return NextResponse.json({
        success: true,
        feedback_result: feedbackResult,
        message: `Feedback processed successfully`,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "corrections" or "feedback"' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('AI PDF Analysis Corrections API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process corrections/feedback',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
