/**
 * File validation utilities for secure file handling
 * Implements OWASP file upload security practices
 */

export interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  scanForMalware?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedName: string;
  mimeType: string;
  size: number;
}

/**
 * Validate uploaded file for security compliance
 */
export async function validateFile(
  file: File,
  options: FileValidationOptions,
): Promise<FileValidationResult> {
  const errors: string[] = [];
  let isValid = true;

  // Basic file info
  const originalName = file.name;
  const size = file.size;
  const type = file.type;

  // Validate file size
  if (size > options.maxSize) {
    errors.push(
      `File size ${size} exceeds maximum allowed size ${options.maxSize}`,
    );
    isValid = false;
  }

  // Validate MIME type
  if (!options.allowedTypes.includes(type)) {
    errors.push(`MIME type ${type} is not allowed`);
    isValid = false;
  }

  // Validate file extension
  const extension = originalName.toLowerCase().split('.').pop() || '';
  if (!options.allowedExtensions.includes(extension)) {
    errors.push(`File extension .${extension} is not allowed`);
    isValid = false;
  }

  // Sanitize filename
  const sanitizedName = sanitizeFileName(originalName);

  // Basic malware check (check for suspicious patterns)
  if (options.scanForMalware) {
    const buffer = await file.arrayBuffer();
    if (containsSuspiciousPatterns(new Uint8Array(buffer))) {
      errors.push('File contains suspicious patterns');
      isValid = false;
    }
  }

  return {
    isValid,
    errors,
    sanitizedName,
    mimeType: type,
    size,
  };
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
function sanitizeFileName(fileName: string): string {
  // Remove path separators and special characters
  let sanitized = fileName.replace(/[\/\\:*?"<>|]/g, '');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^\.+|\.+$/g, '').trim();

  // Ensure filename isn't empty
  if (!sanitized) {
    sanitized = 'file';
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 255 - (ext ? ext.length + 1 : 0));
    sanitized = ext ? `${name}.${ext}` : name;
  }

  return sanitized;
}

/**
 * Basic check for suspicious binary patterns
 */
function containsSuspiciousPatterns(buffer: Uint8Array): boolean {
  // Check for common executable headers
  const suspiciousHeaders = [
    [0x4d, 0x5a], // PE executable (Windows)
    [0x7f, 0x45, 0x4c, 0x46], // ELF executable (Linux)
    [0xfe, 0xed, 0xfa, 0xce], // Mach-O executable (macOS)
    [0xfe, 0xed, 0xfa, 0xcf], // Mach-O executable (macOS 64-bit)
  ];

  for (const header of suspiciousHeaders) {
    if (buffer.length >= header.length) {
      let matches = true;
      for (let i = 0; i < header.length; i++) {
        if (buffer[i] !== header[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
  }

  return false;
}

/**
 * Simple file upload validation for compatibility
 */
export const validateFileUpload = (file: File) => {
  return validateFile(file, FILE_VALIDATION_PRESETS.IMAGES);
};

/**
 * Common file validation presets
 */
export const FILE_VALIDATION_PRESETS = {
  IMAGES: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    scanForMalware: true,
  },
  DOCUMENTS: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    allowedExtensions: ['pdf', 'doc', 'docx'],
    scanForMalware: true,
  },
  SPREADSHEETS: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    allowedExtensions: ['xls', 'xlsx', 'csv'],
    scanForMalware: true,
  },
  AUDIO: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4'],
    allowedExtensions: ['mp3', 'wav', 'm4a'],
    scanForMalware: false,
  },
};
