// Web Worker for heavy search operations
// This worker handles complex search, filtering, and sorting operations off the main thread

// Search algorithms and utilities
const searchUtils = {
  // Fuzzy search implementation using Levenshtein distance
  levenshteinDistance: (str1, str2) => {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  },

  // Calculate fuzzy match score (0-1, higher is better)
  fuzzyScore: (query, text) => {
    if (!query || !text) return 0;
    
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Exact match gets highest score
    if (textLower === queryLower) return 1;
    
    // Prefix match gets high score
    if (textLower.startsWith(queryLower)) return 0.9;
    
    // Contains match gets medium score
    if (textLower.includes(queryLower)) return 0.7;
    
    // Fuzzy match for typos
    const distance = searchUtils.levenshteinDistance(queryLower, textLower);
    const maxLength = Math.max(queryLower.length, textLower.length);
    
    if (distance <= maxLength * 0.3) { // Allow up to 30% character differences
      return Math.max(0, 0.5 - (distance / maxLength));
    }
    
    return 0;
  },

  // Normalize text for search
  normalizeText: (text) => {
    if (typeof text !== 'string') return '';
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  },

  // Extract searchable text from guest object
  extractSearchableText: (guest) => {
    const searchableFields = [
      guest.first_name,
      guest.last_name,
      guest.email,
      guest.phone,
      guest.household_name,
      guest.plus_one_name,
      guest.notes
    ];
    
    return searchableFields
      .filter(field => field && typeof field === 'string')
      .map(field => searchUtils.normalizeText(field))
      .join(' ');
  }
};

// Sorting algorithms optimized for large datasets
const sortUtils = {
  // Quick sort implementation for better performance on large datasets
  quickSort: (arr, compareFunction) => {
    if (arr.length <= 1) return arr;
    
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = [];
    const right = [];
    const equal = [];
    
    for (let element of arr) {
      const comparison = compareFunction(element, pivot);
      if (comparison < 0) left.push(element);
      else if (comparison > 0) right.push(element);
      else equal.push(element);
    }
    
    return [
      ...sortUtils.quickSort(left, compareFunction),
      ...equal,
      ...sortUtils.quickSort(right, compareFunction)
    ];
  },

  // Generate comparison function for guest sorting
  createGuestComparator: (field, direction) => {
    const directionMultiplier = direction === 'asc' ? 1 : -1;
    
    return (a, b) => {
      let aValue = a[field];
      let bValue = b[field];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * directionMultiplier;
      }
      
      // Numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * directionMultiplier;
      }
      
      // Boolean comparison
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return (aValue === bValue ? 0 : aValue ? 1 : -1) * directionMultiplier;
      }
      
      // Fallback to string comparison
      return String(aValue).localeCompare(String(bValue)) * directionMultiplier;
    };
  }
};

// Filter utilities for advanced guest filtering
const filterUtils = {
  // Apply multiple filters to guest data
  applyFilters: (guests, filters) => {
    if (!filters || Object.keys(filters).length === 0) return guests;
    
    return guests.filter(guest => {
      for (const [filterKey, filterValue] of Object.entries(filters)) {
        if (!filterValue) continue;
        
        switch (filterKey) {
          case 'category':
            if (Array.isArray(filterValue) && !filterValue.includes(guest.category)) return false;
            if (typeof filterValue === 'string' && guest.category !== filterValue) return false;
            break;
            
          case 'rsvp_status':
            if (Array.isArray(filterValue) && !filterValue.includes(guest.rsvp_status)) return false;
            if (typeof filterValue === 'string' && guest.rsvp_status !== filterValue) return false;
            break;
            
          case 'side':
            if (Array.isArray(filterValue) && !filterValue.includes(guest.side)) return false;
            if (typeof filterValue === 'string' && guest.side !== filterValue) return false;
            break;
            
          case 'plus_one':
            if (typeof filterValue === 'boolean' && guest.plus_one !== filterValue) return false;
            break;
            
          case 'dietary_restrictions':
            if (typeof filterValue === 'boolean' && Boolean(guest.dietary_restrictions) !== filterValue) return false;
            break;
            
          case 'age_group':
            if (Array.isArray(filterValue) && !filterValue.includes(guest.age_group)) return false;
            break;
            
          case 'has_table':
            if (typeof filterValue === 'boolean') {
              const hasTable = Boolean(guest.table_number);
              if (hasTable !== filterValue) return false;
            }
            break;
        }
      }
      
      return true;
    });
  }
};

// Performance monitoring for worker operations
const performanceMonitor = {
  startTime: null,
  
  start: () => {
    performanceMonitor.startTime = performance.now();
  },
  
  end: (operation) => {
    if (performanceMonitor.startTime) {
      const duration = performance.now() - performanceMonitor.startTime;
      performanceMonitor.startTime = null;
      return duration;
    }
    return 0;
  }
};

// Main message handler
self.onmessage = function(event) {
  const { type, data, requestId } = event.data;
  
  try {
    performanceMonitor.start();
    let result;
    
    switch (type) {
      case 'SEARCH_GUESTS':
        result = searchGuests(data);
        break;
        
      case 'SORT_GUESTS':
        result = sortGuests(data);
        break;
        
      case 'FILTER_GUESTS':
        result = filterGuests(data);
        break;
        
      case 'SEARCH_AND_FILTER':
        result = searchAndFilter(data);
        break;
        
      case 'BULK_PROCESS':
        result = bulkProcess(data);
        break;
        
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
    
    const duration = performanceMonitor.end(type);
    
    // Send successful result
    self.postMessage({
      type: 'SUCCESS',
      requestId,
      result: {
        ...result,
        performanceMetrics: {
          operation: type,
          duration,
          itemsProcessed: Array.isArray(data.guests) ? data.guests.length : 0,
          timestamp: Date.now()
        }
      }
    });
    
  } catch (error) {
    // Send error result
    self.postMessage({
      type: 'ERROR',
      requestId,
      error: {
        message: error.message,
        operation: type,
        timestamp: Date.now()
      }
    });
  }
};

// Search guests with fuzzy matching
function searchGuests({ guests, query, options = {} }) {
  if (!query || !query.trim()) return { guests, totalResults: guests.length };
  
  const {
    fuzzySearch = true,
    minScore = 0.1,
    maxResults = 1000
  } = options;
  
  const results = [];
  const normalizedQuery = searchUtils.normalizeText(query);
  
  for (const guest of guests) {
    const searchableText = searchUtils.extractSearchableText(guest);
    let score = 0;
    
    if (fuzzySearch) {
      // Check each searchable field for the best match
      const fields = [
        guest.first_name,
        guest.last_name,
        guest.email,
        guest.household_name,
        `${guest.first_name} ${guest.last_name}`
      ].filter(Boolean);
      
      for (const field of fields) {
        const fieldScore = searchUtils.fuzzyScore(normalizedQuery, searchUtils.normalizeText(field));
        score = Math.max(score, fieldScore);
      }
    } else {
      // Exact contains search
      score = searchableText.includes(normalizedQuery) ? 1 : 0;
    }
    
    if (score >= minScore) {
      results.push({ ...guest, searchScore: score });
    }
  }
  
  // Sort by search score (highest first)
  results.sort((a, b) => b.searchScore - a.searchScore);
  
  // Limit results
  const limitedResults = results.slice(0, maxResults);
  
  return {
    guests: limitedResults,
    totalResults: results.length,
    hasMore: results.length > maxResults
  };
}

// Sort guests using optimized algorithms
function sortGuests({ guests, field, direction = 'asc' }) {
  const comparator = sortUtils.createGuestComparator(field, direction);
  const sortedGuests = sortUtils.quickSort([...guests], comparator);
  
  return {
    guests: sortedGuests,
    totalResults: sortedGuests.length
  };
}

// Filter guests with advanced criteria
function filterGuests({ guests, filters, options = {} }) {
  const filteredGuests = filterUtils.applyFilters(guests, filters);
  
  return {
    guests: filteredGuests,
    totalResults: filteredGuests.length,
    filtersApplied: Object.keys(filters).filter(key => filters[key])
  };
}

// Combined search, filter, and sort operation
function searchAndFilter({ guests, query, filters, sort, options = {} }) {
  let processedGuests = [...guests];
  const operations = [];
  
  // Apply filters first (most selective)
  if (filters && Object.keys(filters).length > 0) {
    processedGuests = filterUtils.applyFilters(processedGuests, filters);
    operations.push(`filtered (${processedGuests.length} results)`);
  }
  
  // Apply search
  if (query && query.trim()) {
    const searchResult = searchGuests({ guests: processedGuests, query, options });
    processedGuests = searchResult.guests;
    operations.push(`searched (${processedGuests.length} results)`);
  }
  
  // Apply sorting
  if (sort && sort.field) {
    const sortResult = sortGuests({ guests: processedGuests, ...sort });
    processedGuests = sortResult.guests;
    operations.push('sorted');
  }
  
  return {
    guests: processedGuests,
    totalResults: processedGuests.length,
    operations
  };
}

// Bulk processing operations
function bulkProcess({ guests, operations }) {
  let processedGuests = [...guests];
  const results = {};
  
  for (const operation of operations) {
    switch (operation.type) {
      case 'UPDATE_CATEGORY':
        processedGuests = processedGuests.map(guest =>
          operation.guestIds.includes(guest.id)
            ? { ...guest, category: operation.value }
            : guest
        );
        results.updated = (results.updated || 0) + operation.guestIds.length;
        break;
        
      case 'UPDATE_RSVP':
        processedGuests = processedGuests.map(guest =>
          operation.guestIds.includes(guest.id)
            ? { ...guest, rsvp_status: operation.value }
            : guest
        );
        results.updated = (results.updated || 0) + operation.guestIds.length;
        break;
        
      case 'ASSIGN_TABLES':
        let tableNumber = operation.startingTable || 1;
        const guestsPerTable = operation.guestsPerTable || 8;
        let currentTableCount = 0;
        
        processedGuests = processedGuests.map(guest => {
          if (operation.guestIds.includes(guest.id)) {
            if (currentTableCount >= guestsPerTable) {
              tableNumber++;
              currentTableCount = 0;
            }
            currentTableCount++;
            return { ...guest, table_number: tableNumber };
          }
          return guest;
        });
        results.tablesAssigned = tableNumber - (operation.startingTable || 1) + 1;
        break;
    }
  }
  
  return {
    guests: processedGuests,
    results,
    totalProcessed: guests.length
  };
}

// Initialize worker
console.log('Search Worker initialized - Ready for operations');