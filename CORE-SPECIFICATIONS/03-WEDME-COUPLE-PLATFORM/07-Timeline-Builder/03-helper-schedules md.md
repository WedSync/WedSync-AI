# 03-helper-schedules.md

## What to Build

Scheduling system for wedding party and helper assignments, showing when each person needs to arrive and their task windows.

## Key Technical Requirements

### Helper Schedule Structure

```
interface HelperSchedule {
  helper_id: string;
  name: string;
  role: string;
  timeline_id: string;
  availability: {
    arrival_time: string;
    departure_time: string;
    break_times?: { start: string; end: string; }[];
  };
  task_blocks: {
    task_id: string;
    task_name: string;
    time_slot: { start: string; end: string; };
    location: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    completed?: boolean;
  }[];
  meal_assignment?: {
    time: string;
    location: string;
    dietary_requirements?: string;
  };
}
```

### UI Components

- Helper availability matrix
- Task load balancing view
- Break time scheduler
- Location-based grouping
- Critical path highlighting
- Mobile check-in system

## Critical Implementation Notes

- Prevent helper over-scheduling
- Account for travel time between locations
- Ensure break times for long days
- Create backup assignments for critical tasks
- SMS reminders for arrival times

## Optimization Algorithm

```
const optimizeHelperSchedule = (helpers: Helper[], tasks: Task[]) => {
  // Sort tasks by priority and time
  const sortedTasks = tasks.sort((a, b) => 
    a.priority_score - b.priority_score || a.start_time - b.start_time
  );
  
  // Assign tasks to available helpers
  return [sortedTasks.map](http://sortedTasks.map)(task => {
    const availableHelpers = helpers.filter(h => 
      isAvailable(h, task.time_slot) && 
      hasSkills(h, task.required_skills) &&
      !isOverloaded(h)
    );
    
    return {
      task,
      assigned_to: availableHelpers[0],
      backups: availableHelpers.slice(1, 3)
    };
  });
};
```