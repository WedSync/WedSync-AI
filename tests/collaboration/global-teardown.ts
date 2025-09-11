export default async () => {
  console.log('🧹 Tearing down WS-244 Collaboration Test Environment')
  
  // Clean up test WebSocket connections
  if ((global as any).testWebSocketServer) {
    console.log('🔌 Closing test WebSocket server...')
    ;(global as any).testWebSocketServer.close()
  }
  
  // Clear test environment variables
  delete process.env.TEST_WS_SERVER
  delete process.env.TEST_MODE
  
  // Clean up any test artifacts
  console.log('🗑️  Cleaning up test artifacts...')
  
  // Clear IndexedDB test data
  if (global.indexedDB) {
    try {
      // Clear all test databases
      const databases = await global.indexedDB.databases?.() || []
      for (const db of databases) {
        if (db.name?.startsWith('test-')) {
          console.log(`🗄️  Deleting test database: ${db.name}`)
          global.indexedDB.deleteDatabase(db.name)
        }
      }
    } catch (error) {
      console.warn('Warning: Could not clean up test databases:', error)
    }
  }
  
  console.log('✅ Collaboration test environment cleaned up')
}