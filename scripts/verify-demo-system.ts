#!/usr/bin/env node
/**
 * Demo Suite System Verification Script
 * Comprehensive verification of all demo system components
 */

import { config } from 'dotenv';
import { demoMediaService } from '../src/lib/services/demo-media-service';
import { demoSeedingService } from '../src/lib/services/demo-seeding-service';
import { authenticateDemoUser, getDemoAccounts, validateDemoToken } from '../src/lib/auth/demo-auth';

// Load environment variables
config({ path: '.env.local' });

interface VerificationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
  duration?: number;
}

class DemoSystemVerifier {
  private results: VerificationResult[] = [];

  async runAllVerifications(): Promise<void> {
    console.log('🔍 WedSync Demo Suite System Verification');
    console.log('==========================================\n');

    try {
      await this.verifyEnvironmentSetup();
      await this.verifyStorageInfrastructure();
      await this.verifyMediaAssetGeneration();
      await this.verifyDataSeeding();
      await this.verifyAuthenticationSystem();
      await this.verifyDataIntegrity();
      await this.verifyPerformance();
      await this.verifyResetFunctionality();
      
      this.printResults();
      this.printSummary();

    } catch (error) {
      this.addResult({
        component: 'System Verification',
        status: 'FAIL',
        message: 'Critical error during verification',
        details: error
      });
      
      this.printResults();
      process.exit(1);
    }
  }

  private async verifyEnvironmentSetup(): Promise<void> {
    console.log('🔧 Verifying Environment Setup...');
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.addResult({
          component: 'Environment',
          status: 'FAIL',
          message: `Missing required environment variable: ${varName}`
        });
      } else {
        this.addResult({
          component: 'Environment',
          status: 'PASS',
          message: `✅ ${varName} configured`
        });
      }
    }

    // Verify JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      this.addResult({
        component: 'Security',
        status: 'WARNING',
        message: 'JWT secret should be at least 32 characters for production use'
      });
    }
  }

  private async verifyStorageInfrastructure(): Promise<void> {
    console.log('🗂️ Verifying Storage Infrastructure...');
    
    const startTime = Date.now();
    
    try {
      await demoMediaService.initializeStorageBuckets();
      
      this.addResult({
        component: 'Storage',
        status: 'PASS',
        message: 'Storage buckets initialized successfully',
        duration: Date.now() - startTime
      });

      // Verify bucket accessibility
      const testUrl = await demoMediaService.getAssetUrl('logo', 'test', 'test.svg');
      
      if (testUrl) {
        this.addResult({
          component: 'Storage',
          status: 'PASS',
          message: 'Storage URL generation working'
        });
      } else {
        this.addResult({
          component: 'Storage',
          status: 'WARNING',
          message: 'Storage URL generation returned null'
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Storage',
        status: 'FAIL',
        message: 'Storage initialization failed',
        details: error
      });
    }
  }

  private async verifyMediaAssetGeneration(): Promise<void> {
    console.log('🎨 Verifying Media Asset Generation...');
    
    // Test supplier logo generation
    const startTime = Date.now();
    
    try {
      const logoResult = await demoMediaService.generateSupplierLogo({
        supplierId: 'test_supplier',
        supplierType: 'photographer',
        businessName: 'Test Photography',
        style: 'modern'
      });

      if (logoResult && logoResult.url && logoResult.metadata) {
        this.addResult({
          component: 'Asset Generation',
          status: 'PASS',
          message: 'Supplier logo generation working',
          details: {
            format: logoResult.metadata.format,
            size: logoResult.metadata.size,
            url: logoResult.url
          }
        });
      } else {
        this.addResult({
          component: 'Asset Generation',
          status: 'FAIL',
          message: 'Supplier logo generation failed'
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Asset Generation',
        status: 'FAIL',
        message: 'Logo generation error',
        details: error
      });
    }

    // Test couple photo generation
    try {
      const photoResult = await demoMediaService.generateCouplePhoto({
        coupleId: 'test_couple',
        firstName: 'Test',
        lastName: 'User',
        partnerName: 'Partner'
      });

      if (photoResult && photoResult.url) {
        this.addResult({
          component: 'Asset Generation',
          status: 'PASS',
          message: 'Couple photo generation working'
        });
      } else {
        this.addResult({
          component: 'Asset Generation',
          status: 'FAIL',
          message: 'Couple photo generation failed'
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Asset Generation',
        status: 'FAIL',
        message: 'Photo generation error',
        details: error
      });
    }

    // Test document template generation
    try {
      const docResults = await demoMediaService.generateDocumentTemplates({
        supplierId: 'test_supplier',
        supplierType: 'photographer',
        businessName: 'Test Photography',
        style: 'modern'
      });

      if (docResults && docResults.length === 5) {
        this.addResult({
          component: 'Asset Generation',
          status: 'PASS',
          message: `Document generation working (${docResults.length} templates created)`
        });
      } else {
        this.addResult({
          component: 'Asset Generation',
          status: 'WARNING',
          message: `Document generation incomplete (${docResults?.length || 0}/5 templates)`
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Asset Generation',
        status: 'FAIL',
        message: 'Document generation error',
        details: error
      });
    }

    const totalDuration = Date.now() - startTime;
    
    if (totalDuration > 30000) { // 30 seconds
      this.addResult({
        component: 'Performance',
        status: 'WARNING',
        message: `Asset generation took ${totalDuration}ms (>30s threshold)`,
        duration: totalDuration
      });
    }
  }

  private async verifyDataSeeding(): Promise<void> {
    console.log('🌱 Verifying Data Seeding...');
    
    const startTime = Date.now();
    
    try {
      // Clean slate first
      await demoSeedingService.resetDemoData();
      
      // Seed demo data
      await demoSeedingService.seedDemoData();
      
      // Verify portal data
      const portalData = await demoSeedingService.getDemoPortalData();
      
      if (portalData.suppliers.length === 7) {
        this.addResult({
          component: 'Data Seeding',
          status: 'PASS',
          message: `✅ All 7 suppliers seeded correctly`
        });
      } else {
        this.addResult({
          component: 'Data Seeding',
          status: 'FAIL',
          message: `Expected 7 suppliers, got ${portalData.suppliers.length}`
        });
      }

      if (portalData.couples.length === 2) {
        this.addResult({
          component: 'Data Seeding',
          status: 'PASS',
          message: `✅ All 2 couples seeded correctly`
        });
      } else {
        this.addResult({
          component: 'Data Seeding',
          status: 'FAIL',
          message: `Expected 2 couples, got ${portalData.couples.length}`
        });
      }

      // Verify asset integration
      const suppliersWithLogos = portalData.suppliers.filter(s => s.logoUrl).length;
      const suppliersWithDocs = portalData.suppliers.filter(s => s.documentUrls && s.documentUrls.length > 0).length;
      const couplesWithPhotos = portalData.couples.filter(c => c.profilePhotoUrl).length;

      this.addResult({
        component: 'Asset Integration',
        status: suppliersWithLogos >= 5 ? 'PASS' : 'WARNING',
        message: `${suppliersWithLogos}/7 suppliers have logos`
      });

      this.addResult({
        component: 'Asset Integration',
        status: suppliersWithDocs >= 5 ? 'PASS' : 'WARNING',
        message: `${suppliersWithDocs}/7 suppliers have documents`
      });

      this.addResult({
        component: 'Asset Integration',
        status: couplesWithPhotos >= 1 ? 'PASS' : 'WARNING',
        message: `${couplesWithPhotos}/2 couples have photos`
      });

      const seedDuration = Date.now() - startTime;
      
      if (seedDuration < 60000) { // Under 1 minute
        this.addResult({
          component: 'Performance',
          status: 'PASS',
          message: `Data seeding completed in ${seedDuration}ms`,
          duration: seedDuration
        });
      } else {
        this.addResult({
          component: 'Performance',
          status: 'WARNING',
          message: `Data seeding took ${seedDuration}ms (>60s)`,
          duration: seedDuration
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Data Seeding',
        status: 'FAIL',
        message: 'Data seeding failed',
        details: error
      });
    }
  }

  private async verifyAuthenticationSystem(): Promise<void> {
    console.log('🔐 Verifying Authentication System...');
    
    try {
      // Test demo account listing
      const accounts = await getDemoAccounts();
      
      if (accounts.suppliers.length === 7 && accounts.couples.length === 2) {
        this.addResult({
          component: 'Authentication',
          status: 'PASS',
          message: 'Demo account enumeration working'
        });
      } else {
        this.addResult({
          component: 'Authentication',
          status: 'FAIL',
          message: `Expected 7 suppliers + 2 couples, got ${accounts.suppliers.length} + ${accounts.couples.length}`
        });
      }

      // Test authentication for each account type
      const supplierAuth = await authenticateDemoUser('supplier_1');
      if (supplierAuth.success && supplierAuth.token) {
        this.addResult({
          component: 'Authentication',
          status: 'PASS',
          message: 'Supplier authentication working'
        });

        // Test token validation
        const tokenValidation = await validateDemoToken(supplierAuth.token);
        if (tokenValidation.valid) {
          this.addResult({
            component: 'Authentication',
            status: 'PASS',
            message: 'JWT token validation working'
          });
        } else {
          this.addResult({
            component: 'Authentication',
            status: 'FAIL',
            message: 'JWT token validation failed'
          });
        }

      } else {
        this.addResult({
          component: 'Authentication',
          status: 'FAIL',
          message: 'Supplier authentication failed',
          details: supplierAuth.error
        });
      }

      const coupleAuth = await authenticateDemoUser('couple_1');
      if (coupleAuth.success && coupleAuth.token) {
        this.addResult({
          component: 'Authentication',
          status: 'PASS',
          message: 'Couple authentication working'
        });
      } else {
        this.addResult({
          component: 'Authentication',
          status: 'FAIL',
          message: 'Couple authentication failed',
          details: coupleAuth.error
        });
      }

      // Test invalid account rejection
      const invalidAuth = await authenticateDemoUser('invalid_account_123');
      if (!invalidAuth.success) {
        this.addResult({
          component: 'Security',
          status: 'PASS',
          message: 'Invalid account properly rejected'
        });
      } else {
        this.addResult({
          component: 'Security',
          status: 'FAIL',
          message: 'Invalid account was authenticated (security risk!)'
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Authentication',
        status: 'FAIL',
        message: 'Authentication system error',
        details: error
      });
    }
  }

  private async verifyDataIntegrity(): Promise<void> {
    console.log('🔍 Verifying Data Integrity...');
    
    try {
      const portalData = await demoSeedingService.getDemoPortalData();
      
      // Verify supplier data integrity
      for (const supplier of portalData.suppliers) {
        if (!supplier.id || !supplier.businessName || !supplier.supplierType || !supplier.email) {
          this.addResult({
            component: 'Data Integrity',
            status: 'FAIL',
            message: `Supplier ${supplier.id} has missing required fields`
          });
        }

        if (supplier.email && !supplier.email.includes('@')) {
          this.addResult({
            component: 'Data Integrity',
            status: 'FAIL',
            message: `Supplier ${supplier.businessName} has invalid email format`
          });
        }
      }

      // Verify couple data integrity
      for (const couple of portalData.couples) {
        if (!couple.id || !couple.firstName || !couple.lastName || !couple.partnerName || !couple.email) {
          this.addResult({
            component: 'Data Integrity',
            status: 'FAIL',
            message: `Couple ${couple.id} has missing required fields`
          });
        }

        if (couple.email && !couple.email.includes('@')) {
          this.addResult({
            component: 'Data Integrity',
            status: 'FAIL',
            message: `Couple ${couple.firstName} & ${couple.partnerName} has invalid email format`
          });
        }
      }

      // Verify business names are realistic
      const expectedSuppliers = [
        'Sky Lens Studios',
        'Golden Frame Films',
        'The Oak Barn',
        'Wild Ivy Flowers',
        'Spin & Spark Entertainment',
        'Fork & Flame Catering',
        'Velvet & Vows Events'
      ];

      const actualBusinessNames = portalData.suppliers.map(s => s.businessName);
      
      for (const expected of expectedSuppliers) {
        if (!actualBusinessNames.includes(expected)) {
          this.addResult({
            component: 'Data Integrity',
            status: 'FAIL',
            message: `Missing expected supplier: ${expected}`
          });
        }
      }

      if (expectedSuppliers.every(name => actualBusinessNames.includes(name))) {
        this.addResult({
          component: 'Data Integrity',
          status: 'PASS',
          message: 'All expected suppliers present with correct names'
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Data Integrity',
        status: 'FAIL',
        message: 'Data integrity check failed',
        details: error
      });
    }
  }

  private async verifyPerformance(): Promise<void> {
    console.log('⚡ Verifying Performance...');
    
    // Test authentication performance
    const authStartTime = Date.now();
    const authResult = await authenticateDemoUser('supplier_1');
    const authDuration = Date.now() - authStartTime;

    if (authResult.success) {
      if (authDuration < 100) {
        this.addResult({
          component: 'Performance',
          status: 'PASS',
          message: `Authentication completed in ${authDuration}ms (<100ms)`,
          duration: authDuration
        });
      } else if (authDuration < 500) {
        this.addResult({
          component: 'Performance',
          status: 'WARNING',
          message: `Authentication took ${authDuration}ms (>100ms but <500ms)`,
          duration: authDuration
        });
      } else {
        this.addResult({
          component: 'Performance',
          status: 'FAIL',
          message: `Authentication took ${authDuration}ms (>500ms threshold)`,
          duration: authDuration
        });
      }
    }

    // Test portal data retrieval performance
    const portalStartTime = Date.now();
    const portalData = await demoSeedingService.getDemoPortalData();
    const portalDuration = Date.now() - portalStartTime;

    if (portalData.suppliers.length > 0) {
      if (portalDuration < 2000) {
        this.addResult({
          component: 'Performance',
          status: 'PASS',
          message: `Portal data retrieval completed in ${portalDuration}ms (<2s)`,
          duration: portalDuration
        });
      } else {
        this.addResult({
          component: 'Performance',
          status: 'WARNING',
          message: `Portal data retrieval took ${portalDuration}ms (>2s)`,
          duration: portalDuration
        });
      }
    }

    // Test concurrent authentication
    const concurrentStartTime = Date.now();
    const concurrentPromises = [
      authenticateDemoUser('supplier_1'),
      authenticateDemoUser('supplier_2'), 
      authenticateDemoUser('couple_1'),
      authenticateDemoUser('couple_2')
    ];

    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentDuration = Date.now() - concurrentStartTime;

    const successfulAuths = concurrentResults.filter(r => r.success).length;
    
    if (successfulAuths === 4) {
      this.addResult({
        component: 'Performance',
        status: 'PASS',
        message: `Concurrent authentication (4 users) completed in ${concurrentDuration}ms`,
        duration: concurrentDuration
      });
    } else {
      this.addResult({
        component: 'Performance',
        status: 'FAIL',
        message: `Concurrent authentication failed: ${successfulAuths}/4 successful`
      });
    }
  }

  private async verifyResetFunctionality(): Promise<void> {
    console.log('🔄 Verifying Reset Functionality...');
    
    try {
      // Ensure we have data first
      await demoSeedingService.seedDemoData();
      
      let portalData = await demoSeedingService.getDemoPortalData();
      const initialSuppliers = portalData.suppliers.length;
      const initialCouples = portalData.couples.length;

      if (initialSuppliers === 0 || initialCouples === 0) {
        this.addResult({
          component: 'Reset',
          status: 'FAIL',
          message: 'No data to reset - seeding may have failed'
        });
        return;
      }

      // Perform reset
      const resetStartTime = Date.now();
      await demoSeedingService.resetDemoData();
      const resetDuration = Date.now() - resetStartTime;

      // Verify data is cleared
      portalData = await demoSeedingService.getDemoPortalData();
      
      if (portalData.suppliers.length === 0 && portalData.couples.length === 0) {
        this.addResult({
          component: 'Reset',
          status: 'PASS',
          message: `Reset cleared all data in ${resetDuration}ms`
        });
      } else {
        this.addResult({
          component: 'Reset',
          status: 'FAIL',
          message: `Reset incomplete: ${portalData.suppliers.length} suppliers, ${portalData.couples.length} couples remaining`
        });
      }

      // Verify we can re-seed after reset
      await demoSeedingService.seedDemoData();
      portalData = await demoSeedingService.getDemoPortalData();
      
      if (portalData.suppliers.length === initialSuppliers && portalData.couples.length === initialCouples) {
        this.addResult({
          component: 'Reset',
          status: 'PASS',
          message: 'Re-seeding after reset successful'
        });
      } else {
        this.addResult({
          component: 'Reset',
          status: 'WARNING',
          message: `Re-seeding resulted in different counts: ${portalData.suppliers.length} suppliers (was ${initialSuppliers}), ${portalData.couples.length} couples (was ${initialCouples})`
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Reset',
        status: 'FAIL',
        message: 'Reset functionality failed',
        details: error
      });
    }
  }

  private addResult(result: VerificationResult): void {
    this.results.push(result);
    
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    
    console.log(`  ${statusIcon} ${result.component}: ${result.message}${duration}`);
    
    if (result.details && result.status === 'FAIL') {
      console.log(`     Details:`, result.details);
    }
  }

  private printResults(): void {
    console.log('\n📊 Verification Results');
    console.log('========================');
    
    const componentGroups = this.groupResultsByComponent();
    
    for (const [component, results] of componentGroups) {
      const passed = results.filter(r => r.status === 'PASS').length;
      const warnings = results.filter(r => r.status === 'WARNING').length;
      const failed = results.filter(r => r.status === 'FAIL').length;
      
      console.log(`\n${component}:`);
      console.log(`  ✅ Passed: ${passed}`);
      if (warnings > 0) console.log(`  ⚠️ Warnings: ${warnings}`);
      if (failed > 0) console.log(`  ❌ Failed: ${failed}`);
    }
  }

  private printSummary(): void {
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;

    console.log('\n🎯 Final Summary');
    console.log('================');
    console.log(`Total Checks: ${totalTests}`);
    console.log(`✅ Passed: ${passed} (${Math.round((passed / totalTests) * 100)}%)`);
    
    if (warnings > 0) {
      console.log(`⚠️ Warnings: ${warnings} (${Math.round((warnings / totalTests) * 100)}%)`);
    }
    
    if (failed > 0) {
      console.log(`❌ Failed: ${failed} (${Math.round((failed / totalTests) * 100)}%)`);
    }

    console.log('\n' + '='.repeat(50));
    
    if (failed === 0) {
      console.log('🎉 DEMO SYSTEM VERIFICATION PASSED!');
      console.log('The WedSync Demo Suite is ready for production use.');
      
      if (warnings > 0) {
        console.log(`\n⚠️ Note: ${warnings} warnings should be reviewed for optimal performance.`);
      }
    } else {
      console.log('❌ DEMO SYSTEM VERIFICATION FAILED!');
      console.log(`${failed} critical issues must be resolved before deployment.`);
      process.exit(1);
    }
  }

  private groupResultsByComponent(): Map<string, VerificationResult[]> {
    const groups = new Map<string, VerificationResult[]>();
    
    for (const result of this.results) {
      if (!groups.has(result.component)) {
        groups.set(result.component, []);
      }
      groups.get(result.component)!.push(result);
    }
    
    return groups;
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new DemoSystemVerifier();
  verifier.runAllVerifications().catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });
}

export { DemoSystemVerifier };