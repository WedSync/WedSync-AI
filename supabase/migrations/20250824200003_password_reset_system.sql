-- Password Reset System Migration
-- Creates all necessary tables for secure password reset functionality

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting table for password resets and other operations
CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security events table for audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates for password reset
INSERT INTO email_templates (id, name, subject_template, html_template, text_template, template_variables, category, is_active, created_at, updated_at) VALUES
(
  'password_reset',
  'Password Reset Request',
  'Reset your WedSync password',
  '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - WedSync</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-top: 40px; margin-bottom: 40px; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .logo { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .button { display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .button:hover { background-color: #1d4ed8; }
        .security-info { background-color: #f8f9ff; padding: 20px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0; }
        .warning { background-color: #fef3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
        .small { font-size: 14px; color: #666; }
        .code { background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">WedSync</div>
            <h1 style="margin: 0; font-size: 24px; color: #1f2937;">Password Reset Request</h1>
        </div>
        
        <p>Hello {user_name},</p>
        
        <p>We received a request to reset the password for your WedSync account associated with <strong>{user_email}</strong>.</p>
        
        <p>If you made this request, click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" class="button">Reset Your Password</a>
        </div>
        
        <p class="small">Or copy and paste this link into your browser:</p>
        <p class="small code">{reset_url}</p>
        
        <div class="security-info">
            <h3 style="margin-top: 0; color: #2563eb;">Security Information</h3>
            <ul class="small">
                <li><strong>Link expires:</strong> {expires_in} from now ({timestamp})</li>
                <li><strong>Request from:</strong> {ip_address}</li>
                <li><strong>Browser:</strong> {user_agent}</li>
            </ul>
        </div>
        
        <div class="warning">
            <h3 style="margin-top: 0; color: #f59e0b;">⚠️ Important Security Notice</h3>
            <p class="small" style="margin-bottom: 0;">
                If you did not request this password reset, please ignore this email and consider:
            </p>
            <ul class="small">
                <li>Your account is still secure</li>
                <li>No changes have been made to your password</li>
                <li>Contact support if you''re concerned about unauthorized access</li>
            </ul>
        </div>
        
        <p class="small">For your security, this link can only be used once and will expire in {expires_in}.</p>
        
        <div class="footer">
            <p>Need help? Contact us at <a href="mailto:{support_email}" style="color: #2563eb;">{support_email}</a></p>
            <p>© 2024 WedSync. All rights reserved.</p>
            <p>This is an automated security email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>',
  'Password Reset Request - WedSync

Hello {user_name},

We received a request to reset the password for your WedSync account ({user_email}).

If you made this request, please visit the following link to reset your password:
{reset_url}

Security Information:
- Link expires: {expires_in} from now
- Request from: {ip_address}
- Time: {timestamp}

⚠️ IMPORTANT: If you did not request this password reset, please ignore this email. Your account remains secure and no changes have been made to your password.

For security, this link can only be used once and will expire in {expires_in}.

Need help? Contact us at {support_email}

© 2024 WedSync. All rights reserved.
This is an automated security email. Please do not reply.',
  ARRAY['user_name', 'user_email', 'reset_url', 'expires_in', 'ip_address', 'user_agent', 'support_email', 'timestamp'],
  'transactional',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  template_variables = EXCLUDED.template_variables,
  updated_at = NOW();

-- Password reset confirmation template
INSERT INTO email_templates (id, name, subject_template, html_template, text_template, template_variables, category, is_active, created_at, updated_at) VALUES
(
  'password_reset_confirmation',
  'Password Reset Confirmation',
  'Your WedSync password has been changed',
  '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed - WedSync</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-top: 40px; margin-bottom: 40px; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .logo { font-size: 28px; font-weight: bold; color: #16a34a; margin-bottom: 10px; }
        .success-icon { background-color: #dcfce7; color: #16a34a; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 20px auto; font-size: 24px; }
        .button { display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .security-info { background-color: #f0f9ff; padding: 20px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
        .small { font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">WedSync</div>
            <div class="success-icon">✓</div>
            <h1 style="margin: 0; font-size: 24px; color: #16a34a;">Password Successfully Changed</h1>
        </div>
        
        <p>Hello {user_name},</p>
        
        <p>This email confirms that the password for your WedSync account <strong>{user_email}</strong> has been successfully changed.</p>
        
        <div class="security-info">
            <h3 style="margin-top: 0; color: #0ea5e9;">Change Details</h3>
            <ul class="small">
                <li><strong>Changed at:</strong> {reset_time}</li>
                <li><strong>IP Address:</strong> {ip_address}</li>
                <li><strong>Browser:</strong> {user_agent}</li>
            </ul>
        </div>
        
        <p>You can now log in to your account using your new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{login_url}" class="button">Log In to WedSync</a>
        </div>
        
        <div style="background-color: #fef3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #f59e0b;">⚠️ Didn''t change your password?</h3>
            <p class="small" style="margin-bottom: 0;">
                If you did not make this change, your account may have been compromised. Please:
            </p>
            <ul class="small">
                <li>Log in immediately and change your password again</li>
                <li>Review your recent account activity</li>
                <li>Contact our support team at <a href="mailto:{support_email}" style="color: #f59e0b;">{support_email}</a></li>
            </ul>
        </div>
        
        <p class="small">For your security, all existing sessions have been logged out. You will need to log in again on all devices.</p>
        
        <div class="footer">
            <p>Need help? Contact us at <a href="mailto:{support_email}" style="color: #2563eb;">{support_email}</a></p>
            <p>© 2024 WedSync. All rights reserved.</p>
            <p>This is an automated security notification. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>',
  'Password Changed - WedSync

Hello {user_name},

This email confirms that the password for your WedSync account ({user_email}) has been successfully changed.

Change Details:
- Changed at: {reset_time}
- IP Address: {ip_address}

You can now log in using your new password at: {login_url}

⚠️ IMPORTANT: If you did not make this change, your account may have been compromised. Please log in immediately and change your password again, then contact support at {support_email}.

For security, all existing sessions have been logged out.

Need help? Contact us at {support_email}

© 2024 WedSync. All rights reserved.',
  ARRAY['user_name', 'user_email', 'reset_time', 'ip_address', 'user_agent', 'support_email', 'login_url'],
  'transactional',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  template_variables = EXCLUDED.template_variables,
  updated_at = NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens(used);

CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_identifier ON rate_limit_requests(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_timestamp ON rate_limit_requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limit_requests_window_start ON rate_limit_requests(window_start);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

-- Add password_updated_at column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN password_updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create cleanup function to remove expired tokens and old rate limit records
CREATE OR REPLACE FUNCTION cleanup_password_reset_system()
RETURNS void AS $$
BEGIN
    -- Delete expired reset tokens
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    -- Delete old rate limit requests (older than 24 hours)
    DELETE FROM rate_limit_requests 
    WHERE timestamp < NOW() - INTERVAL '24 hours';
    
    -- Delete old security events (older than 90 days)
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup daily (if pg_cron is available)
-- This will fail silently if pg_cron is not installed
DO $$
BEGIN
    -- Try to schedule cleanup job
    PERFORM cron.schedule('password-reset-cleanup', '0 2 * * *', 'SELECT cleanup_password_reset_system();');
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if pg_cron is not available
    NULL;
END $$;

COMMENT ON TABLE password_reset_tokens IS 'Stores secure tokens for password reset functionality';
COMMENT ON TABLE rate_limit_requests IS 'Tracks rate limiting for various operations';
COMMENT ON TABLE security_events IS 'Logs security-related events for audit purposes';
COMMENT ON FUNCTION cleanup_password_reset_system() IS 'Cleans up expired tokens and old records from the password reset system';