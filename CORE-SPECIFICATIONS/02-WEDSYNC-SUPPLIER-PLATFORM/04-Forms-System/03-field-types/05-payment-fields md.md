# 05-payment-fields.md

## Purpose

Enable service selection and payment tracking without processing actual payments (no Stripe integration).

## Product/Service Selection

### Add-on Display

- **Layout**: Cards, list, or grid view
- **Information**: Name, description, price, image
- **Categories**: Group related add-ons
- **Dependencies**: Show required combinations

### Selection Methods

- **Checkboxes**: Multiple selections
- **Radio Buttons**: Exclusive options
- **Quantity Selectors**: For countable items
- **Package Builder**: Combinations with discounts

### Pricing Display

- **Base Price**: Clear starting point
- **Add-on Costs**: Individual pricing
- **Discounts**: Package deals, early booking
- **Total Calculator**: Real-time sum
- **Tax Display**: Optional VAT/sales tax

## Package Configuration

### Tiered Packages

- **Bronze/Silver/Gold**: Clear differentiation
- **Feature Matrix**: What's included
- **Upgrade Paths**: Show additional cost
- **Comparisons**: Side-by-side view

### Customization

- **Base + Options**: Start with package, add extras
- **À la Carte**: Build from scratch
- **Time-based**: Hourly rate additions
- **Quantity-based**: Per guest/item pricing

## Payment Tracking

### Schedule Display

- **Deposit**: Amount and due date
- **Installments**: Payment plan options
- **Final Balance**: Due date clear
- **Visual Timeline**: Payment schedule

### Status Indicators

- **Not Due**: Future payments
- **Due Soon**: Upcoming (highlighted)
- **Overdue**: Red alert
- **Paid**: Confirmed with date
- **Refunded**: If applicable

## Visual Elements

### Price Formatting

- **Currency**: Proper symbol placement
- **Thousands**: Comma separation
- **Decimals**: .00 for clarity
- **Strike-through**: For discounts

### Urgency Indicators

- **Limited Availability**: "Only 2 left"
- **Early Bird**: "Save 10% before [date]"
- **Popular Choice**: "Most couples choose this"
- **Exclusive**: "Only for our couples"

## Calculation Logic

### Dynamic Pricing

- **Date-based**: Peak/off-season rates
- **Quantity Breaks**: Bulk discounts
- **Bundle Discounts**: Package savings
- **Conditional Pricing**: Based on other selections

### Constraints

- **Minimum Orders**: Required quantities
- **Maximum Limits**: Availability caps
- **Mutually Exclusive**: Can't select both
- **Required Combinations**: Must go together

## Information Collection

### Per Add-on

- **Specifications**: Size, color, details
- **Delivery Info**: When/where needed
- **Special Instructions**: Per item notes
- **Quantity Details**: Breakdown if needed

### Terms Acceptance

- **Service Terms**: Per add-on T&Cs
- **Cancellation Policy**: Clear statement
- **Deposit Terms**: Non-refundable notice
- **Timestamp**: Legal record

## Summary Generation

### Client View

- **Selected Services**: Clear list
- **Total Cost**: With breakdown
- **Payment Schedule**: What's due when
- **Next Steps**: What happens after selection

### Supplier View

- **Order Summary**: All selections
- **Client Details**: Contact info
- **Special Requests**: Any modifications
- **Internal Notes**: Fulfillment details

## Mobile Optimization

- **Touch-Friendly**: Large tap targets
- **Swipe Selection**: For browsing options
- **Collapsed View**: Expandable sections
- **Quick Calculate**: Instant totals

## Export Options

- **PDF Quote**: Professional document
- **Email Summary**: Send to couple
- **Spreadsheet**: For accounting
- **Integration**: To invoicing system