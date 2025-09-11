#!/bin/bash

# Fix remaining Supabase auth-helpers imports - more comprehensive patterns
echo "🔄 Fixing remaining auth-helpers imports..."

# Handle all import variations including multi-line and different quotes
find src/ -name "*.ts" -o -name "*.tsx" | xargs perl -i -pe '
  s/from ['\''"]@supabase\/auth-helpers-nextjs['\''"]$/from "@supabase\/supabase-js"/g;
  s/from ['\''"]@supabase\/auth-helpers-react['\''"]$/from "@supabase\/supabase-js"/g;
  s/@supabase\/auth-helpers-nextjs/@supabase\/supabase-js/g;
  s/@supabase\/auth-helpers-react/@supabase\/supabase-js/g;
'

# Also handle any remaining client patterns
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e 's/createClientComponentClient()/createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)/g' \
  -e 's/createRouteHandlerClient()/createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)/g' \
  -e 's/createServerComponentClient()/createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)/g'

echo "✅ Fixed remaining auth-helpers patterns"
echo "📊 Remaining auth-helpers references:"
grep -r "auth-helpers" src/ | wc -l