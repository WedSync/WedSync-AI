# 08-row-level-security.md

`### 08-row-level-security.md
```markdown
# Row Level Security (RLS)

## Core RLS Principles

### Enable RLS on All Tables
```sql
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;`

## Policy Examples

### Suppliers See Own Data

sql

`CREATE POLICY "Suppliers see own data" ON forms
  FOR ALL USING (auth.uid() = supplier_id);`

### Couples Control Visibility

sql

`CREATE POLICY "Couples share with connected suppliers" 
ON core_fields
  FOR SELECT USING (
    couple_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM couple_suppliers cs
      WHERE cs.couple_id = core_fields.couple_id
      AND cs.supplier_id = auth.uid()
      AND cs.permissions->>'view_core_fields' = 'true'
    )
  );`

### Public Templates

sql

`CREATE POLICY "Public templates visible to all"
ON templates
  FOR SELECT USING (
    is_public = true OR
    creator_id = auth.uid()
  );`

## Critical Security Notes

- Never use SECURITY DEFINER without careful review
- Service role bypasses RLS - use sparingly
- Test policies with different user roles
- Monitor slow queries from complex policies