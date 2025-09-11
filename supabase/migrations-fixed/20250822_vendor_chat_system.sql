-- WARNING: This migration references tables that may not exist: chat_rooms, chat_messages, UNIQUE
-- Ensure these tables are created first

-- Vendor Chat System Migration
-- WS-078: Real-time Wedding Communication Hub
-- Purpose: Enable real-time messaging between wedding planners and vendors

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CHAT ROOMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Room Information
  room_name VARCHAR(255) NOT NULL,
  room_type VARCHAR(50) NOT NULL CHECK (room_type IN ('vendor_coordination', 'private', 'group', 'announcement')),
  description TEXT,
  room_avatar_url VARCHAR(500),
  
  -- Wedding/Event Association
  wedding_id UUID,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Room Settings
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  allow_attachments BOOLEAN DEFAULT true,
  allow_voice_notes BOOLEAN DEFAULT true,
  max_file_size_mb INTEGER DEFAULT 25,
  
  -- Security & Privacy
  is_encrypted BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  visibility VARCHAR(50) DEFAULT 'participants' CHECK (visibility IN ('participants', 'organization', 'public')),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  
  -- Search & Organization
  tags TEXT[],
  category VARCHAR(100),
  
  CONSTRAINT unique_room_per_wedding_vendor UNIQUE(organization_id, wedding_id, room_type)
);

-- =====================================================
-- CHAT ROOM PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_room_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Participant Information
  participant_type VARCHAR(50) NOT NULL CHECK (participant_type IN ('planner', 'vendor', 'client', 'assistant', 'guest')),
  display_name VARCHAR(255),
  avatar_url VARCHAR(500),
  
  -- Vendor Association (if applicable)
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  vendor_role VARCHAR(100), -- photographer, caterer, florist, etc.
  
  -- Permissions
  can_send_messages BOOLEAN DEFAULT true,
  can_share_files BOOLEAN DEFAULT true,
  can_add_participants BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  is_moderator BOOLEAN DEFAULT false,
  
  -- Status & Activity
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'left')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  last_read_message_id UUID,
  
  -- Notifications
  notification_preference VARCHAR(50) DEFAULT 'all' CHECK (notification_preference IN ('all', 'mentions', 'important', 'none')),
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  
  -- Metadata
  unread_count INTEGER DEFAULT 0,
  mention_count INTEGER DEFAULT 0,
  
  CONSTRAINT unique_participant_per_room UNIQUE(room_id, user_id)
);

-- =====================================================
-- CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Message Content
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('text', 'file', 'image', 'voice', 'system', 'announcement')),
  content TEXT,
  formatted_content JSONB, -- For rich text formatting
  
  -- Threading
  parent_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  thread_count INTEGER DEFAULT 0,
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment objects
  
  -- Mentions & References
  mentions UUID[], -- Array of user IDs mentioned
  referenced_vendors UUID[], -- Array of supplier IDs referenced
  
  -- Status & Delivery
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  delivered_to UUID[], -- Array of user IDs who received the message
  read_by UUID[], -- Array of user IDs who read the message
  
  -- Edit History
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  edit_history JSONB DEFAULT '[]'::jsonb,
  
  -- Deletion
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Search
  search_vector tsvector
);

-- =====================================================
-- CHAT ATTACHMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  mime_type VARCHAR(100),
  file_size_bytes BIGINT,
  
  -- Storage
  storage_path VARCHAR(500) NOT NULL,
  storage_bucket VARCHAR(100) DEFAULT 'chat-attachments',
  public_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  
  -- File Categories
  category VARCHAR(50) CHECK (category IN ('document', 'image', 'video', 'audio', 'contract', 'invoice', 'other')),
  
  -- Security
  is_encrypted BOOLEAN DEFAULT false,
  scan_status VARCHAR(50) DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'infected', 'error')),
  scan_results JSONB,
  
  -- Metadata
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Access Control
  expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- CHAT PRESENCE TABLE (for online status)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  
  -- Presence Information
  status VARCHAR(50) DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  custom_status VARCHAR(255),
  is_typing BOOLEAN DEFAULT false,
  typing_in_thread UUID, -- Reference to parent message if typing in thread
  
  -- Activity
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_type VARCHAR(50),
  app_version VARCHAR(50),
  
  -- Location (for mobile)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  CONSTRAINT unique_presence_per_user_room UNIQUE(user_id, room_id)
);

-- =====================================================
-- CHAT NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  
  -- Notification Type
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('message', 'mention', 'file', 'announcement', 'urgent')),
  
  -- Content
  title VARCHAR(255),
  body TEXT,
  action_url VARCHAR(500),
  
  -- Delivery Status
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Read Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- VENDOR COMMUNICATION PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_communication_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Chat Preferences
  chat_enabled BOOLEAN DEFAULT true,
  preferred_chat_hours JSONB, -- { "monday": { "start": "09:00", "end": "17:00" }, ... }
  auto_response_enabled BOOLEAN DEFAULT false,
  auto_response_message TEXT,
  
  -- Notification Preferences
  urgent_notifications_only BOOLEAN DEFAULT false,
  weekend_notifications BOOLEAN DEFAULT false,
  notification_sound VARCHAR(50),
  
  -- Integration Preferences
  sync_with_calendar BOOLEAN DEFAULT true,
  sync_with_email BOOLEAN DEFAULT false,
  forward_to_email VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_vendor_preferences UNIQUE(supplier_id, user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Chat Rooms Indexes
CREATE INDEX idx_chat_rooms_organization ON chat_rooms(organization_id);
CREATE INDEX idx_chat_rooms_wedding ON chat_rooms(wedding_id);
CREATE INDEX idx_chat_rooms_client ON chat_rooms(client_id);
CREATE INDEX idx_chat_rooms_active ON chat_rooms(is_active) WHERE is_active = true;
CREATE INDEX idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC);

-- Participants Indexes
CREATE INDEX idx_participants_room ON chat_room_participants(room_id);
CREATE INDEX idx_participants_user ON chat_room_participants(user_id);
CREATE INDEX idx_participants_supplier ON chat_room_participants(supplier_id);
CREATE INDEX idx_participants_active ON chat_room_participants(status) WHERE status = 'active';

-- Messages Indexes
CREATE INDEX idx_messages_room ON chat_messages(room_id);
CREATE INDEX idx_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_messages_parent ON chat_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_messages_search ON chat_messages USING gin(search_vector);

-- Attachments Indexes
CREATE INDEX idx_attachments_message ON chat_attachments(message_id);
CREATE INDEX idx_attachments_room ON chat_attachments(room_id);
CREATE INDEX idx_attachments_uploader ON chat_attachments(uploader_id);

-- Presence Indexes
CREATE INDEX idx_presence_user ON chat_presence(user_id);
CREATE INDEX idx_presence_room ON chat_presence(room_id);
CREATE INDEX idx_presence_activity ON chat_presence(last_activity_at DESC);

-- Notifications Indexes
CREATE INDEX idx_notifications_user ON chat_notifications(user_id);
CREATE INDEX idx_notifications_unread ON chat_notifications(user_id, is_read) WHERE is_read = false;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_communication_preferences ENABLE ROW LEVEL SECURITY;

-- Chat Rooms Policies
CREATE POLICY "Users can view rooms they participate in"
  ON chat_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants
      WHERE room_id = chat_rooms.id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can create rooms"
  ON chat_rooms FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Room admins can update rooms"
  ON chat_rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants
      WHERE room_id = chat_rooms.id
      AND user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Messages Policies
CREATE POLICY "Participants can view messages in their rooms"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants
      WHERE room_id = chat_messages.room_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Active participants can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_room_participants
      WHERE room_id = chat_messages.room_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND can_send_messages = true
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON chat_messages FOR UPDATE
  USING (sender_id = auth.uid() AND NOT is_deleted);

-- Attachments Policies
CREATE POLICY "Participants can view attachments in their rooms"
  ON chat_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants
      WHERE room_id = chat_attachments.room_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Active participants can upload attachments"
  ON chat_attachments FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_room_participants
      WHERE room_id = chat_attachments.room_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND can_share_files = true
    )
  );

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON chat_notifications FOR ALL
  USING (user_id = auth.uid());

-- Presence Policies
CREATE POLICY "Anyone can view presence in their rooms"
  ON chat_presence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants
      WHERE room_id = chat_presence.room_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Users can update their own presence"
  ON chat_presence FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update last_message_at in chat_rooms
CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET last_message_at = NEW.created_at
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_last_message_trigger
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_room_last_message();

-- Function to update search vector for messages
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_search_vector_trigger
BEFORE INSERT OR UPDATE OF content ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_message_search_vector();

-- Function to increment unread count for participants
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_room_participants
  SET unread_count = unread_count + 1
  WHERE room_id = NEW.room_id
  AND user_id != NEW.sender_id
  AND status = 'active';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_unread_count_trigger
AFTER INSERT ON chat_messages
FOR EACH ROW
WHEN (NEW.message_type != 'system')
EXECUTE FUNCTION increment_unread_count();

-- Function to reset unread count when message is read
CREATE OR REPLACE FUNCTION reset_unread_count(p_room_id UUID, p_user_id UUID, p_message_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_room_participants
  SET unread_count = 0,
      last_read_message_id = p_message_id
  WHERE room_id = p_room_id
  AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a vendor coordination room
CREATE OR REPLACE FUNCTION create_vendor_coordination_room(
  p_organization_id UUID,
  p_wedding_id UUID,
  p_client_id UUID,
  p_room_name VARCHAR,
  p_vendor_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_vendor_id UUID;
BEGIN
  -- Create the room
  INSERT INTO chat_rooms (
    organization_id,
    wedding_id,
    client_id,
    room_name,
    room_type,
    created_by
  ) VALUES (
    p_organization_id,
    p_wedding_id,
    p_client_id,
    p_room_name,
    'vendor_coordination',
    auth.uid()
  ) RETURNING id INTO v_room_id;
  
  -- Add the creator as admin
  INSERT INTO chat_room_participants (
    room_id,
    user_id,
    participant_type,
    is_admin,
    is_moderator
  ) VALUES (
    v_room_id,
    auth.uid(),
    'planner',
    true,
    true
  );
  
  -- Add vendors as participants
  FOREACH v_vendor_id IN ARRAY p_vendor_ids
  LOOP
    INSERT INTO chat_room_participants (
      room_id,
      user_id,
      supplier_id,
      participant_type
    )
    SELECT 
      v_room_id,
      u.id,
      v_vendor_id,
      'vendor'
    FROM auth.users u
    JOIN suppliers s ON s.organization_id::text = u.raw_user_meta_data->>'organization_id'
    WHERE s.id = v_vendor_id;
  END LOOP;
  
  -- Send initial system message
  INSERT INTO chat_messages (
    room_id,
    message_type,
    content
  ) VALUES (
    v_room_id,
    'system',
    'Vendor coordination room created. All vendors have been added to the conversation.'
  );
  
  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA FOR TESTING (Remove in production)
-- =====================================================

-- Note: Sample data should be added via seed files or test scripts, not in migrations