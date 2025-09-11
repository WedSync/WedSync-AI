import { XSSProtection, XSSSafeSchemas } from '@/lib/security/xss-protection'
import { sanitizeFieldValue } from '@/lib/validations/forms'

describe('XSS Protection Tests', () => {
  
  describe('HTML Sanitization', () => {
    test('should remove script tags', () => {
      const maliciousInput = `<script>alert('XSS')</script>Hello World`
      const sanitized = XSSProtection.sanitizeHTML(maliciousInput)
      expect(sanitized).toBe('Hello World')
      expect(sanitized).not.toContain('<script>')
    })

    test('should remove javascript: URLs', () => {
      const maliciousInput = `<a href="javascript:alert('XSS')">Click me</a>`
      const sanitized = XSSProtection.sanitizeHTML(maliciousInput)
      expect(sanitized).not.toContain('javascript:')
    })

    test('should remove event handlers', () => {
      const maliciousInput = `<div onclick="alert('XSS')">Click me</div>`
      const sanitized = XSSProtection.sanitizeHTML(maliciousInput)
      expect(sanitized).not.toContain('onclick')
    })

    test('should allow safe HTML in basic mode', () => {
      const safeInput = `<p>This is <strong>safe</strong> content</p>`
      const sanitized = XSSProtection.sanitizeHTML(safeInput, 'basic')
      expect(sanitized).toContain('<p>')
      expect(sanitized).toContain('<strong>')
    })

    test('should strip all HTML in strict mode', () => {
      const input = `<p>This is <strong>safe</strong> content</p>`
      const sanitized = XSSProtection.sanitizeHTML(input, 'strict')
      expect(sanitized).toBe('This is safe content')
      expect(sanitized).not.toContain('<p>')
      expect(sanitized).not.toContain('<strong>')
    })
  })

  describe('Input Sanitization', () => {
    test('should sanitize text input', () => {
      const maliciousInputs = [
        `<script>alert('XSS')</script>`,
        `javascript:alert('XSS')`,
        `<img src="x" onerror="alert('XSS')">`,
        `<div onclick="alert('XSS')">content</div>`
      ]

      maliciousInputs.forEach(input => {
        const sanitized = XSSProtection.sanitizeInput(input, 'text')
        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('onclick')
        expect(sanitized).not.toContain('onerror')
      })
    })

    test('should validate email input type', () => {
      const validEmail = 'user@example.com'
      const invalidEmail = `<script>alert('XSS')</script>@example.com`
      
      expect(XSSProtection.sanitizeInput(validEmail, 'email')).toBe(validEmail)
      expect(XSSProtection.sanitizeInput(invalidEmail, 'email')).toBe('')
    })

    test('should validate phone input type', () => {
      const validPhone = '+1 (555) 123-4567'
      const invalidPhone = `<script>alert('XSS')</script>`
      
      expect(XSSProtection.sanitizeInput(validPhone, 'phone')).toBe(validPhone)
      expect(XSSProtection.sanitizeInput(invalidPhone, 'phone')).toBe('')
    })

    test('should validate URL input type', () => {
      const validUrl = 'https://example.com/path'
      const invalidUrl = `javascript:alert('XSS')`
      
      expect(XSSProtection.sanitizeInput(validUrl, 'url')).toBe(validUrl)
      expect(XSSProtection.sanitizeInput(invalidUrl, 'url')).toBe('')
    })

    test('should validate name input type', () => {
      const validName = "John O'Connor"
      const invalidName = `<script>alert('XSS')</script>`
      
      expect(XSSProtection.sanitizeInput(validName, 'name')).toBe(validName)
      expect(XSSProtection.sanitizeInput(invalidName, 'name')).toBe('')
    })

    test('should validate UUID input type', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const invalidUuid = `<script>alert('XSS')</script>`
      
      expect(XSSProtection.sanitizeInput(validUuid, 'uuid')).toBe(validUuid)
      expect(XSSProtection.sanitizeInput(invalidUuid, 'uuid')).toBe('')
    })
  })

  describe('Object Sanitization', () => {
    test('should sanitize object properties recursively', () => {
      const maliciousObject = {
        name: `<script>alert('XSS')</script>John`,
        email: `user@example.com<script>alert('XSS')</script>`,
        nested: {
          field: `<img src="x" onerror="alert('XSS')">`,
          safe: 'This is safe'
        },
        array: [
          `<script>alert('XSS')</script>`,
          'Safe content'
        ]
      }

      const sanitized = XSSProtection.sanitizeObject(maliciousObject)
      
      expect(sanitized.name).not.toContain('<script>')
      expect(sanitized.email).not.toContain('<script>')
      expect(sanitized.nested.field).not.toContain('onerror')
      expect(sanitized.nested.safe).toBe('This is safe')
      expect(sanitized.array[0]).not.toContain('<script>')
      expect(sanitized.array[1]).toBe('Safe content')
    })
  })

  describe('Form Field Sanitization', () => {
    test('should sanitize different field types correctly', () => {
      expect(XSSProtection.sanitizeFormField(`<script>alert('XSS')</script>test@example.com`, 'email'))
        .toBe('')
      
      expect(XSSProtection.sanitizeFormField('test@example.com', 'email'))
        .toBe('test@example.com')
      
      expect(XSSProtection.sanitizeFormField(`<script>alert('XSS')</script>+1234567890`, 'phone'))
        .toBe('')
      
      expect(XSSProtection.sanitizeFormField('+1 (555) 123-4567', 'phone'))
        .toBe('+1 (555) 123-4567')
      
      expect(XSSProtection.sanitizeFormField(`<p>Safe <strong>content</strong></p>`, 'textarea'))
        .toContain('<p>')
      
      expect(XSSProtection.sanitizeFormField(`<script>alert('XSS')</script>`, 'textarea'))
        .toBe('')
    })

    test('should handle null and undefined values', () => {
      expect(XSSProtection.sanitizeFormField(null, 'text')).toBeNull()
      expect(XSSProtection.sanitizeFormField(undefined, 'text')).toBeUndefined()
    })

    test('should validate numeric ranges', () => {
      expect(XSSProtection.sanitizeFormField(123, 'number')).toBe(123)
      expect(XSSProtection.sanitizeFormField(9999999999, 'number')).toBeNull()
      expect(XSSProtection.sanitizeFormField(-9999999999, 'number')).toBeNull()
      expect(XSSProtection.sanitizeFormField(Infinity, 'number')).toBeNull()
      expect(XSSProtection.sanitizeFormField(NaN, 'number')).toBeNull()
    })

    test('should handle boolean values', () => {
      expect(XSSProtection.sanitizeFormField(true, 'checkbox')).toBe(true)
      expect(XSSProtection.sanitizeFormField(false, 'checkbox')).toBe(false)
      expect(XSSProtection.sanitizeFormField('true', 'checkbox')).toBe(true)
      expect(XSSProtection.sanitizeFormField('false', 'checkbox')).toBe(false)
    })

    test('should sanitize array values', () => {
      const maliciousArray = [
        `<script>alert('XSS')</script>`,
        'Safe content',
        `<img src="x" onerror="alert('XSS')">`
      ]
      
      const sanitized = XSSProtection.sanitizeFormField(maliciousArray, 'text')
      expect(Array.isArray(sanitized)).toBe(true)
      expect((sanitized as string[])[1]).toBe('Safe content')
      expect((sanitized as string[]).some(item => item.includes('<script>'))).toBe(false)
    })
  })

  describe('Enhanced Zod Schemas', () => {
    test('should validate and sanitize text with XSSSafeSchemas', () => {
      const schema = XSSSafeSchemas.safeText(100)
      
      expect(schema.parse('Hello World')).toBe('Hello World')
      expect(schema.parse(`<script>alert('XSS')</script>Hello`)).toBe('Hello')
      
      expect(() => schema.parse('A'.repeat(101))).toThrow()
    })

    test('should validate and sanitize email with XSSSafeSchemas', () => {
      const schema = XSSSafeSchemas.safeEmail()
      
      expect(schema.parse('user@example.com')).toBe('user@example.com')
      expect(() => schema.parse('invalid-email')).toThrow()
      expect(() => schema.parse(`<script>alert('XSS')</script>@example.com`)).toThrow()
    })

    test('should validate and sanitize phone with XSSSafeSchemas', () => {
      const schema = XSSSafeSchemas.safePhone()
      
      expect(schema.parse('+1 (555) 123-4567')).toBe('+1 (555) 123-4567')
      expect(() => schema.parse(`<script>alert('XSS')</script>`)).toThrow()
    })

    test('should validate and sanitize URL with XSSSafeSchemas', () => {
      const schema = XSSSafeSchemas.safeUrl()
      
      expect(schema.parse('https://example.com')).toBe('https://example.com')
      expect(() => schema.parse(`javascript:alert('XSS')`)).toThrow()
    })

    test('should validate and sanitize name with XSSSafeSchemas', () => {
      const schema = XSSSafeSchemas.safeName(50)
      
      expect(schema.parse("John O'Connor")).toBe("John O'Connor")
      expect(() => schema.parse(`<script>alert('XSS')</script>`)).toThrow()
    })

    test('should validate and sanitize UUID with XSSSafeSchemas', () => {
      const schema = XSSSafeSchemas.safeUuid()
      
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      expect(schema.parse(validUuid)).toBe(validUuid)
      expect(() => schema.parse('invalid-uuid')).toThrow()
      expect(() => schema.parse(`<script>alert('XSS')</script>`)).toThrow()
    })

    test('should validate and sanitize slug with XSSSafeSchemas', () => {
      const schema = XSSSafeSchemas.safeSlug(50)
      
      expect(schema.parse('valid-slug-123')).toBe('valid-slug-123')
      expect(() => schema.parse('Invalid Slug!')).toThrow()
      expect(() => schema.parse(`<script>alert('XSS')</script>`)).toThrow()
    })

    test('should validate and sanitize rich text with XSSSafeSchemas', () => {
      const schema = XSSSafeSchemas.richText(1000)
      
      const safeHtml = '<p>This is <strong>safe</strong> content</p>'
      const maliciousHtml = `<p>This is <script>alert('XSS')</script> content</p>`
      
      expect(schema.parse(safeHtml)).toContain('<p>')
      expect(schema.parse(safeHtml)).toContain('<strong>')
      expect(schema.parse(maliciousHtml)).not.toContain('<script>')
    })
  })

  describe('Legacy Form Validation', () => {
    test('should use enhanced XSS protection in sanitizeFieldValue', () => {
      expect(sanitizeFieldValue(`<script>alert('XSS')</script>test@example.com`, 'email'))
        .toBe('')
      
      expect(sanitizeFieldValue('test@example.com', 'email'))
        .toBe('test@example.com')
      
      expect(sanitizeFieldValue(`<script>alert('XSS')</script>Hello World`, 'text'))
        .toBe('Hello World')
      
      expect(sanitizeFieldValue(null, 'text'))
        .toBeNull()
      
      expect(sanitizeFieldValue(undefined, 'text'))
        .toBeUndefined()
    })
  })

  describe('Advanced XSS Attack Vectors', () => {
    test('should block SVG XSS attacks', () => {
      const svgXss = `<svg onload="alert('XSS')">test</svg>`
      const sanitized = XSSProtection.sanitizeHTML(svgXss)
      expect(sanitized).not.toContain('onload')
      expect(sanitized).not.toContain('<svg>')
    })

    test('should block CSS XSS attacks', () => {
      const cssXss = `<div style="background:url('javascript:alert(1)')">test</div>`
      const sanitized = XSSProtection.sanitizeHTML(cssXss)
      expect(sanitized).not.toContain('javascript:')
    })

    test('should block data URI XSS attacks', () => {
      const dataUriXss = `<img src="data:text/html,<script>alert('XSS')</script>">`
      const sanitized = XSSProtection.sanitizeHTML(dataUriXss)
      expect(sanitized).not.toContain('data:text/html')
    })

    test('should block vbscript attacks', () => {
      const vbscriptXss = `<a href="vbscript:msgbox('XSS')">Click</a>`
      const sanitized = XSSProtection.sanitizeInput(vbscriptXss)
      expect(sanitized).not.toContain('vbscript:')
    })

    test('should block eval attacks', () => {
      const evalXss = `<img src="x" onerror="eval('alert(1)')">`
      const sanitized = XSSProtection.sanitizeInput(evalXss)
      expect(sanitized).not.toContain('eval(')
    })

    test('should block expression attacks', () => {
      const expressionXss = `<div style="width:expression(alert('XSS'))">test</div>`
      const sanitized = XSSProtection.sanitizeInput(expressionXss)
      expect(sanitized).not.toContain('expression(')
    })

    test('should block setTimeout/setInterval attacks', () => {
      const timeoutXss = `<img src="x" onerror="setTimeout('alert(1)', 100)">`
      const sanitized = XSSProtection.sanitizeInput(timeoutXss)
      expect(sanitized).not.toContain('setTimeout(')
    })
  })

  describe('Content Security Policy Headers', () => {
    test('should generate proper CSP headers', () => {
      const headers = XSSProtection.getCSPHeaders()
      
      expect(headers['Content-Security-Policy']).toBeDefined()
      expect(headers['X-Content-Type-Options']).toBe('nosniff')
      expect(headers['X-Frame-Options']).toBe('DENY')
      expect(headers['X-XSS-Protection']).toBe('1; mode=block')
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    })

    test('should have restrictive CSP directives', () => {
      const headers = XSSProtection.getCSPHeaders()
      const csp = headers['Content-Security-Policy']
      
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("object-src 'none'")
      expect(csp).toContain("base-uri 'self'")
      expect(csp).toContain("frame-ancestors 'none'")
      expect(csp).toContain('upgrade-insecure-requests')
    })
  })
})