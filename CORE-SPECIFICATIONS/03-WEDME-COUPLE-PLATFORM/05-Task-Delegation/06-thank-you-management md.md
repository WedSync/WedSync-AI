# 06-thank-you-management.md

## What to Build

Post-wedding thank you note tracking system for helpers, including automated reminders, gift tracking, and personalized message management.

## Key Technical Requirements

### Thank You Schema

```
interface ThankYouTracker {
  id: string;
  couple_id: string;
  helper_id: string;
  tasks_completed: string[];
  thank_you_status: 'pending' | 'drafted' | 'sent';
  method: 'card' | 'email' | 'gift' | 'in_person';
  gift_details?: {
    type: string;
    value: number;
    ordered_date?: Date;
    delivered_date?: Date;
  };
  message: string;
  sent_date?: Date;
  follow_up_reminder?: Date;
}
```

### UI Components

- Helper contribution summary dashboard
- Thank you checklist with progress
- Message template library
- Gift idea suggestions based on contribution
- Bulk thank you card designer

## Critical Implementation Notes

- Auto-generate thank you list from completed tasks
- Calculate helper "impact score" for gift suggestions
- Integration with card printing services
- Track physical address collection
- Set reminders at 1 week, 1 month, 3 months post-wedding

## Automation Features

```
// Generate thank you list
const generateThankYouList = async (coupleId: string) => {
  const helpers = await getHelpersWithCompletedTasks(coupleId);
  
  return [helpers.map](http://helpers.map)(helper => ({
    name: [helper.name](http://helper.name),
    tasksCompleted: helper.tasks.length,
    impactLevel: calculateImpact(helper.tasks),
    suggestedGift: getGiftSuggestion(helper.tasks),
    draftMessage: generatePersonalizedMessage(helper)
  }));
};
```