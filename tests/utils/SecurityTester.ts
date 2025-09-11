// /tests/utils/SecurityTester.ts
export class SecurityTester {
  async validateSecurityHeaders(response: any): Promise<boolean> {
    const headers = response.headers();
    const requiredHeaders = [
      'x-frame-options',
      'x-content-type-options', 
      'strict-transport-security',
      'x-xss-protection'
    ];

    for (const header of requiredHeaders) {
      if (!headers[header]) {
        console.error(`Missing security header: ${header}`);
        return false;
      }
    }
    return true;
  }

  async testEndpointAuthentication(page: any, endpoint: string): Promise<boolean> {
    try {
      const response = await page.request.get(endpoint);
      const status = response.status();
      
      // Should return 401 or 403 for protected endpoints
      return [401, 403].includes(status);
    } catch (error) {
      console.error(`Error testing endpoint ${endpoint}:`, error);
      return false;
    }
  }

  async validateCSRFProtection(page: any, endpoint: string): Promise<boolean> {
    try {
      // Attempt POST without CSRF token
      const response = await page.request.post(endpoint, {
        data: { test: 'data' }
      });
      
      // Should reject without CSRF token
      return response.status() === 403;
    } catch (error) {
      console.error(`Error testing CSRF protection on ${endpoint}:`, error);
      return false;
    }
  }

  async checkForSQLInjection(page: any, inputSelector: string): Promise<boolean> {
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT * FROM users --"
    ];

    for (const payload of sqlPayloads) {
      await page.fill(inputSelector, payload);
      await page.press(inputSelector, 'Enter');
      
      // Check for SQL error messages in response
      const content = await page.content();
      if (content.includes('SQL') || content.includes('syntax error')) {
        console.error(`SQL injection vulnerability detected with payload: ${payload}`);
        return false;
      }
    }
    
    return true;
  }

  async validateInputSanitization(page: any, inputSelector: string): Promise<boolean> {
    const xssPayloads = [
      "<script>alert('xss')</script>",
      "<img src=x onerror=alert('xss')>",
      "javascript:alert('xss')"
    ];

    for (const payload of xssPayloads) {
      await page.fill(inputSelector, payload);
      await page.press(inputSelector, 'Enter');
      await page.waitForTimeout(1000);
      
      // Check if script executed
      const alerts = await page.evaluate(() => window.alertTriggered);
      if (alerts) {
        console.error(`XSS vulnerability detected with payload: ${payload}`);
        return false;
      }
    }
    
    return true;
  }

  async checkPasswordSecurity(page: any): Promise<boolean> {
    const weakPasswords = [
      'password',
      '123456',
      'admin',
      'test'
    ];

    for (const password of weakPasswords) {
      await page.fill('[data-testid="password"]', password);
      await page.click('[data-testid="register-button"]');
      
      const errorMessage = await page.textContent('[data-testid="password-error"]');
      if (!errorMessage || !errorMessage.includes('weak')) {
        console.error(`Weak password accepted: ${password}`);
        return false;
      }
    }
    
    return true;
  }
}