# 09-indexes-optimization.md

`### 09-indexes-optimization.md
```markdown
# Database Indexes & Optimization

## Critical Indexes

### Foreign Keys (Automatic)
```sql
-- PostgreSQL creates these automatically
-- Listed for documentation
- suppliers(id)
- couples(id) 
- forms(supplier_id)
- clients(supplier_id)`

### Search Performance

sql

- `*- Text search on business names*
CREATE INDEX idx_suppliers_business_name_gin
ON suppliers USING gin( to_tsvector('english', business_name)
);
*- Email lookups*
CREATE UNIQUE INDEX idx_suppliers_email
ON suppliers(lower(email));
*- Date range queries*
CREATE INDEX idx_couples_wedding_date
ON couples(wedding_date)
WHERE wedding_date > CURRENT_DATE;`

### JSONB Indexes

sql

- `*- Core fields searching*
CREATE INDEX idx_core_fields_data
ON core_fields USING gin(wedding_party);
*- Form fields searching* 
CREATE INDEX idx_forms_fields
ON forms USING gin(fields);`

### Composite Indexes

sql

- `*- Common dashboard query*
CREATE INDEX idx_clients_supplier_wedding
ON clients(supplier_id, wedding_date DESC);
*- Activity feed*
CREATE INDEX idx_activities_actor_time
ON activities(actor_id, created_at DESC);`

## Query Optimization Rules

- Use EXPLAIN ANALYZE on slow queries
- Partial indexes for active/archived splits
- Consider materialized views for analytics
- Regular VACUUM and ANALYZE
- Monitor pg_stat_user_tables