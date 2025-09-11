# 04-share-controls.md

## What to Build

Granular sharing system allowing couples to control which timeline views different stakeholders can access.

## Key Technical Requirements

### Sharing Permissions Model

```
interface TimelineSharing {
  timeline_id: string;
  share_settings: {
    public_url?: string; // Guest-facing simplified timeline
    expiry_date?: Date;
    password_protected: boolean;
    password?: string;
  };
  stakeholder_access: {
    stakeholder_type: 'supplier' | 'helper' | 'guest' | 'coordinator';
    user_id?: string;
    email?: string;
    permissions: {
      view_full_timeline: boolean;
      view_supplier_details: boolean;
      view_helper_assignments: boolean;
      view_private_notes: boolean;
      can_comment: boolean;
      can_suggest_changes: boolean;
    };
    custom_view?: {
      show_events: string[]; // event_ids
      hide_details: string[]; // field names
      time_range?: { start: string; end: string; };
    };
  }[];
}
```

### UI Controls

- Permission matrix with checkboxes
- Preview as stakeholder view
- Share link generator with QR code
- Revoke access management
- View access logs
- Bulk permission templates

## Critical Implementation Notes

- Read-only by default for all shares
- Track who viewed and when
- Watermark on printed versions
- Auto-expire guest links after wedding
- Email notifications for timeline updates

## Share Link Generation

```
const generateShareLink = async (timeline: Timeline, permissions: SharePermissions) => {
  const token = generateSecureToken();
  
  await supabase.from('timeline_shares').insert({
    timeline_id: [timeline.id](http://timeline.id),
    token,
    permissions,
    created_at: new Date(),
    expires_at: addDays(new Date(), 30),
    access_log: []
  });
  
  return {
    url: `${BASE_URL}/timeline/view/${token}`,
    qr_code: await generateQRCode(`${BASE_URL}/timeline/view/${token}`)
  };
};
```