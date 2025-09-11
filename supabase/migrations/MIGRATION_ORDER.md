# WedSync Database Migration Order

## Execution Instructions

Run these migrations in the exact order listed below. Each migration builds on the previous ones.

### Foundation Layer (Must run first)
1. `20250101000001_auth_schema.sql` - Authentication foundation
2. `20250101000002_base_schema.sql` - Organizations and base tables
3. `20250101000003_clients_vendors_schema.sql` - Core client/vendor tables

### Core Systems
4. `20250101000004_communications_system.sql` - Messaging and notifications
5. `20250101000005_payment_tables.sql` - Payment tracking
6. `20250101000006_core_fields_system.sql` - Core wedding fields (KEY DIFFERENTIATOR)
7. `20250101000007_pdf_import_tables.sql` - PDF processing

### Security Layer
8. `20250101000008_security_rls_policies.sql` - Row Level Security
9. `20250101000009_security_enhancements.sql` - Security enhancements
10. `20250101000010_enhanced_security_audit.sql` - Audit logging
11. `20250101000011_security_alerts_table.sql` - Security alerts

### Performance & Infrastructure
12. `20250101000012_performance_indexes.sql` - Database indexes
13. `20250101000013_api_key_system.sql` - API management
14. `20250101000014_enterprise_token_system.sql` - Token system
15. `20250101000015_advanced_performance_optimization.sql` - Performance tuning
16. `20250101000016_pdf_processing_progress_tracking.sql` - PDF tracking

### Journey Management (Core Feature)
17. `20250101000017_journey_execution_system.sql` - Journey engine
18. `20250101000018_journey_analytics_dashboard.sql` - Journey analytics
19. `20250101000019_analytics_data_pipeline.sql` - Data pipeline
20. `20250101000020_form_templates_library.sql` - Form templates

### Client & Lead Management
21. `20250101000021_lead_status_tracking_system.sql` - Lead tracking
22. `20250101000022_advanced_journey_index_optimization.sql` - Journey optimization
23. `20250101000023_index_monitoring_system.sql` - Index monitoring
24. `20250101000024_notes_system.sql` - Notes system

### Analytics & Compliance
25. `20250101000025_analytics_tracking.sql` - Analytics tracking
26. `20250101000026_query_performance_validation.sql` - Query validation
27. `20250101000027_gdpr_ccpa_compliance.sql` - Privacy compliance
28. `20250101000028_tagging_system.sql` - Tagging
29. `20250101000029_tutorial_system.sql` - Tutorials
30. `20250101000030_vendor_portal_system.sql` - Vendor portal

### Extended Features
31. `20250101000031_dashboard_system.sql` - Dashboard
32. `20250101000032_import_system.sql` - Import system
33. `20250101000033_payment_system_extensions.sql` - Payment extensions
34. `20250101000034_wedding_encryption_system.sql` - Data encryption
35. `20250101000035_ab_testing_system.sql` - A/B testing
36. `20250101000036_client_profiles_enhancement.sql` - Profile enhancements
37. `20250101000037_journey_canvas_enhancement.sql` - Canvas enhancements

### Guest Management Suite
38. `20250101000038_guest_management_system.sql` - Guest management
39. `20250101000039_guest_management_rls.sql` - Guest RLS
40. `20250101000040_guest_management_functions.sql` - Guest functions

### Additional Features
41. `20250101000041_rsvp_management_system.sql` - RSVP system
42. `20250101000042_wedding_website_system.sql` - Wedding websites
43. `20250101000043_referral_programs_system.sql` - Referrals

### Task Management Suite
44. `20250101000044_task_delegation_system.sql` - Task delegation
45. `20250101000045_delegation_workflow_system.sql` - Workflows
46. `20250101000046_deadline_tracking_system.sql` - Deadlines
47. `20250101000047_task_status_history.sql` - Status history
48. `20250101000048_workload_tracking_system.sql` - Workload tracking
49. `20250101000049_task_collaboration_templates.sql` - Collaboration

### Final Features
50. `20250101000050_seo_analytics_system.sql` - SEO analytics

### Recent Updates (January 2025)
51. `20250120000001_journey_execution_engine.sql` - Journey execution updates
52. `20250121000001_journey_metrics_analytics.sql` - Metrics updates
53. `20250121000002_analytics_query_optimization.sql` - Query optimization
54. `20250121000003_analytics_automation_setup.sql` - Automation setup

## Execution Command

When ready to apply migrations to Supabase:

```bash
# First, link to your Supabase project
npx supabase link --project-ref your-project-ref

# Then apply all migrations
npx supabase migration up
```

## Notes
- Each migration depends on the ones before it
- Do NOT skip migrations or run out of order
- If a migration fails, fix the issue before continuing
- All migrations are idempotent (safe to run multiple times)
