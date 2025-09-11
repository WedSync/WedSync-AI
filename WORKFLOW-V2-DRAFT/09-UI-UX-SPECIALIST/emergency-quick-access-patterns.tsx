/**
 * Emergency Quick Access Patterns for Wedding Day Critical Scenarios
 * UI/UX Specialist Design Library - Context-Aware Emergency Actions
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion'

// Wedding Day Emergency Action Types
interface EmergencyAction {
  id: string
  label: string
  icon: string
  action: () => void
  severity: 'critical' | 'high' | 'medium'
  context: WeddingContext
  quickAccess: boolean
}

interface WeddingContext {
  phase: 'setup' | 'ceremony' | 'reception' | 'breakdown'
  vendorRole: 'photographer' | 'coordinator' | 'caterer' | 'dj' | 'florist'
  stressLevel: 'normal' | 'elevated' | 'critical'
  connectivity: 'online' | 'poor' | 'offline'
}

// Context-Aware Floating Action Button System
export const WeddingDayFAB = ({ context, onEmergencyAction }: {
  context: WeddingContext
  onEmergencyAction: (action: EmergencyAction) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [emergencyActions, setEmergencyActions] = useState<EmergencyAction[]>([])

  useEffect(() => {
    // Load context-specific emergency actions
    const actions = getContextualEmergencyActions(context)
    setEmergencyActions(actions)
  }, [context])

  const getContextualEmergencyActions = (ctx: WeddingContext): EmergencyAction[] => {
    const baseActions: Record<string, EmergencyAction[]> = {
      photographer: {
        setup: [
          {
            id: 'contact-coordinator',
            label: 'Contact Coordinator',
            icon: '📞',
            action: () => initiateEmergencyCall('coordinator'),
            severity: 'high',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'equipment-backup',
            label: 'Equipment Backup',
            icon: '📷',
            action: () => requestEquipmentBackup(),
            severity: 'critical',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'lighting-issue',
            label: 'Report Lighting Issue',
            icon: '💡',
            action: () => reportVenueIssue('lighting'),
            severity: 'medium',
            context: ctx,
            quickAccess: false
          }
        ],
        ceremony: [
          {
            id: 'silent-mode-alert',
            label: 'Silent Mode Alert',
            icon: '🔇',
            action: () => enableSilentMode(),
            severity: 'critical',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'battery-warning',
            label: 'Battery Low Warning',
            icon: '🔋',
            action: () => batteryEmergencyProtocol(),
            severity: 'high',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'backup-photographer',
            label: 'Request Backup',
            icon: '👥',
            action: () => requestBackupPhotographer(),
            severity: 'critical',
            context: ctx,
            quickAccess: true
          }
        ],
        reception: [
          {
            id: 'timeline-late',
            label: 'Timeline Running Late',
            icon: '⏰',
            action: () => reportTimelineDelay(),
            severity: 'high',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'special-moment',
            label: 'Special Moment Alert',
            icon: '✨',
            action: () => alertSpecialMoment(),
            severity: 'medium',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'storage-full',
            label: 'Storage Full',
            icon: '💾',
            action: () => storageEmergencyProtocol(),
            severity: 'critical',
            context: ctx,
            quickAccess: true
          }
        ]
      },
      coordinator: {
        setup: [
          {
            id: 'weather-alert',
            label: 'Weather Emergency',
            icon: '🌦️',
            action: () => activateWeatherProtocol(),
            severity: 'critical',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'vendor-delay',
            label: 'Vendor Delay',
            icon: '🚛',
            action: () => reportVendorDelay(),
            severity: 'high',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'equipment-issue',
            label: 'Equipment Issue',
            icon: '⚠️',
            action: () => reportEquipmentIssue(),
            severity: 'high',
            context: ctx,
            quickAccess: true
          }
        ],
        ceremony: [
          {
            id: 'timeline-adjustment',
            label: 'Adjust Timeline',
            icon: '📅',
            action: () => quickTimelineAdjustment(),
            severity: 'high',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'guest-emergency',
            label: 'Guest Emergency',
            icon: '🚨',
            action: () => handleGuestEmergency(),
            severity: 'critical',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'audio-problem',
            label: 'Audio Problem',
            icon: '🎤',
            action: () => reportAudioIssue(),
            severity: 'high',
            context: ctx,
            quickAccess: true
          }
        ],
        reception: [
          {
            id: 'catering-delay',
            label: 'Catering Delay',
            icon: '🍽️',
            action: () => reportCateringDelay(),
            severity: 'high',
            context: ctx,
            quickAccess: true
          },
          {
            id: 'music-request',
            label: 'Music Request',
            icon: '🎵',
            action: () => forwardMusicRequest(),
            severity: 'medium',
            context: ctx,
            quickAccess: false
          },
          {
            id: 'cleanup-early',
            label: 'Early Cleanup',
            icon: '🧹',
            action: () => initiateEarlyCleanup(),
            severity: 'medium',
            context: ctx,
            quickAccess: false
          }
        ]
      }
    }

    return baseActions[ctx.vendorRole]?.[ctx.phase] || []
  }

  const primaryActions = emergencyActions.filter(a => a.quickAccess && a.severity === 'critical')
  const secondaryActions = emergencyActions.filter(a => a.quickAccess && a.severity === 'high')

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 space-y-3"
          >
            {/* Primary Critical Actions */}
            {primaryActions.map((action, index) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  onEmergencyAction(action)
                  action.action()
                  setIsExpanded(false)
                }}
                className="flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-red-700 transition-colors min-w-max"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </motion.button>
            ))}
            
            {/* Secondary High Priority Actions */}
            {secondaryActions.map((action, index) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (primaryActions.length + index) * 0.1 }}
                onClick={() => {
                  onEmergencyAction(action)
                  action.action()
                  setIsExpanded(false)
                }}
                className="flex items-center gap-3 bg-orange-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors min-w-max"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-colors ${
          context.stressLevel === 'critical' 
            ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
            : context.stressLevel === 'elevated'
            ? 'bg-orange-600 hover:bg-orange-700'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <motion.span
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {context.stressLevel === 'critical' ? '🚨' : '⚡'}
        </motion.span>
      </motion.button>
    </div>
  )
}

// Swipe Gesture Library for Wedding Day Quick Actions
export const SwipeActionLibrary = {
  photographer: {
    photoManagement: {
      swipeRight: (photoId: string) => {
        // Mark photo as favorite for client gallery
        markPhotoAsFavorite(photoId)
        showFeedback('Added to favorites ⭐')
      },
      swipeLeft: (photoId: string) => {
        // Mark for deletion (with undo option)
        markPhotoForDeletion(photoId)
        showFeedback('Marked for deletion 🗑️', { undo: true })
      },
      swipeUp: (photoId: string) => {
        // Upload to client gallery immediately
        uploadToClientGallery(photoId)
        showFeedback('Uploaded to client gallery 📤')
      },
      swipeDown: (photoId: string) => {
        // Add to timeline milestone
        addToTimelineMilestone(photoId)
        showFeedback('Added to timeline 📅')
      }
    }
  },
  coordinator: {
    taskManagement: {
      swipeRight: (taskId: string) => {
        // Mark task as complete
        markTaskComplete(taskId)
        showFeedback('Task completed ✅')
      },
      swipeLeft: (taskId: string) => {
        // Report delay or issue
        reportTaskDelay(taskId)
        showFeedback('Delay reported ⏰')
      },
      longPress: (vendorId: string) => {
        // Show vendor quick contact options
        showVendorQuickContact(vendorId)
      },
      doubleTap: (locationId: string) => {
        // Quick photo documentation
        openCameraForDocumentation(locationId)
      }
    }
  }
}

// Voice Command System for Hands-Free Emergency Actions
export const VoiceEmergencyCommands = {
  'Emergency contact coordinator': () => {
    initiateEmergencyCall('coordinator')
    announceAction('Calling coordinator')
  },
  'Timeline delay fifteen minutes': () => {
    updateTimelineDelay(15)
    announceAction('Timeline delayed 15 minutes')
  },
  'Send update to all vendors': () => {
    broadcastStatusUpdate()
    announceAction('Update sent to all vendors')
  },
  'Photo backup needed': () => {
    requestBackupPhotographer()
    announceAction('Backup photographer requested')
  },
  'Weather alert activated': () => {
    activateWeatherProtocol()
    announceAction('Weather alert activated')
  },
  'Mark milestone complete': () => {
    markCurrentMilestoneComplete()
    announceAction('Milestone marked complete')
  }
}

// Offline Emergency Action Queue
export class OfflineEmergencyQueue {
  private queue: EmergencyAction[] = []
  private isOnline = navigator.onLine

  constructor() {
    window.addEventListener('online', this.syncQueue.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }

  queueEmergencyAction(action: EmergencyAction, details: any) {
    const queuedAction = {
      ...action,
      timestamp: new Date().toISOString(),
      details,
      synced: false
    }

    if (this.isOnline) {
      this.executeAction(queuedAction)
    } else {
      this.queue.push(queuedAction)
      this.storeInLocalStorage()
      this.showOfflineNotification(action.label)
    }
  }

  private async syncQueue() {
    this.isOnline = true
    
    for (const action of this.queue) {
      try {
        await this.executeAction(action)
        action.synced = true
      } catch (error) {
        console.error('Failed to sync emergency action:', error)
      }
    }

    // Remove synced actions
    this.queue = this.queue.filter(action => !action.synced)
    this.storeInLocalStorage()
  }

  private handleOffline() {
    this.isOnline = false
    this.showOfflineNotification('Working offline - emergency actions will sync when connected')
  }

  private storeInLocalStorage() {
    localStorage.setItem('wedding-emergency-queue', JSON.stringify(this.queue))
  }

  private async executeAction(action: any) {
    // Execute the emergency action when online
    try {
      await fetch('/api/emergency-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      })
    } catch (error) {
      throw new Error(`Failed to execute emergency action: ${error}`)
    }
  }

  private showOfflineNotification(message: string) {
    // Show user-friendly offline notification
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded-lg z-50'
    notification.textContent = `Offline: ${message}`
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.remove()
    }, 5000)
  }
}

// Context-Aware Quick Access Bar
export const WeddingDayQuickBar = ({ context }: { context: WeddingContext }) => {
  const quickActions = getQuickBarActions(context)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {quickActions.map(action => (
          <button
            key={action.id}
            onClick={action.action}
            className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
              action.severity === 'critical' 
                ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl mb-1">{action.icon}</span>
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Helper functions (would be implemented in actual app)
const initiateEmergencyCall = (role: string) => console.log(`Emergency call to ${role}`)
const requestEquipmentBackup = () => console.log('Equipment backup requested')
const reportVenueIssue = (issue: string) => console.log(`Venue issue: ${issue}`)
const enableSilentMode = () => console.log('Silent mode enabled')
const batteryEmergencyProtocol = () => console.log('Battery emergency protocol activated')
const requestBackupPhotographer = () => console.log('Backup photographer requested')
const reportTimelineDelay = () => console.log('Timeline delay reported')
const alertSpecialMoment = () => console.log('Special moment alert sent')
const storageEmergencyProtocol = () => console.log('Storage emergency protocol activated')
const activateWeatherProtocol = () => console.log('Weather protocol activated')
const reportVendorDelay = () => console.log('Vendor delay reported')
const reportEquipmentIssue = () => console.log('Equipment issue reported')
const quickTimelineAdjustment = () => console.log('Quick timeline adjustment')
const handleGuestEmergency = () => console.log('Guest emergency handled')
const reportAudioIssue = () => console.log('Audio issue reported')
const reportCateringDelay = () => console.log('Catering delay reported')
const forwardMusicRequest = () => console.log('Music request forwarded')
const initiateEarlyCleanup = () => console.log('Early cleanup initiated')
const markPhotoAsFavorite = (id: string) => console.log(`Photo ${id} marked as favorite`)
const markPhotoForDeletion = (id: string) => console.log(`Photo ${id} marked for deletion`)
const uploadToClientGallery = (id: string) => console.log(`Photo ${id} uploaded to client gallery`)
const addToTimelineMilestone = (id: string) => console.log(`Photo ${id} added to timeline`)
const markTaskComplete = (id: string) => console.log(`Task ${id} completed`)
const reportTaskDelay = (id: string) => console.log(`Task ${id} delay reported`)
const showVendorQuickContact = (id: string) => console.log(`Quick contact for vendor ${id}`)
const openCameraForDocumentation = (id: string) => console.log(`Camera opened for location ${id}`)
const showFeedback = (message: string, options?: any) => console.log(`Feedback: ${message}`)
const updateTimelineDelay = (minutes: number) => console.log(`Timeline delayed ${minutes} minutes`)
const broadcastStatusUpdate = () => console.log('Status update broadcast')
const announceAction = (action: string) => console.log(`Voice announcement: ${action}`)
const markCurrentMilestoneComplete = () => console.log('Current milestone marked complete')
const getQuickBarActions = (context: WeddingContext) => []