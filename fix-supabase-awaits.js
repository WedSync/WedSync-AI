const fs = require('fs');
const path = require('path');

// List of files that need fixing
const files = [
  'src/app/auth/callback/route.ts',
  'src/app/pdf/[id]/mapping/page.tsx',
  'src/app/api/clients/bulk/route.ts',
  'src/app/api/clients/import/route.ts',
  'src/app/api/chat/messages/route.ts',
  'src/app/api/chat/rooms/route.ts',
  'src/app/api/invoices/route.ts',
  'src/app/api/auth/signup/route.ts',
  'src/app/api/booking/confirm/route.ts',
  'src/app/api/booking/[id]/preparation/route.ts',
  'src/app/api/booking/reminders/route.ts',
  'src/app/api/health/complete/route.ts',
  'src/app/api/health/alerts/route.ts',
  'src/app/api/website/domains/verify/route.ts',
  'src/app/api/website/domains/route.ts',
  'src/app/api/admin/audit-log/route.ts',
  'src/app/api/admin/quick-actions/route.ts',
  'src/app/api/admin/system-features/toggle/route.ts',
  'src/app/api/admin/system-features/route.ts',
  'src/app/api/wedding-website/verify-password/route.ts',
  'src/app/api/wedding-website/route.ts',
  'src/app/api/wedding-website/translations/route.ts',
  'src/app/api/dashboard/config/route.ts',
  'src/app/api/dashboard/route.ts',
  'src/app/api/dashboard/widgets/[type]/route.ts',
  'src/app/api/tutorials/progress/route.ts',
  'src/app/api/tutorials/start/route.ts',
  'src/app/api/weather/alerts/route.ts',
  'src/app/api/rsvp/vendor-report/route.ts',
  'src/app/api/journeys/[id]/validate/route.ts',
  'src/app/api/journeys/[id]/test/route.ts',
  'src/app/api/journeys/[id]/canvas/route.ts',
  'src/app/api/import/upload/route.ts',
  'src/app/api/import/process/route.ts',
  'src/app/api/analytics/wedding/[id]/route.ts',
  'src/app/api/analytics/wedding/[id]/export/route.ts',
  'src/app/api/analytics/mrr/route.ts',
  'src/app/api/analytics/executive/route.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Pattern to match: const supabase = createClient()
  // We need to be careful about context - only fix in async functions
  const regex = /(\s*)(const supabase = createClient\(\))/g;
  content = content.replace(regex, (match, whitespace, statement) => {
    modified = true;
    return whitespace + 'const supabase = await createClient()';
  });

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

console.log('Fixing Supabase createClient() calls...');
files.forEach(fixFile);
console.log('Done!');