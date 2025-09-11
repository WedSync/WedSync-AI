/**
 * UI Migration Component Tests
 * Validates Untitled UI components maintain functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import { 
  Button, 
  WeddingButton, 
  VendorButton 
} from '@/components/ui/button-untitled'

import { 
  Input, 
  WeddingInput, 
  Label, 
  HelperText 
} from '@/components/ui/input-untitled'

import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  VendorCard 
} from '@/components/ui/card-untitled'

describe('Button Component Migration', () => {
  it('renders all wedding variants correctly', () => {
    const variants = [
      'wedding', 'elegant', 'romantic', 'luxury',
      'photographer', 'venue', 'florist', 'caterer'
    ] as const
    
    variants.forEach(variant => {
      const { container } = render(
        <Button variant={variant}>Test {variant}</Button>
      )
      expect(container.firstChild).toHaveClass(expect.stringContaining(variant))
    })
  })
  
  it('handles loading state properly', async () => {
    render(
      <Button loading loadingText="Saving...">
        Save
      </Button>
    )
    
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })
  
  it('maintains touch target size on mobile', () => {
    const { container } = render(
      <Button size="xs" onTouchStart={() => {}}>
        Touch Me
      </Button>
    )
    
    const button = container.querySelector('button')
    expect(button).toHaveClass(expect.stringContaining('touch'))
  })
  
  it('supports left and right icons', () => {
    const LeftIcon = () => <span data-testid="left-icon">←</span>
    const RightIcon = () => <span data-testid="right-icon">→</span>
    
    render(
      <Button leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
        Icon Button
      </Button>
    )
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })
  
  it('wedding button preset works correctly', () => {
    const { container } = render(
      <WeddingButton size="lg">
        Book Your Wedding
      </WeddingButton>
    )
    
    expect(container.firstChild).toHaveClass(expect.stringContaining('wedding'))
  })
})

describe('Input Component Migration', () => {
  it('renders with label and helper text', () => {
    render(
      <Input
        label="Couple Names"
        helperText="Enter both names"
        placeholder="Jane & John"
      />
    )
    
    expect(screen.getByLabelText('Couple Names')).toBeInTheDocument()
    expect(screen.getByText('Enter both names')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jane & John')).toBeInTheDocument()
  })
  
  it('shows error state correctly', () => {
    render(
      <Input
        label="Email"
        error="Please enter a valid email"
        defaultValue="invalid"
      />
    )
    
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email')
  })
  
  it('handles required fields', () => {
    render(
      <Input
        label="Wedding Date"
        required
      />
    )
    
    expect(screen.getByLabelText(/required/i)).toBeInTheDocument()
    const input = screen.getByLabelText('Wedding Date *')
    expect(input).toHaveAttribute('aria-required', 'true')
  })
  
  it('supports left and right icons', () => {
    const LeftIcon = () => <span data-testid="email-icon">@</span>
    const RightIcon = () => <span data-testid="check-icon">✓</span>
    
    render(
      <Input
        leftIcon={<LeftIcon />}
        rightIcon={<RightIcon />}
        defaultValue="test@example.com"
      />
    )
    
    expect(screen.getByTestId('email-icon')).toBeInTheDocument()
    expect(screen.getByTestId('check-icon')).toBeInTheDocument()
  })
  
  it('wedding input variant applies correct styles', () => {
    const { container } = render(
      <WeddingInput label="Venue Name" />
    )
    
    const input = container.querySelector('input')
    expect(input).toHaveClass(expect.stringContaining('rose'))
  })
})

describe('Card Component Migration', () => {
  it('renders with all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Wedding Venue</CardTitle>
        </CardHeader>
        <CardContent>
          Beautiful garden setting
        </CardContent>
      </Card>
    )
    
    expect(screen.getByText('Wedding Venue')).toBeInTheDocument()
    expect(screen.getByText('Beautiful garden setting')).toBeInTheDocument()
  })
  
  it('interactive variant responds to hover', async () => {
    const { container } = render(
      <Card variant="wedding" interactive>
        Interactive Card
      </Card>
    )
    
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass(expect.stringContaining('cursor-pointer'))
    expect(card).toHaveClass(expect.stringContaining('hover:shadow-lg'))
  })
  
  it('VendorCard displays vendor information correctly', () => {
    render(
      <VendorCard
        vendorType="photographer"
        vendorName="Elegant Moments"
        vendorDescription="Capturing your special day"
        rating={4.8}
        imageUrl="/photographer.jpg"
      >
        <p>10 years experience</p>
      </VendorCard>
    )
    
    expect(screen.getByText('Elegant Moments')).toBeInTheDocument()
    expect(screen.getByText('Capturing your special day')).toBeInTheDocument()
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText('10 years experience')).toBeInTheDocument()
    
    const img = screen.getByAltText('Elegant Moments')
    expect(img).toHaveAttribute('src', '/photographer.jpg')
  })
  
  it('applies correct vendor-specific styling', () => {
    const vendorTypes = ['photographer', 'venue', 'florist', 'caterer'] as const
    
    vendorTypes.forEach(type => {
      const { container } = render(
        <VendorCard
          vendorType={type}
          vendorName={`Test ${type}`}
        />
      )
      
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass(expect.stringContaining(
        type === 'photographer' ? 'blue' :
        type === 'venue' ? 'emerald' :
        type === 'florist' ? 'pink' : 'orange'
      ))
    })
  })
})

describe('Accessibility Compliance', () => {
  it('buttons have proper ARIA attributes', () => {
    render(
      <Button loading disabled>
        Submit Form
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })
  
  it('inputs have proper label associations', () => {
    render(
      <Input
        label="Guest Count"
        helperText="Total number of guests"
        error="Must be a number"
      />
    )
    
    const input = screen.getByLabelText('Guest Count')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('error'))
  })
  
  it('required fields are properly marked', () => {
    render(
      <Input
        label="Wedding Date"
        required
      />
    )
    
    const input = screen.getByLabelText('Wedding Date *')
    expect(input).toHaveAttribute('aria-required', 'true')
  })
  
  it('focus management works correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <>
        <Button>First</Button>
        <Button>Second</Button>
        <Button disabled>Third</Button>
        <Button>Fourth</Button>
      </>
    )
    
    const buttons = screen.getAllByRole('button')
    
    // Tab through buttons
    await user.tab()
    expect(buttons[0]).toHaveFocus()
    
    await user.tab()
    expect(buttons[1]).toHaveFocus()
    
    await user.tab()
    // Should skip disabled button
    expect(buttons[3]).toHaveFocus()
  })
})

describe('Performance Considerations', () => {
  it('lazy loads heavy components', async () => {
    // Mock dynamic import
    const LazyVendorCard = React.lazy(() => 
      Promise.resolve({ 
        default: VendorCard as React.ComponentType<any> 
      })
    )
    
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <LazyVendorCard
          vendorType="venue"
          vendorName="Test Venue"
        />
      </React.Suspense>
    )
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Test Venue')).toBeInTheDocument()
    })
  })
  
  it('memoizes expensive renders', () => {
    const ExpensiveButton = React.memo(Button)
    let renderCount = 0
    
    const TestComponent = ({ count }: { count: number }) => {
      renderCount++
      return (
        <ExpensiveButton variant="wedding">
          Render {count}
        </ExpensiveButton>
      )
    }
    
    const { rerender } = render(<TestComponent count={1} />)
    expect(renderCount).toBe(1)
    
    // Re-render with same props - should not trigger render
    rerender(<TestComponent count={1} />)
    expect(renderCount).toBe(1)
    
    // Re-render with different props - should trigger render
    rerender(<TestComponent count={2} />)
    expect(renderCount).toBe(2)
  })
})