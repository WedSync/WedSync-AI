/**
 * Factory for creating reporting engine instances
 * Uses dynamic imports to avoid loading heavy dependencies during build
 */

export async function createWeddingReportingEngine(config?: any) {
  // Only load the actual implementation on the server side when needed
  if (typeof window !== 'undefined') {
    // Client side - return mock
    return {
      generateReport: async () => ({ success: false, error: 'Server only' }),
      scheduleReport: async () => ({ success: false, error: 'Server only' }),
      getReportStatus: async () => ({ status: 'unavailable' }),
    };
  }

  try {
    // Server side - dynamic import
    const { WeddingReportingEngineBackend } = await import(
      './ReportingEngineBackend'
    );
    return new WeddingReportingEngineBackend(config);
  } catch (error) {
    console.warn('Failed to load reporting engine:', error);
    // Return mock implementation for development
    return {
      generateReport: async () => ({
        success: false,
        error: 'Reporting engine dependencies not available',
      }),
      scheduleReport: async () => ({
        success: false,
        error: 'Reporting engine dependencies not available',
      }),
      getReportStatus: async () => ({
        status: 'unavailable',
        message: 'Reporting engine dependencies not available',
      }),
    };
  }
}
