import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormBuilder } from '@/components/forms/FormBuilder'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } }
      })
    }
  }))
}))

describe('FormBuilder Component', () => {
  const renderFormBuilder = (props = {}) => {
    return render(
      <DndProvider backend={HTML5Backend}>
        <FormBuilder {...props} />
      </DndProvider>
    )
  }

  describe('Field Management', () => {
    it('should render the form canvas', () => {
      renderFormBuilder()
      expect(screen.getByTestId('form-canvas')).toBeInTheDocument()
    })

    it('should show field palette', () => {
      renderFormBuilder()
      expect(screen.getByTestId('field-palette')).toBeInTheDocument()
      expect(screen.getByText('Text Field')).toBeInTheDocument()
      expect(screen.getByText('Email Field')).toBeInTheDocument()
      expect(screen.getByText('Date Picker')).toBeInTheDocument()
    })

    it('should allow dragging fields to canvas', async () => {
      renderFormBuilder()
      
      const textField = screen.getByText('Text Field')
      const canvas = screen.getByTestId('form-canvas')
      
      // Simulate drag and drop
      fireEvent.dragStart(textField)
      fireEvent.dragEnter(canvas)
      fireEvent.drop(canvas)
      
      await waitFor(() => {
        expect(screen.getByTestId('field-0')).toBeInTheDocument()
      })
    })

    it('should open field settings on click', async () => {
      renderFormBuilder()
      
      // Add a field first
      const textField = screen.getByText('Text Field')
      const canvas = screen.getByTestId('form-canvas')
      
      fireEvent.dragStart(textField)
      fireEvent.drop(canvas)
      
      await waitFor(() => {
        const field = screen.getByTestId('field-0')
        fireEvent.click(field)
        expect(screen.getByTestId('field-settings')).toBeInTheDocument()
      })
    })

    it('should update field label', async () => {
      renderFormBuilder()
      const user = userEvent.setup()
      
      // Add field and open settings
      const textField = screen.getByText('Text Field')
      const canvas = screen.getByTestId('form-canvas')
      
      fireEvent.dragStart(textField)
      fireEvent.drop(canvas)
      
      const field = await screen.findByTestId('field-0')
      fireEvent.click(field)
      
      const labelInput = screen.getByLabelText('Field Label')
      await user.clear(labelInput)
      await user.type(labelInput, 'Couple Names')
      
      expect(labelInput).toHaveValue('Couple Names')
    })
  })

  describe('Core Fields Integration', () => {
    it('should identify core fields', async () => {
      renderFormBuilder()
      
      // Add a wedding date field
      const dateField = screen.getByText('Date Picker')
      const canvas = screen.getByTestId('form-canvas')
      
      fireEvent.dragStart(dateField)
      fireEvent.drop(canvas)
      
      const field = await screen.findByTestId('field-0')
      fireEvent.click(field)
      
      // Set field key to wedding_date
      const keyInput = screen.getByLabelText('Field Key')
      await userEvent.clear(keyInput)
      await userEvent.type(keyInput, 'wedding_date')
      
      // Should show core field badge
      await waitFor(() => {
        expect(screen.getByTestId('core-field-badge')).toBeInTheDocument()
        expect(screen.getByText('Auto-fills from WedMe')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('should require at least one field', async () => {
      renderFormBuilder()
      
      const saveButton = screen.getByText('Save Form')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Form must have at least one field')).toBeInTheDocument()
      })
    })

    it('should validate field uniqueness', async () => {
      renderFormBuilder()
      
      // Add two fields with same key
      const textField = screen.getByText('Text Field')
      const canvas = screen.getByTestId('form-canvas')
      
      // Add first field
      fireEvent.dragStart(textField)
      fireEvent.drop(canvas)
      
      // Add second field
      fireEvent.dragStart(textField)
      fireEvent.drop(canvas)
      
      // Set both to same key
      const fields = await screen.findAllByTestId(/field-\d/)
      for (const field of fields) {
        fireEvent.click(field)
        const keyInput = screen.getByLabelText('Field Key')
        await userEvent.clear(keyInput)
        await userEvent.type(keyInput, 'duplicate_key')
      }
      
      const saveButton = screen.getByText('Save Form')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Field keys must be unique')).toBeInTheDocument()
      })
    })
  })
})