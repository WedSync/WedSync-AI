#!/usr/bin/env npx tsx
/**
 * WS-194 Vercel Environment Setup Script
 * Automated environment variable management for Vercel deployments
 * Team B - Backend/API Focus
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface EnvironmentVariable {
  key: string;
  value: string;
  target: ('development' | 'preview' | 'production')[];
  type?: 'system' | 'secret' | 'plain';
  gitBranch?: string;
}

interface VercelProject {
  id: string;
  name: string;
  framework?: string;
}

class VercelEnvironmentManager {
  private projectId: string | null = null;
  private vercelToken: string;

  constructor() {
    this.vercelToken = process.env.VERCEL_TOKEN || '';
    if (!this.vercelToken) {
      throw new Error('VERCEL_TOKEN environment variable is required');
    }
  }

  /**
   * Get project information
   */
  private async getProjectInfo(): Promise<VercelProject> {
    try {
      const result = execSync('vercel project ls --format json', { 
        encoding: 'utf-8',
        env: { ...process.env, VERCEL_TOKEN: this.vercelToken }
      });
      
      const projects = JSON.parse(result);
      const project = projects.find((p: any) => p.name === 'wedsync' || p.name.includes('wedsync'));
      
      if (!project) {
        throw new Error('WedSync project not found in Vercel');
      }

      this.projectId = project.id;
      return project;
    } catch (error) {
      console.error('Failed to get project info:', error);
      throw error;
    }
  }

  /**
   * Load environment variables from .env files
   */
  private loadEnvironmentVariables(): Record<string, string> {
    const envFiles = [
      '.env.local',
      '.env.production',
      '.env.staging',
      '.env'
    ];

    const envVars: Record<string, string> = {};

    for (const envFile of envFiles) {
      const envPath = join(process.cwd(), envFile);
      if (existsSync(envPath)) {
        console.log(`Loading variables from ${envFile}`);
        const content = readFileSync(envPath, 'utf-8');
        
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            if (key && value && !envVars[key]) {
              envVars[key] = value;
            }
          }
        });
      }
    }

    return envVars;
  }

  /**
   * Determine environment variable configuration
   */
  private configureEnvironmentVariables(envVars: Record<string, string>): EnvironmentVariable[] {
    const variables: EnvironmentVariable[] = [];

    for (const [key, value] of Object.entries(envVars)) {
      const config: EnvironmentVariable = {
        key,
        value,
        target: this.getTargetEnvironments(key, value),
        type: this.getVariableType(key, value)
      };

      variables.push(config);
    }

    return variables;
  }

  /**
   * Determine target environments for variable
   */
  private getTargetEnvironments(key: string, value: string): ('development' | 'preview' | 'production')[] {
    // Public variables go to all environments
    if (key.startsWith('NEXT_PUBLIC_')) {
      return ['development', 'preview', 'production'];
    }

    // Development-specific
    if (key.includes('DEV') || value.includes('localhost') || value.includes('127.0.0.1')) {
      return ['development'];
    }

    // Test/staging-specific
    if (key.includes('TEST') || key.includes('STAGING') || value.includes('test') || value.includes('staging')) {
      return ['preview'];
    }

    // Production secrets and configs
    if (key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN')) {
      return ['production'];
    }

    // Default to all environments for general config
    return ['development', 'preview', 'production'];
  }

  /**
   * Determine variable type
   */
  private getVariableType(key: string, value: string): 'system' | 'secret' | 'plain' {
    // System variables (set by platform)
    if (key.startsWith('VERCEL_') || key === 'NODE_ENV') {
      return 'system';
    }

    // Secret variables (sensitive data)
    const sensitiveKeys = ['SECRET', 'KEY', 'TOKEN', 'PASSWORD', 'PRIVATE', 'AUTH'];
    if (sensitiveKeys.some(sensitive => key.includes(sensitive))) {
      return 'secret';
    }

    // Plain variables (safe to display)
    return 'plain';
  }

  /**
   * Set environment variable in Vercel
   */
  private async setEnvironmentVariable(variable: EnvironmentVariable): Promise<void> {
    try {
      const targets = variable.target.join(',');
      const typeFlag = variable.type === 'secret' ? '--sensitive' : '';
      
      const command = `vercel env add ${variable.key} ${typeFlag} --force --target ${targets}`;
      
      console.log(`Setting ${variable.key} for environments: ${targets}`);
      
      // For sensitive variables, use stdin to pass the value
      if (variable.type === 'secret') {
        execSync(command, {
          input: variable.value,
          encoding: 'utf-8',
          env: { ...process.env, VERCEL_TOKEN: this.vercelToken },
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } else {
        execSync(`${command} "${variable.value}"`, {
          encoding: 'utf-8',
          env: { ...process.env, VERCEL_TOKEN: this.vercelToken }
        });
      }

      console.log(`✅ Set ${variable.key}`);
    } catch (error) {
      console.error(`❌ Failed to set ${variable.key}:`, error);
      throw error;
    }
  }

  /**
   * Wedding-specific environment validation
   */
  private validateWeddingEnvironment(variables: EnvironmentVariable[]): void {
    const requiredWeddingVars = [
      'WEDDING_DATA_ENCRYPTION_KEY',
      'SATURDAY_DEPLOYMENT_BLOCK',
      'WEDDING_SEASON_PEAK_MONTHS',
      'GDPR_COMPLIANCE_MODE'
    ];

    const missing = requiredWeddingVars.filter(key => 
      !variables.find(v => v.key === key)
    );

    if (missing.length > 0) {
      console.warn(`⚠️  Missing wedding-specific variables: ${missing.join(', ')}`);
      console.warn('These should be configured for proper wedding data protection.');
    }

    // Validate Saturday protection
    const saturdayProtection = variables.find(v => v.key === 'SATURDAY_DEPLOYMENT_BLOCK');
    if (saturdayProtection && saturdayProtection.value !== 'true') {
      console.warn('⚠️  Saturday deployment protection is not enabled');
    }

    console.log('🏰 Wedding environment validation completed');
  }

  /**
   * Setup all environment variables
   */
  async setupEnvironment(): Promise<void> {
    try {
      console.log('🚀 Starting Vercel environment setup...');
      
      // Get project info
      const project = await this.getProjectInfo();
      console.log(`📁 Project: ${project.name} (${project.id})`);

      // Load environment variables
      const envVars = this.loadEnvironmentVariables();
      console.log(`📋 Loaded ${Object.keys(envVars).length} environment variables`);

      // Configure variables
      const variables = this.configureEnvironmentVariables(envVars);
      
      // Validate wedding-specific requirements
      this.validateWeddingEnvironment(variables);

      // Set variables in Vercel
      console.log('\n🔧 Setting environment variables in Vercel...');
      
      for (const variable of variables) {
        try {
          await this.setEnvironmentVariable(variable);
          
          // Rate limiting to avoid API limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to set ${variable.key}, continuing...`);
        }
      }

      console.log('\n✅ Vercel environment setup completed!');
      console.log('📝 Summary:');
      console.log(`  - Total variables: ${variables.length}`);
      console.log(`  - Production: ${variables.filter(v => v.target.includes('production')).length}`);
      console.log(`  - Preview: ${variables.filter(v => v.target.includes('preview')).length}`);
      console.log(`  - Development: ${variables.filter(v => v.target.includes('development')).length}`);
      console.log(`  - Secrets: ${variables.filter(v => v.type === 'secret').length}`);

    } catch (error) {
      console.error('❌ Vercel environment setup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Remove all environment variables
   */
  async cleanEnvironment(): Promise<void> {
    try {
      console.log('🧹 Cleaning Vercel environment variables...');
      
      // Get current variables
      const result = execSync(`vercel env ls --format json`, {
        encoding: 'utf-8',
        env: { ...process.env, VERCEL_TOKEN: this.vercelToken }
      });

      const existingVars = JSON.parse(result);
      
      for (const envVar of existingVars) {
        try {
          execSync(`vercel env rm ${envVar.name} --yes`, {
            encoding: 'utf-8',
            env: { ...process.env, VERCEL_TOKEN: this.vercelToken }
          });
          console.log(`🗑️  Removed ${envVar.name}`);
        } catch (error) {
          console.error(`Failed to remove ${envVar.name}:`, error);
        }
      }

      console.log('✅ Environment cleanup completed');
    } catch (error) {
      console.error('❌ Environment cleanup failed:', error);
      process.exit(1);
    }
  }

  /**
   * List current environment variables
   */
  async listEnvironment(): Promise<void> {
    try {
      console.log('📋 Current Vercel environment variables:');
      
      const result = execSync(`vercel env ls`, {
        encoding: 'utf-8',
        env: { ...process.env, VERCEL_TOKEN: this.vercelToken }
      });

      console.log(result);
    } catch (error) {
      console.error('❌ Failed to list environment variables:', error);
      process.exit(1);
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'setup';
  
  const manager = new VercelEnvironmentManager();

  switch (command) {
    case 'setup':
      await manager.setupEnvironment();
      break;
    
    case 'clean':
      await manager.cleanEnvironment();
      break;
    
    case 'list':
      await manager.listEnvironment();
      break;
    
    default:
      console.log(`
Usage: npx tsx scripts/setup-vercel-env.ts [command]

Commands:
  setup   Set up environment variables in Vercel (default)
  clean   Remove all environment variables from Vercel
  list    List current environment variables

Environment Variables Required:
  VERCEL_TOKEN  Vercel API token

Examples:
  npx tsx scripts/setup-vercel-env.ts setup
  npx tsx scripts/setup-vercel-env.ts list
  npx tsx scripts/setup-vercel-env.ts clean
      `);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { VercelEnvironmentManager };