import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface TestAttachment {
  name: string
  path: string
  mimeType: string
  size: number
}

export async function createTestAttachment(
  fileName: string,
  mimeType: string,
  sizeBytes: number = 1024
): Promise<TestAttachment> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wedsync-test-'))
  const filePath = path.join(tempDir, fileName)
  
  // Create test file content based on type
  let content: Buffer
  
  if (mimeType === 'application/pdf') {
    // Simple PDF header for testing
    content = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
195
%%EOF`)
  } else if (mimeType.startsWith('image/')) {
    // Simple 1x1 pixel PNG for testing
    content = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ])
  } else {
    // Generic text content
    content = Buffer.from('Test file content for vendor chat system testing')
  }
  
  // Pad to requested size if needed
  if (content.length < sizeBytes) {
    const padding = Buffer.alloc(sizeBytes - content.length, 0)
    content = Buffer.concat([content, padding])
  }
  
  await fs.writeFile(filePath, content)
  
  return {
    name: fileName,
    path: filePath,
    mimeType,
    size: content.length
  }
}

export async function cleanupTestFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath)
      // Also try to remove the temp directory if it's empty
      const dir = path.dirname(filePath)
      await fs.rmdir(dir).catch(() => {}) // Ignore errors if not empty
    } catch (error) {
      console.warn(`Failed to cleanup test file: ${filePath}`, error)
    }
  }
}

export async function createTestImage(
  fileName: string = 'test-image.png',
  width: number = 100,
  height: number = 100
): Promise<TestAttachment> {
  return createTestAttachment(fileName, 'image/png')
}

export async function createTestDocument(
  fileName: string = 'test-document.pdf'
): Promise<TestAttachment> {
  return createTestAttachment(fileName, 'application/pdf')
}

export async function createTestContract(
  fileName: string = 'vendor-contract.pdf'
): Promise<TestAttachment> {
  return createTestAttachment(fileName, 'application/pdf', 2 * 1024 * 1024) // 2MB
}