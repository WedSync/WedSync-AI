# MIGRATION REQUEST TEMPLATE
## Copy this template when sending migrations to SQL Expert

```markdown
# MIGRATION REQUEST - WS-XXX - [Feature Name]
## Team: [A/B/C/D/E]
## Round: [1/2/3]
## Date: [YYYY-MM-DD]

### FEATURE CONTEXT
**What we're building:** [Brief description of the feature]
**Why database changes needed:** [Explain the requirement]

### MIGRATION FILES CREATED
1. `/wedsync/supabase/migrations/[timestamp]_[description].sql`
   - Purpose: [What this migration does]
   - Size: [number] lines

2. `/wedsync/supabase/migrations/[timestamp]_[description2].sql` (if multiple)
   - Purpose: [What this migration does]
   - Size: [number] lines

### DATABASE CHANGES

**New Tables:**
- `table_name` - [Purpose of table]
  - Primary key: [field]
  - Foreign keys: [references]
  - RLS enabled: Yes/No

**Modified Tables:**
- `existing_table` - [What was changed]
  - Added columns: [list]
  - Modified columns: [list]
  - New indexes: [list]

**New Functions/Triggers:**
- `function_name()` - [Purpose]
- `trigger_name` - [When it fires]

### DEPENDENCIES

**Required Tables (must exist):**
- `organizations` - [Why needed]
- `user_profiles` - [Why needed]
- [Other tables]

**Required Extensions:**
- `uuid-ossp` - [If needed]
- `pg_trgm` - [If needed for search]
- [Others]

### TESTING STATUS

**Local Testing:**
- [ ] Migration applies cleanly
- [ ] Rollback tested
- [ ] No syntax errors
- [ ] RLS policies tested
- [ ] Application connects successfully

**Known Issues:**
- [Any problems encountered]
- [Patterns you're unsure about]

### SPECIAL CONSIDERATIONS

**Performance:**
- Expected row count: [estimate]
- Index strategy: [description]
- Query patterns: [how data will be accessed]

**Security:**
- RLS policies: [Implemented/Needed]
- Sensitive data: [Yes/No - details]
- Auth pattern used: [Description]

**Integration:**
- API endpoints affected: [list]
- Frontend components affected: [list]
- Other services affected: [list]

### URGENCY
Priority: [🔴 CRITICAL - Blocking other teams / 🟡 STANDARD / 🟢 ROUTINE]
Deadline: [If applicable]

### QUESTIONS FOR SQL EXPERT
1. [Specific question about patterns]
2. [Concern about performance]
3. [Need help with RLS]

---
**Team Contact:** Team [X] via /WORKFLOW-V2-DRAFT/OUTBOX/team-[x]/
**Feature Spec:** /WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-XXX-[feature]-technical.md
```

## HOW TO USE THIS TEMPLATE

1. Copy this entire template
2. Create new file: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-XXX.md`
3. Fill in all sections with your specific information
4. Delete any sections that don't apply
5. Save and notify that migration is ready for SQL Expert

## COMMON PATTERNS TO MENTION

If your migration includes these, specifically note them:
- Auth functions (auth.uid(), auth.role())
- User references (user_profiles vs users table)
- GIST constraints with UUIDs
- View/table conversions
- Complex foreign key relationships
- Cascade deletes
- Trigger functions
- Computed columns
- Full-text search indexes