import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/monitoring/logger';

export async function POST(request: NextRequest) {
  try {
    const vitals = await request.json();

    // Log web vitals to our monitoring system
    logger.info(
      {
        event_type: 'web_vitals',
        metric_name: vitals.name,
        metric_value: vitals.value,
        metric_rating: vitals.rating,
        page_url: vitals.url,
        user_agent: vitals.userAgent,
        page_category: vitals.page_category,
        business_type: vitals.business_type,
      },
      `Web Vital: ${vitals.name} = ${vitals.value}`,
    );

    // Send to external monitoring if configured
    if (process.env.DATADOG_API_KEY) {
      // Send to Datadog or other monitoring service
      await fetch(
        `https://api.datadoghq.com/api/v1/series?api_key=${process.env.DATADOG_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            series: [
              {
                metric: `wedsync.web_vitals.${vitals.name.toLowerCase()}`,
                points: [[Math.floor(Date.now() / 1000), vitals.value]],
                tags: [
                  `page_category:${vitals.page_category}`,
                  `rating:${vitals.rating}`,
                  `business:wedding_services`,
                ],
              },
            ],
          }),
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      {
        event_type: 'error',
        api_endpoint: '/api/analytics/web-vitals',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to process web vitals',
    );

    return NextResponse.json(
      { error: 'Failed to process web vitals' },
      { status: 500 },
    );
  }
}
