# 04-quick-actions.md

## What to Build

Centralized quick action panel in the admin dashboard for common administrative tasks, bulk operations, and emergency interventions without navigating through multiple screens.

## Key Technical Requirements

### Quick Action Categories

```
interface QuickAction {
  id: string
  category: 'user' | 'system' | 'financial' | 'support' | 'data'
  label: string
  icon: string
  action: () => Promise<void>
  requiresConfirmation: boolean
  permissions: AdminPermission[]
  keyboard_shortcut?: string
}

const quickActions: QuickAction[] = [
  // User Management
  {
    category: 'user',
    label: 'Impersonate User',
    icon: 'user-switch',
    action: async (userId: string) => {
      await createAuditLog('admin_impersonation', { userId })
      await switchToUserSession(userId)
    },
    requiresConfirmation: true,
    permissions: ['super_admin']
  },
  {
    category: 'user',
    label: 'Reset User Password',
    icon: 'key',
    action: async (email: string) => {
      await sendPasswordResetEmail(email)
      toast.success('Password reset sent')
    },
    requiresConfirmation: false,
    permissions: ['user_management']
  },
  
  // System Actions
  {
    category: 'system',
    label: 'Clear Cache',
    icon: 'refresh',
    action: async () => {
      await redis.flushdb()
      await invalidateCDN()
      toast.success('All caches cleared')
    },
    requiresConfirmation: true,
    permissions: ['system_admin'],
    keyboard_shortcut: 'cmd+shift+c'
  },
  
  // Financial Actions
  {
    category: 'financial',
    label: 'Apply Credit',
    icon: 'credit-card',
    action: async (userId: string, amount: number, reason: string) => {
      await applyAccountCredit(userId, amount, reason)
      await createAuditLog('credit_applied', { userId, amount, reason })
    },
    requiresConfirmation: true,
    permissions: ['billing_admin']
  }
]
```

### Quick Actions UI Component

```
const QuickActionsPanel = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null)
  const { permissions } = useAdminAuth()
  
  // Filter actions based on permissions
  const availableActions = quickActions.filter(action => 
    action.permissions.some(perm => permissions.includes(perm))
  )
  
  // Command palette style search
  const filteredActions = availableActions.filter(action =>
    action.label.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  return (
    <div className="quick-actions-panel">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search actions or press '/' to focus"
          value={searchQuery}
          onChange={(e) => setSearchQuery([e.target](http://e.target).value)}
          onKeyDown={handleKeyboardShortcuts}
        />
      </div>
      
      <div className="action-categories">
        {Object.entries(groupBy(filteredActions, 'category')).map(([category, actions]) => (
          <div key={category} className="action-category">
            <h3>{category.toUpperCase()}</h3>
            <div className="action-grid">
              {[actions.map](http://actions.map)(action => (
                <ActionButton
                  key={[action.id](http://action.id)}
                  action={action}
                  onClick={() => executeAction(action)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {selectedAction && (
        <ActionModal
          action={selectedAction}
          onConfirm={handleActionConfirm}
          onCancel={() => setSelectedAction(null)}
        />
      )}
    </div>
  )
}
```

### Bulk Operations Component

```
const BulkOperations = () => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [operation, setOperation] = useState<string>('')
  
  const bulkOperations = [
    {
      id: 'extend_trial',
      label: 'Extend Trial',
      action: async (userIds: string[]) => {
        const result = await db.update('suppliers')
          .set({ trial_ends_at: addDays(new Date(), 14) })
          .where('id', 'in', userIds)
        return result
      }
    },
    {
      id: 'send_email',
      label: 'Send Bulk Email',
      action: async (userIds: string[], template: string, data: any) => {
        await queueBulkEmails(userIds, template, data)
      }
    },
    {
      id: 'export_data',
      label: 'Export User Data',
      action: async (userIds: string[]) => {
        const data = await exportUserData(userIds)
        downloadCSV(data, `users_export_${[Date.now](http://Date.now)()}.csv`)
      }
    }
  ]
  
  return (
    <div className="bulk-operations">
      <h3>Bulk Operations</h3>
      
      <div className="selection-info">
        {selectedUsers.length} users selected
      </div>
      
      <select 
        value={operation} 
        onChange={(e) => setOperation([e.target](http://e.target).value)}
      >
        <option value="">Select operation...</option>
        {[bulkOperations.map](http://bulkOperations.map)(op => (
          <option key={[op.id](http://op.id)} value={[op.id](http://op.id)}>{op.label}</option>
        ))}
      </select>
      
      <button 
        onClick={() => executeBulkOperation(operation, selectedUsers)}
        disabled={!operation || selectedUsers.length === 0}
      >
        Execute on {selectedUsers.length} users
      </button>
    </div>
  )
}
```

### Emergency Actions Panel

```
const EmergencyActions = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  
  const emergencyActions = [
    {
      label: 'Enable Maintenance Mode',
      severity: 'warning',
      action: async () => {
        await redis.set('maintenance_mode', 'true')
        await notifyAllUsers('Platform maintenance in progress')
        setMaintenanceMode(true)
      }
    },
    {
      label: 'Disable All Webhooks',
      severity: 'critical',
      action: async () => {
        await db.update('webhooks').set({ enabled: false })
        await createAlert('All webhooks disabled by admin', 'critical')
      }
    },
    {
      label: 'Pause All Subscriptions',
      severity: 'critical',
      action: async () => {
        await stripe.subscriptions.pauseCollection({ behavior: 'mark_uncollectible' })
        await createAlert('Subscription processing paused', 'critical')
      }
    },
    {
      label: 'Force Logout All Users',
      severity: 'critical',
      action: async () => {
        await supabase.auth.admin.signOut({ scope: 'global' })
        await redis.flushdb() // Clear all sessions
      }
    }
  ]
  
  return (
    <div className="emergency-panel">
      <h3 className="text-red-600">⚠️ Emergency Actions</h3>
      <p className="text-sm text-gray-600">
        Use only in critical situations. All actions are logged.
      </p>
      
      {[emergencyActions.map](http://emergencyActions.map)(action => (
        <button
          key={action.label}
          className={`emergency-btn severity-${action.severity}`}
          onClick={() => confirmAndExecute(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
```

## Critical Implementation Notes

1. **Audit Everything**: Every quick action must create detailed audit logs
2. **Permission Guards**: Double-check permissions before action execution
3. **Confirmation Dialogs**: Critical actions need explicit confirmation with typed text
4. **Rate Limiting**: Prevent accidental spam of actions (max 10 per minute)
5. **Keyboard Shortcuts**: Power users need quick keyboard access
6. **Undo Capability**: Where possible, provide undo for recent actions
7. **Action History**: Show last 10 actions performed with timestamps

## Database Structure

```
CREATE TABLE admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id),
  action_type VARCHAR(100) NOT NULL,
  action_category VARCHAR(50),
  target_type VARCHAR(50), -- 'user', 'supplier', 'system'
  target_id VARCHAR(255),
  parameters JSONB,
  result JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions_log(admin_id);
CREATE INDEX idx_admin_actions_created ON admin_actions_log(created_at DESC);
CREATE INDEX idx_admin_actions_type ON admin_actions_log(action_type);

-- Quick action templates for common tasks
CREATE TABLE quick_action_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  action_type VARCHAR(100),
  parameters JSONB,
  permissions TEXT[],
  keyboard_shortcut VARCHAR(50),
  created_by UUID REFERENCES admin_users(id),
  is_public BOOLEAN DEFAULT false
);
```