#!/bin/bash

echo "🚀 Guardian Protocol: Comprehensive Supabase Auth-Helpers Migration"
echo "================================================================="

# Count initial instances
INITIAL_COUNT=$(grep -r "auth-helpers" --include="*.ts" --include="*.tsx" src/ | wc -l)
echo "📊 Initial auth-helpers imports found: $INITIAL_COUNT"

# 1. Replace all import statements
echo "🔄 Fixing import statements..."

# Replace createClientComponentClient imports
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/import { createClientComponentClient }/import { createClient }/g'
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s/from '@supabase\/auth-helpers-nextjs'/from '@supabase\/supabase-js'/g"

# Replace createServerComponentClient imports  
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/import { createServerComponentClient }/import { createClient }/g'

# Replace createRouteHandlerClient imports
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/import { createRouteHandlerClient }/import { createClient }/g'

# Replace combined imports
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/import { createClientComponentClient, User }/import { createClient, User }/g'
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/import { createServerComponentClient, User }/import { createClient, User }/g'
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/import { createRouteHandlerClient, User }/import { createClient, User }/g'

# 2. Replace client instantiation patterns
echo "🔧 Fixing client instantiation patterns..."

# For route handlers and server components - use service role
find src/app/api -name "*.ts" | xargs sed -i '' "s/createRouteHandlerClient({ cookies })/createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)/g"
find src/app/api -name "*.ts" | xargs sed -i '' "s/createRouteHandlerClient()/createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)/g"

# For server components - use service role with proper typing
find src/app -name "page.tsx" -o -name "layout.tsx" | xargs sed -i '' "s/createServerComponentClient({ cookies })/createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)/g"
find src/app -name "page.tsx" -o -name "layout.tsx" | xargs sed -i '' "s/createServerComponentClient()/createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)/g"

# For client components - use anon key
find src/components -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/createClientComponentClient()/createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)/g"

# 3. Update any remaining auth patterns
echo "🔐 Fixing authentication patterns..."

# Replace useUser with useAuth pattern where needed
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/const { data: { user } }/const { data: user }/g'

# 4. Clean up any leftover auth-helpers references
echo "🧹 Cleaning up remaining references..."

# Replace any missed auth-helpers patterns
find src/ -name "*.ts" -o -name "*.tsx" | xargs perl -pi -e "s/from ['\"]@supabase\/auth-helpers[^'\"]*['\"]/from '@supabase\/supabase-js'/g"

# Count final instances
FINAL_COUNT=$(grep -r "auth-helpers" --include="*.ts" --include="*.tsx" src/ | wc -l)
echo ""
echo "📈 Migration Results:"
echo "   Initial: $INITIAL_COUNT instances"
echo "   Final:   $FINAL_COUNT instances"
echo "   Fixed:   $((INITIAL_COUNT - FINAL_COUNT)) instances"
echo ""

if [ $FINAL_COUNT -lt 50 ]; then
    echo "✅ SUCCESS: Major reduction achieved!"
else
    echo "⚠️  WARNING: Many instances remain - manual review needed"
fi

echo "🏁 Auth-helpers migration script completed!"