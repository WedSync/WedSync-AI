import { test, expect } from '@playwright/test';

test.describe('Travel Time Calculator', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Google Maps API
    await page.route('**/api/travel/**', (route) => {
      route.fulfill({ json: { success: true, data: {} } });
    });
    
    await page.route('**/api/places/**', (route) => {
      route.fulfill({ 
        json: { 
          success: true, 
          predictions: [
            {
              place_id: 'test-place-1',
              description: '123 Wedding Ave, City, State',
              structured_formatting: {
                main_text: '123 Wedding Ave',
                secondary_text: 'City, State'
              }
            }
          ] 
        } 
      });
    });

    await page.route('**/api/geocode/**', (route) => {
      route.fulfill({
        json: {
          success: true,
          results: [
            {
              place_id: 'test-place-1',
              formatted_address: '123 Wedding Ave, City, State',
              geometry: {
                location: { lat: 40.7128, lng: -74.0060 }
              }
            }
          ]
        }
      });
    });

    // Navigate to travel calculator page
    await page.goto('/travel-calculator');
  });

  test('displays travel calculator interface', async ({ page }) => {
    await expect(page.locator('h2:has-text("Travel Time Calculator")')).toBeVisible();
    await expect(page.locator('text=Calculate accurate travel times')).toBeVisible();
  });

  test('allows adding and removing stops', async ({ page }) => {
    // Check initial stops (start + destination)
    const initialStops = page.locator('[data-testid="route-stop"]');
    await expect(initialStops).toHaveCount(2);

    // Add a new stop
    await page.click('text=Add Stop');
    await expect(page.locator('[data-testid="route-stop"]')).toHaveCount(3);

    // Remove a stop (should have remove button on middle stops)
    const removeButtons = page.locator('[data-testid="remove-stop"]');
    if (await removeButtons.count() > 0) {
      await removeButtons.first().click();
      await expect(page.locator('[data-testid="route-stop"]')).toHaveCount(2);
    }
  });

  test('allows entering departure time', async ({ page }) => {
    const departureInput = page.locator('input[type="datetime-local"]');
    await expect(departureInput).toBeVisible();
    
    // Set departure time to 2 hours from now
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const timeString = futureTime.toISOString().slice(0, 16);
    
    await departureInput.fill(timeString);
    await expect(departureInput).toHaveValue(timeString);
  });

  test('allows configuring route options', async ({ page }) => {
    // Check route options are available
    await expect(page.locator('text=Route Options')).toBeVisible();
    
    // Toggle avoid tolls
    const avoidTollsCheckbox = page.locator('input[type="checkbox"]').first();
    await avoidTollsCheckbox.check();
    await expect(avoidTollsCheckbox).toBeChecked();
    
    // Select traffic model
    const trafficModelSelect = page.locator('select');
    await trafficModelSelect.selectOption('pessimistic');
    await expect(trafficModelSelect).toHaveValue('pessimistic');
  });

  test('performs location search and selection', async ({ page }) => {
    const locationInput = page.locator('input[placeholder*="Starting location"]').first();
    
    // Type in location input
    await locationInput.fill('123 Wedding');
    
    // Wait for suggestions to appear
    await expect(page.locator('text=123 Wedding Ave')).toBeVisible();
    
    // Click on suggestion
    await page.click('text=123 Wedding Ave');
    
    // Verify input is updated
    await expect(locationInput).toHaveValue('123 Wedding Ave, City, State');
  });

  test('calculates route when all requirements met', async ({ page }) => {
    // Mock successful route calculation
    await page.route('**/api/travel/calculate', (route) => {
      route.fulfill({
        json: {
          success: true,
          route: {
            id: 'test-route-123',
            name: 'Test Route',
            stops: [
              {
                id: 'start',
                location: { lat: 40.7128, lng: -74.0060 },
                name: 'Starting Location',
                type: 'pickup'
              },
              {
                id: 'end',
                location: { lat: 40.7589, lng: -73.9851 },
                name: 'Destination',
                type: 'destination'
              }
            ],
            segments: [
              {
                start: { lat: 40.7128, lng: -74.0060 },
                end: { lat: 40.7589, lng: -73.9851 },
                distance: 5000,
                duration: 900,
                durationInTraffic: 1200,
                traffic: {
                  currentDelay: 5,
                  expectedDelay: 5,
                  severity: 'moderate',
                  description: 'Moderate traffic conditions'
                },
                instructions: ['Head north', 'Turn right']
              }
            ],
            totalDistance: 5000,
            totalDuration: 900,
            totalDurationInTraffic: 1200,
            bufferTime: 10,
            createdAt: new Date().toISOString(),
            lastCalculated: new Date().toISOString()
          }
        }
      });
    });

    await page.route('**/api/travel/time', (route) => {
      route.fulfill({
        json: {
          success: true,
          travelTime: {
            routeId: 'test-route-123',
            departureTime: new Date().toISOString(),
            arrivalTime: new Date(Date.now() + 20 * 60000).toISOString(),
            totalTravelTime: 20,
            bufferTime: 10,
            confidence: 'high',
            warnings: []
          }
        }
      });
    });

    // Fill in location inputs
    const startInput = page.locator('input[placeholder*="Starting location"]');
    await startInput.fill('123 Start Ave');
    await page.click('text=123 Wedding Ave');

    const endInput = page.locator('input[placeholder*="Destination"]');
    await endInput.fill('456 End St');
    await page.click('text=123 Wedding Ave');

    // Click calculate
    await page.click('text=Calculate');
    
    // Wait for loading to complete
    await expect(page.locator('text=Calculating...')).not.toBeVisible({ timeout: 10000 });
    
    // Check results are displayed
    await expect(page.locator('text=Route Summary')).toBeVisible();
    await expect(page.locator('text=20m')).toBeVisible(); // Total time
    await expect(page.locator('text=Traffic Analysis')).toBeVisible();
  });

  test('handles route optimization', async ({ page }) => {
    // Mock optimization response
    await page.route('**/api/travel/optimize', (route) => {
      route.fulfill({
        json: {
          success: true,
          optimizedRoute: {
            id: 'optimized-route-123',
            name: 'Optimized Route',
            stops: [],
            segments: [],
            totalDistance: 4500,
            totalDuration: 800,
            totalDurationInTraffic: 1000,
            bufferTime: 8,
            createdAt: new Date().toISOString(),
            lastCalculated: new Date().toISOString()
          },
          alternatives: [],
          timeSaved: 5
        }
      });
    });

    // Add multiple stops first
    await page.click('text=Add Stop');
    await page.click('text=Add Stop');

    // Click optimize route
    await page.click('text=Optimize Route');
    
    // Should see optimization results
    await expect(page.locator('text=Route optimized!')).toBeVisible();
  });

  test('displays error messages appropriately', async ({ page }) => {
    // Mock API error
    await page.route('**/api/travel/calculate', (route) => {
      route.fulfill({
        status: 400,
        json: {
          error: 'Please set locations for all stops'
        }
      });
    });

    // Try to calculate without setting locations
    await page.click('text=Calculate');
    
    // Should show error message
    await expect(page.locator('text=Please set locations for all stops')).toBeVisible();
  });

  test('displays traffic analysis correctly', async ({ page }) => {
    // Set up successful route calculation with traffic data
    await page.route('**/api/travel/calculate', (route) => {
      route.fulfill({
        json: {
          success: true,
          route: {
            id: 'traffic-test-route',
            name: 'Traffic Test Route',
            stops: [],
            segments: [
              {
                traffic: {
                  severity: 'heavy',
                  currentDelay: 15,
                  description: 'Heavy traffic - significant delays expected'
                }
              },
              {
                traffic: {
                  severity: 'light',
                  currentDelay: 2,
                  description: 'Light traffic conditions'
                }
              }
            ],
            totalDistance: 10000,
            totalDuration: 1800,
            totalDurationInTraffic: 2400,
            bufferTime: 20,
            createdAt: new Date().toISOString(),
            lastCalculated: new Date().toISOString()
          }
        }
      });
    });

    // Set up locations and calculate
    await page.locator('input[placeholder*="Starting location"]').fill('Start Location');
    await page.click('text=123 Wedding Ave');
    
    await page.locator('input[placeholder*="Destination"]').fill('End Location');  
    await page.click('text=123 Wedding Ave');

    await page.click('text=Calculate');
    
    // Wait for results
    await expect(page.locator('text=Traffic Analysis')).toBeVisible();
    await expect(page.locator('text=Heavy Traffic Alert')).toBeVisible();
  });

  test('works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that interface is still functional
    await expect(page.locator('h2:has-text("Travel Time Calculator")')).toBeVisible();
    
    // Layout should stack vertically on mobile
    const gridLayout = page.locator('.grid.grid-cols-1.lg\\:grid-cols-2');
    await expect(gridLayout).toBeVisible();
    
    // Buttons should be appropriately sized
    await expect(page.locator('text=Calculate')).toBeVisible();
    await expect(page.locator('text=Add Stop')).toBeVisible();
  });

  test('supports keyboard navigation', async ({ page }) => {
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="datetime-local"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    // Should focus on first location input
    await expect(page.locator('input[placeholder*="Starting location"]').first()).toBeFocused();
    
    // Test enter key on calculate button
    await page.keyboard.press('Tab'); // Navigate to calculate button
    // Note: We'd need to ensure the button gets focus properly
  });
});

test.describe('Travel Calculator API Integration', () => {
  test('handles Google Maps API failures gracefully', async ({ page }) => {
    // Mock API failures
    await page.route('**/api/places/**', (route) => {
      route.fulfill({ status: 500, json: { error: 'API unavailable' } });
    });

    await page.route('**/api/geocode/**', (route) => {
      route.fulfill({ status: 500, json: { error: 'Geocoding failed' } });
    });

    await page.goto('/travel-calculator');
    
    // Try to search for a location
    const locationInput = page.locator('input[placeholder*="Starting location"]');
    await locationInput.fill('123 Test Street');
    
    // Should handle the error gracefully (no suggestions appear)
    await expect(page.locator('.suggestions')).not.toBeVisible();
  });

  test('caches route calculations appropriately', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/api/travel/calculate', (route) => {
      requestCount++;
      route.fulfill({
        json: {
          success: true,
          route: {
            id: `cached-route-${requestCount}`,
            name: 'Cached Route Test',
            stops: [],
            segments: [],
            totalDistance: 5000,
            totalDuration: 900,
            totalDurationInTraffic: 1200,
            bufferTime: 10,
            createdAt: new Date().toISOString(),
            lastCalculated: new Date().toISOString()
          }
        }
      });
    });

    await page.goto('/travel-calculator');
    
    // Set up identical route twice
    await page.locator('input[placeholder*="Starting location"]').fill('Same Start');
    await page.locator('input[placeholder*="Destination"]').fill('Same End');
    
    await page.click('text=Calculate');
    await page.waitForTimeout(500);
    
    await page.click('text=Calculate');
    
    // Should only make one request due to caching
    // Note: This test depends on the caching implementation
    expect(requestCount).toBe(1);
  });
});