#!/usr/bin/env npx tsx

/**
 * Wedding Field Patterns Database Initialization Script
 * WS-242: AI PDF Analysis System - Pattern Database Setup
 * 
 * Run this script to populate the database with comprehensive wedding field patterns
 * Usage: npx tsx scripts/initialize-wedding-patterns.ts
 */

import { createClient } from '@supabase/supabase-js';
import { WeddingFieldPatternsService } from '../src/lib/services/weddingFieldPatternsService';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🎯 Wedding Field Patterns Database Initialization');
  console.log('==================================================\n');

  try {
    // Check database connection
    console.log('📡 Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('wedding_field_patterns')
      .select('count(*)', { count: 'exact', head: true });

    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      process.exit(1);
    }

    console.log('✅ Database connection successful');

    // Check if patterns already exist
    const { count: existingPatternsCount } = connectionTest || { count: 0 };
    console.log(`📊 Found ${existingPatternsCount} existing patterns`);

    if (existingPatternsCount && existingPatternsCount > 0) {
      console.log('\n⚠️  Wedding field patterns already exist in the database');
      console.log('   Choose an option:');
      console.log('   1. Skip initialization (keep existing patterns)');
      console.log('   2. Clear and reinitialize (WARNING: This will delete all existing patterns)');
      console.log('   3. Add new patterns only (merge with existing)');
      
      // For script purposes, we'll add new patterns only
      console.log('\n🔄 Proceeding with merge approach (option 3)...\n');
    }

    // Initialize the patterns service
    const patternsService = new WeddingFieldPatternsService();
    
    // Get pattern statistics before initialization
    const stats = patternsService.getPatternStatistics();
    console.log('📈 Pattern Statistics:');
    console.log(`   • Total patterns to add: ${stats.totalPatterns}`);
    console.log(`   • High priority patterns: ${stats.highPriorityPatterns}`);
    console.log('   • By category:');
    Object.entries(stats.patternsByCategory).forEach(([category, count]) => {
      console.log(`     - ${category}: ${count} patterns`);
    });
    console.log('   • By industry:');
    Object.entries(stats.patternsByIndustry).forEach(([industry, count]) => {
      console.log(`     - ${industry}: ${count} patterns`);
    });
    console.log('');

    // Initialize patterns
    console.log('🚀 Starting pattern initialization...\n');
    
    // Get all patterns to initialize
    const patterns = patternsService.getComprehensivePatterns();
    
    // Split into chunks for better performance and error handling
    const chunkSize = 25;
    const chunks = [];
    for (let i = 0; i < patterns.length; i += chunkSize) {
      chunks.push(patterns.slice(i, i + chunkSize));
    }

    let totalInitialized = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const [chunkIndex, chunk] of chunks.entries()) {
      console.log(`📦 Processing batch ${chunkIndex + 1}/${chunks.length} (${chunk.length} patterns)...`);
      
      try {
        // Check which patterns already exist to avoid duplicates
        const existingPatterns = await supabase
          .from('wedding_field_patterns')
          .select('pattern_name, field_type')
          .in('pattern_name', chunk.map(p => p.patternName));

        const existingPatternKeys = new Set(
          existingPatterns.data?.map(p => `${p.pattern_name}:${p.field_type}`) || []
        );

        // Filter out existing patterns
        const newPatterns = chunk.filter(pattern => 
          !existingPatternKeys.has(`${pattern.patternName}:${pattern.fieldType}`)
        );

        if (newPatterns.length === 0) {
          console.log(`   ⏭️  All patterns in this batch already exist, skipping...`);
          totalSkipped += chunk.length;
          continue;
        }

        // Insert new patterns
        const { data, error } = await supabase
          .from('wedding_field_patterns')
          .insert(
            newPatterns.map(pattern => ({
              pattern_name: pattern.patternName,
              field_type: pattern.fieldType,
              regex_pattern: pattern.regexPattern,
              priority: pattern.priority,
              context_keywords: pattern.contextKeywords,
              validation_rules: pattern.validationRules,
              description: pattern.description,
              category: pattern.category,
              is_active: pattern.isActive,
              industry: pattern.industry,
              created_by_user_id: 'system'
            }))
          )
          .select();

        if (error) {
          console.error(`   ❌ Error in batch ${chunkIndex + 1}:`, error.message);
          totalErrors += chunk.length;
          continue;
        }

        const insertedCount = data?.length || 0;
        const skippedInBatch = chunk.length - insertedCount;
        
        totalInitialized += insertedCount;
        totalSkipped += skippedInBatch;
        
        console.log(`   ✅ Added ${insertedCount} new patterns (${skippedInBatch} already existed)`);
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`   ❌ Exception in batch ${chunkIndex + 1}:`, error);
        totalErrors += chunk.length;
      }
    }

    console.log('\n🎉 Pattern initialization completed!');
    console.log('=====================================');
    console.log(`✅ Successfully added: ${totalInitialized} patterns`);
    console.log(`⏭️  Already existed: ${totalSkipped} patterns`);
    console.log(`❌ Failed to add: ${totalErrors} patterns`);
    console.log(`📊 Total processed: ${totalInitialized + totalSkipped + totalErrors} patterns\n`);

    // Verify final state
    const { count: finalCount } = await supabase
      .from('wedding_field_patterns')
      .select('count(*)', { count: 'exact', head: true }) || { count: 0 };
    
    console.log(`📈 Total patterns in database: ${finalCount}`);

    // Test a few patterns to ensure they work
    console.log('\n🧪 Running pattern validation tests...');
    
    const testText = `
      Client Name: Emily Johnson
      Groom: James Smith
      Email: emily.johnson@example.com
      Phone: 07123 456789
      Wedding Date: 15/06/2024
      Venue: Ashridge House
      Guest Count: 120
      Budget: £8,500
      Photography Style: Documentary
    `;

    const testResults = patternsService.testPatternsAgainstText(testText);
    const successfulMatches = testResults.filter(result => result.success);
    
    console.log(`   • Tested ${testResults.length} patterns against sample text`);
    console.log(`   • Successfully matched: ${successfulMatches.length} patterns`);
    console.log(`   • Match rate: ${Math.round((successfulMatches.length / testResults.length) * 100)}%`);
    
    if (successfulMatches.length > 0) {
      console.log('\n   Sample matches:');
      successfulMatches.slice(0, 5).forEach(result => {
        console.log(`   ✅ ${result.pattern.patternName}: "${result.matches[0]?.[1] || result.matches[0]?.[0]}"`);
      });
    }

    console.log('\n🎯 Recommendations:');
    stats.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    console.log('\n✨ Wedding field patterns database is ready!');
    console.log('   You can now process PDF forms with high accuracy wedding field extraction.');

  } catch (error) {
    console.error('❌ Fatal error during initialization:', error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export default main;