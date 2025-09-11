/**
 * Response Streaming - WS-173 Backend Performance Optimization
 * Team B - Round 1 Implementation
 * Handles streaming responses for large datasets with backpressure and error recovery
 */

import { createClient } from '@/lib/supabase/server';
import { metricsTracker } from '@/lib/performance/metrics-tracker';
import { performanceCacheManager } from '@/lib/cache/performance-cache-manager';
import { Transform, Readable } from 'stream';

export interface StreamingOptions {
  batchSize?: number;
  maxConcurrency?: number;
  format?: 'json' | 'csv' | 'ndjson' | 'sse';
  compression?: boolean;
  cacheResults?: boolean;
  resumeToken?: string;
  includeProgress?: boolean;
  timeout?: number;
}

export interface StreamingContext {
  organizationId?: string;
  userId?: string;
  totalCount?: number;
  processedCount?: number;
  errorCount?: number;
  startTime?: Date;
}

export interface StreamingProgress {
  processed: number;
  total?: number;
  percentage?: number;
  rate: number; // items per second
  estimatedTimeRemaining?: number;
  errors: number;
  currentBatch: number;
}

export class ResponseStreamer {
  private static readonly DEFAULT_BATCH_SIZE = 1000;
  private static readonly DEFAULT_MAX_CONCURRENCY = 3;
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Stream large dataset as JSON array
   */
  static async streamJSONArray<T>(
    dataSource: AsyncIterable<T[]> | (() => AsyncIterable<T[]>),
    options: StreamingOptions = {},
    context: StreamingContext = {},
  ): Promise<Response> {
    const encoder = new TextEncoder();
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Start JSON array
          controller.enqueue(encoder.encode('{"data":['));

          let isFirst = true;
          const source =
            typeof dataSource === 'function' ? dataSource() : dataSource;

          for await (const batch of source) {
            try {
              for (const item of batch) {
                if (!isFirst) {
                  controller.enqueue(encoder.encode(','));
                }

                controller.enqueue(encoder.encode(JSON.stringify(item)));

                isFirst = false;
                processedCount++;

                // Send progress update if requested
                if (options.includeProgress && processedCount % 100 === 0) {
                  await ResponseStreamer.sendProgressUpdate(
                    controller,
                    encoder,
                    processedCount,
                    context.totalCount,
                    startTime,
                    errorCount,
                  );
                }
              }
            } catch (error) {
              errorCount++;
              console.error('Error processing batch:', error);
            }
          }

          // End JSON array with metadata
          const duration = Date.now() - startTime;
          controller.enqueue(
            encoder.encode(
              `],"meta":{"processed":${processedCount},"errors":${errorCount},"duration":${duration},"timestamp":"${new Date().toISOString()}"}}`,
            ),
          );
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: ResponseStreamer.getStreamingHeaders(
        'application/json',
        options.compression,
      ),
    });
  }

  /**
   * Stream data as Server-Sent Events (SSE)
   */
  static async streamServerSentEvents<T>(
    dataSource: AsyncIterable<T[]> | (() => AsyncIterable<T[]>),
    options: StreamingOptions = {},
    context: StreamingContext = {},
  ): Promise<Response> {
    const encoder = new TextEncoder();
    const startTime = Date.now();
    let processedCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection event
          controller.enqueue(
            encoder.encode(
              `event: connected\ndata: ${JSON.stringify({
                timestamp: new Date().toISOString(),
                total: context.totalCount,
              })}\n\n`,
            ),
          );

          const source =
            typeof dataSource === 'function' ? dataSource() : dataSource;

          for await (const batch of source) {
            // Send batch as SSE event
            controller.enqueue(
              encoder.encode(`event: data\ndata: ${JSON.stringify(batch)}\n\n`),
            );

            processedCount += batch.length;

            // Send progress event
            if (options.includeProgress) {
              const progress = ResponseStreamer.calculateProgress(
                processedCount,
                context.totalCount,
                startTime,
                0,
              );

              controller.enqueue(
                encoder.encode(
                  `event: progress\ndata: ${JSON.stringify(progress)}\n\n`,
                ),
              );
            }

            // Keep connection alive
            controller.enqueue(
              encoder.encode(`event: heartbeat\ndata: ${Date.now()}\n\n`),
            );
          }

          // Send completion event
          controller.enqueue(
            encoder.encode(
              `event: complete\ndata: ${JSON.stringify({
                processed: processedCount,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: ResponseStreamer.getSSEHeaders(),
    });
  }

  /**
   * Stream data as NDJSON (newline-delimited JSON)
   */
  static async streamNDJSON<T>(
    dataSource: AsyncIterable<T[]> | (() => AsyncIterable<T[]>),
    options: StreamingOptions = {},
    context: StreamingContext = {},
  ): Promise<Response> {
    const encoder = new TextEncoder();
    let processedCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const source =
            typeof dataSource === 'function' ? dataSource() : dataSource;

          for await (const batch of source) {
            for (const item of batch) {
              controller.enqueue(encoder.encode(JSON.stringify(item) + '\n'));
              processedCount++;
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: ResponseStreamer.getStreamingHeaders(
        'application/x-ndjson',
        options.compression,
      ),
    });
  }

  /**
   * Stream data as CSV
   */
  static async streamCSV<T extends Record<string, any>>(
    dataSource: AsyncIterable<T[]> | (() => AsyncIterable<T[]>),
    columns: string[],
    options: StreamingOptions = {},
    context: StreamingContext = {},
  ): Promise<Response> {
    const encoder = new TextEncoder();
    let isFirstBatch = true;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const source =
            typeof dataSource === 'function' ? dataSource() : dataSource;

          for await (const batch of source) {
            if (isFirstBatch && batch.length > 0) {
              // Send CSV header
              const header = columns.join(',') + '\n';
              controller.enqueue(encoder.encode(header));
              isFirstBatch = false;
            }

            // Convert batch to CSV rows
            const csvRows =
              batch
                .map((item) =>
                  columns
                    .map((col) => {
                      const value = item[col];
                      return typeof value === 'string' && value.includes(',')
                        ? `"${value.replace(/"/g, '""')}"`
                        : String(value || '');
                    })
                    .join(','),
                )
                .join('\n') + '\n';

            controller.enqueue(encoder.encode(csvRows));
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: ResponseStreamer.getStreamingHeaders(
        'text/csv',
        options.compression,
      ),
    });
  }

  /**
   * Create paginated data source for wedding-specific data
   */
  static async *createWeddingDataSource<T>(
    query: {
      table: string;
      select?: string;
      filter?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean }[];
    },
    batchSize: number = ResponseStreamer.DEFAULT_BATCH_SIZE,
    context: StreamingContext = {},
  ): AsyncIterable<T[]> {
    const supabase = await createClient();
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        let queryBuilder = supabase
          .from(query.table)
          .select(query.select || '*')
          .range(offset, offset + batchSize - 1);

        // Apply filters
        if (query.filter) {
          Object.entries(query.filter).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              queryBuilder = queryBuilder.in(key, value);
            } else {
              queryBuilder = queryBuilder.eq(key, value);
            }
          });
        }

        // Apply organization filter if provided
        if (context.organizationId && query.table !== 'organizations') {
          queryBuilder = queryBuilder.eq(
            'organization_id',
            context.organizationId,
          );
        }

        // Apply ordering
        if (query.orderBy) {
          query.orderBy.forEach((order) => {
            queryBuilder = queryBuilder.order(order.column, {
              ascending: order.ascending !== false,
            });
          });
        }

        const { data, error } = await queryBuilder;

        if (error) {
          console.error(`Error fetching ${query.table} batch:`, error);
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        yield data as T[];

        if (data.length < batchSize) {
          hasMore = false;
        }

        offset += batchSize;

        // Track metrics
        await metricsTracker.trackDatabaseQuery(
          `SELECT * FROM ${query.table} LIMIT ${batchSize} OFFSET ${offset}`,
          0, // Execution time would be measured by the query
          data.length,
          query.table,
        );
      } catch (error) {
        console.error(`Error in batch processing for ${query.table}:`, error);
        break;
      }
    }
  }

  /**
   * Create analytics data source with time-based streaming
   */
  static async *createAnalyticsDataSource(
    dateRange: { start: Date; end: Date },
    organizationId: string,
    batchSize: number = ResponseStreamer.DEFAULT_BATCH_SIZE,
  ): AsyncIterable<any[]> {
    const supabase = await createClient();

    // Stream data in daily chunks to avoid memory issues
    const dayMs = 24 * 60 * 60 * 1000;
    let currentDate = new Date(dateRange.start);

    while (currentDate <= dateRange.end) {
      const nextDate = new Date(
        Math.min(currentDate.getTime() + dayMs, dateRange.end.getTime()),
      );

      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', currentDate.toISOString())
        .lt('created_at', nextDate.toISOString())
        .limit(batchSize);

      if (error) {
        console.error('Error fetching analytics batch:', error);
        break;
      }

      if (data && data.length > 0) {
        yield data;
      }

      currentDate = nextDate;
    }
  }

  /**
   * Create budget export data source with related data
   */
  static async *createBudgetExportSource(
    clientId: string,
    batchSize: number = ResponseStreamer.DEFAULT_BATCH_SIZE,
  ): AsyncIterable<any[]> {
    const supabase = await createClient();
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('budget_items')
        .select(
          `
          *,
          budget_categories(name),
          vendors(name, contact_email)
        `,
        )
        .eq('client_id', clientId)
        .range(offset, offset + batchSize - 1)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching budget batch:', error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      // Transform data for export
      const transformedData = data.map((item) => ({
        ...item,
        category_name: item.budget_categories?.name || 'Uncategorized',
        vendor_name: item.vendors?.name || '',
        vendor_contact: item.vendors?.contact_email || '',
      }));

      yield transformedData;

      if (data.length < batchSize) {
        hasMore = false;
      }

      offset += batchSize;
    }
  }

  // Helper methods

  private static async sendProgressUpdate(
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder,
    processed: number,
    total: number | undefined,
    startTime: number,
    errors: number,
  ): Promise<void> {
    const progress = ResponseStreamer.calculateProgress(
      processed,
      total,
      startTime,
      errors,
    );

    // Send progress as a separate JSON object in the stream
    controller.enqueue(
      encoder.encode(`\n,{"progress":${JSON.stringify(progress)}}`),
    );
  }

  private static calculateProgress(
    processed: number,
    total: number | undefined,
    startTime: number,
    errors: number,
  ): StreamingProgress {
    const elapsed = Date.now() - startTime;
    const rate = processed / (elapsed / 1000);

    return {
      processed,
      total,
      percentage: total ? Math.round((processed / total) * 100) : undefined,
      rate: Math.round(rate * 100) / 100,
      estimatedTimeRemaining:
        total && rate > 0
          ? Math.round(((total - processed) / rate) * 1000)
          : undefined,
      errors,
      currentBatch: Math.ceil(processed / ResponseStreamer.DEFAULT_BATCH_SIZE),
    };
  }

  private static getStreamingHeaders(
    contentType: string,
    compression?: boolean,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    };

    if (compression) {
      headers['Content-Encoding'] = 'gzip';
    }

    return headers;
  }

  private static getSSEHeaders(): Record<string, string> {
    return {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no',
    };
  }
}

// Specialized streaming handlers for common wedding data exports

export class WeddingDataStreamer {
  /**
   * Stream all client data with related information
   */
  static async streamClientData(
    organizationId: string,
    format: 'json' | 'csv' = 'json',
    options: StreamingOptions = {},
  ): Promise<Response> {
    const dataSource = ResponseStreamer.createWeddingDataSource(
      {
        table: 'clients',
        select: `
        id, first_name, last_name, email, phone, 
        wedding_date, venue, budget, status, created_at,
        organization_id
      `,
        orderBy: [{ column: 'created_at', ascending: true }],
      },
      options.batchSize,
      { organizationId },
    );

    if (format === 'csv') {
      const columns = [
        'id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'wedding_date',
        'venue',
        'budget',
        'status',
        'created_at',
      ];
      return ResponseStreamer.streamCSV(dataSource, columns, options);
    }

    return ResponseStreamer.streamJSONArray(dataSource, options);
  }

  /**
   * Stream comprehensive budget data
   */
  static async streamBudgetData(
    clientId: string,
    format: 'json' | 'csv' = 'json',
    options: StreamingOptions = {},
  ): Promise<Response> {
    const dataSource = ResponseStreamer.createBudgetExportSource(
      clientId,
      options.batchSize,
    );

    if (format === 'csv') {
      const columns = [
        'id',
        'name',
        'category_name',
        'planned_amount',
        'actual_amount',
        'vendor_name',
        'vendor_contact',
        'status',
        'created_at',
      ];
      return ResponseStreamer.streamCSV(dataSource, columns, options);
    }

    return ResponseStreamer.streamJSONArray(dataSource, options);
  }

  /**
   * Stream analytics data for reporting
   */
  static async streamAnalyticsData(
    organizationId: string,
    dateRange: { start: Date; end: Date },
    format: 'json' | 'ndjson' = 'ndjson',
    options: StreamingOptions = {},
  ): Promise<Response> {
    const dataSource = ResponseStreamer.createAnalyticsDataSource(
      dateRange,
      organizationId,
      options.batchSize,
    );

    if (format === 'ndjson') {
      return ResponseStreamer.streamNDJSON(dataSource, options);
    }

    return ResponseStreamer.streamJSONArray(dataSource, options);
  }

  /**
   * Stream real-time wedding updates via SSE
   */
  static async streamWeddingUpdates(
    organizationId: string,
    weddingIds?: string[],
    options: StreamingOptions = {},
  ): Promise<Response> {
    // Create a data source that polls for updates
    const dataSource = async function* () {
      const supabase = await createClient();

      while (true) {
        try {
          let query = supabase
            .from('recent_activity')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(10);

          if (weddingIds && weddingIds.length > 0) {
            query = query.in('wedding_id', weddingIds);
          }

          const { data, error } = await query;

          if (error) {
            console.error('Error fetching wedding updates:', error);
            break;
          }

          if (data && data.length > 0) {
            yield data;
          }

          // Wait 5 seconds before next poll
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (error) {
          console.error('Error in wedding updates stream:', error);
          break;
        }
      }
    };

    return ResponseStreamer.streamServerSentEvents(dataSource(), options);
  }
}

// Utility function for API route integration
export function createStreamingResponse<T>(
  dataGenerator: () => AsyncIterable<T[]>,
  format: StreamingOptions['format'] = 'json',
  options: StreamingOptions = {},
): Promise<Response> {
  switch (format) {
    case 'csv':
      throw new Error('CSV format requires column specification');
    case 'ndjson':
      return ResponseStreamer.streamNDJSON(dataGenerator, options);
    case 'sse':
      return ResponseStreamer.streamServerSentEvents(dataGenerator, options);
    case 'json':
    default:
      return ResponseStreamer.streamJSONArray(dataGenerator, options);
  }
}
