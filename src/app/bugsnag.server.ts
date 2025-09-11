import { initBugsnagNode } from '@/lib/bugsnag'

// Initialize Bugsnag for server-side error tracking
initBugsnagNode()

// Export for use in API routes and server components
export { reportWeddingError, reportVendorError } from '@/lib/bugsnag'