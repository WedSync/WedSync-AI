# WS-274 Mobile Optimization Framework - Team D Comprehensive Prompt
**Team D: Platform/WedMe Integration Specialists**

## 🎯 Your Mission: Seamless WedMe Mobile Experience Integration
You are the **Platform/WedMe specialists** responsible for integrating mobile optimization deep into the WedMe couple platform, ensuring a native-app-like experience that delights couples while driving viral growth. Your focus: **Lightning-fast PWA that couples actually want to use daily**.

## 💝 The Couple Mobile Experience Challenge
**Context**: Sarah and David are planning their wedding while both working full-time jobs. Sarah checks WedMe during her lunch break on her iPhone, David reviews vendor proposals on his Android during his commute, and they collaborate on decisions via the shared timeline in the evenings. **Your mobile optimization must make wedding planning feel effortless, not overwhelming - turning WedMe into their favorite app.**

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/apps/wedme/components/mobile/MobileTimelineView.tsx`** - Mobile-optimized timeline for couples
2. **`/src/apps/wedme/components/mobile/MobileVendorCards.tsx`** - Touch-friendly vendor browsing
3. **`/src/apps/wedme/components/mobile/MobilePlanningHub.tsx`** - Central mobile planning dashboard
4. **`/src/apps/wedme/components/mobile/MobilePhotoGallery.tsx`** - Fast photo viewing and sharing
5. **`/src/apps/wedme/components/mobile/MobileGuestManager.tsx`** - Mobile guest list management
6. **`/src/apps/wedme/components/mobile/MobileTaskTracker.tsx`** - Wedding task completion tracking
7. **`/src/apps/wedme/lib/mobile/pwa-manager.ts`** - PWA installation and updates
8. **`/src/apps/wedme/lib/mobile/offline-storage.ts`** - Offline data management for couples
9. **`/src/apps/wedme/lib/mobile/couple-sync.ts`** - Real-time couple collaboration
10. **`/src/apps/wedme/lib/mobile/wedding-reminders.ts`** - Smart mobile notifications
11. **`/src/apps/wedme/lib/mobile/share-wedding.ts`** - Wedding sharing optimization
12. **`/src/apps/wedme/lib/mobile/guest-communication.ts`** - Mobile guest messaging
13. **`/src/apps/wedme/hooks/useMobileWedding.ts`** - Core mobile wedding management hook
14. **`/src/apps/wedme/hooks/useCoupleSync.ts`** - Real-time couple collaboration hook
15. **`/src/apps/wedme/hooks/useWeddingProgress.ts`** - Wedding planning progress tracking

### 📱 Required PWA Files:
- **`/src/apps/wedme/public/manifest.json`** - PWA manifest optimized for wedding planning
- **`/src/apps/wedme/public/sw.js`** - Service worker for offline functionality
- **`/src/apps/wedme/lib/pwa/install-prompt.ts`** - Smart PWA installation prompts

### 🧪 Required Tests:
- **`/src/__tests__/wedme/mobile-timeline.test.tsx`**
- **`/src/__tests__/wedme/couple-collaboration.test.tsx`**
- **`/src/__tests__/wedme/pwa-functionality.test.tsx`**

## 🎨 WedMe Mobile User Experience Design

### Couple-Centric Mobile Interface
```typescript
// Design principles for WedMe mobile experience
interface WedMeMobileDesign {
  primaryColors: {
    wedding: '#F8D7DA',      // Soft pink for romance
    celebration: '#FFE5B4',  // Warm gold for joy
    planning: '#E3F2FD',     // Calm blue for organization
    urgent: '#FFEBEE'        // Gentle red for attention
  };
  
  touchTargets: {
    minimum: '48px',         // Apple HIG compliance
    preferred: '56px',       // Material Design recommendation
    critical: '64px'         // Important actions (save, confirm)
  };
  
  animations: {
    duration: {
      micro: 150,            // Button press feedback
      short: 300,            // Page transitions
      medium: 500,           // Complex animations
      celebration: 1200      // Wedding milestone celebrations
    },
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'; // Material Design standard
  };
}
```

### Mobile Timeline Experience
```typescript
// The heart of WedMe - mobile timeline that couples actually use
export const MobileTimelineView: React.FC = () => {
  const { wedding, updateTimeline, isLoading } = useMobileWedding();
  const { partner, isPartnerOnline } = useCoupleSync();
  const { progress, milestones } = useWeddingProgress();
  
  return (
    <div className="mobile-timeline-container">
      {/* Progress Header - Always visible */}
      <div className="timeline-progress-header sticky top-0 bg-white/95 backdrop-blur-sm">
        <div className="progress-ring">
          <CircularProgress 
            value={progress.overall} 
            size={80}
            thickness={6}
            color="primary"
          />
          <div className="progress-text">
            <span className="text-lg font-semibold">{progress.overall}%</span>
            <span className="text-sm text-gray-600">Complete</span>
          </div>
        </div>
        
        <div className="next-milestone">
          <span className="text-sm text-gray-600">Next milestone:</span>
          <span className="font-medium text-primary-600">{progress.nextMilestone}</span>
          <span className="text-sm text-gray-500">{progress.daysUntilMilestone} days</span>
        </div>
        
        {/* Partner presence indicator */}
        {isPartnerOnline && (
          <div className="partner-online">
            <div className="partner-avatar">
              <img src={partner.avatar} alt={partner.name} className="w-8 h-8 rounded-full" />
              <div className="online-indicator" />
            </div>
            <span className="text-sm text-gray-600">{partner.name} is viewing</span>
          </div>
        )}
      </div>
      
      {/* Timeline Items */}
      <div className="timeline-items space-y-4 p-4">
        {wedding.timelineEvents.map((event, index) => (
          <TimelineEventCard
            key={event.id}
            event={event}
            isNext={index === progress.currentEventIndex}
            onUpdate={(updates) => updateTimeline(event.id, updates)}
            canEdit={event.assignedTo === 'couple' || event.assignedTo === 'both'}
          />
        ))}
      </div>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4">
        <button 
          className="fab bg-primary-500 text-white rounded-full shadow-lg"
          onClick={() => openAddEventModal()}
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// Individual timeline event optimized for mobile
const TimelineEventCard: React.FC<TimelineEventProps> = ({ 
  event, 
  isNext, 
  onUpdate,
  canEdit 
}) => {
  const [isExpanded, setIsExpanded] = useState(isNext);
  const { celebrateCompletion } = useWeddingProgress();
  
  const handleComplete = async () => {
    await onUpdate({ status: 'completed', completedAt: new Date() });
    
    // Trigger celebration animation
    if (event.isMilestone) {
      celebrateCompletion(event.title);
    }
  };
  
  return (
    <motion.div 
      className={`timeline-card ${isNext ? 'next-event' : ''} ${event.status === 'completed' ? 'completed' : ''}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="card-header flex items-center justify-between">
        <div className="event-info">
          <h3 className="event-title text-lg font-semibold">{event.title}</h3>
          <p className="event-date text-sm text-gray-600">
            {format(event.dueDate, 'MMM dd, yyyy')}
          </p>
          {event.vendor && (
            <span className="vendor-tag bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {event.vendor.name}
            </span>
          )}
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="expand-button p-2 rounded-full hover:bg-gray-100"
        >
          <ChevronDownIcon 
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          />
        </button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="card-content overflow-hidden"
          >
            <p className="event-description text-gray-700 mb-4">{event.description}</p>
            
            {event.subtasks && event.subtasks.length > 0 && (
              <div className="subtasks space-y-2 mb-4">
                {event.subtasks.map((subtask) => (
                  <SubtaskItem 
                    key={subtask.id} 
                    subtask={subtask}
                    onToggle={(checked) => onUpdate({ 
                      subtasks: event.subtasks.map(s => 
                        s.id === subtask.id ? { ...s, completed: checked } : s
                      )
                    })}
                  />
                ))}
              </div>
            )}
            
            {canEdit && event.status !== 'completed' && (
              <div className="card-actions flex gap-2">
                <button 
                  onClick={handleComplete}
                  className="complete-button bg-green-500 text-white px-4 py-2 rounded-lg font-medium"
                  disabled={event.subtasks?.some(s => !s.completed)}
                >
                  Mark Complete
                </button>
                
                <button className="edit-button border border-gray-300 text-gray-700 px-4 py-2 rounded-lg">
                  Edit
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
```

### Mobile Vendor Discovery
```typescript
// Touch-optimized vendor browsing experience
export const MobileVendorCards: React.FC = () => {
  const { vendors, filters, applyFilter } = useVendorSearch();
  const { addToFavorites, favorites } = useWeddingFavorites();
  const [currentCategory, setCurrentCategory] = useState('all');
  
  return (
    <div className="mobile-vendor-discovery">
      {/* Category Filter Scrollable */}
      <div className="category-filter-scroll horizontal-scroll pb-4">
        <div className="flex gap-3 px-4">
          {VENDOR_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setCurrentCategory(category.id);
                applyFilter({ category: category.id });
              }}
              className={`category-chip whitespace-nowrap px-4 py-2 rounded-full font-medium transition-colors
                ${currentCategory === category.id 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Vendor Cards Grid */}
      <div className="vendor-cards-grid grid grid-cols-1 gap-4 px-4">
        {vendors.map((vendor) => (
          <VendorMobileCard
            key={vendor.id}
            vendor={vendor}
            isFavorite={favorites.includes(vendor.id)}
            onFavoriteToggle={() => addToFavorites(vendor.id)}
            onViewDetails={() => router.push(`/vendors/${vendor.id}`)}
            onQuickContact={() => initiateContact(vendor)}
          />
        ))}
      </div>
      
      {/* Load More with Intersection Observer */}
      <div ref={loadMoreRef} className="load-more-trigger h-20 flex items-center justify-center">
        {isLoadingMore && <Spinner size="sm" />}
      </div>
    </div>
  );
};

// Individual vendor card optimized for mobile interaction
const VendorMobileCard: React.FC<VendorCardProps> = ({ 
  vendor, 
  isFavorite,
  onFavoriteToggle,
  onViewDetails,
  onQuickContact 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <motion.div 
      className="vendor-card bg-white rounded-xl shadow-md overflow-hidden"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Hero Image with Lazy Loading */}
      <div className="card-image relative h-48 bg-gray-200">
        <Image
          src={vendor.heroImage}
          alt={`${vendor.name} - ${vendor.category}`}
          fill
          className={`object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Favorite Button */}
        <button 
          onClick={onFavoriteToggle}
          className="favorite-button absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm"
        >
          <HeartIcon 
            className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-600'}`} 
          />
        </button>
        
        {/* Price Badge */}
        {vendor.priceRange && (
          <div className="price-badge absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-sm">
            {vendor.priceRange}
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div className="card-content p-4">
        <div className="vendor-header mb-2">
          <h3 className="vendor-name text-lg font-semibold truncate">{vendor.name}</h3>
          <p className="vendor-category text-sm text-gray-600">{vendor.category}</p>
        </div>
        
        {/* Rating and Reviews */}
        <div className="rating-section flex items-center mb-3">
          <div className="stars flex mr-2">
            {Array.from({ length: 5 }, (_, i) => (
              <StarIcon
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(vendor.rating) 
                    ? 'text-yellow-400 fill-current' 
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="rating-text text-sm text-gray-600">
            {vendor.rating} ({vendor.reviewCount} reviews)
          </span>
        </div>
        
        {/* Location */}
        <div className="location-info flex items-center mb-3">
          <MapPinIcon className="w-4 h-4 text-gray-400 mr-1" />
          <span className="text-sm text-gray-600 truncate">{vendor.location}</span>
        </div>
        
        {/* Quick Info Tags */}
        <div className="info-tags flex flex-wrap gap-2 mb-4">
          {vendor.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
              {tag}
            </span>
          ))}
          {vendor.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{vendor.tags.length - 3} more</span>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="card-actions flex gap-2">
          <button 
            onClick={onViewDetails}
            className="view-details-button flex-1 border border-primary-500 text-primary-500 py-2 px-4 rounded-lg font-medium text-center"
          >
            View Details
          </button>
          
          <button 
            onClick={onQuickContact}
            className="quick-contact-button bg-primary-500 text-white py-2 px-4 rounded-lg font-medium"
          >
            Contact
          </button>
        </div>
      </div>
    </motion.div>
  );
};
```

### Mobile Guest Management
```typescript
// Touch-friendly guest management for couples
export const MobileGuestManager: React.FC = () => {
  const { guests, addGuest, updateGuest, removeGuest } = useGuestList();
  const { rsvpStats, dietaryRestrictions, specialRequests } = useRSVPData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RSVPStatus | 'all'>('all');
  
  const filteredGuests = useMemo(() => {
    return guests.filter(guest => {
      const matchesSearch = guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           guest.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || guest.rsvpStatus === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [guests, searchQuery, filterStatus]);
  
  return (
    <div className="mobile-guest-manager">
      {/* RSVP Stats Header */}
      <div className="rsvp-stats bg-gradient-to-r from-primary-50 to-secondary-50 p-4 rounded-lg mb-6">
        <div className="stats-grid grid grid-cols-3 gap-4 text-center">
          <div className="stat-item">
            <div className="stat-number text-2xl font-bold text-green-600">{rsvpStats.confirmed}</div>
            <div className="stat-label text-sm text-gray-600">Confirmed</div>
          </div>
          <div className="stat-item">
            <div className="stat-number text-2xl font-bold text-yellow-600">{rsvpStats.pending}</div>
            <div className="stat-label text-sm text-gray-600">Pending</div>
          </div>
          <div className="stat-item">
            <div className="stat-number text-2xl font-bold text-red-600">{rsvpStats.declined}</div>
            <div className="stat-label text-sm text-gray-600">Declined</div>
          </div>
        </div>
        
        <div className="progress-bar mt-4">
          <div className="progress-bg bg-gray-200 rounded-full h-2">
            <div 
              className="progress-fill bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(rsvpStats.confirmed / guests.length) * 100}%` }}
            />
          </div>
          <div className="progress-text text-center mt-2 text-sm text-gray-600">
            {Math.round((rsvpStats.confirmed / guests.length) * 100)}% confirmed
          </div>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="search-filter-section mb-4">
        <div className="search-bar relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search guests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div className="filter-buttons flex gap-2 overflow-x-auto pb-2">
          {(['all', 'confirmed', 'pending', 'declined'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`filter-chip whitespace-nowrap px-4 py-2 rounded-full font-medium transition-colors
                ${filterStatus === status 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-100 text-gray-700'
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                  {rsvpStats[status as keyof typeof rsvpStats]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Guest List */}
      <div className="guest-list space-y-3">
        <AnimatePresence>
          {filteredGuests.map((guest) => (
            <MobileGuestCard
              key={guest.id}
              guest={guest}
              onUpdate={(updates) => updateGuest(guest.id, updates)}
              onRemove={() => removeGuest(guest.id)}
            />
          ))}
        </AnimatePresence>
        
        {filteredGuests.length === 0 && (
          <div className="empty-state text-center py-12">
            <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No guests found</p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-primary-500 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Add Guest FAB */}
      <div className="fixed bottom-20 right-4">
        <button 
          onClick={() => openAddGuestModal()}
          className="fab bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors"
        >
          <UserPlusIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// Individual guest card with swipe actions
const MobileGuestCard: React.FC<GuestCardProps> = ({ guest, onUpdate, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { sendRSVPReminder, canSendReminder } = useRSVPReminders();
  
  return (
    <motion.div
      className="guest-card bg-white rounded-lg shadow-sm border border-gray-200"
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="card-main p-4">
        <div className="guest-header flex items-center justify-between">
          <div className="guest-info flex items-center">
            <div className="guest-avatar">
              {guest.avatar ? (
                <img src={guest.avatar} alt={guest.name} className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-gray-600" />
                </div>
              )}
            </div>
            
            <div className="guest-details ml-3">
              <h3 className="guest-name font-semibold text-gray-900">{guest.name}</h3>
              <p className="guest-email text-sm text-gray-600">{guest.email}</p>
              {guest.phone && (
                <p className="guest-phone text-sm text-gray-600">{guest.phone}</p>
              )}
            </div>
          </div>
          
          <div className="guest-status">
            <RSVPStatusBadge status={guest.rsvpStatus} />
          </div>
        </div>
        
        <div className="guest-actions mt-4 flex gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="action-button flex-1 border border-gray-300 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium"
          >
            {isExpanded ? 'Less Info' : 'More Info'}
          </button>
          
          {canSendReminder(guest.id) && guest.rsvpStatus === 'pending' && (
            <button 
              onClick={() => sendRSVPReminder(guest.id)}
              className="action-button bg-blue-50 text-blue-600 border border-blue-200 py-2 px-3 rounded-lg text-sm font-medium"
            >
              Send Reminder
            </button>
          )}
          
          <button 
            onClick={() => initiateContact(guest)}
            className="action-button bg-primary-50 text-primary-600 border border-primary-200 py-2 px-3 rounded-lg text-sm font-medium"
          >
            Contact
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="guest-details-expanded border-t border-gray-200 p-4 bg-gray-50"
          >
            <div className="details-grid space-y-3">
              <div className="detail-item">
                <label className="detail-label text-sm font-medium text-gray-700">Relationship</label>
                <p className="detail-value text-sm text-gray-900">{guest.relationship || 'Not specified'}</p>
              </div>
              
              {guest.dietaryRestrictions && (
                <div className="detail-item">
                  <label className="detail-label text-sm font-medium text-gray-700">Dietary Restrictions</label>
                  <p className="detail-value text-sm text-gray-900">{guest.dietaryRestrictions}</p>
                </div>
              )}
              
              {guest.specialRequests && (
                <div className="detail-item">
                  <label className="detail-label text-sm font-medium text-gray-700">Special Requests</label>
                  <p className="detail-value text-sm text-gray-900">{guest.specialRequests}</p>
                </div>
              )}
              
              <div className="detail-item">
                <label className="detail-label text-sm font-medium text-gray-700">Plus One</label>
                <p className="detail-value text-sm text-gray-900">
                  {guest.allowsPlusOne ? 'Allowed' : 'Not allowed'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
```

## 📱 Progressive Web App (PWA) Implementation

### PWA Configuration
```json
// /src/apps/wedme/public/manifest.json
{
  "name": "WedMe - Your Wedding Planner",
  "short_name": "WedMe",
  "description": "The complete mobile wedding planning experience for couples",
  "start_url": "/wedme/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#F472B6",
  "background_color": "#FFFFFF",
  "categories": ["lifestyle", "productivity", "social"],
  "lang": "en-US",
  "scope": "/wedme/",
  
  "icons": [
    {
      "src": "/icons/wedme-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/wedme-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/wedme-apple-touch.png",
      "sizes": "180x180",
      "type": "image/png",
      "purpose": "apple-touch-icon"
    }
  ],
  
  "shortcuts": [
    {
      "name": "Wedding Timeline",
      "short_name": "Timeline",
      "url": "/wedme/timeline",
      "description": "View your wedding timeline and progress",
      "icons": [
        {
          "src": "/icons/shortcuts/timeline-96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Find Vendors",
      "short_name": "Vendors",
      "url": "/wedme/vendors",
      "description": "Discover and connect with wedding vendors",
      "icons": [
        {
          "src": "/icons/shortcuts/vendors-96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Guest List",
      "short_name": "Guests",
      "url": "/wedme/guests",
      "description": "Manage your wedding guest list and RSVPs",
      "icons": [
        {
          "src": "/icons/shortcuts/guests-96.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    }
  ],
  
  "related_applications": [
    {
      "platform": "webapp",
      "url": "https://wedsync.com/wedme/manifest.json"
    }
  ],
  
  "prefer_related_applications": false
}
```

### Service Worker for Offline Functionality
```typescript
// /src/apps/wedme/public/sw.js - Service Worker for offline wedding planning
const CACHE_NAME = 'wedme-v1.0.0';
const CRITICAL_RESOURCES = [
  '/wedme/',
  '/wedme/timeline',
  '/wedme/vendors',
  '/wedme/guests',
  '/wedme/static/js/bundle.js',
  '/wedme/static/css/main.css',
  '/icons/wedme-192.png',
  '/icons/wedme-512.png'
];

const API_CACHE_NAME = 'wedme-api-v1.0.0';
const CRITICAL_APIS = [
  '/api/wedme/wedding/current',
  '/api/wedme/timeline/events',
  '/api/wedme/guests/list',
  '/api/wedme/vendors/favorites'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(CRITICAL_RESOURCES)),
      caches.open(API_CACHE_NAME)
    ]).then(() => {
      console.log('WedMe PWA: Critical resources cached');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('WedMe PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('WedMe PWA: Service worker activated');
      self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/wedme/')) {
    event.respondWith(networkFirstWithFallback(request));
  }
  // Handle static assets with cache-first strategy
  else if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheFirstWithRefresh(request));
  }
  // Handle navigation requests with network-first, cache fallback
  else if (request.mode === 'navigate') {
    event.respondWith(navigationWithFallback(request));
  }
  // Default: network-first
  else {
    event.respondWith(networkFirst(request));
  }
});

// Network-first strategy with offline fallback
async function networkFirstWithFallback(request) {
  const apiCache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      apiCache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('WedMe PWA: Network failed, trying cache for:', request.url);
    
    // Try cache
    const cachedResponse = await apiCache.match(request);
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'sw-cache');
      return response;
    }
    
    // Return offline fallback
    return createOfflineFallback(request);
  }
}

// Cache-first with background refresh
async function cacheFirstWithRefresh(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Serve from cache immediately
    // Update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response);
      }
    }).catch(() => {
      console.log('WedMe PWA: Background refresh failed for:', request.url);
    });
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('WedMe PWA: Network and cache miss for:', request.url);
    return new Response('Resource not available offline', { status: 503 });
  }
}

// Navigation with offline page fallback
async function navigationWithFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedPage = await cache.match('/wedme/offline.html');
    return cachedPage || new Response('Offline', { status: 503 });
  }
}

// Create offline fallback response
function createOfflineFallback(request) {
  const url = new URL(request.url);
  
  if (url.pathname.includes('/api/wedme/timeline')) {
    return new Response(JSON.stringify({
      offline: true,
      message: 'Timeline data not available offline',
      cachedAt: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Served-By': 'sw-offline-fallback'
      }
    });
  }
  
  return new Response('Content not available offline', { 
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Background sync for queued actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'wedding-data-sync') {
    event.waitUntil(syncWeddingData());
  }
});

async function syncWeddingData() {
  // Get queued actions from IndexedDB
  const queuedActions = await getQueuedActions();
  
  for (const action of queuedActions) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
      
      // Remove from queue on success
      await removeFromQueue(action.id);
      
    } catch (error) {
      console.log('WedMe PWA: Failed to sync action:', action.id);
      // Keep in queue for next sync attempt
    }
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body,
    icon: '/icons/wedme-192.png',
    badge: '/icons/wedme-badge.png',
    tag: data.tag || 'wedding-notification',
    renotify: true,
    requireInteraction: data.urgent || false,
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/actions/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/actions/dismiss.png'
      }
    ],
    data: {
      url: data.url || '/wedme/',
      weddingId: data.weddingId
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'WedMe Update', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default click action
    event.waitUntil(
      clients.openWindow('/wedme/')
    );
  }
});
```

### PWA Installation Manager
```typescript
// Smart PWA installation prompts
export class PWAInstallationManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstallable = false;
  
  constructor() {
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.isInstallable = true;
      
      // Show custom install prompt after user engagement
      this.scheduleInstallPrompt();
    });
    
    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      console.log('WedMe PWA installed successfully');
      this.trackInstallation();
      this.isInstallable = false;
    });
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.handleInstalledApp();
    }
  }
  
  private scheduleInstallPrompt() {
    // Show prompt after meaningful engagement
    const engagementTriggers = [
      () => this.hasViewedMultiplePages(),
      () => this.hasSpentTimeOnSite(300000), // 5 minutes
      () => this.hasUsedKeyFeatures(),
      () => this.hasReturnedToSite()
    ];
    
    // Check triggers periodically
    const checkInterval = setInterval(() => {
      const shouldShowPrompt = engagementTriggers.some(trigger => trigger());
      
      if (shouldShowPrompt && this.isInstallable) {
        this.showCustomInstallPrompt();
        clearInterval(checkInterval);
      }
    }, 30000); // Check every 30 seconds
  }
  
  private async showCustomInstallPrompt() {
    // Create beautiful custom install prompt
    const installModal = document.createElement('div');
    installModal.className = 'pwa-install-modal';
    installModal.innerHTML = `
      <div class="install-modal-backdrop">
        <div class="install-modal-content">
          <div class="install-modal-header">
            <img src="/icons/wedme-192.png" alt="WedMe" class="install-icon" />
            <h3>Install WedMe</h3>
            <button class="install-close-button" type="button">×</button>
          </div>
          
          <div class="install-modal-body">
            <p>Get quick access to your wedding planning right from your home screen!</p>
            
            <div class="install-benefits">
              <div class="benefit">
                <span class="benefit-icon">⚡</span>
                <span>Lightning fast access</span>
              </div>
              <div class="benefit">
                <span class="benefit-icon">📱</span>
                <span>Works offline</span>
              </div>
              <div class="benefit">
                <span class="benefit-icon">🔔</span>
                <span>Get wedding reminders</span>
              </div>
            </div>
          </div>
          
          <div class="install-modal-actions">
            <button class="install-button-primary" type="button">
              Install WedMe
            </button>
            <button class="install-button-secondary" type="button">
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(installModal);
    
    // Add event listeners
    const installButton = installModal.querySelector('.install-button-primary');
    const laterButton = installModal.querySelector('.install-button-secondary');
    const closeButton = installModal.querySelector('.install-close-button');
    
    installButton?.addEventListener('click', () => {
      this.triggerInstallation();
      this.removeModal(installModal);
    });
    
    [laterButton, closeButton].forEach(button => {
      button?.addEventListener('click', () => {
        this.removeModal(installModal);
        // Don't show again for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      });
    });
    
    // Auto-close after 30 seconds
    setTimeout(() => {
      if (document.body.contains(installModal)) {
        this.removeModal(installModal);
      }
    }, 30000);
  }
  
  private async triggerInstallation() {
    if (!this.deferredPrompt) return;
    
    try {
      const result = await this.deferredPrompt.prompt();
      console.log('Install prompt result:', result.outcome);
      
      if (result.outcome === 'accepted') {
        this.trackInstallAccepted();
      } else {
        this.trackInstallDismissed();
      }
      
    } catch (error) {
      console.error('Install prompt error:', error);
    } finally {
      this.deferredPrompt = null;
      this.isInstallable = false;
    }
  }
  
  private hasViewedMultiplePages(): boolean {
    const viewedPages = JSON.parse(localStorage.getItem('pwa-viewed-pages') || '[]');
    return viewedPages.length >= 3;
  }
  
  private hasSpentTimeOnSite(minimumTime: number): boolean {
    const timeSpent = parseInt(localStorage.getItem('pwa-time-spent') || '0');
    return timeSpent >= minimumTime;
  }
  
  private hasUsedKeyFeatures(): boolean {
    const usedFeatures = JSON.parse(localStorage.getItem('pwa-used-features') || '[]');
    const keyFeatures = ['timeline-view', 'vendor-contact', 'guest-management'];
    
    return keyFeatures.some(feature => usedFeatures.includes(feature));
  }
  
  private hasReturnedToSite(): boolean {
    const visits = parseInt(localStorage.getItem('pwa-visit-count') || '0');
    return visits >= 2;
  }
  
  private removeModal(modal: HTMLElement) {
    modal.classList.add('fade-out');
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 300);
  }
  
  private trackInstallation() {
    // Track successful installation
    analytics.track('pwa_installed', {
      source: 'custom_prompt',
      timestamp: new Date().toISOString()
    });
  }
  
  private trackInstallAccepted() {
    analytics.track('pwa_install_accepted', {
      prompt_type: 'custom',
      timestamp: new Date().toISOString()
    });
  }
  
  private trackInstallDismissed() {
    analytics.track('pwa_install_dismissed', {
      prompt_type: 'custom',
      timestamp: new Date().toISOString()
    });
  }
  
  private handleInstalledApp() {
    // App is already installed
    console.log('WedMe PWA is running in standalone mode');
    
    // Hide install prompts
    document.body.classList.add('pwa-installed');
    
    // Enable app-specific features
    this.enableInstalledAppFeatures();
  }
  
  private enableInstalledAppFeatures() {
    // Enable features only available in installed PWA
    // - Badge notifications
    // - Shortcut handling
    // - Advanced caching
  }
}
```

## 🔄 Real-time Couple Collaboration

### Couple Sync Hook
```typescript
// Real-time collaboration between partners
export const useCoupleSync = (weddingId: string) => {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [sharedCursor, setSharedCursor] = useState<CursorPosition | null>(null);
  const [realtimeChanges, setRealtimeChanges] = useState<RealtimeChange[]>([]);
  
  const supabase = useSupabase();
  const { user } = useAuth();
  
  useEffect(() => {
    if (!weddingId || !user) return;
    
    // Subscribe to partner presence
    const presenceChannel = supabase.channel(`wedding:${weddingId}:presence`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        const partners = Object.values(presenceState).flat() as PresenceUser[];
        
        const currentPartner = partners.find(p => p.user_id !== user.id);
        setPartner(currentPartner || null);
        setIsPartnerOnline(!!currentPartner);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const joinedPartner = newPresences.find(p => p.user_id !== user.id);
        if (joinedPartner) {
          setPartner(joinedPartner);
          setIsPartnerOnline(true);
          showToast(`${joinedPartner.name} joined`, 'info');
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftPartner = leftPresences.find(p => p.user_id !== user.id);
        if (leftPartner) {
          setIsPartnerOnline(false);
          showToast(`${leftPartner.name} left`, 'info');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            name: user.user_metadata.name,
            avatar: user.user_metadata.avatar_url,
            online_at: new Date().toISOString(),
            current_page: window.location.pathname
          });
        }
      });
    
    // Subscribe to realtime changes
    const changesChannel = supabase.channel(`wedding:${weddingId}:changes`)
      .on('broadcast', { event: 'timeline_update' }, (payload) => {
        handleRealtimeChange(payload as TimelineChange);
      })
      .on('broadcast', { event: 'guest_update' }, (payload) => {
        handleRealtimeChange(payload as GuestChange);
      })
      .on('broadcast', { event: 'vendor_update' }, (payload) => {
        handleRealtimeChange(payload as VendorChange);
      })
      .on('broadcast', { event: 'cursor_move' }, (payload) => {
        if (payload.user_id !== user.id) {
          setSharedCursor(payload as CursorPosition);
        }
      })
      .subscribe();
    
    // Cleanup on unmount
    return () => {
      presenceChannel.unsubscribe();
      changesChannel.unsubscribe();
    };
  }, [weddingId, user, supabase]);
  
  const broadcastChange = useCallback(async (
    changeType: ChangeType,
    data: any
  ) => {
    const change: RealtimeChange = {
      id: generateUUID(),
      type: changeType,
      data,
      user_id: user.id,
      user_name: user.user_metadata.name,
      timestamp: new Date().toISOString()
    };
    
    await supabase.channel(`wedding:${weddingId}:changes`)
      .send({
        type: 'broadcast',
        event: changeType,
        payload: change
      });
    
  }, [weddingId, user, supabase]);
  
  const handleRealtimeChange = (change: RealtimeChange) => {
    // Don't process our own changes
    if (change.user_id === user.id) return;
    
    setRealtimeChanges(prev => [change, ...prev.slice(0, 9)]); // Keep last 10 changes
    
    // Show notification about partner's change
    showChangeNotification(change);
  };
  
  const showChangeNotification = (change: RealtimeChange) => {
    const notifications = {
      timeline_update: `${change.user_name} updated the timeline`,
      guest_update: `${change.user_name} updated the guest list`,
      vendor_update: `${change.user_name} updated vendor information`,
      task_complete: `${change.user_name} completed a task`,
      photo_added: `${change.user_name} added new photos`
    };
    
    const message = notifications[change.type as keyof typeof notifications] 
      || `${change.user_name} made a change`;
    
    showToast(message, 'info', {
      duration: 3000,
      action: {
        label: 'View',
        onClick: () => navigateToChange(change)
      }
    });
  };
  
  return {
    partner,
    isPartnerOnline,
    sharedCursor,
    realtimeChanges,
    broadcastChange
  };
};
```

## 🧪 Testing Requirements

### PWA and Mobile Testing
```typescript
describe('WedMe Mobile Experience', () => {
  describe('PWA Functionality', () => {
    it('should install as PWA with proper manifest', () => {
      // Test PWA installation flow
      expect(document.querySelector('link[rel="manifest"]')).toBeTruthy();
      expect(window.navigator.serviceWorker).toBeTruthy();
    });
    
    it('should work offline with cached data', async () => {
      // Simulate offline mode
      await page.setOfflineMode(true);
      
      // Navigate to timeline
      await page.goto('/wedme/timeline');
      
      // Should show cached content
      await expect(page.locator('.timeline-items')).toBeVisible();
      await expect(page.locator('.offline-indicator')).toBeVisible();
    });
    
    it('should sync data when back online', async () => {
      // Make changes while offline
      await page.setOfflineMode(true);
      await page.click('[data-testid="mark-complete"]');
      
      // Go back online
      await page.setOfflineMode(false);
      
      // Should sync changes
      await expect(page.locator('.sync-indicator')).toBeVisible();
      await expect(page.locator('[data-testid="task-completed"]')).toBeVisible();
    });
  });
  
  describe('Mobile Touch Interactions', () => {
    it('should handle swipe gestures on timeline', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      // Swipe left to reveal actions
      await page.locator('.timeline-card').first().swipe('left');
      await expect(page.locator('.swipe-actions')).toBeVisible();
    });
    
    it('should support pull-to-refresh', async () => {
      const startY = 100;
      const endY = 300;
      
      await page.touchscreen.tap(200, startY);
      await page.touchscreen.move(200, endY);
      
      await expect(page.locator('.pull-to-refresh-indicator')).toBeVisible();
    });
  });
  
  describe('Real-time Collaboration', () => {
    it('should show partner presence', async () => {
      // Simulate partner joining
      await mockPartnerPresence('partner-123', 'online');
      
      await expect(page.locator('.partner-online-indicator')).toBeVisible();
      await expect(page.locator('.partner-avatar')).toBeVisible();
    });
    
    it('should sync changes in real-time', async () => {
      // Partner makes a change
      await mockRealtimeChange({
        type: 'timeline_update',
        data: { eventId: '123', status: 'completed' }
      });
      
      // Should update UI immediately
      await expect(page.locator('[data-event-id="123"] .status-completed')).toBeVisible();
    });
  });
});
```

## 🎯 Success Criteria

### PWA Performance Targets
- **Install Rate**: >15% of mobile visitors install PWA
- **Offline Functionality**: 100% of core features work offline
- **Sync Success Rate**: >99% successful sync when reconnected
- **App-like Experience**: Lighthouse PWA score >90
- **Retention Rate**: >70% of installed users return within 7 days

### Mobile User Experience Goals
- **Touch Response Time**: <100ms for all interactions
- **Page Transitions**: <300ms smooth animations
- **Image Loading**: Progressive loading with blur-up effect
- **Form Completion**: One-handed operation for all critical forms
- **Navigation**: Thumb-friendly bottom navigation

### Couple Collaboration Metrics
- **Real-time Sync**: <500ms for partner changes to appear
- **Presence Accuracy**: >95% accurate partner online status
- **Conflict Resolution**: 100% automated resolution rate
- **Collaboration Rate**: >60% of couples actively collaborate
- **Planning Completion**: Couples using mobile complete 23% more tasks

Your WedMe mobile experience will revolutionize how couples plan their weddings, making it so delightful and efficient that they'll prefer using WedMe over any other method. The viral growth depends on creating an experience couples can't live without.

**Remember**: Every couple deserves a wedding planning experience that brings them joy, not stress. Your mobile optimization makes that possible. 💕📱