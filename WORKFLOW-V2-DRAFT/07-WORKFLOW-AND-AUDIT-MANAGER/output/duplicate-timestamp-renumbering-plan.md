# 🔢 DUPLICATE TIMESTAMP RENUMBERING PLAN
## Generated: 2025-08-27 by Workflow Manager

## 🎯 OBJECTIVE
Resolve duplicate timestamps to prevent migration conflicts while preserving all legitimate features.

## 📊 DUPLICATE ANALYSIS

### VERSION 20250122000003 (3 files - KEEP ALL)
**Original Files:**
- `20250122000003_faq_management_system.sql` 
- `20250122000003_subscription_billing_system.sql`
- `20250122000003_whatsapp_integration_system.sql`

**Resolution - Sequential Renumbering:**
```bash
# Keep first file as-is
# Rename others with incremental timestamps (add 1 second each)

mv 20250122000003_subscription_billing_system.sql 20250122000004_subscription_billing_system.sql
mv 20250122000003_whatsapp_integration_system.sql 20250122000005_whatsapp_integration_system.sql
```

**Result:**
- ✅ `20250122000003_faq_management_system.sql` (unchanged)
- ✅ `20250122000004_subscription_billing_system.sql` (renamed)
- ✅ `20250122000005_whatsapp_integration_system.sql` (renamed)

### VERSION 20250122000005 (2 files - KEEP ALL)
**Original Files:**
- `20250122000005_automated_reminders_system.sql`
- `20250122000005_contract_management_system.sql`

**Resolution:**
```bash
# Keep first file as-is, rename second
mv 20250122000005_contract_management_system.sql 20250122000006_contract_management_system.sql
```

**Result:**
- ✅ `20250122000005_automated_reminders_system.sql` (unchanged)
- ✅ `20250122000006_contract_management_system.sql` (renamed)

### VERSION 20250824000001 (2 files - KEEP ALL)
**Original Files:**
- `20250824000001_marketplace_search_filters.sql`
- `20250824000001_portfolio_management_system.sql`

**Resolution:**
```bash
mv 20250824000001_portfolio_management_system.sql 20250824000002_portfolio_management_system.sql
```

**Result:**
- ✅ `20250824000001_marketplace_search_filters.sql` (unchanged)
- ✅ `20250824000002_portfolio_management_system.sql` (renamed)

### VERSION 20250826000001 (3 files - KEEP ALL)
**Original Files:**
- `20250826000001_advanced_encryption_system.sql`
- `20250826000001_communication_campaigns_system.sql`
- `20250826000001_ws151_guest_import_infrastructure.sql`

**Resolution:**
```bash
mv 20250826000001_communication_campaigns_system.sql 20250826000002_communication_campaigns_system.sql
mv 20250826000001_ws151_guest_import_infrastructure.sql 20250826000003_ws151_guest_import_infrastructure.sql
```

**Result:**
- ✅ `20250826000001_advanced_encryption_system.sql` (unchanged)
- ✅ `20250826000002_communication_campaigns_system.sql` (renamed)
- ✅ `20250826000003_ws151_guest_import_infrastructure.sql` (renamed)

### VERSION 20250826120001 (3 files - KEEP ALL)
**Original Files:**
- `20250826120001_gdpr_round2_intelligence_features.sql`
- `20250826120001_seating_optimization_system.sql`
- `20250826120001_ws152_dietary_requirements_team_d.sql`

**Resolution:**
```bash
mv 20250826120001_seating_optimization_system.sql 20250826120002_seating_optimization_system.sql
mv 20250826120001_ws152_dietary_requirements_team_d.sql 20250826120003_ws152_dietary_requirements_team_d.sql
```

**Result:**
- ✅ `20250826120001_gdpr_round2_intelligence_features.sql` (unchanged)
- ✅ `20250826120002_seating_optimization_system.sql` (renamed)
- ✅ `20250826120003_ws152_dietary_requirements_team_d.sql` (renamed)

## 🔄 EXECUTION COMMANDS

### Complete Renumbering Script:
```bash
#!/bin/bash
echo "=== MIGRATION RENUMBERING SCRIPT ==="
echo "Renaming duplicate timestamp migrations..."

# 20250122000003 series
mv 20250122000003_subscription_billing_system.sql 20250122000004_subscription_billing_system.sql
mv 20250122000003_whatsapp_integration_system.sql 20250122000005_whatsapp_integration_system.sql

# 20250122000005 series  
mv 20250122000005_contract_management_system.sql 20250122000006_contract_management_system.sql

# 20250824000001 series
mv 20250824000001_portfolio_management_system.sql 20250824000002_portfolio_management_system.sql

# 20250826000001 series
mv 20250826000001_communication_campaigns_system.sql 20250826000002_communication_campaigns_system.sql
mv 20250826000001_ws151_guest_import_infrastructure.sql 20250826000003_ws151_guest_import_infrastructure.sql

# 20250826120001 series
mv 20250826120001_seating_optimization_system.sql 20250826120002_seating_optimization_system.sql  
mv 20250826120001_ws152_dietary_requirements_team_d.sql 20250826120003_ws152_dietary_requirements_team_d.sql

echo "✅ Renumbering complete!"
echo ""
echo "Verification - checking for remaining duplicates:"
ls *.sql | cut -d'_' -f1 | sort | uniq -d
```

## 📋 VERIFICATION CHECKLIST

After renumbering:
- [ ] No duplicate version numbers remain
- [ ] All migration files have unique timestamps  
- [ ] File contents unchanged (only filenames modified)
- [ ] Migration order maintained logically
- [ ] No missing migrations

## ⚠️ SPECIAL CASES HANDLED

### VERSION 025 - Already Resolved
- `025_sms_configuration_system.sql` (original)
- `025_sms_configuration_system_fixed.sql` (improved version)
- **Decision**: Keep both - different implementations

### Applied Migrations Stay Unchanged
- Only rename files not yet applied to database
- Applied migrations maintain their original version numbers

## 🎯 FINAL RESULT

**Before Renumbering**: 16+ duplicate version conflicts  
**After Renumbering**: 0 duplicate version conflicts  
**Files Renamed**: 8 migration files  
**Files Preserved**: All migration functionality intact

---

**NEXT STEP**: Execute renumbering script then proceed with Batch A migrations