# 07-execution-engine.md

## Overview

Runtime system that processes journey nodes, executes modules, and manages state.

## Execution Architecture

```
class JourneyExecutor {
  private queue: ExecutionQueue
  private scheduler: CronScheduler
  private state: JourneyState
  
  async processNextNode(journeyInstance: JourneyInstance) {
    const node = this.queue.dequeue()
    const result = await this.executeModule(node.module)
    await this.updateState(journeyInstance, node, result)
    this.scheduleNext(journeyInstance)
  }
}
```

## Scheduling System

- **Cron Jobs**: Every 5 minutes check
- **Queue Priority**: Urgent > Normal > Future
- **Batch Processing**: Group similar tasks
- **Rate Limiting**: Prevent API overload

## State Management

```
interface JourneyState {
  instanceId: string
  currentNode: string
  completedNodes: string[]
  scheduledNodes: QueuedNode[]
  variables: Record<string, any>
  status: 'active' | 'paused' | 'completed' | 'failed'
}
```

## Error Handling

- **Retry Logic**: 3 attempts with backoff
- **Fallback Paths**: Alternative modules
- **Alert System**: Notify on failures
- **Recovery Mode**: Resume from last good state

## Performance Optimization

- Module result caching
- Parallel execution where possible
- Database query batching
- Lazy loading of content

## Monitoring

```
// Execution metrics
interface ExecutionMetrics {
  processingTime: number
  successRate: number
  queueDepth: number
  errorRate: number
}
```

## Supabase Integration

- Realtime subscriptions for updates
- Edge functions for execution
- Database triggers for scheduling
- Row-level security for isolation