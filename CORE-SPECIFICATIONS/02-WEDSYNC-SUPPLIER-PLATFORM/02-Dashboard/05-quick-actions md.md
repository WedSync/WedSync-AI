# 05-quick-actions.md

## Purpose

One-click access to the most frequently used features, reducing time to complete common tasks.

## Key Implementation Requirements

### Primary Quick Actions

```
1. ➕ Add New Client (modal)
2. 📋 Create Form (navigate to builder)
3. 📧 Send Bulk Message (modal)
4. 📥 Import Clients (wizard)
5. 🚀 Start Journey (selection modal)
```

### Contextual Actions

Based on current view:

- Client profile → Send message, Add note, Assign journey
- Form responses → Export, Mark complete, Send reminder
- Journey canvas → Add module, Test journey, Publish

### Smart Suggestions

- AI-powered action recommendations
- Based on time of day/week
- Historical usage patterns
- Current workload analysis

### Keyboard Shortcuts

```
Cmd/Ctrl + N: New (contextual)
Cmd/Ctrl + K: Search
Cmd/Ctrl + M: New message
Cmd/Ctrl + I: Import
Cmd/Ctrl + Enter: Save/Send
```

### Mobile Optimization

- Floating action button (FAB)
- Long-press for action menu
- Swipe gestures for common actions
- Voice commands support

### Action Feedback

- Loading states during execution
- Success confirmations
- Error handling with retry
- Undo capability where applicable

## Critical Success Factors

- Every action completable in <3 clicks
- Clear visual affordances
- Consistent placement across views
- Mobile gesture support