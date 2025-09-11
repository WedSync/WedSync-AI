# WS-280 Thank You Management - Team D Comprehensive Prompt
**Team D: Platform/WedMe Integration Specialists**

## 🎯 Your Mission: Mobile-First Wedding Thank You Experience & WedMe Growth Engine
You are the **Platform/WedMe specialists** responsible for integrating thank you management into the WedMe couple platform and ensuring an exceptional mobile experience for gratitude tracking. Your focus: **WhatsApp-quality mobile thank you management that couples love using, with viral sharing features that showcase their gratitude journey and drive WedMe adoption among friends and family**.

## 💝 The Mobile Wedding Thank You Challenge
**Context**: Emma and James just returned from their honeymoon to find 247 wedding gifts waiting. On her iPhone while sitting in their new living room surrounded by boxes, Emma needs to quickly photograph gifts, add thank you notes, track delivery status, and share her gratitude journey with friends who might be planning their own weddings. **Your mobile platform must make thank you management as easy as posting on Instagram with the reliability of banking apps**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/apps/wedme/components/thank-you/MobileThankYouManager.tsx`** - Mobile-optimized thank you management hub
2. **`/src/apps/wedme/components/thank-you/GiftPhotoCaptureFlow.tsx`** - Camera integration for gift documentation
3. **`/src/apps/wedme/hooks/useMobileThankYouSync.tsx`** - Offline-first sync for mobile devices
4. **`/src/apps/wedme/components/sharing/GratitudeJourneyShare.tsx`** - Social sharing for viral growth
5. **`/src/apps/wedme/lib/offline/thank-you-queue.ts`** - Offline thank you note queue management

### 📱 Mobile Requirements:
- **Touch-Optimized Interface**: Thumb-friendly thank you management designed for one-handed use
- **Camera Integration**: Instant photo capture for gift documentation with automatic organization
- **Offline-First Architecture**: Queue thank you notes offline, sync when connection returns
- **Voice Note Support**: Record voice memos for personalized thank you messages
- **Gesture Controls**: Swipe gestures for quick actions (mark as sent, edit, delete)
- **Progress Visualization**: Beautiful progress tracking with wedding-themed animations
- **WedMe Viral Features**: Share gratitude journey to showcase wedding bliss and drive app growth

Your mobile platform transforms overwhelming thank you management into a delightful mobile experience.

## 🎨 Core Mobile Components Implementation

### Mobile Thank You Manager Hub (`/src/apps/wedme/components/thank-you/MobileThankYouManager.tsx`)
```tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Camera, Gift, Heart, Send, Users, Sparkles, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMobileThankYouSync } from '../../hooks/useMobileThankYouSync'
import { GiftPhotoCaptureFlow } from './GiftPhotoCaptureFlow'
import { ThankYouProgressRing } from './ThankYouProgressRing'
import { GratitudeJourneyShare } from '../sharing/GratitudeJourneyShare'
import { QuickActionSheet } from './QuickActionSheet'
import { VoiceNoteRecorder } from './VoiceNoteRecorder'

interface MobileThankYouManagerProps {
  weddingId: string
  coupleId: string
  organizationId: string
}

export function MobileThankYouManager({
  weddingId,
  coupleId,
  organizationId
}: MobileThankYouManagerProps) {
  const [activeView, setActiveView] = useState<'overview' | 'gifts' | 'notes' | 'share'>('overview')
  const [showCameraFlow, setShowCameraFlow] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)

  const {
    gifts,
    notes,
    progress,
    loading,
    error,
    syncStatus,
    addGift,
    updateGift,
    createNote,
    sendNote,
    syncOfflineChanges
  } = useMobileThankYouSync(organizationId, weddingId)

  // Auto-sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      if (syncStatus === 'offline') {
        syncOfflineChanges()
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [syncOfflineChanges, syncStatus])

  // Pull-to-refresh functionality
  const handlePullToRefresh = async () => {
    if ('serviceWorker' in navigator) {
      // Implement pull-to-refresh via service worker
      const registration = await navigator.serviceWorker.ready
      registration.sync.register('thank-you-sync')
    }
  }

  const quickActions = [
    {
      icon: Camera,
      label: 'Add Gift',
      color: 'bg-pink-500',
      action: () => setShowCameraFlow(true)
    },
    {
      icon: Heart,
      label: 'Write Note',
      color: 'bg-rose-500',
      action: () => setShowVoiceRecorder(true)
    },
    {
      icon: Send,
      label: 'Send Notes',
      color: 'bg-emerald-500',
      action: () => handleBulkSend()
    },
    {
      icon: Sparkles,
      label: 'Share Journey',
      color: 'bg-purple-500',
      action: () => setActiveView('share')
    }
  ]

  const handleBulkSend = async () => {
    const readyNotes = notes.filter(note => note.status === 'ready')
    
    for (const note of readyNotes) {
      await sendNote(note.id)
    }
  }

  if (loading) {
    return <ThankYouLoadingSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50">
      {/* Header with sync status */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-rose-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Thank You Notes</h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full ${
                  syncStatus === 'online' ? 'bg-green-500' : 
                  syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 
                  'bg-gray-400'
                }`} />
                {syncStatus === 'online' ? 'All caught up' : 
                 syncStatus === 'syncing' ? 'Syncing...' : 
                 'Offline - changes saved locally'}
              </div>
            </div>
            
            {/* Progress ring */}
            <ThankYouProgressRing
              total={progress.totalGifts}
              completed={progress.sentNotes}
              size="small"
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pb-20"> {/* Space for bottom navigation */}
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <OverviewTab
              key="overview"
              progress={progress}
              gifts={gifts}
              notes={notes}
              onAddGift={() => setShowCameraFlow(true)}
              onViewGifts={() => setActiveView('gifts')}
            />
          )}
          
          {activeView === 'gifts' && (
            <GiftsTab
              key="gifts"
              gifts={gifts}
              onEditGift={(giftId) => {
                setSelectedGiftId(giftId)
                setShowActionSheet(true)
              }}
              onAddGift={() => setShowCameraFlow(true)}
            />
          )}
          
          {activeView === 'notes' && (
            <NotesTab
              key="notes"
              notes={notes}
              gifts={gifts}
              onEditNote={(noteId) => {
                // Handle note editing
              }}
              onSendNote={sendNote}
            />
          )}
          
          {activeView === 'share' && (
            <GratitudeJourneyShare
              key="share"
              weddingId={weddingId}
              progress={progress}
              recentGifts={gifts.slice(0, 6)}
              onClose={() => setActiveView('overview')}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-30">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full shadow-lg flex items-center justify-center"
          onClick={() => setShowActionSheet(true)}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-rose-200 z-40">
        <div className="flex justify-around py-2">
          {[
            { key: 'overview', icon: Heart, label: 'Overview' },
            { key: 'gifts', icon: Gift, label: 'Gifts' },
            { key: 'notes', icon: Send, label: 'Notes' },
            { key: 'share', icon: Users, label: 'Share' }
          ].map(({ key, icon: Icon, label }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center py-2 px-3 rounded-lg ${
                activeView === key 
                  ? 'text-pink-600 bg-pink-50' 
                  : 'text-gray-600'
              }`}
              onClick={() => setActiveView(key as any)}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Modal overlays */}
      <AnimatePresence>
        {showCameraFlow && (
          <GiftPhotoCaptureFlow
            onClose={() => setShowCameraFlow(false)}
            onGiftAdded={(giftData) => {
              addGift(giftData)
              setShowCameraFlow(false)
            }}
            organizationId={organizationId}
          />
        )}
        
        {showActionSheet && (
          <QuickActionSheet
            actions={quickActions}
            onClose={() => setShowActionSheet(false)}
            selectedGiftId={selectedGiftId}
            onAction={(action) => {
              action()
              setShowActionSheet(false)
              setSelectedGiftId(null)
            }}
          />
        )}
        
        {showVoiceRecorder && (
          <VoiceNoteRecorder
            onClose={() => setShowVoiceRecorder(false)}
            onVoiceNote={(audioBlob, transcript) => {
              // Handle voice note creation
              setShowVoiceRecorder(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ 
  progress, 
  gifts, 
  notes, 
  onAddGift, 
  onViewGifts 
}: {
  progress: any
  gifts: any[]
  notes: any[]
  onAddGift: () => void
  onViewGifts: () => void
}) {
  const completionPercentage = progress.totalGifts > 0 
    ? Math.round((progress.sentNotes / progress.totalGifts) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 space-y-6"
    >
      {/* Progress Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100">
        <div className="text-center mb-6">
          <div className="mb-4">
            <ThankYouProgressRing
              total={progress.totalGifts}
              completed={progress.sentNotes}
              size="large"
            />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {progress.sentNotes} of {progress.totalGifts}
          </h3>
          <p className="text-gray-600">Thank you notes sent</p>
          
          {completionPercentage === 100 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mt-4 flex items-center justify-center gap-2 text-emerald-600"
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">All done! 🎉</span>
            </motion.div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-pink-600">{progress.writtenNotes}</div>
            <div className="text-xs text-gray-600">Written</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-600">{progress.readyNotes}</div>
            <div className="text-xs text-gray-600">Ready</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-600">{progress.deliveredNotes}</div>
            <div className="text-xs text-gray-600">Delivered</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onAddGift}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl text-white"
          >
            <Camera className="w-5 h-5" />
            <span className="font-medium">Add Gift</span>
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onViewGifts}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-white"
          >
            <Gift className="w-5 h-5" />
            <span className="font-medium">View Gifts</span>
          </motion.button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {gifts.slice(0, 3).map((gift, index) => (
            <motion.div
              key={gift.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              {gift.imageUrl ? (
                <img 
                  src={gift.imageUrl} 
                  alt={gift.description}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-pink-200 to-rose-200 rounded-lg flex items-center justify-center">
                  <Gift className="w-6 h-6 text-pink-600" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {gift.description}
                </p>
                <p className="text-sm text-gray-600">
                  From {gift.giverName}
                </p>
              </div>
              
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                gift.thankYouStatus === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                gift.thankYouStatus === 'sent' ? 'bg-blue-100 text-blue-700' :
                gift.thankYouStatus === 'written' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {gift.thankYouStatus === 'delivered' ? '✓ Sent' :
                 gift.thankYouStatus === 'sent' ? 'Sending' :
                 gift.thankYouStatus === 'written' ? 'Ready' :
                 'Pending'}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Gifts Tab Component
function GiftsTab({ 
  gifts, 
  onEditGift, 
  onAddGift 
}: {
  gifts: any[]
  onEditGift: (giftId: string) => void
  onAddGift: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredGifts = gifts.filter(gift => {
    const matchesSearch = gift.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         gift.giverName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || gift.thankYouStatus === filterStatus
    
    return matchesSearch && matchesFilter
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 space-y-4"
    >
      {/* Search and filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-rose-100">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search gifts or givers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          
          <div className="flex gap-2 overflow-x-auto">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'written', label: 'Written' },
              { value: 'sent', label: 'Sent' },
              { value: 'delivered', label: 'Delivered' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                  filterStatus === value
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gifts grid */}
      <div className="grid grid-cols-1 gap-3">
        {filteredGifts.map((gift, index) => (
          <motion.div
            key={gift.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-rose-100"
            onClick={() => onEditGift(gift.id)}
          >
            <div className="flex gap-4">
              {gift.imageUrl ? (
                <img 
                  src={gift.imageUrl} 
                  alt={gift.description}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-pink-200 to-rose-200 rounded-lg flex items-center justify-center">
                  <Gift className="w-8 h-8 text-pink-600" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate mb-1">
                  {gift.description}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  From {gift.giverName}
                </p>
                
                {gift.value && (
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    £{gift.value}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    gift.thankYouStatus === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                    gift.thankYouStatus === 'sent' ? 'bg-blue-100 text-blue-700' :
                    gift.thankYouStatus === 'written' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {gift.thankYouStatus === 'delivered' ? '✓ Delivered' :
                     gift.thankYouStatus === 'sent' ? 'Sent' :
                     gift.thankYouStatus === 'written' ? 'Ready to Send' :
                     'Needs Thank You'}
                  </div>
                  
                  {gift.receivedDate && (
                    <span className="text-xs text-gray-500">
                      {new Date(gift.receivedDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredGifts.length === 0 && (
        <div className="text-center py-12">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No gifts found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Start by adding your first wedding gift'
            }
          </p>
          <button
            onClick={onAddGift}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-xl font-medium"
          >
            Add Your First Gift
          </button>
        </div>
      )}
    </motion.div>
  )
}

// Notes Tab Component  
function NotesTab({ 
  notes, 
  gifts, 
  onEditNote, 
  onSendNote 
}: {
  notes: any[]
  gifts: any[]
  onEditNote: (noteId: string) => void
  onSendNote: (noteId: string) => void
}) {
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredNotes = notes.filter(note => 
    filterStatus === 'all' || note.status === filterStatus
  )

  // Create a map of gifts for quick lookup
  const giftMap = gifts.reduce((map, gift) => {
    map[gift.id] = gift
    return map
  }, {} as Record<string, any>)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 space-y-4"
    >
      {/* Status filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-rose-100">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { value: 'all', label: 'All Notes' },
            { value: 'draft', label: 'Drafts' },
            { value: 'ready', label: 'Ready' },
            { value: 'sent', label: 'Sent' },
            { value: 'delivered', label: 'Delivered' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                filterStatus === value
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {filteredNotes.map((note, index) => {
          const gift = giftMap[note.giftId]
          
          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-rose-100"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Thank you to {gift?.giverName || 'Unknown'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    For: {gift?.description || 'Gift'}
                  </p>
                </div>
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  note.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                  note.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  note.status === 'ready' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {note.status === 'delivered' ? 'Delivered' :
                   note.status === 'sent' ? 'Sent' :
                   note.status === 'ready' ? 'Ready' :
                   'Draft'}
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                {note.content}
              </p>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {note.deliveryMethod === 'email' ? '📧 Email' :
                   note.deliveryMethod === 'postal' ? '📮 Post' :
                   note.deliveryMethod === 'sms' ? '📱 SMS' :
                   '🤝 Hand Delivery'}
                </span>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditNote(note.id)}
                    className="text-sm text-pink-600 font-medium"
                  >
                    Edit
                  </button>
                  
                  {note.status === 'ready' && (
                    <button
                      onClick={() => onSendNote(note.id)}
                      className="text-sm text-emerald-600 font-medium"
                    >
                      Send Now
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No thank you notes</h3>
          <p className="text-gray-600">
            {filterStatus !== 'all' 
              ? 'No notes match your current filter'
              : 'Write your first thank you note to get started'
            }
          </p>
        </div>
      )}
    </motion.div>
  )
}

// Loading skeleton
function ThankYouLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 p-4">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Gift Photo Capture Flow (`/src/apps/wedme/components/thank-you/GiftPhotoCaptureFlow.tsx`)
```tsx
'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Camera, X, RotateCcw, Check, Upload, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface GiftPhotoCaptureFlowProps {
  onClose: () => void
  onGiftAdded: (giftData: any) => void
  organizationId: string
}

interface CapturedPhoto {
  blob: Blob
  url: string
  metadata: {
    timestamp: Date
    location?: GeolocationCoordinates
  }
}

export function GiftPhotoCaptureFlow({
  onClose,
  onGiftAdded,
  organizationId
}: GiftPhotoCaptureFlowProps) {
  const [currentStep, setCurrentStep] = useState<'camera' | 'preview' | 'details' | 'processing'>('camera')
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null)
  const [giftDetails, setGiftDetails] = useState({
    description: '',
    giverName: '',
    giverEmail: '',
    value: '',
    category: '',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  // Start camera on mount
  React.useEffect(() => {
    startCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      // Fallback to file upload if camera access fails
      setCurrentStep('details')
    }
  }

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return

      // Get location if available
      let location: GeolocationCoordinates | undefined
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        location = position.coords
      } catch (error) {
        console.warn('Could not get location:', error)
      }

      const photo: CapturedPhoto = {
        blob,
        url: URL.createObjectURL(blob),
        metadata: {
          timestamp: new Date(),
          location
        }
      }

      setCapturedPhoto(photo)
      setCurrentStep('preview')

      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
    }, 'image/jpeg', 0.8)
  }, [stream])

  const retakePhoto = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto.url)
      setCapturedPhoto(null)
    }
    setCurrentStep('camera')
    startCamera()
  }

  const uploadFromGallery = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const photo: CapturedPhoto = {
      blob: file,
      url: URL.createObjectURL(file),
      metadata: {
        timestamp: new Date()
      }
    }

    setCapturedPhoto(photo)
    setCurrentStep('preview')
  }

  const handleSubmit = async () => {
    if (!capturedPhoto) return

    setCurrentStep('processing')

    try {
      // Upload photo to storage
      const photoUrl = await uploadPhotoToStorage(capturedPhoto.blob)
      
      // Extract text from image using AI (if available)
      const extractedText = await extractTextFromImage(capturedPhoto.blob)
      
      // Auto-fill fields if text was extracted
      if (extractedText) {
        autoFillFromExtractedText(extractedText)
      }

      // Create gift record
      const giftData = {
        ...giftDetails,
        imageUrl: photoUrl,
        extractedText,
        organizationId,
        metadata: capturedPhoto.metadata
      }

      onGiftAdded(giftData)
      
    } catch (error) {
      console.error('Error processing gift:', error)
      // Handle error - could show retry option
    }
  }

  const uploadPhotoToStorage = async (blob: Blob): Promise<string> => {
    // Create form data for upload
    const formData = new FormData()
    formData.append('file', blob, `gift-${Date.now()}.jpg`)
    formData.append('organizationId', organizationId)
    formData.append('folder', 'thank-you-gifts')

    const response = await fetch('/api/upload/gift-photo', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Failed to upload photo')
    }

    const { url } = await response.json()
    return url
  }

  const extractTextFromImage = async (blob: Blob): Promise<string | null> => {
    try {
      // Use OCR service or AI to extract text from image
      const formData = new FormData()
      formData.append('image', blob)

      const response = await fetch('/api/ai/extract-text', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const { text } = await response.json()
        return text
      }
    } catch (error) {
      console.warn('Text extraction failed:', error)
    }
    
    return null
  }

  const autoFillFromExtractedText = (text: string) => {
    // Use AI to parse extracted text and fill form fields
    // This could identify gift descriptions, giver names, values, etc.
    // For now, just use as notes
    setGiftDetails(prev => ({
      ...prev,
      notes: prev.notes ? `${prev.notes}\n\nExtracted: ${text}` : `Extracted: ${text}`
    }))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-white text-center">
          <div className="text-sm opacity-75">
            Step {currentStep === 'camera' ? 1 : currentStep === 'preview' ? 2 : 3} of 3
          </div>
          <div className="font-medium">
            {currentStep === 'camera' ? 'Capture Gift Photo' :
             currentStep === 'preview' ? 'Review Photo' :
             currentStep === 'details' ? 'Gift Details' :
             'Processing...'}
          </div>
        </div>

        {currentStep === 'camera' && (
          <button
            onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
            className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Camera Step */}
        {currentStep === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-full flex flex-col"
          >
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Camera overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-white/50 rounded-2xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-white rounded-full" />
              </div>
            </div>

            {/* Camera controls */}
            <div className="p-6 flex items-center justify-center gap-8">
              <button
                onClick={uploadFromGallery}
                className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                <Upload className="w-5 h-5" />
              </button>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center relative"
              >
                <Camera className="w-8 h-8 text-gray-900" />
                <div className="absolute inset-2 border-2 border-gray-900 rounded-full" />
              </motion.button>
              
              <div className="w-12 h-12" /> {/* Spacer for alignment */}
            </div>
          </motion.div>
        )}

        {/* Preview Step */}
        {currentStep === 'preview' && capturedPhoto && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="h-full flex flex-col"
          >
            <div className="flex-1 relative">
              <img
                src={capturedPhoto.url}
                alt="Captured gift"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 bg-black/50 backdrop-blur-sm">
              <div className="flex justify-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={retakePhoto}
                  className="flex-1 bg-white/20 text-white py-3 rounded-xl font-medium"
                >
                  Retake
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentStep('details')}
                  className="flex-1 bg-white text-black py-3 rounded-xl font-medium"
                >
                  Use This Photo
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Details Step */}
        {currentStep === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="h-full bg-white flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-4 pb-24">
              {capturedPhoto && (
                <div className="mb-6">
                  <img
                    src={capturedPhoto.url}
                    alt="Gift photo"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gift Description *
                  </label>
                  <input
                    type="text"
                    value={giftDetails.description}
                    onChange={(e) => setGiftDetails(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Crystal wine glasses set"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Who? *
                  </label>
                  <input
                    type="text"
                    value={giftDetails.giverName}
                    onChange={(e) => setGiftDetails(prev => ({ ...prev, giverName: e.target.value }))}
                    placeholder="e.g., Sarah & Mike Johnson"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Value (£)
                    </label>
                    <input
                      type="number"
                      value={giftDetails.value}
                      onChange={(e) => setGiftDetails(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="50"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={giftDetails.category}
                      onChange={(e) => setGiftDetails(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">Select category</option>
                      <option value="household">Household</option>
                      <option value="decorative">Decorative</option>
                      <option value="experience">Experience</option>
                      <option value="money">Money/Voucher</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={giftDetails.giverEmail}
                    onChange={(e) => setGiftDetails(prev => ({ ...prev, giverEmail: e.target.value }))}
                    placeholder="sarah@example.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Received
                  </label>
                  <input
                    type="date"
                    value={giftDetails.receivedDate}
                    onChange={(e) => setGiftDetails(prev => ({ ...prev, receivedDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={giftDetails.notes}
                    onChange={(e) => setGiftDetails(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special notes about this gift..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!giftDetails.description || !giftDetails.giverName}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Gift
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Processing Step */}
        {currentStep === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full bg-gradient-to-br from-pink-500 via-rose-500 to-purple-500 flex items-center justify-center"
          >
            <div className="text-center text-white">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-6"
              />
              
              <h3 className="text-xl font-bold mb-2">Processing Gift</h3>
              <p className="text-white/80">
                Saving photo and extracting details...
              </p>
              
              <div className="mt-6 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm">Using AI to help organize your gifts</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input for gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </motion.div>
  )
}
```

### Mobile Thank You Sync Hook (`/src/apps/wedme/hooks/useMobileThankYouSync.tsx`)
```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useNetworkState } from './useNetworkState'

interface Gift {
  id: string
  description: string
  giverName: string
  giverEmail?: string
  value?: number
  category?: string
  receivedDate?: string
  imageUrl?: string
  thankYouStatus: 'pending' | 'written' | 'sent' | 'delivered'
  notes?: string
}

interface ThankYouNote {
  id: string
  giftId: string
  content: string
  status: 'draft' | 'ready' | 'sent' | 'delivered'
  deliveryMethod: 'email' | 'postal' | 'sms' | 'hand_delivery'
  sentDate?: string
  deliveredDate?: string
}

interface Progress {
  totalGifts: number
  writtenNotes: number
  readyNotes: number
  sentNotes: number
  deliveredNotes: number
}

interface SyncState {
  status: 'online' | 'offline' | 'syncing'
  lastSync?: Date
  pendingChanges: number
  conflictCount: number
}

export function useMobileThankYouSync(organizationId: string, weddingId: string) {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [notes, setNotes] = useState<ThankYouNote[]>([])
  const [progress, setProgress] = useState<Progress>({
    totalGifts: 0,
    writtenNotes: 0,
    readyNotes: 0,
    sentNotes: 0,
    deliveredNotes: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'online',
    pendingChanges: 0,
    conflictCount: 0
  })

  const supabase = createClientComponentClient()
  const { isOnline, connectionType } = useNetworkState()

  // Local storage keys
  const STORAGE_KEYS = {
    gifts: `gifts_${organizationId}_${weddingId}`,
    notes: `notes_${organizationId}_${weddingId}`,
    pendingChanges: `pending_changes_${organizationId}_${weddingId}`,
    lastSync: `last_sync_${organizationId}_${weddingId}`
  }

  // Initialize data and set up offline storage
  useEffect(() => {
    initializeData()
    
    // Set up real-time subscriptions when online
    if (isOnline) {
      setupRealtimeSubscriptions()
    }

    // Register service worker for background sync
    registerBackgroundSync()
  }, [organizationId, weddingId, isOnline])

  // Update sync status based on network state
  useEffect(() => {
    setSyncState(prev => ({
      ...prev,
      status: isOnline ? 'online' : 'offline'
    }))

    // Trigger sync when coming back online
    if (isOnline && syncState.pendingChanges > 0) {
      syncOfflineChanges()
    }
  }, [isOnline])

  const initializeData = async () => {
    try {
      setLoading(true)
      
      // Try to load from local storage first (for offline support)
      const cachedGifts = loadFromStorage(STORAGE_KEYS.gifts)
      const cachedNotes = loadFromStorage(STORAGE_KEYS.notes)
      
      if (cachedGifts.length > 0 || cachedNotes.length > 0) {
        setGifts(cachedGifts)
        setNotes(cachedNotes)
        updateProgress(cachedGifts)
      }

      // If online, fetch latest data
      if (isOnline) {
        await fetchLatestData()
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchLatestData = async () => {
    try {
      // Fetch gifts
      const { data: giftsData, error: giftsError } = await supabase
        .from('thank_you_gifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })

      if (giftsError) throw giftsError

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('thank_you_notes')
        .select(`
          *,
          thank_you_gifts!inner(id, wedding_id)
        `)
        .eq('organization_id', organizationId)
        .eq('thank_you_gifts.wedding_id', weddingId)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError

      const transformedGifts = giftsData?.map(transformGiftFromDB) || []
      const transformedNotes = notesData?.map(transformNoteFromDB) || []

      setGifts(transformedGifts)
      setNotes(transformedNotes)
      updateProgress(transformedGifts)

      // Cache data locally
      saveToStorage(STORAGE_KEYS.gifts, transformedGifts)
      saveToStorage(STORAGE_KEYS.notes, transformedNotes)
      saveToStorage(STORAGE_KEYS.lastSync, new Date())

      setSyncState(prev => ({
        ...prev,
        lastSync: new Date(),
        pendingChanges: 0
      }))

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    }
  }

  const setupRealtimeSubscriptions = () => {
    // Subscribe to gifts changes
    const giftsSubscription = supabase
      .channel(`gifts_${organizationId}_${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thank_you_gifts',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          handleRealtimeGiftChange(payload)
        }
      )
      .subscribe()

    // Subscribe to notes changes
    const notesSubscription = supabase
      .channel(`notes_${organizationId}_${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thank_you_notes',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          handleRealtimeNoteChange(payload)
        }
      )
      .subscribe()

    return () => {
      giftsSubscription.unsubscribe()
      notesSubscription.unsubscribe()
    }
  }

  const handleRealtimeGiftChange = (payload: any) => {
    const transformedGift = transformGiftFromDB(payload.new || payload.old)
    
    setGifts(prev => {
      let updated = [...prev]
      
      if (payload.eventType === 'INSERT') {
        // Check if gift already exists locally to prevent duplicates
        if (!updated.find(g => g.id === transformedGift.id)) {
          updated.push(transformedGift)
        }
      } else if (payload.eventType === 'UPDATE') {
        const index = updated.findIndex(g => g.id === transformedGift.id)
        if (index !== -1) {
          updated[index] = transformedGift
        }
      } else if (payload.eventType === 'DELETE') {
        updated = updated.filter(g => g.id !== transformedGift.id)
      }
      
      updateProgress(updated)
      saveToStorage(STORAGE_KEYS.gifts, updated)
      return updated
    })
  }

  const handleRealtimeNoteChange = (payload: any) => {
    const transformedNote = transformNoteFromDB(payload.new || payload.old)
    
    setNotes(prev => {
      let updated = [...prev]
      
      if (payload.eventType === 'INSERT') {
        if (!updated.find(n => n.id === transformedNote.id)) {
          updated.push(transformedNote)
        }
      } else if (payload.eventType === 'UPDATE') {
        const index = updated.findIndex(n => n.id === transformedNote.id)
        if (index !== -1) {
          updated[index] = transformedNote
        }
      } else if (payload.eventType === 'DELETE') {
        updated = updated.filter(n => n.id !== transformedNote.id)
      }
      
      saveToStorage(STORAGE_KEYS.notes, updated)
      return updated
    })
  }

  const addGift = async (giftData: Partial<Gift>) => {
    const newGift: Gift = {
      id: `temp_${Date.now()}`, // Temporary ID for offline
      description: giftData.description || '',
      giverName: giftData.giverName || '',
      giverEmail: giftData.giverEmail,
      value: giftData.value,
      category: giftData.category,
      receivedDate: giftData.receivedDate,
      imageUrl: giftData.imageUrl,
      thankYouStatus: 'pending',
      notes: giftData.notes,
      ...giftData
    }

    // Add to local state immediately
    const updatedGifts = [...gifts, newGift]
    setGifts(updatedGifts)
    updateProgress(updatedGifts)
    saveToStorage(STORAGE_KEYS.gifts, updatedGifts)

    if (isOnline) {
      try {
        // Sync to server
        const { data, error } = await supabase
          .from('thank_you_gifts')
          .insert([{
            organization_id: organizationId,
            wedding_id: weddingId,
            gift_description: newGift.description,
            primary_giver_name: newGift.giverName,
            giver_email: newGift.giverEmail,
            gift_value: newGift.value,
            gift_category: newGift.category,
            gift_received_date: newGift.receivedDate,
            gift_image_url: newGift.imageUrl,
            personal_notes: newGift.notes,
            thank_you_status: 'pending'
          }])
          .select()
          .single()

        if (error) throw error

        // Update with real ID from server
        const serverGift = transformGiftFromDB(data)
        const finalGifts = updatedGifts.map(g => g.id === newGift.id ? serverGift : g)
        setGifts(finalGifts)
        saveToStorage(STORAGE_KEYS.gifts, finalGifts)

      } catch (err) {
        console.error('Error syncing gift to server:', err)
        // Queue for later sync
        queuePendingChange('INSERT_GIFT', newGift)
      }
    } else {
      // Queue for later sync when online
      queuePendingChange('INSERT_GIFT', newGift)
    }
  }

  const updateGift = async (giftId: string, updates: Partial<Gift>) => {
    const updatedGifts = gifts.map(gift => 
      gift.id === giftId ? { ...gift, ...updates } : gift
    )
    
    setGifts(updatedGifts)
    updateProgress(updatedGifts)
    saveToStorage(STORAGE_KEYS.gifts, updatedGifts)

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('thank_you_gifts')
          .update({
            gift_description: updates.description,
            primary_giver_name: updates.giverName,
            giver_email: updates.giverEmail,
            gift_value: updates.value,
            gift_category: updates.category,
            gift_received_date: updates.receivedDate,
            personal_notes: updates.notes,
            thank_you_status: updates.thankYouStatus
          })
          .eq('id', giftId)

        if (error) throw error

      } catch (err) {
        console.error('Error updating gift:', err)
        queuePendingChange('UPDATE_GIFT', { id: giftId, ...updates })
      }
    } else {
      queuePendingChange('UPDATE_GIFT', { id: giftId, ...updates })
    }
  }

  const createNote = async (noteData: Partial<ThankYouNote>) => {
    const newNote: ThankYouNote = {
      id: `temp_note_${Date.now()}`,
      giftId: noteData.giftId || '',
      content: noteData.content || '',
      status: 'draft',
      deliveryMethod: noteData.deliveryMethod || 'email',
      ...noteData
    }

    const updatedNotes = [...notes, newNote]
    setNotes(updatedNotes)
    saveToStorage(STORAGE_KEYS.notes, updatedNotes)

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('thank_you_notes')
          .insert([{
            gift_id: newNote.giftId,
            organization_id: organizationId,
            note_content: newNote.content,
            delivery_method: newNote.deliveryMethod,
            status: newNote.status
          }])
          .select()
          .single()

        if (error) throw error

        const serverNote = transformNoteFromDB(data)
        const finalNotes = updatedNotes.map(n => n.id === newNote.id ? serverNote : n)
        setNotes(finalNotes)
        saveToStorage(STORAGE_KEYS.notes, finalNotes)

      } catch (err) {
        console.error('Error creating note:', err)
        queuePendingChange('INSERT_NOTE', newNote)
      }
    } else {
      queuePendingChange('INSERT_NOTE', newNote)
    }
  }

  const sendNote = async (noteId: string) => {
    // Update note status to 'sent'
    const updatedNotes = notes.map(note =>
      note.id === noteId 
        ? { ...note, status: 'sent' as const, sentDate: new Date().toISOString() }
        : note
    )
    
    setNotes(updatedNotes)
    saveToStorage(STORAGE_KEYS.notes, updatedNotes)

    // Update corresponding gift status
    const note = updatedNotes.find(n => n.id === noteId)
    if (note) {
      await updateGift(note.giftId, { thankYouStatus: 'sent' })
    }

    if (isOnline) {
      try {
        // Trigger delivery via API
        const response = await fetch('/api/thank-you/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noteId })
        })

        if (!response.ok) throw new Error('Failed to send note')

      } catch (err) {
        console.error('Error sending note:', err)
        queuePendingChange('SEND_NOTE', { id: noteId })
      }
    } else {
      queuePendingChange('SEND_NOTE', { id: noteId })
    }
  }

  const syncOfflineChanges = useCallback(async () => {
    if (!isOnline) return

    setSyncState(prev => ({ ...prev, status: 'syncing' }))

    try {
      const pendingChanges = loadFromStorage(STORAGE_KEYS.pendingChanges, [])
      
      for (const change of pendingChanges) {
        try {
          await processPendingChange(change)
        } catch (err) {
          console.error('Error processing pending change:', err)
          // Keep change in queue for retry
          continue
        }
      }

      // Clear processed changes
      saveToStorage(STORAGE_KEYS.pendingChanges, [])
      
      // Fetch latest data to ensure sync
      await fetchLatestData()

      setSyncState(prev => ({
        ...prev,
        status: 'online',
        pendingChanges: 0,
        lastSync: new Date()
      }))

    } catch (err) {
      console.error('Sync error:', err)
      setSyncState(prev => ({ ...prev, status: 'offline' }))
    }
  }, [isOnline])

  // Utility functions
  const loadFromStorage = (key: string, defaultValue: any = []) => {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : defaultValue
    } catch {
      return defaultValue
    }
  }

  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (err) {
      console.warn('Failed to save to localStorage:', err)
    }
  }

  const queuePendingChange = (type: string, data: any) => {
    const pendingChanges = loadFromStorage(STORAGE_KEYS.pendingChanges, [])
    pendingChanges.push({ type, data, timestamp: Date.now() })
    saveToStorage(STORAGE_KEYS.pendingChanges, pendingChanges)
    
    setSyncState(prev => ({ ...prev, pendingChanges: pendingChanges.length }))
  }

  const processPendingChange = async (change: any) => {
    switch (change.type) {
      case 'INSERT_GIFT':
        // Process offline gift creation
        break
      case 'UPDATE_GIFT':
        // Process offline gift update
        break
      case 'INSERT_NOTE':
        // Process offline note creation
        break
      case 'SEND_NOTE':
        // Process offline note sending
        break
    }
  }

  const updateProgress = (currentGifts: Gift[]) => {
    const progress = {
      totalGifts: currentGifts.length,
      writtenNotes: currentGifts.filter(g => ['written', 'sent', 'delivered'].includes(g.thankYouStatus)).length,
      readyNotes: notes.filter(n => n.status === 'ready').length,
      sentNotes: currentGifts.filter(g => ['sent', 'delivered'].includes(g.thankYouStatus)).length,
      deliveredNotes: currentGifts.filter(g => g.thankYouStatus === 'delivered').length
    }
    
    setProgress(progress)
  }

  const transformGiftFromDB = (dbGift: any): Gift => ({
    id: dbGift.id,
    description: dbGift.gift_description || '',
    giverName: dbGift.primary_giver_name || '',
    giverEmail: dbGift.giver_email,
    value: dbGift.gift_value,
    category: dbGift.gift_category,
    receivedDate: dbGift.gift_received_date,
    imageUrl: dbGift.gift_image_url,
    thankYouStatus: dbGift.thank_you_status || 'pending',
    notes: dbGift.personal_notes
  })

  const transformNoteFromDB = (dbNote: any): ThankYouNote => ({
    id: dbNote.id,
    giftId: dbNote.gift_id,
    content: dbNote.note_content || '',
    status: dbNote.status || 'draft',
    deliveryMethod: dbNote.delivery_method || 'email',
    sentDate: dbNote.sent_date,
    deliveredDate: dbNote.delivered_date
  })

  const registerBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        // Register for background sync when network becomes available
        await registration.sync.register('thank-you-sync')
      } catch (err) {
        console.warn('Background sync registration failed:', err)
      }
    }
  }

  return {
    gifts,
    notes,
    progress,
    loading,
    error,
    syncStatus: syncState.status,
    pendingChanges: syncState.pendingChanges,
    lastSync: syncState.lastSync,
    
    // Actions
    addGift,
    updateGift,
    createNote,
    sendNote,
    syncOfflineChanges,
    
    // Utility
    refetch: fetchLatestData
  }
}
```

## ✅ Acceptance Criteria Checklist

- [ ] **Mobile-First Design** optimized for one-handed phone usage with thumb-friendly controls and bottom navigation
- [ ] **Camera Integration** provides instant photo capture with automatic organization and AI-powered text extraction
- [ ] **Offline-First Architecture** queues all actions locally and syncs seamlessly when connection returns
- [ ] **Touch Gestures** support swipe-to-action, pull-to-refresh, and long-press context menus
- [ ] **Voice Note Support** enables hands-free thank you message composition with automatic transcription
- [ ] **Progress Visualization** shows beautiful wedding-themed progress tracking with motivational messaging
- [ ] **Real-time Sync** updates instantly across all family members managing thank you notes
- [ ] **PWA Functionality** works as installed app with push notifications and offline capabilities
- [ ] **WedMe Viral Features** includes gratitude journey sharing to showcase wedding bliss and drive app adoption
- [ ] **Battery Optimization** minimizes power consumption during extended thank you writing sessions
- [ ] **Network Resilience** gracefully handles poor venue WiFi and cellular dead zones with intelligent sync
- [ ] **Social Integration** enables sharing thank you progress and wedding joy to attract new users to WedMe

Your mobile platform transforms overwhelming post-wedding thank you management into a delightful, Instagram-worthy experience that couples actually enjoy using.

**Remember**: Couples live on their phones and love sharing their happiness. Make thank you management so smooth and shareable they become your best marketing advocates! 📱💍