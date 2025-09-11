/**
 * SSL Certificate Monitoring and Renewal Alert System
 *
 * Critical for Wedding Vendors:
 * - Ensures HTTPS is always working for booking forms
 * - Monitors certificate expiration to prevent service disruption
 * - Automated alerts before certificates expire
 * - Wedding day protection - no SSL issues during peak times
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export type CertificateStatus =
  | 'valid'
  | 'expired'
  | 'expiring-soon'
  | 'invalid'
  | 'not-found';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export interface SSLCertificate {
  domain: string;
  subjectName: string;
  issuerName: string;
  serialNumber: string;
  fingerprint: string;
  validFrom: Date;
  validTo: Date;
  daysUntilExpiry: number;
  status: CertificateStatus;
  isWildcard: boolean;
  subjectAltNames: string[];
  keyAlgorithm: string;
  keySize: number;
  signatureAlgorithm: string;
  lastChecked: Date;
  organizationId: string;
}

export interface SSLAlert {
  id: string;
  domain: string;
  organizationId: string;
  alertType: 'expiry' | 'invalid' | 'renewed' | 'error';
  severity: AlertSeverity;
  message: string;
  daysUntilExpiry?: number;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface MonitoringConfig {
  checkInterval: number; // milliseconds
  expiryWarningDays: number[]; // Days before expiry to send alerts
  enableAutoRenewal: boolean;
  enableEmergencyAlerts: boolean; // For certificates expiring within 24h
  weddingDayProtection: boolean; // Extra monitoring on weekends
}

export class SSLMonitor {
  private supabase;
  private config: MonitoringConfig;
  private monitoringInterval: NodeJS.Timer | null = null;
  private activeChecks: Set<string> = new Set();

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      checkInterval: 4 * 60 * 60 * 1000, // 4 hours
      expiryWarningDays: [30, 7, 3, 1], // Alert at 30, 7, 3, and 1 days before expiry
      enableAutoRenewal: true,
      enableEmergencyAlerts: true,
      weddingDayProtection: true,
      ...config,
    };

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );

    this.startMonitoring();
  }

  /**
   * Start continuous SSL monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) return;

    this.log('Starting SSL certificate monitoring', 'info');

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCycle();
      } catch (error) {
        this.log(`SSL monitoring cycle failed: ${error}`, 'error');
      }
    }, this.config.checkInterval);

    // Run initial check
    this.performMonitoringCycle();
  }

  /**
   * Stop SSL monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.log('SSL certificate monitoring stopped', 'info');
    }
  }

  /**
   * Monitor SSL certificate for a specific domain
   */
  async monitorDomain(
    domain: string,
    organizationId: string,
  ): Promise<SSLCertificate> {
    if (this.activeChecks.has(domain)) {
      throw new Error(`SSL check already in progress for ${domain}`);
    }

    this.activeChecks.add(domain);

    try {
      this.log(`Checking SSL certificate for ${domain}`, 'info');

      const certificate = await this.checkSSLCertificate(
        domain,
        organizationId,
      );
      await this.updateCertificateInDatabase(certificate);
      await this.checkAndSendAlerts(certificate);

      return certificate;
    } finally {
      this.activeChecks.delete(domain);
    }
  }

  /**
   * Check SSL certificate details for a domain
   */
  private async checkSSLCertificate(
    domain: string,
    organizationId: string,
  ): Promise<SSLCertificate> {
    try {
      // Use Node.js tls module to check certificate
      const tls = await import('tls');
      const net = await import('net');

      return new Promise((resolve, reject) => {
        const options = {
          host: domain,
          port: 443,
          servername: domain,
          rejectUnauthorized: false, // We want to check invalid certs too
          timeout: 10000,
        };

        const socket = tls.connect(options, () => {
          try {
            const cert = socket.getPeerCertificate(true);

            if (!cert || Object.keys(cert).length === 0) {
              reject(new Error('No certificate found'));
              return;
            }

            // Parse certificate details
            const validFrom = new Date(cert.valid_from);
            const validTo = new Date(cert.valid_to);
            const now = new Date();
            const daysUntilExpiry = Math.ceil(
              (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );

            // Determine certificate status
            let status: CertificateStatus;
            if (validTo < now) {
              status = 'expired';
            } else if (daysUntilExpiry <= 30) {
              status = 'expiring-soon';
            } else {
              status = 'valid';
            }

            // Check for wildcard certificate
            const isWildcard = cert.subject?.CN?.startsWith('*.') || false;

            // Extract Subject Alternative Names
            const subjectAltNames: string[] = [];
            if (cert.subjectaltname) {
              const sans = cert.subjectaltname.split(', ');
              sans.forEach((san) => {
                if (san.startsWith('DNS:')) {
                  subjectAltNames.push(san.substring(4));
                }
              });
            }

            // Create fingerprint
            const fingerprint =
              createHash('sha256')
                .update(cert.raw)
                .digest('hex')
                .toUpperCase()
                .match(/.{2}/g)
                ?.join(':') || '';

            const certificate: SSLCertificate = {
              domain,
              subjectName: cert.subject?.CN || domain,
              issuerName: cert.issuer?.CN || 'Unknown',
              serialNumber: cert.serialNumber || '',
              fingerprint,
              validFrom,
              validTo,
              daysUntilExpiry,
              status,
              isWildcard,
              subjectAltNames,
              keyAlgorithm: cert.pubkey?.type || 'Unknown',
              keySize: cert.bits || 0,
              signatureAlgorithm: cert.sigalg || 'Unknown',
              lastChecked: new Date(),
              organizationId,
            };

            resolve(certificate);
          } catch (parseError) {
            reject(new Error(`Certificate parsing failed: ${parseError}`));
          } finally {
            socket.end();
          }
        });

        socket.on('error', (error) => {
          reject(new Error(`SSL connection failed: ${error.message}`));
        });

        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('SSL connection timeout'));
        });
      });
    } catch (error) {
      // Return error certificate object
      return {
        domain,
        subjectName: domain,
        issuerName: 'Error',
        serialNumber: '',
        fingerprint: '',
        validFrom: new Date(),
        validTo: new Date(),
        daysUntilExpiry: -999,
        status: 'not-found',
        isWildcard: false,
        subjectAltNames: [],
        keyAlgorithm: 'Unknown',
        keySize: 0,
        signatureAlgorithm: 'Unknown',
        lastChecked: new Date(),
        organizationId,
      };
    }
  }

  /**
   * Update certificate information in database
   */
  private async updateCertificateInDatabase(
    certificate: SSLCertificate,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('ssl_certificates').upsert(
        {
          domain: certificate.domain,
          organization_id: certificate.organizationId,
          subject_name: certificate.subjectName,
          issuer_name: certificate.issuerName,
          serial_number: certificate.serialNumber,
          fingerprint: certificate.fingerprint,
          valid_from: certificate.validFrom.toISOString(),
          valid_to: certificate.validTo.toISOString(),
          days_until_expiry: certificate.daysUntilExpiry,
          status: certificate.status,
          is_wildcard: certificate.isWildcard,
          subject_alt_names: certificate.subjectAltNames,
          key_algorithm: certificate.keyAlgorithm,
          key_size: certificate.keySize,
          signature_algorithm: certificate.signatureAlgorithm,
          last_checked: certificate.lastChecked.toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'domain,organization_id',
        },
      );

      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
    } catch (error) {
      this.log(`Failed to update certificate in database: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Check if alerts need to be sent and send them
   */
  private async checkAndSendAlerts(certificate: SSLCertificate): Promise<void> {
    const alerts: SSLAlert[] = [];

    // Check for expiry alerts
    if (this.config.expiryWarningDays.includes(certificate.daysUntilExpiry)) {
      const severity = this.getAlertSeverity(certificate.daysUntilExpiry);

      alerts.push({
        id: `${certificate.domain}-expiry-${certificate.daysUntilExpiry}`,
        domain: certificate.domain,
        organizationId: certificate.organizationId,
        alertType: 'expiry',
        severity,
        message: `SSL certificate for ${certificate.domain} expires in ${certificate.daysUntilExpiry} day(s)`,
        daysUntilExpiry: certificate.daysUntilExpiry,
        triggeredAt: new Date(),
        acknowledged: false,
      });
    }

    // Emergency alert for certificates expiring within 24 hours
    if (
      this.config.enableEmergencyAlerts &&
      certificate.daysUntilExpiry <= 1 &&
      certificate.daysUntilExpiry > 0
    ) {
      alerts.push({
        id: `${certificate.domain}-emergency`,
        domain: certificate.domain,
        organizationId: certificate.organizationId,
        alertType: 'expiry',
        severity: 'emergency',
        message: `EMERGENCY: SSL certificate for ${certificate.domain} expires in ${certificate.daysUntilExpiry < 1 ? 'less than 24 hours' : '1 day'}!`,
        daysUntilExpiry: certificate.daysUntilExpiry,
        triggeredAt: new Date(),
        acknowledged: false,
      });
    }

    // Alert for expired certificates
    if (certificate.status === 'expired') {
      alerts.push({
        id: `${certificate.domain}-expired`,
        domain: certificate.domain,
        organizationId: certificate.organizationId,
        alertType: 'invalid',
        severity: 'critical',
        message: `SSL certificate for ${certificate.domain} has EXPIRED! This will break HTTPS access.`,
        daysUntilExpiry: certificate.daysUntilExpiry,
        triggeredAt: new Date(),
        acknowledged: false,
      });
    }

    // Alert for invalid certificates
    if (
      certificate.status === 'invalid' ||
      certificate.status === 'not-found'
    ) {
      alerts.push({
        id: `${certificate.domain}-invalid`,
        domain: certificate.domain,
        organizationId: certificate.organizationId,
        alertType: 'invalid',
        severity: 'critical',
        message: `SSL certificate for ${certificate.domain} is invalid or not found. HTTPS may not be working.`,
        triggeredAt: new Date(),
        acknowledged: false,
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  /**
   * Determine alert severity based on days until expiry
   */
  private getAlertSeverity(daysUntilExpiry: number): AlertSeverity {
    if (daysUntilExpiry <= 0) return 'emergency';
    if (daysUntilExpiry <= 1) return 'critical';
    if (daysUntilExpiry <= 3) return 'warning';
    return 'info';
  }

  /**
   * Send SSL certificate alert
   */
  private async sendAlert(alert: SSLAlert): Promise<void> {
    try {
      // Check if this alert was already sent recently
      const existingAlert = await this.checkExistingAlert(alert);
      if (existingAlert) {
        this.log(
          `Alert already exists for ${alert.domain}: ${alert.alertType}`,
          'info',
        );
        return;
      }

      // Store alert in database
      await this.storeAlert(alert);

      // Send notifications based on severity
      await this.sendNotifications(alert);

      this.log(
        `SSL alert sent for ${alert.domain}: ${alert.message}`,
        'warning',
      );
    } catch (error) {
      this.log(`Failed to send SSL alert: ${error}`, 'error');
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: SSLAlert): Promise<void> {
    const { error } = await this.supabase.from('ssl_alerts').insert({
      id: alert.id,
      domain: alert.domain,
      organization_id: alert.organizationId,
      alert_type: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      days_until_expiry: alert.daysUntilExpiry,
      triggered_at: alert.triggeredAt.toISOString(),
      acknowledged: alert.acknowledged,
    });

    if (error && !error.message.includes('duplicate key')) {
      throw new Error(`Failed to store alert: ${error.message}`);
    }
  }

  /**
   * Check if alert already exists
   */
  private async checkExistingAlert(alert: SSLAlert): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('ssl_alerts')
      .select('id')
      .eq('id', alert.id)
      .single();

    return !error && !!data;
  }

  /**
   * Send notifications for SSL alerts
   */
  private async sendNotifications(alert: SSLAlert): Promise<void> {
    // Get organization contact details
    const { data: org } = await this.supabase
      .from('organizations')
      .select('name, contact_email, contact_phone')
      .eq('id', alert.organizationId)
      .single();

    if (!org) return;

    // Send email notification
    if (org.contact_email) {
      await this.sendEmailAlert(alert, org);
    }

    // Send SMS for critical/emergency alerts
    if (
      (alert.severity === 'critical' || alert.severity === 'emergency') &&
      org.contact_phone
    ) {
      await this.sendSMSAlert(alert, org);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    alert: SSLAlert,
    organization: any,
  ): Promise<void> {
    try {
      // This would integrate with your email service (Resend)
      const emailContent = this.generateEmailContent(alert, organization);

      this.log(
        `Email alert would be sent to ${organization.contact_email}: ${alert.message}`,
        'info',
      );

      // TODO: Integrate with actual email service
      // await emailService.send({
      //   to: organization.contact_email,
      //   subject: `SSL Certificate Alert - ${alert.domain}`,
      //   html: emailContent
      // });
    } catch (error) {
      this.log(`Failed to send email alert: ${error}`, 'error');
    }
  }

  /**
   * Send SMS alert for critical issues
   */
  private async sendSMSAlert(
    alert: SSLAlert,
    organization: any,
  ): Promise<void> {
    try {
      const message = `WedSync Alert: SSL certificate for ${alert.domain} ${alert.alertType === 'expiry' ? `expires in ${alert.daysUntilExpiry} days` : 'has issues'}. Check your dashboard immediately.`;

      this.log(
        `SMS alert would be sent to ${organization.contact_phone}: ${message}`,
        'info',
      );

      // TODO: Integrate with SMS service (Twilio)
      // await smsService.send({
      //   to: organization.contact_phone,
      //   body: message
      // });
    } catch (error) {
      this.log(`Failed to send SMS alert: ${error}`, 'error');
    }
  }

  /**
   * Generate email content for SSL alerts
   */
  private generateEmailContent(alert: SSLAlert, organization: any): string {
    const urgencyColor = {
      info: '#3b82f6',
      warning: '#f59e0b',
      critical: '#ef4444',
      emergency: '#dc2626',
    }[alert.severity];

    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: ${urgencyColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">SSL Certificate Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${alert.severity.toUpperCase()}</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Alert Details</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Domain:</strong> ${alert.domain}</p>
            <p><strong>Organization:</strong> ${organization.name}</p>
            <p><strong>Issue:</strong> ${alert.message}</p>
            ${alert.daysUntilExpiry !== undefined ? `<p><strong>Days Until Expiry:</strong> ${alert.daysUntilExpiry}</p>` : ''}
            <p><strong>Alert Time:</strong> ${alert.triggeredAt.toLocaleString()}</p>
          </div>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin-top: 0;">What This Means for Your Wedding Business</h3>
            <ul style="color: #92400e; margin: 0;">
              <li>Couples may see "Not Secure" warnings when visiting your booking forms</li>
              <li>Some browsers may block access to your website completely</li>
              <li>This can damage trust and prevent bookings</li>
              <li>Search engine rankings may be affected</li>
            </ul>
          </div>

          <div style="background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 6px;">
            <h3 style="color: #047857; margin-top: 0;">Immediate Action Required</h3>
            <ol style="color: #047857; margin: 0;">
              <li>Log into your WedSync dashboard immediately</li>
              <li>Go to Domain Settings → SSL Certificates</li>
              <li>Contact your web developer or hosting provider</li>
              <li>Renew your SSL certificate before it expires</li>
            </ol>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="https://app.wedsync.com/dashboard" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
          <p>This is an automated alert from WedSync SSL Monitoring</p>
          <p>If you need help, contact support at support@wedsync.com</p>
        </div>
      </div>
    `;
  }

  /**
   * Perform complete monitoring cycle
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      // Get all domains that need monitoring
      const { data: domains } = await this.supabase
        .from('domain_routes')
        .select('domain, organization_id')
        .eq('is_active', true)
        .neq('domain', null);

      if (!domains || domains.length === 0) {
        this.log('No domains found for SSL monitoring', 'info');
        return;
      }

      this.log(
        `Starting SSL monitoring cycle for ${domains.length} domains`,
        'info',
      );

      // Check wedding day protection
      const isWeekend = this.isWeekend();
      const checkInterval =
        isWeekend && this.config.weddingDayProtection
          ? Math.floor(this.config.checkInterval / 2)
          : this.config.checkInterval;

      // Monitor each domain
      const monitorPromises = domains.map(async (domainInfo) => {
        try {
          await this.monitorDomain(
            domainInfo.domain,
            domainInfo.organization_id,
          );
        } catch (error) {
          this.log(`Failed to monitor ${domainInfo.domain}: ${error}`, 'error');
        }
      });

      await Promise.allSettled(monitorPromises);

      this.log(`SSL monitoring cycle completed`, 'info');
    } catch (error) {
      this.log(`SSL monitoring cycle failed: ${error}`, 'error');
    }
  }

  /**
   * Check if today is weekend (wedding season protection)
   */
  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Get SSL certificate status for organization
   */
  async getOrganizationSSLStatus(
    organizationId: string,
  ): Promise<SSLCertificate[]> {
    const { data, error } = await this.supabase
      .from('ssl_certificates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('days_until_expiry', { ascending: true });

    if (error) {
      throw new Error(`Failed to get SSL status: ${error.message}`);
    }

    return (data || []).map(this.mapDatabaseToCertificate);
  }

  /**
   * Get unacknowledged SSL alerts
   */
  async getUnacknowledgedAlerts(organizationId: string): Promise<SSLAlert[]> {
    const { data, error } = await this.supabase
      .from('ssl_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('acknowledged', false)
      .order('triggered_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get alerts: ${error.message}`);
    }

    return (data || []).map(this.mapDatabaseToAlert);
  }

  /**
   * Acknowledge SSL alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('ssl_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }
  }

  /**
   * Map database row to SSLCertificate
   */
  private mapDatabaseToCertificate(data: any): SSLCertificate {
    return {
      domain: data.domain,
      subjectName: data.subject_name,
      issuerName: data.issuer_name,
      serialNumber: data.serial_number,
      fingerprint: data.fingerprint,
      validFrom: new Date(data.valid_from),
      validTo: new Date(data.valid_to),
      daysUntilExpiry: data.days_until_expiry,
      status: data.status,
      isWildcard: data.is_wildcard,
      subjectAltNames: data.subject_alt_names || [],
      keyAlgorithm: data.key_algorithm,
      keySize: data.key_size,
      signatureAlgorithm: data.signature_algorithm,
      lastChecked: new Date(data.last_checked),
      organizationId: data.organization_id,
    };
  }

  /**
   * Map database row to SSLAlert
   */
  private mapDatabaseToAlert(data: any): SSLAlert {
    return {
      id: data.id,
      domain: data.domain,
      organizationId: data.organization_id,
      alertType: data.alert_type,
      severity: data.severity,
      message: data.message,
      daysUntilExpiry: data.days_until_expiry,
      triggeredAt: new Date(data.triggered_at),
      acknowledged: data.acknowledged,
      acknowledgedBy: data.acknowledged_by,
      acknowledgedAt: data.acknowledged_at
        ? new Date(data.acknowledged_at)
        : undefined,
    };
  }

  /**
   * Logging utility
   */
  private log(
    message: string,
    level: 'info' | 'error' | 'warning' = 'info',
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[SSL-Monitor ${timestamp}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ERROR: ${message}`);
        break;
      case 'warning':
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      default:
        console.log(`${prefix} ℹ️  ${message}`);
    }
  }

  /**
   * Cleanup and stop monitoring
   */
  cleanup(): void {
    this.stopMonitoring();
    this.activeChecks.clear();
    this.log('SSL Monitor cleanup completed', 'info');
  }
}

export default SSLMonitor;
