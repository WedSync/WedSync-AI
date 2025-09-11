import { NextRequest, NextResponse } from 'next/server';
import { errorTracker } from '@/lib/monitoring/error-tracking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errorId, feedback, context, weddingContext, url, userAgent } = body;

    // Validate required fields
    if (!errorId || !feedback) {
      return NextResponse.json(
        { error: 'Error ID and feedback are required' },
        { status: 400 },
      );
    }

    // Add breadcrumb to error tracker
    errorTracker.addBreadcrumb({
      category: 'error_feedback',
      message: `User provided feedback for error ${errorId}`,
      level: 'info',
      data: {
        errorId,
        feedbackLength: feedback.length,
        hasWeddingContext: Boolean(weddingContext),
        url,
        context,
      },
    });

    // In a real implementation, you would:
    // 1. Store the feedback in the database
    // 2. Associate it with the error event
    // 3. Potentially trigger notifications to the development team
    // 4. Update the error's priority based on user feedback

    // Mock implementation for now
    const feedbackRecord = {
      id: `feedback_${Date.now()}`,
      errorId,
      feedback: feedback.substring(0, 1000), // Limit feedback length
      userContext: {
        url,
        userAgent,
        context,
        weddingContext,
      },
      timestamp: new Date().toISOString(),
      processed: false,
    };

    // Log the feedback for monitoring
    console.log('Error feedback received:', {
      errorId,
      feedbackPreview: feedback.substring(0, 100),
      hasWeddingContext: Boolean(weddingContext),
      urgency: weddingContext?.urgency || 'unknown',
    });

    // If this is wedding-related feedback with high urgency, escalate
    if (
      weddingContext?.urgency === 'critical' ||
      weddingContext?.urgency === 'high'
    ) {
      errorTracker.addBreadcrumb({
        category: 'escalation',
        message: 'High-priority wedding error feedback received',
        level: 'error',
        data: {
          errorId,
          weddingDate: weddingContext.weddingDate,
          vendorType: weddingContext.vendorType,
          urgency: weddingContext.urgency,
        },
      });

      // In a real implementation, this would trigger immediate notifications
      // to on-call engineers or wedding support team
    }

    return NextResponse.json({
      success: true,
      feedbackId: feedbackRecord.id,
      message:
        'Thank you for your feedback! Our team will investigate this issue.',
      escalated:
        weddingContext?.urgency === 'critical' ||
        weddingContext?.urgency === 'high',
    });
  } catch (error) {
    console.error('Error processing feedback:', error);

    // Track this error too
    if (error instanceof Error) {
      errorTracker.captureError(
        error,
        {
          endpoint: '/api/errors/feedback',
          method: 'POST',
          timestamp: Date.now(),
          environment: process.env.NODE_ENV || 'development',
        },
        {
          error_type: 'api_error',
          context: 'feedback_processing',
        },
      );
    }

    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 },
    );
  }
}
