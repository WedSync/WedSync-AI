# 03-team-management.md

# Team Management System

## What to Build

Multi-user access control with roles and permissions for supplier accounts.

## Technical Requirements

- Role-based permissions (Owner, Admin, Member)
- Invitation system via email
- Activity audit trail
- Seat limit enforcement

## Implementation

typescript

`*// Team structure*
team_members {
  id: uuid
  supplier_id: uuid
  user_id: uuid
  role: enum('owner','admin','member','viewer')
  permissions: jsonb *// Custom permissions override*
  invited_by: uuid
  invited_at: timestamp
  accepted_at: timestamp
  removed_at: timestamp
}

*// Permission matrix*
const ROLE_PERMISSIONS = {
  owner: ['*'], *// All permissions*
  admin: [
    'manage_team',
    'manage_clients',
    'manage_forms',
    'view_analytics',
    'manage_billing'
  ],
  member: [
    'manage_clients',
    'manage_forms',
    'view_analytics'
  ],
  viewer: [
    'view_clients',
    'view_analytics'
  ]
}

*// Check permission*
function canPerform(userId, supplierId, action) {
  const member = await getTeamMember(userId, supplierId);
  const permissions = member.permissions || ROLE_PERMISSIONS[member.role];
  return permissions.includes(action) || permissions.includes('*');
}`

## Critical Notes

- Email invite with 7-day expiry
- Transfer ownership requires email confirmation
- Log all permission-checked actions
- Enforce seat limits per subscription tier