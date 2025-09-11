#!/bin/bash

# Final Supabase Import Cleanup Script
# Guardian Protocol - Category 4 Final Phase

echo "🛡️ Guardian Protocol: Final Category 4 Cleanup Phase"

# Update import statements from deprecated package
echo "📝 Updating import statements from deprecated @supabase/auth-helpers-nextjs..."
find . -name "*.ts" -not -path "./__tests__/*" -exec grep -l "from '@supabase/auth-helpers-nextjs'" {} \; | while read file; do
    echo "  Updating imports in: $file"
    sed -i '' 's/import.*createRouteHandlerClient.*from.*@supabase\/auth-helpers-nextjs.*/import { createServerClient } from "@supabase\/ssr";/g' "$file"
done

# Update test files with correct imports
echo "📝 Updating test file imports..."
find . -path "./__tests__/*" -name "*.ts" -exec grep -l "from '@supabase/auth-helpers-nextjs'" {} \; | while read file; do
    echo "  Updating test file: $file"
    sed -i '' 's/import.*createRouteHandlerClient.*from.*@supabase\/auth-helpers-nextjs.*/import { createServerClient } from "@supabase\/ssr";/g' "$file"
done

# Handle createServerComponentClient and createClientComponentClient imports
echo "📝 Updating other deprecated Supabase component client imports..."
find . -name "*.ts" -name "*.tsx" -exec grep -l "createServerComponentClient\|createClientComponentClient" {} \; | while read file; do
    echo "  Updating component clients in: $file"
    sed -i '' 's/createServerComponentClient/createServerClient/g' "$file"
    sed -i '' 's/createClientComponentClient/createBrowserClient/g' "$file"
done

echo "✅ Final Category 4 Import Cleanup Complete!"
echo "📊 Checking remaining deprecated imports..."
find . -name "*.ts" -exec grep -l "@supabase/auth-helpers-nextjs" {} \; | wc -l