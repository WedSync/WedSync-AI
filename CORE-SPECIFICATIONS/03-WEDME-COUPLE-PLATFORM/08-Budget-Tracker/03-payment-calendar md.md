# 03-payment-calendar.md

## What to Build

Calendar visualization showing when payments are due, helping couples track upcoming expenses and payment deadlines.

## Key Technical Requirements

### Calendar Data Structure

```
interface PaymentCalendar {
  couple_id: string;
  view_type: 'month' | 'quarter' | 'year';
  payments: {
    date: Date;
    items: {
      expense_id: string;
      supplier: string;
      amount: number;
      category: string;
      status: 'paid' | 'due' | 'overdue';
      category_color: string;
    }[];
    day_total: number;
  }[];
  summary: {
    month_total: number;
    paid_this_month: number;
    pending_this_month: number;
  };
}
```

### UI Components

- Monthly calendar grid with payment dots
- Payment amount badges on dates
- Color coding by category
- Expandable day view
- Drag to reschedule planned payments
- Payment reminder setup

## Critical Implementation Notes

- Highlight overdue payments in red
- Show running balance projection
- Export to Google/Apple Calendar
- Mobile swipe between months
- Today marker with upcoming week summary

## Calendar Rendering

```
const renderPaymentCalendar = (payments: Payment[], currentMonth: Date) => {
  const calendar = generateCalendarGrid(currentMonth);
  
  return [calendar.map](http://calendar.map)(week => 
    [week.map](http://week.map)(day => {
      const dayPayments = payments.filter(p => 
        isSameDay(p.due_date, day)
      );
      
      return {
        date: day,
        payments: dayPayments,
        total: dayPayments.reduce((sum, p) => sum + p.amount, 0),
        hasOverdue: dayPayments.some(p => p.status === 'overdue'),
        categories: [...new Set([dayPayments.map](http://dayPayments.map)(p => p.category))]
      };
    })
  );
};
```