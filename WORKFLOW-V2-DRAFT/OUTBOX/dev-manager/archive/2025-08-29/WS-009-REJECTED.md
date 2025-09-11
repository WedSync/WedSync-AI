# FEATURE REJECTED: WS-009 - Priority Widgets

**Reason**: This feature involves client payment collection (`payment_overdue` type) which is outside WedSync scope

**Original Request**: Priority dashboard widgets including payment overdue tracking and client billing priorities

**Forbidden Elements Detected**:
- Line 34: `payment_overdue` task type for client payment collection
- Line 84: `payment_overdue` in priority task types  
- Line 321: High priority scoring (90) for payment collection from clients
- Focus on business revenue collection rather than wedding coordination

**Alternative**: Create priority widgets focused purely on wedding coordination tasks like:
- Form completion deadlines for wedding details
- Meeting scheduling with existing clients about their wedding
- Journey milestone completion
- Vendor coordination priorities
- Wedding day timeline preparation

**Status**: REJECTED - Does not align with WedSync's wedding coordination focus
**Date**: 2025-08-23