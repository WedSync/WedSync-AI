# WS-310 React Flow Implementation Guide - Team D
## Integration & Data Flow Specialist

### 🎯 ROLE DEFINITION
**Specialist**: React Flow Integration & Data Architecture Engineer
**Focus**: Real-time data synchronization, external integrations, and data flow optimization
**Wedding Context**: Journey data must sync across CRM systems and wedding platforms seamlessly

### 📋 PRIMARY TASK
Implement comprehensive React Flow data integration layer connecting wedding journey builders with Supabase, CRM systems (Tave, HoneyBook), and real-time synchronization for multi-vendor coordination.

### 🛠 CORE RESPONSIBILITIES

#### 1. Supabase Real-time Integration
```typescript
// Real-time journey synchronization with Supabase
interface JourneyFlowData {
  id: string;
  organization_id: string;
  client_id: string;
  journey_type: 'wedding_planning' | 'vendor_coordination' | 'client_communication';
  nodes: FlowNode[];
  edges: FlowEdge[];
  status: 'draft' | 'active' | 'completed';
  last_updated: string;
  updated_by: string;
}

const useRealtimeJourneyFlow = (journeyId: string) => {
  const [flowData, setFlowData] = useState<JourneyFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const supabase = createClient();
    
    // Initial fetch
    const fetchJourney = async () => {
      try {
        const { data, error } = await supabase
          .from('customer_journeys')
          .select(`
            *,
            journey_steps (*),
            journey_triggers (*),
            assigned_vendors (*)
          `)
          .eq('id', journeyId)
          .single();
          
        if (error) throw error;
        
        const transformedData = transformSupabaseToFlowData(data);
        setFlowData(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch journey');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJourney();
    
    // Real-time subscription
    const subscription = supabase
      .channel(`journey_${journeyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customer_journeys',
        filter: `id=eq.${journeyId}`
      }, (payload) => {
        console.log('Journey updated:', payload);
        const transformedData = transformSupabaseToFlowData(payload.new);
        setFlowData(transformedData);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'journey_steps',
        filter: `journey_id=eq.${journeyId}`
      }, (payload) => {
        console.log('Journey steps updated:', payload);
        // Update specific node in flow data
        setFlowData(prev => {
          if (!prev) return null;
          return updateFlowNodeFromStep(prev, payload.new);
        });
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [journeyId]);
  
  return { flowData, isLoading, error, setFlowData };
};

// Transform Supabase data to React Flow format
const transformSupabaseToFlowData = (data: any): JourneyFlowData => {
  const nodes: FlowNode[] = data.journey_steps?.map((step: any, index: number) => ({
    id: step.id,
    type: step.step_type === 'vendor_action' ? 'vendorNode' : 'clientNode',
    position: { 
      x: (index % 3) * 250 + 50, 
      y: Math.floor(index / 3) * 150 + 50 
    },
    data: {
      title: step.title,
      description: step.description,
      status: step.status,
      vendor_id: step.vendor_id,
      due_date: step.due_date,
      metadata: step.metadata || {},
      onUpdate: (nodeData: any) => updateJourneyStep(step.id, nodeData)
    },
    draggable: true
  })) || [];
  
  const edges: FlowEdge[] = data.journey_steps?.reduce((acc: FlowEdge[], step: any, index: number) => {
    if (step.depends_on_steps && step.depends_on_steps.length > 0) {
      step.depends_on_steps.forEach((dependsOn: string) => {
        acc.push({
          id: `${dependsOn}-${step.id}`,
          source: dependsOn,
          target: step.id,
          type: 'smoothstep',
          animated: step.status === 'in_progress',
          style: {
            strokeWidth: 2,
            stroke: step.status === 'completed' ? '#10b981' : 
                   step.status === 'in_progress' ? '#f59e0b' : '#6b7280'
          }
        });
      });
    }
    return acc;
  }, []) || [];
  
  return {
    id: data.id,
    organization_id: data.organization_id,
    client_id: data.client_id,
    journey_type: data.journey_type,
    nodes,
    edges,
    status: data.status,
    last_updated: data.updated_at,
    updated_by: data.updated_by
  };
};
```

#### 2. CRM Integration Layer
```typescript
// Multi-CRM integration for journey data
interface CRMIntegration {
  provider: 'tave' | 'honeybook' | 'dubsado' | 'studio_ninja';
  sync_enabled: boolean;
  last_sync: string;
  mapping_config: Record<string, string>;
}

class JourneyDataSyncManager {
  private integrations: Map<string, CRMIntegration> = new Map();
  
  async syncJourneyWithCRM(journeyId: string, crmProvider: string): Promise<void> {
    const journey = await this.fetchJourneyFromSupabase(journeyId);
    
    switch (crmProvider) {
      case 'tave':
        await this.syncWithTave(journey);
        break;
      case 'honeybook':
        await this.syncWithHoneybook(journey);
        break;
      default:
        throw new Error(`Unsupported CRM provider: ${crmProvider}`);
    }
  }
  
  private async syncWithTave(journey: JourneyFlowData): Promise<void> {
    // Tave API v2 integration
    const taveClient = new TaveAPIClient();
    
    // Map React Flow nodes to Tave workflow steps
    const taveWorkflow = {
      name: `Wedding Journey - ${journey.client_id}`,
      steps: journey.nodes.map(node => ({
        name: node.data.title,
        description: node.data.description,
        due_date: node.data.due_date,
        assigned_to: node.data.vendor_id,
        status: this.mapStatusToTave(node.data.status),
        metadata: {
          wedsync_node_id: node.id,
          flow_position: node.position
        }
      }))
    };
    
    try {
      const taveWorkflowId = await taveClient.createWorkflow(taveWorkflow);
      
      // Store mapping for future syncs
      await this.updateJourneyMetadata(journey.id, {
        tave_workflow_id: taveWorkflowId,
        last_tave_sync: new Date().toISOString()
      });
      
      console.log(`Journey ${journey.id} synced with Tave workflow ${taveWorkflowId}`);
    } catch (error) {
      console.error('Failed to sync with Tave:', error);
      throw new Error(`Tave sync failed: ${error}`);
    }
  }
  
  private async syncWithHoneybook(journey: JourneyFlowData): Promise<void> {
    // HoneyBook OAuth integration
    const honeybookClient = new HoneybookAPIClient();
    
    // Create HoneyBook project from journey
    const honeybookProject = {
      name: `WedSync Journey - ${journey.client_id}`,
      client_id: journey.client_id,
      tasks: journey.nodes.map(node => ({
        title: node.data.title,
        description: node.data.description,
        due_date: node.data.due_date,
        assignee: node.data.vendor_id,
        status: this.mapStatusToHoneybook(node.data.status),
        wedsync_metadata: {
          node_id: node.id,
          position: node.position
        }
      }))
    };
    
    try {
      const honeybookProjectId = await honeybookClient.createProject(honeybookProject);
      
      await this.updateJourneyMetadata(journey.id, {
        honeybook_project_id: honeybookProjectId,
        last_honeybook_sync: new Date().toISOString()
      });
      
      console.log(`Journey ${journey.id} synced with HoneyBook project ${honeybookProjectId}`);
    } catch (error) {
      console.error('Failed to sync with HoneyBook:', error);
      throw new Error(`HoneyBook sync failed: ${error}`);
    }
  }
}
```

#### 3. Real-time Collaboration System
```typescript
// Multi-user collaboration for React Flow
const useRealtimeCollaboration = (journeyId: string) => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [cursors, setCursors] = useState<UserCursor[]>([]);
  const [presence, setPresence] = useState<PresenceState>('idle');
  
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`collaboration_${journeyId}`);
    
    // Track user presence
    const userPresence = {
      user_id: userId,
      journey_id: journeyId,
      status: 'active',
      last_seen: new Date().toISOString(),
      cursor_position: { x: 0, y: 0 },
      selected_nodes: []
    };
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users = Object.keys(presenceState).map(key => ({
          id: key,
          ...presenceState[key][0]
        }));
        setActiveUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        setCursors(prev => {
          const updated = prev.filter(c => c.user_id !== payload.user_id);
          return [...updated, payload];
        });
      })
      .on('broadcast', { event: 'node_select' }, ({ payload }) => {
        // Handle node selection conflicts
        handleNodeSelectionConflict(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userPresence);
        }
      });
    
    return () => {
      channel.unsubscribe();
    };
  }, [journeyId, userId]);
  
  // Broadcast cursor movements
  const broadcastCursorMove = useCallback((x: number, y: number) => {
    const supabase = createClient();
    const channel = supabase.channel(`collaboration_${journeyId}`);
    
    channel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: {
        user_id: userId,
        x,
        y,
        timestamp: Date.now()
      }
    });
  }, [journeyId, userId]);
  
  return {
    activeUsers,
    cursors,
    presence,
    broadcastCursorMove
  };
};
```

#### 4. Workflow Automation Integration
```typescript
// Webhook-driven workflow automation
interface WorkflowTrigger {
  id: string;
  event_type: 'node_completed' | 'deadline_approaching' | 'vendor_assigned';
  conditions: Record<string, any>;
  actions: WorkflowAction[];
}

interface WorkflowAction {
  type: 'send_email' | 'send_sms' | 'create_task' | 'update_crm' | 'trigger_payment';
  config: Record<string, any>;
}

class JourneyAutomationEngine {
  async processNodeCompletion(journeyId: string, nodeId: string): Promise<void> {
    const triggers = await this.getTriggersForEvent('node_completed', journeyId);
    
    for (const trigger of triggers) {
      if (this.evaluateTriggerConditions(trigger, { nodeId })) {
        await this.executeActions(trigger.actions, { journeyId, nodeId });
      }
    }
  }
  
  private async executeActions(actions: WorkflowAction[], context: any): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'send_email':
          await this.sendAutomatedEmail(action.config, context);
          break;
        case 'update_crm':
          await this.updateCRMSystem(action.config, context);
          break;
        case 'trigger_payment':
          await this.triggerPaymentRequest(action.config, context);
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    }
  }
  
  private async sendAutomatedEmail(config: any, context: any): Promise<void> {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const templateData = {
      ...context,
      journey_url: `${process.env.NEXT_PUBLIC_APP_URL}/journeys/${context.journeyId}`,
      vendor_dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendor`
    };
    
    await resend.emails.send({
      from: 'WedSync <noreply@wedsync.com>',
      to: config.recipient_email,
      subject: this.renderTemplate(config.subject_template, templateData),
      html: this.renderTemplate(config.html_template, templateData)
    });
  }
}
```

#### 5. Data Validation & Conflict Resolution
```typescript
// Prevent data corruption in multi-user environments
const useDataConsistency = (journeyId: string) => {
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [lastKnownVersion, setLastKnownVersion] = useState<string>('');
  
  const validateAndMergeChanges = useCallback(async (
    localChanges: Partial<JourneyFlowData>,
    remoteVersion: string
  ) => {
    if (lastKnownVersion !== remoteVersion) {
      // Conflict detected - fetch latest version
      const latest = await fetchLatestJourneyVersion(journeyId);
      const conflicts = detectConflicts(localChanges, latest);
      
      if (conflicts.length > 0) {
        setConflicts(conflicts);
        return { success: false, conflicts };
      }
    }
    
    // Apply changes with optimistic locking
    const result = await updateJourneyWithVersion(journeyId, localChanges, remoteVersion);
    
    if (result.success) {
      setLastKnownVersion(result.new_version);
      setConflicts([]);
    }
    
    return result;
  }, [journeyId, lastKnownVersion]);
  
  return {
    conflicts,
    resolveConflict: (conflictId: string, resolution: ConflictResolution) => {
      // Apply conflict resolution
    },
    validateAndMergeChanges
  };
};

// Conflict detection for simultaneous edits
const detectConflicts = (localChanges: any, remoteState: any): DataConflict[] => {
  const conflicts: DataConflict[] = [];
  
  // Check for node position conflicts
  if (localChanges.nodes && remoteState.nodes) {
    localChanges.nodes.forEach((localNode: any) => {
      const remoteNode = remoteState.nodes.find((n: any) => n.id === localNode.id);
      if (remoteNode && 
          (localNode.position.x !== remoteNode.position.x || 
           localNode.position.y !== remoteNode.position.y)) {
        conflicts.push({
          type: 'position_conflict',
          node_id: localNode.id,
          local_position: localNode.position,
          remote_position: remoteNode.position
        });
      }
    });
  }
  
  return conflicts;
};
```

### 🔄 INTEGRATION CAPABILITIES

#### Supported Systems
1. **CRM Platforms**
   - Tave (REST API v2)
   - HoneyBook (OAuth2)
   - Dubsado (Webhook integration)
   - Studio Ninja (API integration)

2. **Calendar Systems**
   - Google Calendar
   - Outlook Calendar
   - Apple Calendar (CalDAV)

3. **Communication Platforms**
   - Resend (Email)
   - Twilio (SMS)
   - Slack (Team notifications)

4. **Payment Systems**
   - Stripe (Payment requests)
   - PayPal (Invoice generation)

### 🎯 REAL-TIME SYNCHRONIZATION
1. **Bi-directional sync** with CRM systems
2. **Conflict resolution** for simultaneous edits
3. **Version control** for journey states
4. **Rollback capabilities** for data recovery

### 🔐 DATA SECURITY & COMPLIANCE
1. **Encryption in transit** (TLS 1.3)
2. **Encryption at rest** (AES-256)
3. **GDPR compliance** for EU clients
4. **SOC 2 Type II** compliance
5. **Audit logging** for all data changes

### 🚀 DELIVERABLES
1. **Supabase Integration Layer** - Real-time sync with database
2. **Multi-CRM Connector** - Bi-directional sync with major CRMs
3. **Collaboration System** - Multi-user real-time editing
4. **Automation Engine** - Workflow triggers and actions
5. **Data Validation** - Conflict detection and resolution
6. **Integration Dashboard** - Monitor sync status and health

Focus on creating bulletproof data synchronization that keeps wedding teams coordinated across all their existing tools!