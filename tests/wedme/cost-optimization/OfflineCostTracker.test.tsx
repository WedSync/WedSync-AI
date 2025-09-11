import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import OfflineCostTracker from '../../../src/components/wedme/cost-optimization/OfflineCostTracker';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock vibrate API
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

describe('OfflineCostTracker', () => {
  const mockOnSyncComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders online status correctly', () => {
    render(
      <OfflineCostTracker 
        weddingId="test-wedding"
        onSyncComplete={mockOnSyncComplete}
      />
    );
    
    expect(screen.getByText(/Online/)).toBeInTheDocument();
  });

  it('switches to offline mode when network goes down', async () => {
    render(
      <OfflineCostTracker weddingId="test-wedding" />
    );
    
    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    
    fireEvent(window, new Event('offline'));
    
    await waitFor(() => {
      expect(screen.getByText(/Offline Mode/)).toBeInTheDocument();
    });
  });

  it('adds new cost entry when online', async () => {
    render(
      <OfflineCostTracker weddingId="test-wedding" />
    );
    
    // Fill in the form
    const amountInput = screen.getByPlaceholderText(/0.00/);
    const descriptionInput = screen.getByPlaceholderText(/What was this cost for/);
    const categorySelect = screen.getByDisplayValue(/Venue/);
    
    fireEvent.change(amountInput, { target: { value: '250.00' } });
    fireEvent.change(descriptionInput, { target: { value: 'Venue deposit' } });
    fireEvent.change(categorySelect, { target: { value: 'venue' } });
    
    // Submit the form
    const addButton = screen.getByText(/Add Entry/);
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(navigator.vibrate).toHaveBeenCalledWith([50]);
    });
  });

  it('adds entries to pending when offline', async () => {
    // Set offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    
    render(
      <OfflineCostTracker weddingId="test-wedding" />
    );
    
    // Add entry while offline
    const amountInput = screen.getByPlaceholderText(/0.00/);
    const descriptionInput = screen.getByPlaceholderText(/What was this cost for/);
    
    fireEvent.change(amountInput, { target: { value: '150.00' } });
    fireEvent.change(descriptionInput, { target: { value: 'Offline expense' } });
    
    const addButton = screen.getByText(/Add Entry \(Offline\)/);
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText(/1 entries pending sync/)).toBeInTheDocument();
    });
  });

  it('displays pending entries with sync alert', () => {
    // Mock localStorage with pending entries
    localStorageMock.getItem.mockImplementation((key) => {
      if (key.includes('pending-entries')) {
        return JSON.stringify([{
          id: 'pending-1',
          amount: 100,
          description: 'Test expense',
          category: 'venue',
          timestamp: new Date().toISOString(),
          synced: false
        }]);
      }
      return null;
    });
    
    render(
      <OfflineCostTracker weddingId="test-wedding" />
    );
    
    expect(screen.getByText(/1 entries pending sync/)).toBeInTheDocument();
    expect(screen.getByText(/£100.00/)).toBeInTheDocument();
  });

  it('syncs pending entries when online', async () => {
    // Mock pending entries
    localStorageMock.getItem.mockImplementation((key) => {
      if (key.includes('pending-entries')) {
        return JSON.stringify([{
          id: 'pending-1',
          amount: 100,
          description: 'Test expense',
          category: 'venue',
          timestamp: new Date().toISOString(),
          synced: false
        }]);
      }
      return null;
    });
    
    render(
      <OfflineCostTracker 
        weddingId="test-wedding"
        onSyncComplete={mockOnSyncComplete}
      />
    );
    
    // Click sync button
    const syncButton = screen.getByText(/Sync 1 Entries/);
    fireEvent.click(syncButton);
    
    // Should show syncing state
    expect(screen.getByText(/Syncing.../)).toBeInTheDocument();
    
    // Wait for sync to complete
    await waitFor(() => {
      expect(mockOnSyncComplete).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pending-entries-test-wedding');
    }, { timeout: 3000 });
  });

  it('auto-syncs when coming back online', async () => {
    // Start offline with pending entries
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key.includes('pending-entries')) {
        return JSON.stringify([{
          id: 'pending-1',
          amount: 100,
          description: 'Test expense',
          category: 'venue',
          timestamp: new Date().toISOString(),
          synced: false
        }]);
      }
      return null;
    });
    
    const { rerender } = render(
      <OfflineCostTracker 
        weddingId="test-wedding"
        onSyncComplete={mockOnSyncComplete}
      />
    );
    
    // Go back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    
    fireEvent(window, new Event('online'));
    
    // Should auto-trigger sync
    await waitFor(() => {
      expect(mockOnSyncComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('removes entries from pending and synced lists', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key.includes('pending-entries')) {
        return JSON.stringify([{
          id: 'pending-1',
          amount: 100,
          description: 'Test expense',
          category: 'venue',
          timestamp: new Date().toISOString(),
          synced: false
        }]);
      }
      return null;
    });
    
    render(
      <OfflineCostTracker weddingId="test-wedding" />
    );
    
    // Find and click remove button
    const removeButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/Test expense/)).not.toBeInTheDocument();
    });
  });

  it('displays storage usage information', () => {
    render(
      <OfflineCostTracker weddingId="test-wedding" />
    );
    
    expect(screen.getByText(/Storage Used:/)).toBeInTheDocument();
  });

  it('shows last sync timestamp', () => {
    const lastSyncTime = new Date().toISOString();
    localStorageMock.getItem.mockImplementation((key) => {
      if (key.includes('last-sync')) {
        return lastSyncTime;
      }
      return null;
    });
    
    render(
      <OfflineCostTracker weddingId="test-wedding" />
    );
    
    expect(screen.getByText(/Last Sync:/)).toBeInTheDocument();
  });

  it('validates form inputs before allowing submission', () => {
    render(
      <OfflineCostTracker weddingId="test-wedding" />
    );
    
    const addButton = screen.getByText(/Add Entry/);
    expect(addButton).toBeDisabled();
    
    // Fill only amount
    const amountInput = screen.getByPlaceholderText(/0.00/);
    fireEvent.change(amountInput, { target: { value: '100' } });
    
    expect(addButton).toBeDisabled();
    
    // Fill description too
    const descriptionInput = screen.getByPlaceholderText(/What was this cost for/);
    fireEvent.change(descriptionInput, { target: { value: 'Test expense' } });
    
    expect(addButton).not.toBeDisabled();
  });

  it('displays summary totals correctly', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key.includes('cost-entries')) {
        return JSON.stringify([{
          id: 'synced-1',
          amount: 200,
          description: 'Synced expense',
          category: 'venue',
          timestamp: new Date().toISOString(),
          synced: true
        }]);
      }
      if (key.includes('pending-entries')) {
        return JSON.stringify([{
          id: 'pending-1',
          amount: 100,
          description: 'Pending expense',
          category: 'venue',
          timestamp: new Date().toISOString(),
          synced: false
        }]);
      }
      return null;
    });
    
    render(
      <OfflineCostTracker weddingId="test-wedding" />
    );
    
    expect(screen.getByText(/£200.00/)).toBeInTheDocument(); // Total Synced
    expect(screen.getByText(/£100.00/)).toBeInTheDocument(); // Pending Sync
  });
});