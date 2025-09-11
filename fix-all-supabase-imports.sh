#!/bin/bash

# Comprehensive Supabase Import Fix Script
# Guardian Protocol - Category 4 Complete Cleanup

echo "🛡️ Guardian Protocol: Comprehensive Category 4 Import Cleanup"

# Replace all variations of createClientComponentClient import
echo "📝 Replacing createClientComponentClient imports..."
find . -name "*.ts" -name "*.tsx" -exec grep -l "createClientComponentClient.*@supabase/auth-helpers-nextjs" {} \; | while read file; do
    echo "  Fixing client component: $file"
    sed -i '' 's/import.*createClientComponentClient.*from.*@supabase\/auth-helpers-nextjs.*/import { createBrowserClient } from "@supabase\/ssr";/g' "$file"
done

# Replace all variations of createServerComponentClient import  
echo "📝 Replacing createServerComponentClient imports..."
find . -name "*.ts" -name "*.tsx" -exec grep -l "createServerComponentClient.*@supabase/auth-helpers-nextjs" {} \; | while read file; do
    echo "  Fixing server component: $file"
    sed -i '' 's/import.*createServerComponentClient.*from.*@supabase\/auth-helpers-nextjs.*/import { createServerClient } from "@supabase\/ssr";/g' "$file"
done

# Replace any remaining @supabase/auth-helpers-nextjs imports with the modern equivalent
echo "📝 Replacing any remaining auth-helpers-nextjs imports..."
find . -name "*.ts" -name "*.tsx" -exec grep -l "@supabase/auth-helpers-nextjs" {} \; | while read file; do
    echo "  Fixing remaining import in: $file"
    sed -i '' 's/import.*from.*@supabase\/auth-helpers-nextjs.*/import { createServerClient, createBrowserClient } from "@supabase\/ssr";/g' "$file"
done

# Update function calls in the files
echo "📝 Updating function calls to use modern patterns..."
find . -name "*.ts" -name "*.tsx" -exec grep -l "createClientComponentClient\|createServerComponentClient" {} \; | while read file; do
    echo "  Updating function calls in: $file"
    # Replace createClientComponentClient calls
    sed -i '' 's/createClientComponentClient()/createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)/g' "$file"
    # Replace createServerComponentClient calls  
    sed -i '' 's/createServerComponentClient()/createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookies().getAll() }, setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => { cookies().set(name, value, options) }) } } })/g' "$file"
done

echo "✅ Comprehensive Category 4 Import Cleanup Complete!"
echo "📊 Checking remaining deprecated imports..."
find . -name "*.ts" -name "*.tsx" -exec grep -l "@supabase/auth-helpers-nextjs" {} \; | wc -l