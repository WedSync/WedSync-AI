#!/bin/bash

# Fix deprecated Supabase auth-helpers imports across the entire codebase
# This script updates all files to use the modern @supabase/supabase-js patterns

echo "🔄 Starting comprehensive Supabase import fix..."

# Fix import statements
echo "📝 Updating import statements..."
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e 's/import { createClientComponentClient } from .@supabase\/auth-helpers-nextjs./import { createClient } from '\''@supabase\/supabase-js'\''/g' \
  -e 's/import { createRouteHandlerClient } from .@supabase\/auth-helpers-nextjs./import { createClient } from '\''@supabase\/supabase-js'\''/g' \
  -e 's/import { createServerComponentClient } from .@supabase\/auth-helpers-nextjs./import { createClient } from '\''@supabase\/supabase-js'\''/g' \
  -e 's/import { useUser } from .@supabase\/auth-helpers-react./import { useAuth } from '\''@\/hooks\/useAuth'\''/g'

# Fix client instantiation
echo "🔧 Updating client instantiation..."
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e 's/const supabase = createClientComponentClient()/const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)/g' \
  -e 's/const supabase = createRouteHandlerClient()/const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)/g' \
  -e 's/const supabase = createServerComponentClient()/const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)/g'

# Fix user hook usage
echo "👤 Updating user hook usage..."
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e 's/const user = useUser()/const { user } = useAuth()/g'

echo "✅ Supabase import fix complete!"
echo "📊 Summary:"
echo "  - Updated import statements for createClient*"
echo "  - Updated client instantiation patterns"
echo "  - Updated user hook usage"
echo ""
echo "🧪 Run 'npm run build' to test the changes"