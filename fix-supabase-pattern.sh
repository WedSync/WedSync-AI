#!/bin/bash

# Optimized Supabase Pattern Replacement Script
# Guardian Protocol - Category 4 Cleanup

echo "🛡️ Guardian Protocol: Processing Category 4 - Deprecated Supabase Patterns"

# Define the replacement patterns
MODERN_PATTERN='createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookies().getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookies().set(name, value, options)
              })
            }
          }
        }
      )'

# Process files with the simple pattern first
echo "📝 Processing createRouteHandlerClient({ cookies }) pattern..."
find . -name "*.ts" -exec grep -l "createRouteHandlerClient({ cookies })" {} \; | while read file; do
    echo "  Updating: $file"
    sed -i '' 's/createRouteHandlerClient({ cookies })/createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookies().getAll() }, setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => { cookies().set(name, value, options) }) } } })/g' "$file"
done

# Process files with the complex pattern
echo "📝 Processing createRouteHandlerClient({ cookies: () => cookieStore }) pattern..."
find . -name "*.ts" -exec grep -l "createRouteHandlerClient({ cookies: () => cookieStore })" {} \; | while read file; do
    echo "  Updating: $file"
    sed -i '' 's/createRouteHandlerClient({ cookies: () => cookieStore })/createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll() }, setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => { cookieStore.set(name, value, options) }) } } })/g' "$file"
done

echo "✅ Category 4 Pattern Replacement Complete!"
echo "📊 Checking remaining files..."
find . -name "*.ts" -exec grep -l "createRouteHandlerClient" {} \; | wc -l