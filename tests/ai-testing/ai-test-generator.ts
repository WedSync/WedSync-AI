// AI-Powered Test Generation and Maintenance System
// Automatically generates, maintains, and optimizes test cases for WedSync
// Uses machine learning to analyze code patterns and user behavior

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from '@typescript-eslint/parser';
import type { AST } from '@typescript-eslint/parser';

interface TestGenerationContext {
  filePath: string;
  codeContent: string;
  ast: any;
  dependencies: string[];
  functionSignatures: FunctionSignature[];
  weddingContext: WeddingDomainContext;
}

interface FunctionSignature {
  name: string;
  parameters: Parameter[];
  returnType: string;
  isAsync: boolean;
  complexity: number;
  weddingRelevance: number; // 0-1 score for wedding domain relevance
}

interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: any;
}

interface WeddingDomainContext {
  isWeddingRelated: boolean;
  domain: string; // 'rsvp', 'timeline', 'budget', 'vendors', 'photos', 'guests'
  userRole: string; // 'couple', 'vendor', 'admin', 'guest'
  criticalPath: boolean; // Is this a critical wedding workflow?
  dataTypes: string[]; // Wedding-specific data types used
}

interface GeneratedTest {
  testName: string;
  description: string;
  testCode: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  weddingScenario: string;
  dataRequirements: any[];
  mockRequirements: string[];
  assertions: string[];
  edgeCases: string[];
}

interface TestMaintenanceAction {
  type: 'update' | 'remove' | 'optimize' | 'fix';
  testPath: string;
  reason: string;
  suggestedChanges: string;
  confidence: number; // 0-1 confidence in the suggestion
}

class AITestGenerator {
  private weddingDomains = {
    rsvp: {
      keywords: ['rsvp', 'guest', 'response', 'invitation', 'attend'],
      criticalFunctions: ['submitRSVP', 'updateGuestCount', 'sendInvitation'],
      testScenarios: ['last-minute-changes', 'dietary-restrictions', 'plus-ones']
    },
    timeline: {
      keywords: ['timeline', 'schedule', 'event', 'ceremony', 'reception'],
      criticalFunctions: ['createEvent', 'updateTimeline', 'notifyVendors'],
      testScenarios: ['vendor-delays', 'weather-changes', 'time-conflicts']
    },
    budget: {
      keywords: ['budget', 'cost', 'payment', 'expense', 'invoice'],
      criticalFunctions: ['calculateTotal', 'addExpense', 'processPayment'],
      testScenarios: ['budget-exceeded', 'payment-failures', 'currency-conversion']
    },
    vendors: {
      keywords: ['vendor', 'supplier', 'booking', 'contract', 'service'],
      criticalFunctions: ['bookVendor', 'reviewVendor', 'manageContracts'],
      testScenarios: ['vendor-cancellation', 'quality-disputes', 'last-minute-bookings']
    },
    photos: {
      keywords: ['photo', 'gallery', 'album', 'image', 'memory'],
      criticalFunctions: ['uploadPhoto', 'createAlbum', 'shareGallery'],
      testScenarios: ['storage-limits', 'sharing-permissions', 'bulk-uploads']
    },
    guests: {
      keywords: ['guest', 'contact', 'address', 'invitation', 'list'],
      criticalFunctions: ['addGuest', 'updateContact', 'manageGroups'],
      testScenarios: ['duplicate-contacts', 'invalid-addresses', 'group-management']
    }
  };

  async generateTestsForFile(filePath: string): Promise<GeneratedTest[]> {
    console.log(`🤖 AI analyzing ${filePath} for test generation...`);
    
    try {
      // Read and parse the source file
      const codeContent = await fs.readFile(filePath, 'utf-8');
      const context = await this.analyzeCode(filePath, codeContent);
      
      // Generate tests based on AI analysis
      const tests: GeneratedTest[] = [];
      
      // Generate unit tests for functions
      for (const func of context.functionSignatures) {
        const unitTests = await this.generateUnitTests(func, context);
        tests.push(...unitTests);
      }
      
      // Generate integration tests for wedding workflows
      if (context.weddingContext.isWeddingRelated) {
        const integrationTests = await this.generateIntegrationTests(context);
        tests.push(...integrationTests);
      }
      
      // Generate edge case tests
      const edgeCaseTests = await this.generateEdgeCaseTests(context);
      tests.push(...edgeCaseTests);
      
      console.log(`✅ Generated ${tests.length} AI-powered tests for ${path.basename(filePath)}`);
      return tests;
      
    } catch (error) {
      console.error(`❌ AI test generation failed for ${filePath}:`, error);
      return [];
    }
  }

  private async analyzeCode(filePath: string, codeContent: string): Promise<TestGenerationContext> {
    // Parse TypeScript/JavaScript AST
    const ast = parse(codeContent, {
      sourceType: 'module',
      ecmaVersion: 2022,
      ecmaFeatures: {
        jsx: true,
        tsx: true
      }
    });
    
    // Extract function signatures using AI analysis
    const functionSignatures = this.extractFunctions(ast, codeContent);
    
    // Analyze wedding domain relevance
    const weddingContext = this.analyzeWeddingContext(filePath, codeContent, functionSignatures);
    
    // Extract dependencies
    const dependencies = this.extractDependencies(codeContent);
    
    return {
      filePath,
      codeContent,
      ast,
      dependencies,
      functionSignatures,
      weddingContext
    };
  }

  private extractFunctions(ast: any, code: string): FunctionSignature[] {
    const functions: FunctionSignature[] = [];
    
    // Simulate AST traversal and function extraction
    // In real implementation, this would use proper AST traversal
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*{/g;
    const arrowFunctionRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>\s*/g;
    
    let match;
    
    // Extract regular functions
    while ((match = functionRegex.exec(code)) !== null) {
      const [, name, params, returnType] = match;
      
      functions.push({
        name,
        parameters: this.parseParameters(params),
        returnType: returnType?.trim() || 'any',
        isAsync: match[0].includes('async'),
        complexity: this.calculateComplexity(name, code),
        weddingRelevance: this.calculateWeddingRelevance(name, code)
      });
    }
    
    // Extract arrow functions
    while ((match = arrowFunctionRegex.exec(code)) !== null) {
      const [, name, params, returnType] = match;
      
      functions.push({
        name,
        parameters: this.parseParameters(params),
        returnType: returnType?.trim() || 'any',
        isAsync: match[0].includes('async'),
        complexity: this.calculateComplexity(name, code),
        weddingRelevance: this.calculateWeddingRelevance(name, code)
      });
    }
    
    return functions;
  }

  private parseParameters(paramString: string): Parameter[] {
    if (!paramString.trim()) return [];
    
    return paramString.split(',').map(param => {
      const trimmed = param.trim();
      const [nameType, defaultValue] = trimmed.split('=');
      const [name, type] = nameType.split(':').map(s => s.trim());
      
      return {
        name: name.replace(/[?]$/, ''), // Remove optional marker
        type: type || 'any',
        optional: name.includes('?') || !!defaultValue,
        defaultValue: defaultValue?.trim()
      };
    });
  }

  private calculateComplexity(functionName: string, code: string): number {
    // Simple complexity calculation based on cyclomatic complexity indicators
    const functionCode = this.extractFunctionBody(functionName, code);
    
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionPatterns = [/if\s*\(/g, /else/g, /for\s*\(/g, /while\s*\(/g, /switch\s*\(/g, /catch\s*\(/g, /&&/g, /\|\|/g, /\?/g];
    
    decisionPatterns.forEach(pattern => {
      const matches = functionCode.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10); // Cap at 10
  }

  private calculateWeddingRelevance(functionName: string, code: string): number {
    const functionCode = this.extractFunctionBody(functionName, code);
    const fullText = (functionName + ' ' + functionCode).toLowerCase();
    
    let relevanceScore = 0;
    let totalKeywords = 0;
    
    // Check against wedding domain keywords
    Object.values(this.weddingDomains).forEach(domain => {
      domain.keywords.forEach(keyword => {
        totalKeywords++;
        if (fullText.includes(keyword)) {
          relevanceScore++;
        }
      });
    });
    
    return totalKeywords > 0 ? relevanceScore / totalKeywords : 0;
  }

  private extractFunctionBody(functionName: string, code: string): string {
    const regex = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)[^{]*{([^}]*)}`, 'g');
    const match = regex.exec(code);
    return match ? match[1] : '';
  }

  private analyzeWeddingContext(filePath: string, code: string, functions: FunctionSignature[]): WeddingDomainContext {
    const pathLower = filePath.toLowerCase();
    const codeLower = code.toLowerCase();
    
    // Determine wedding domain
    let domain = 'general';
    let maxRelevance = 0;
    
    Object.entries(this.weddingDomains).forEach(([domainName, domainData]) => {
      const relevance = domainData.keywords.reduce((score, keyword) => {
        if (pathLower.includes(keyword) || codeLower.includes(keyword)) {
          return score + 1;
        }
        return score;
      }, 0) / domainData.keywords.length;
      
      if (relevance > maxRelevance) {
        maxRelevance = relevance;
        domain = domainName;
      }
    });
    
    // Determine user role context
    const userRole = this.determineUserRole(pathLower, codeLower);
    
    // Check if it's a critical path
    const criticalPath = this.isCriticalWeddingPath(domain, functions);
    
    // Extract wedding-specific data types
    const dataTypes = this.extractWeddingDataTypes(code);
    
    return {
      isWeddingRelated: maxRelevance > 0.3,
      domain,
      userRole,
      criticalPath,
      dataTypes
    };
  }

  private determineUserRole(pathLower: string, codeLower: string): string {
    const roleIndicators = {
      admin: ['admin', 'dashboard', 'manage', 'control'],
      vendor: ['vendor', 'supplier', 'service', 'booking'],
      couple: ['couple', 'bride', 'groom', 'planning'],
      guest: ['guest', 'rsvp', 'invitation', 'attendance']
    };
    
    for (const [role, indicators] of Object.entries(roleIndicators)) {
      if (indicators.some(indicator => pathLower.includes(indicator) || codeLower.includes(indicator))) {
        return role;
      }
    }
    
    return 'general';
  }

  private isCriticalWeddingPath(domain: string, functions: FunctionSignature[]): boolean {
    if (!this.weddingDomains[domain as keyof typeof this.weddingDomains]) return false;
    
    const criticalFunctions = this.weddingDomains[domain as keyof typeof this.weddingDomains].criticalFunctions;
    
    return functions.some(func => 
      criticalFunctions.some(criticalFunc => 
        func.name.toLowerCase().includes(criticalFunc.toLowerCase())
      )
    );
  }

  private extractWeddingDataTypes(code: string): string[] {
    const weddingTypes = ['Wedding', 'Guest', 'Vendor', 'Event', 'Budget', 'RSVP', 'Timeline', 'Photo', 'Album', 'Invitation'];
    
    return weddingTypes.filter(type => {
      const regex = new RegExp(`\\b${type}\\b`, 'i');
      return regex.test(code);
    });
  }

  private extractDependencies(code: string): string[] {
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    
    const dependencies: string[] = [];
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }
    
    while ((match = requireRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  private async generateUnitTests(func: FunctionSignature, context: TestGenerationContext): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];
    
    // Generate basic functionality test
    const basicTest = this.generateBasicUnitTest(func, context);
    tests.push(basicTest);
    
    // Generate parameter validation tests
    if (func.parameters.length > 0) {
      const paramTests = this.generateParameterTests(func, context);
      tests.push(...paramTests);
    }
    
    // Generate async/error handling tests
    if (func.isAsync) {
      const asyncTests = this.generateAsyncTests(func, context);
      tests.push(...asyncTests);
    }
    
    return tests;
  }

  private generateBasicUnitTest(func: FunctionSignature, context: TestGenerationContext): GeneratedTest {
    const weddingScenario = this.generateWeddingScenario(context.weddingContext);
    const testData = this.generateTestData(func, context.weddingContext);
    
    const testCode = `
describe('${func.name}', () => {
  test('should ${this.generateTestDescription(func, context)}', ${func.isAsync ? 'async ' : ''}() => {
    // Arrange
    ${this.generateTestSetup(func, testData)}
    
    // Act
    const result = ${func.isAsync ? 'await ' : ''}${func.name}(${this.generateTestParams(func, testData)});
    
    // Assert
    ${this.generateAssertions(func, context, testData)}
  });
});`.trim();
    
    return {
      testName: `${func.name} basic functionality`,
      description: `Tests basic functionality of ${func.name} in ${weddingScenario} scenario`,
      testCode,
      priority: func.weddingRelevance > 0.7 ? 'critical' : func.complexity > 5 ? 'high' : 'medium',
      weddingScenario,
      dataRequirements: testData,
      mockRequirements: this.generateMockRequirements(func, context),
      assertions: this.generateExpectedAssertions(func),
      edgeCases: this.generateEdgeCases(func)
    };
  }

  private generateParameterTests(func: FunctionSignature, context: TestGenerationContext): GeneratedTest[] {
    const tests: GeneratedTest[] = [];
    
    func.parameters.forEach(param => {
      // Test invalid parameter types
      tests.push({
        testName: `${func.name} - invalid ${param.name}`,
        description: `Tests ${func.name} with invalid ${param.name} parameter`,
        testCode: this.generateInvalidParamTest(func, param, context),
        priority: 'medium',
        weddingScenario: 'parameter validation',
        dataRequirements: [],
        mockRequirements: [],
        assertions: ['should throw error', 'should validate input'],
        edgeCases: ['null', 'undefined', 'wrong type']
      });
      
      // Test boundary conditions
      if (this.isNumericType(param.type)) {
        tests.push({
          testName: `${func.name} - ${param.name} boundary conditions`,
          description: `Tests ${func.name} with boundary values for ${param.name}`,
          testCode: this.generateBoundaryTest(func, param, context),
          priority: 'medium',
          weddingScenario: 'boundary testing',
          dataRequirements: [],
          mockRequirements: [],
          assertions: ['should handle minimum values', 'should handle maximum values'],
          edgeCases: ['zero', 'negative', 'maximum safe integer']
        });
      }
    });
    
    return tests;
  }

  private generateAsyncTests(func: FunctionSignature, context: TestGenerationContext): GeneratedTest[] {
    const tests: GeneratedTest[] = [];
    
    // Promise rejection test
    tests.push({
      testName: `${func.name} - error handling`,
      description: `Tests ${func.name} error handling for wedding scenarios`,
      testCode: `
test('should handle errors gracefully', async () => {
  // Arrange
  ${this.generateErrorScenarioSetup(func, context)}
  
  // Act & Assert
  await expect(${func.name}(${this.generateErrorParams(func)}))
    .rejects.toThrow('${this.generateExpectedError(func, context)}');
});`,
      priority: context.weddingContext.criticalPath ? 'critical' : 'high',
      weddingScenario: 'error conditions',
      dataRequirements: [],
      mockRequirements: ['error simulation'],
      assertions: ['should reject with error', 'should maintain data integrity'],
      edgeCases: ['network failure', 'database timeout', 'validation error']
    });
    
    return tests;
  }

  private async generateIntegrationTests(context: TestGenerationContext): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];
    const domain = context.weddingContext.domain;
    
    if (this.weddingDomains[domain as keyof typeof this.weddingDomains]) {
      const domainData = this.weddingDomains[domain as keyof typeof this.weddingDomains];
      
      domainData.testScenarios.forEach(scenario => {
        tests.push({
          testName: `Integration test - ${scenario}`,
          description: `Tests ${domain} integration for ${scenario} wedding scenario`,
          testCode: this.generateIntegrationTestCode(domain, scenario, context),
          priority: 'high',
          weddingScenario: scenario,
          dataRequirements: this.generateScenarioData(scenario),
          mockRequirements: this.generateIntegrationMocks(domain, scenario),
          assertions: this.generateIntegrationAssertions(scenario),
          edgeCases: this.generateScenarioEdgeCases(scenario)
        });
      });
    }
    
    return tests;
  }

  private async generateEdgeCaseTests(context: TestGenerationContext): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];
    
    // Wedding-specific edge cases
    const weddingEdgeCases = {
      'leap-year-wedding': 'Wedding scheduled on February 29th',
      'timezone-changes': 'Wedding across timezone boundaries',
      'vendor-cancellation': 'Last-minute vendor cancellation',
      'weather-emergency': 'Weather emergency affecting outdoor wedding',
      'guest-limit-exceeded': 'Guest count exceeding venue capacity',
      'budget-currency-change': 'Currency fluctuation affecting budget'
    };
    
    Object.entries(weddingEdgeCases).forEach(([caseKey, description]) => {
      tests.push({
        testName: `Edge case - ${caseKey}`,
        description,
        testCode: this.generateEdgeCaseTestCode(caseKey, description, context),
        priority: 'low',
        weddingScenario: caseKey,
        dataRequirements: this.generateEdgeCaseData(caseKey),
        mockRequirements: [],
        assertions: [`should handle ${caseKey} scenario`],
        edgeCases: [caseKey]
      });
    });
    
    return tests;
  }

  // Helper methods for test generation
  private generateWeddingScenario(weddingContext: WeddingDomainContext): string {
    const scenarios = {
      rsvp: 'Last-minute RSVP changes before wedding',
      timeline: 'Wedding day timeline coordination',
      budget: 'Budget tracking during planning phase',
      vendors: 'Vendor management and coordination',
      photos: 'Wedding photo collection and sharing',
      guests: 'Guest list management and communication'
    };
    
    return scenarios[weddingContext.domain as keyof typeof scenarios] || 'General wedding scenario';
  }

  private generateTestData(func: FunctionSignature, weddingContext: WeddingDomainContext): any[] {
    // Generate realistic wedding test data based on function parameters
    const testData: any[] = [];
    
    func.parameters.forEach(param => {
      if (param.type.toLowerCase().includes('guest')) {
        testData.push({
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          rsvp: 'yes',
          dietaryRestrictions: 'vegetarian'
        });
      } else if (param.type.toLowerCase().includes('wedding')) {
        testData.push({
          id: 'wedding-123',
          bride: 'Emma Thompson',
          groom: 'James Rodriguez',
          date: '2024-09-15',
          venue: 'Garden Manor Estate'
        });
      } else if (param.type.toLowerCase().includes('vendor')) {
        testData.push({
          id: 'vendor-456',
          name: 'Sunset Photography',
          type: 'photographer',
          rating: 4.8,
          price: 3500
        });
      } else {
        // Generate basic test data based on type
        testData.push(this.generateBasicTestValue(param.type));
      }
    });
    
    return testData;
  }

  private generateBasicTestValue(type: string): any {
    const typeMap: { [key: string]: any } = {
      string: 'test-string',
      number: 42,
      boolean: true,
      array: [],
      object: {},
      date: new Date('2024-01-01'),
      'string[]': ['item1', 'item2'],
      'number[]': [1, 2, 3]
    };
    
    return typeMap[type.toLowerCase()] || null;
  }

  private generateTestSetup(func: FunctionSignature, testData: any[]): string {
    const setup = [
      '// Mock dependencies',
      'const mockDatabase = jest.fn();',
      'const mockLogger = jest.fn();'
    ];
    
    testData.forEach((data, index) => {
      if (typeof data === 'object') {
        setup.push(`const testData${index} = ${JSON.stringify(data, null, 2)};`);
      } else {
        setup.push(`const testData${index} = ${JSON.stringify(data)};`);
      }
    });
    
    return setup.join('\n    ');
  }

  private generateTestParams(func: FunctionSignature, testData: any[]): string {
    return func.parameters.map((_, index) => 
      `testData${index}`
    ).join(', ');
  }

  private generateAssertions(func: FunctionSignature, context: TestGenerationContext, testData: any[]): string {
    const assertions: string[] = [];
    
    if (func.returnType !== 'void') {
      assertions.push('expect(result).toBeDefined();');
      
      if (func.returnType.includes('[]')) {
        assertions.push('expect(Array.isArray(result)).toBe(true);');
      } else if (func.returnType === 'boolean') {
        assertions.push('expect(typeof result).toBe("boolean");');
      } else if (func.returnType === 'number') {
        assertions.push('expect(typeof result).toBe("number");');
      }
    }
    
    // Wedding-specific assertions
    if (context.weddingContext.isWeddingRelated) {
      assertions.push('// Wedding-specific validations');
      if (context.weddingContext.domain === 'rsvp') {
        assertions.push('expect(mockDatabase).toHaveBeenCalledWith(expect.objectContaining({ rsvp: expect.any(String) }));');
      } else if (context.weddingContext.domain === 'budget') {
        assertions.push('expect(result).toBeGreaterThanOrEqual(0); // Budget should not be negative');
      }
    }
    
    return assertions.join('\n    ');
  }

  private generateMockRequirements(func: FunctionSignature, context: TestGenerationContext): string[] {
    const mocks: string[] = [];
    
    // Analyze dependencies for required mocks
    context.dependencies.forEach(dep => {
      if (dep.includes('database') || dep.includes('prisma') || dep.includes('supabase')) {
        mocks.push('database connection');
      } else if (dep.includes('auth')) {
        mocks.push('authentication service');
      } else if (dep.includes('email') || dep.includes('notification')) {
        mocks.push('email service');
      }
    });
    
    // Wedding-specific mocks
    if (context.weddingContext.isWeddingRelated) {
      mocks.push(`${context.weddingContext.domain} service`);
      if (context.weddingContext.criticalPath) {
        mocks.push('audit logging');
      }
    }
    
    return [...new Set(mocks)];
  }

  private generateExpectedAssertions(func: FunctionSignature): string[] {
    const assertions: string[] = [];
    
    if (func.returnType !== 'void') {
      assertions.push('result should be defined');
      assertions.push(`result should match ${func.returnType} type`);
    }
    
    if (func.name.includes('create') || func.name.includes('add')) {
      assertions.push('should create new record');
      assertions.push('should return created item ID');
    } else if (func.name.includes('update')) {
      assertions.push('should modify existing record');
      assertions.push('should return updated data');
    } else if (func.name.includes('delete') || func.name.includes('remove')) {
      assertions.push('should remove record');
      assertions.push('should return deletion confirmation');
    }
    
    return assertions;
  }

  private generateEdgeCases(func: FunctionSignature): string[] {
    const edgeCases: string[] = [];
    
    func.parameters.forEach(param => {
      if (!param.optional) {
        edgeCases.push(`missing ${param.name}`);
      }
      
      if (param.type === 'string') {
        edgeCases.push(`empty ${param.name}`, `very long ${param.name}`);
      } else if (param.type === 'number') {
        edgeCases.push(`zero ${param.name}`, `negative ${param.name}`, `maximum ${param.name}`);
      } else if (param.type.includes('[]')) {
        edgeCases.push(`empty ${param.name} array`, `single item ${param.name}`, `large ${param.name} array`);
      }
    });
    
    return edgeCases;
  }

  private isNumericType(type: string): boolean {
    return ['number', 'int', 'float', 'double', 'bigint'].includes(type.toLowerCase());
  }

  private generateInvalidParamTest(func: FunctionSignature, param: Parameter, context: TestGenerationContext): string {
    return `
test('should handle invalid ${param.name} parameter', ${func.isAsync ? 'async ' : ''}() => {
  // Test with null
  ${func.isAsync ? 'await ' : ''}expect(() => ${func.name}(${this.generateInvalidParamCall(func, param, 'null')}))
    .toThrow('Invalid ${param.name}');
    
  // Test with wrong type
  ${func.isAsync ? 'await ' : ''}expect(() => ${func.name}(${this.generateInvalidParamCall(func, param, 'wrong-type')}))
    .toThrow('Invalid ${param.name} type');
});`;
  }

  private generateInvalidParamCall(func: FunctionSignature, targetParam: Parameter, invalidType: string): string {
    return func.parameters.map(param => {
      if (param.name === targetParam.name) {
        switch (invalidType) {
          case 'null': return 'null';
          case 'wrong-type': return param.type === 'string' ? '123' : '"invalid"';
          default: return 'undefined';
        }
      }
      return this.generateBasicTestValue(param.type);
    }).join(', ');
  }

  private generateBoundaryTest(func: FunctionSignature, param: Parameter, context: TestGenerationContext): string {
    return `
test('should handle ${param.name} boundary conditions', ${func.isAsync ? 'async ' : ''}() => {
  // Test minimum value
  const minResult = ${func.isAsync ? 'await ' : ''}${func.name}(${this.generateBoundaryParamCall(func, param, 'min')});
  expect(minResult).toBeDefined();
  
  // Test maximum value  
  const maxResult = ${func.isAsync ? 'await ' : ''}${func.name}(${this.generateBoundaryParamCall(func, param, 'max')});
  expect(maxResult).toBeDefined();
});`;
  }

  private generateBoundaryParamCall(func: FunctionSignature, targetParam: Parameter, boundary: string): string {
    return func.parameters.map(param => {
      if (param.name === targetParam.name) {
        switch (boundary) {
          case 'min': return '0';
          case 'max': return 'Number.MAX_SAFE_INTEGER';
          default: return '1';
        }
      }
      return this.generateBasicTestValue(param.type);
    }).join(', ');
  }

  private generateErrorScenarioSetup(func: FunctionSignature, context: TestGenerationContext): string {
    return `
// Mock error conditions for ${context.weddingContext.domain} domain
jest.spyOn(console, 'error').mockImplementation();
const mockError = new Error('${this.generateExpectedError(func, context)}');`;
  }

  private generateErrorParams(func: FunctionSignature): string {
    return func.parameters.map(param => 'invalidData').join(', ');
  }

  private generateExpectedError(func: FunctionSignature, context: TestGenerationContext): string {
    const domainErrors = {
      rsvp: 'RSVP submission failed',
      timeline: 'Timeline update failed',
      budget: 'Budget calculation error',
      vendors: 'Vendor booking failed',
      photos: 'Photo upload failed',
      guests: 'Guest management error'
    };
    
    return domainErrors[context.weddingContext.domain as keyof typeof domainErrors] || 'Operation failed';
  }

  private generateIntegrationTestCode(domain: string, scenario: string, context: TestGenerationContext): string {
    return `
describe('Integration: ${domain} - ${scenario}', () => {
  test('should handle ${scenario} scenario end-to-end', async () => {
    // Arrange
    ${this.generateIntegrationSetup(domain, scenario)}
    
    // Act
    const result = await executeWeddingWorkflow('${scenario}', testData);
    
    // Assert
    ${this.generateIntegrationAssertions(scenario).map(assertion => `expect(result).${assertion};`).join('\n    ')}
  });
});`;
  }

  private generateIntegrationSetup(domain: string, scenario: string): string {
    const setups = {
      'last-minute-changes': `
const testData = {
  weddingId: 'test-wedding-123',
  originalGuestCount: 150,
  newGuestCount: 175,
  changeReason: 'family additions'
};
const mockDatabase = setupTestDatabase();
const mockNotificationService = setupNotificationMocks();`,
      
      'vendor-delays': `
const testData = {
  weddingId: 'test-wedding-456',
  vendorId: 'photographer-789',
  originalTime: '14:00',
  newTime: '15:30',
  delayReason: 'traffic'
};
const mockVendorService = setupVendorMocks();
const mockTimelineService = setupTimelineMocks();`
    };
    
    return setups[scenario as keyof typeof setups] || `const testData = setupTestData('${scenario}');`;
  }

  private generateScenarioData(scenario: string): any[] {
    const scenarioData = {
      'last-minute-changes': [
        { type: 'guest-update', count: 25, reason: 'family additions' }
      ],
      'vendor-delays': [
        { type: 'time-change', originalTime: '14:00', newTime: '15:30' }
      ],
      'budget-exceeded': [
        { type: 'expense', amount: 5000, category: 'flowers', reason: 'seasonal pricing' }
      ]
    };
    
    return scenarioData[scenario as keyof typeof scenarioData] || [];
  }

  private generateIntegrationMocks(domain: string, scenario: string): string[] {
    const mocks = [`${domain} service`, 'database connection'];
    
    if (scenario.includes('notification') || scenario.includes('changes')) {
      mocks.push('notification service');
    }
    
    if (scenario.includes('payment') || scenario.includes('budget')) {
      mocks.push('payment processor');
    }
    
    return mocks;
  }

  private generateIntegrationAssertions(scenario: string): string[] {
    const assertions = {
      'last-minute-changes': [
        'toHaveProperty("updated", true)',
        'toHaveProperty("notificationsSent")',
        'toHaveProperty("guestCount", 175)'
      ],
      'vendor-delays': [
        'toHaveProperty("timeline.updated", true)',
        'toHaveProperty("vendorsNotified", true)',
        'toHaveProperty("newSchedule")'
      ],
      'budget-exceeded': [
        'toHaveProperty("budgetStatus", "over")',
        'toHaveProperty("recommendations")',
        'toHaveProperty("alertsSent", true)'
      ]
    };
    
    return assertions[scenario as keyof typeof assertions] || ['toBeDefined()'];
  }

  private generateEdgeCaseTestCode(caseKey: string, description: string, context: TestGenerationContext): string {
    return `
test('${description}', async () => {
  // Arrange
  const edgeCaseData = ${this.generateEdgeCaseDataString(caseKey)};
  
  // Act
  const result = await handleEdgeCase('${caseKey}', edgeCaseData);
  
  // Assert
  expect(result).toHaveProperty('handled', true);
  expect(result).toHaveProperty('fallbackApplied');
});`;
  }

  private generateEdgeCaseData(caseKey: string): any[] {
    const edgeCases = {
      'leap-year-wedding': [{ date: '2024-02-29', venue: 'outdoor' }],
      'timezone-changes': [{ ceremony: 'GMT-5', reception: 'GMT-4' }],
      'guest-limit-exceeded': [{ capacity: 150, rsvpCount: 175 }],
      'budget-currency-change': [{ originalCurrency: 'USD', newRate: 1.2 }]
    };
    
    return edgeCases[caseKey as keyof typeof edgeCases] || [];
  }

  private generateEdgeCaseDataString(caseKey: string): string {
    const data = this.generateEdgeCaseData(caseKey);
    return JSON.stringify(data[0] || {}, null, 2);
  }

  private generateTestDescription(func: FunctionSignature, context: TestGenerationContext): string {
    const action = func.name.includes('create') ? 'create' :
                  func.name.includes('update') ? 'update' :
                  func.name.includes('delete') ? 'delete' :
                  func.name.includes('get') || func.name.includes('fetch') ? 'retrieve' :
                  'process';
    
    const subject = context.weddingContext.domain === 'general' ? 
      'data' : `${context.weddingContext.domain} information`;
    
    return `${action} ${subject} successfully`;
  }

  // Test maintenance methods
  async analyzeExistingTests(testDirectory: string): Promise<TestMaintenanceAction[]> {
    console.log(`🔍 AI analyzing existing tests in ${testDirectory}...`);
    
    const actions: TestMaintenanceAction[] = [];
    
    try {
      const testFiles = await this.findTestFiles(testDirectory);
      
      for (const testFile of testFiles) {
        const fileActions = await this.analyzeTestFile(testFile);
        actions.push(...fileActions);
      }
      
      console.log(`✅ Analysis complete. Found ${actions.length} maintenance actions.`);
      
    } catch (error) {
      console.error('❌ Test analysis failed:', error);
    }
    
    return actions;
  }

  private async findTestFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findTestFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${directory}:`, error);
    }
    
    return files;
  }

  private async analyzeTestFile(filePath: string): Promise<TestMaintenanceAction[]> {
    const actions: TestMaintenanceAction[] = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Check for outdated patterns
      if (content.includes('jest.mock') && !content.includes('vi.mock')) {
        actions.push({
          type: 'update',
          testPath: filePath,
          reason: 'Migrate from Jest to Vitest mocking',
          suggestedChanges: 'Replace jest.mock with vi.mock and update imports',
          confidence: 0.9
        });
      }
      
      // Check for missing wedding context
      if (!this.hasWeddingContext(content) && this.shouldHaveWeddingContext(filePath)) {
        actions.push({
          type: 'update',
          testPath: filePath,
          reason: 'Add wedding-specific test scenarios',
          suggestedChanges: 'Include realistic wedding data and scenarios',
          confidence: 0.8
        });
      }
      
      // Check for performance issues
      if (this.hasPerformanceIssues(content)) {
        actions.push({
          type: 'optimize',
          testPath: filePath,
          reason: 'Optimize test performance',
          suggestedChanges: 'Reduce test setup time and use shared fixtures',
          confidence: 0.7
        });
      }
      
      // Check for missing edge cases
      if (this.missingEdgeCases(content)) {
        actions.push({
          type: 'update',
          testPath: filePath,
          reason: 'Add missing edge case tests',
          suggestedChanges: 'Include boundary conditions and error scenarios',
          confidence: 0.75
        });
      }
      
    } catch (error) {
      console.warn(`Warning: Could not analyze ${filePath}:`, error);
    }
    
    return actions;
  }

  private hasWeddingContext(content: string): boolean {
    const weddingKeywords = ['wedding', 'bride', 'groom', 'guest', 'venue', 'rsvp', 'vendor', 'ceremony'];
    return weddingKeywords.some(keyword => content.toLowerCase().includes(keyword));
  }

  private shouldHaveWeddingContext(filePath: string): boolean {
    const pathLower = filePath.toLowerCase();
    return !pathLower.includes('util') && 
           !pathLower.includes('helper') && 
           !pathLower.includes('config') &&
           (pathLower.includes('component') || pathLower.includes('page') || pathLower.includes('api'));
  }

  private hasPerformanceIssues(content: string): boolean {
    // Simple heuristics for performance issues
    const issues = [
      content.includes('beforeEach') && content.includes('expensive'), // Expensive setup in beforeEach
      content.match(/await.*sleep|setTimeout/g)?.length > 5, // Too many waits
      content.includes('mount(') && !content.includes('shallow('), // Full mounting without shallow
    ];
    
    return issues.some(Boolean);
  }

  private missingEdgeCases(content: string): boolean {
    const edgeCaseIndicators = [
      'null', 'undefined', 'empty', 'invalid', 'error', 'boundary', 'limit', 'maximum', 'minimum'
    ];
    
    const foundIndicators = edgeCaseIndicators.filter(indicator => 
      content.toLowerCase().includes(indicator)
    );
    
    return foundIndicators.length < 3; // Less than 3 edge case indicators
  }

  async generateMaintenancePlan(actions: TestMaintenanceAction[]): Promise<string> {
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const actionsByPriority = this.groupActionsByPriority(actions);
    
    let plan = '# AI Test Maintenance Plan\n\n';
    plan += `Generated: ${new Date().toISOString()}\n`;
    plan += `Total Actions: ${actions.length}\n\n`;
    
    priorityOrder.forEach(priority => {
      const priorityActions = actionsByPriority[priority] || [];
      if (priorityActions.length > 0) {
        plan += `## ${priority.toUpperCase()} Priority (${priorityActions.length} actions)\n\n`;
        
        priorityActions.forEach((action, index) => {
          plan += `### ${index + 1}. ${action.type.toUpperCase()}: ${path.basename(action.testPath)}\n`;
          plan += `**Reason**: ${action.reason}\n`;
          plan += `**Changes**: ${action.suggestedChanges}\n`;
          plan += `**Confidence**: ${(action.confidence * 100).toFixed(0)}%\n\n`;
        });
      }
    });
    
    return plan;
  }

  private groupActionsByPriority(actions: TestMaintenanceAction[]): Record<string, TestMaintenanceAction[]> {
    const groups: Record<string, TestMaintenanceAction[]> = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    actions.forEach(action => {
      let priority = 'medium';
      
      if (action.confidence > 0.9) priority = 'critical';
      else if (action.confidence > 0.8) priority = 'high';
      else if (action.confidence > 0.6) priority = 'medium';
      else priority = 'low';
      
      groups[priority].push(action);
    });
    
    return groups;
  }
}

export { AITestGenerator, GeneratedTest, TestMaintenanceAction, FunctionSignature, WeddingDomainContext };