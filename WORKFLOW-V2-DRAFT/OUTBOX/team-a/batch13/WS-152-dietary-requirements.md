# TEAM A - BATCH 13: WS-152 - Dietary Requirements Management

## ASSIGNMENT DATE: 2025-01-20

### TEAM A RESPONSIBILITIES
**Focus Areas**: Form UX, Visual Indicators, Safety Warnings

#### TASKS ASSIGNED TO TEAM A:
1. **Dietary Requirements Form** (`/src/components/guests/DietaryRequirementsForm.tsx`)
   - Checkbox groups for common allergies/preferences
   - Severity level selection with visual indicators
   - Life-threatening allergy warnings
   - Auto-save functionality

2. **Dietary Matrix Display** (`/src/components/guests/DietaryMatrix.tsx`)
   - Tabular view of all dietary requirements
   - Color-coded severity levels
   - Filtering and search functionality
   - Print-optimized layout for caterers

3. **Allergen Warnings Component** (`/src/components/guests/AllergenWarnings.tsx`)
   - Prominent life-threatening allergy alerts
   - Emergency contact information display
   - Kitchen safety protocol indicators
   - EpiPen requirement notifications

#### TECHNICAL REQUIREMENTS:
- Form validation with React Hook Form
- Visual severity indicators (color coding)
- Accessibility for screen readers on safety warnings
- Auto-save debounced at 2-second intervals
- Export functionality to PDF/CSV for caterers

#### INTEGRATION POINTS:
- Extends guest management system from WS-151
- Dietary requirements API (`/api/dietary/*`)
- Integration with guest detail pages
- Export service for caterer reports

#### ESTIMATED EFFORT: 18 hours
**Due Date**: End of sprint (2025-02-03)

---

### DEPENDENCIES:
- Must complete after WS-151 (Guest List Builder)
- Team B provides dietary requirements API
- Team D creates dietary database schema

### SUCCESS CRITERIA:
- [ ] Life-threatening allergies show prominent warnings
- [ ] Form auto-saves without user intervention
- [ ] Dietary matrix loads and filters quickly
- [ ] Export generates caterer-ready reports
- [ ] All severity levels are clearly distinguished

### NOTES:
This feature deals with **life-threatening medical information**. Prioritize clear visual indicators, fail-safe data handling, and caterer communication. Any life-threatening allergy must be impossible to miss.