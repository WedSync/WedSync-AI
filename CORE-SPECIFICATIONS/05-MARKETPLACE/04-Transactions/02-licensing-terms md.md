# 02-licensing-terms.md

# Licensing Terms

## What to Build

Implement licensing system that protects creators' intellectual property while giving buyers appropriate usage rights.

## Key Technical Requirements

### License Types

```
enum LicenseType {
  SINGLE_USE = 'single_use',      // One supplier account only
  TEAM = 'team',                   // Up to 5 team members
  AGENCY = 'agency',               // Unlimited internal use
  RESELLER = 'reseller'            // Can modify and resell
}

interface TemplateLicense {
  type: LicenseType;
  restrictions: {
    commercial_use: boolean;
    modification_allowed: boolean;
    redistribution_allowed: boolean;
    attribution_required: boolean;
    max_users?: number;
    max_clients?: number;
  };
  duration: {
    type: 'perpetual' | 'subscription' | 'limited';
    expiry_date?: Date;
    renewal_required?: boolean;
  };
  terms_version: string;
  accepted_at: Date;
}
```

### License Agreement Display

```
const LicenseAgreement = ({ template, licenseType }) => {
  const [accepted, setAccepted] = useState(false);
  const terms = getLicenseTerms(licenseType);
  
  return (
    <div className="license-agreement">
      <h3>License Terms for {template.title}</h3>
      
      <div className="license-summary bg-blue-50 p-4 rounded">
        <h4>What you can do:</h4>
        <ul>
          {[terms.permissions.map](http://terms.permissions.map)(p => (
            <li key={p}>✓ {p}</li>
          ))}
        </ul>
        
        <h4 className="mt-4">Restrictions:</h4>
        <ul>
          {[terms.restrictions.map](http://terms.restrictions.map)(r => (
            <li key={r}>✗ {r}</li>
          ))}
        </ul>
      </div>
      
      <div className="license-full-text mt-4 h-64 overflow-y-auto border p-4">
        <ReactMarkdown>{terms.full_text}</ReactMarkdown>
      </div>
      
      <label className="flex items-center mt-4">
        <input 
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted([e.target](http://e.target).checked)}
        />
        <span className="ml-2">
          I accept the license terms and understand the usage restrictions
        </span>
      </label>
    </div>
  );
};
```

### License Enforcement

```
class LicenseManager {
  async validateLicense(purchaseId: string, userId: string) {
    const purchase = await db.purchases.findById(purchaseId);
    const license = await db.licenses.findOne({ purchase_id: purchaseId });
    
    // Check license validity
    if (license.duration.type === 'limited') {
      if (new Date() > license.duration.expiry_date) {
        throw new LicenseExpiredError();
      }
    }
    
    // Check user limits
    if (license.restrictions.max_users) {
      const activeUsers = await this.countActiveUsers(purchaseId);
      if (activeUsers >= license.restrictions.max_users) {
        throw new UserLimitExceededError();
      }
    }
    
    // Check modification rights
    if (!license.restrictions.modification_allowed) {
      await this.preventModification(purchase.template_id, userId);
    }
    
    return license;
  }
  
  async trackUsage(purchaseId: string, action: string) {
    await db.license_usage.create({
      purchase_id: purchaseId,
      action,
      timestamp: new Date(),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
  }
}
```

### License Terms Generator

```
class LicenseTermsGenerator {
  generate(template: Template, licenseType: LicenseType): string {
    const terms = this.getBaseTerms();
    const specific = this.getSpecificTerms(licenseType);
    
    return `
# LICENSE AGREEMENT

This License Agreement ("Agreement") is between ${[template.creator.business](http://template.creator.business)_name} 
("Licensor") and the purchasing party ("Licensee").

## GRANT OF LICENSE
${specific.grant}

## PERMITTED USES
${specific.permitted_uses.join('\n')}

## RESTRICTIONS
The Licensee may NOT:
${specific.restrictions.join('\n')}

## INTELLECTUAL PROPERTY
${terms.ip_section}

## TERMINATION
${terms.termination}

## LIABILITY
${terms.liability}

## GOVERNING LAW
This Agreement shall be governed by the laws of ${terms.jurisdiction}.

Version: ${terms.version}
Effective Date: ${new Date().toISOString()}
    `;
  }
}
```

### License Violation Detection

```
class LicenseViolationDetector {
  async checkForViolations() {
    // Check for excessive user access
    const overusedLicenses = await db.query(`
      SELECT purchase_id, COUNT(DISTINCT user_id) as user_count
      FROM license_access_logs
      WHERE timestamp > NOW() - INTERVAL '30 days'
      GROUP BY purchase_id
      HAVING COUNT(DISTINCT user_id) > 
        (SELECT restrictions->>'max_users' FROM licenses WHERE purchase_id = purchase_id)
    `);
    
    // Check for unauthorized redistribution
    const redistributed = await this.detectRedistribution();
    
    // Check for commercial use violations
    const commercialViolations = await this.detectCommercialUse();
    
    return {
      overused: overusedLicenses,
      redistributed,
      commercial: commercialViolations
    };
  }
  
  async handleViolation(violation: Violation) {
    // Log violation
    await db.violations.create(violation);
    
    // Notify creator
    await this.notifyCreator(violation);
    
    // Take action based on severity
    if (violation.severity === 'high') {
      await this.suspendLicense(violation.purchase_id);
    } else {
      await this.sendWarning(violation.buyer_id);
    }
  }
}
```

## Critical Implementation Notes

### Default License Terms

- Single use license for all basic purchases
- No redistribution without explicit permission
- Modifications allowed for internal use only
- Attribution required in client-facing uses
- Commercial use included in all paid licenses

### License Upgrades

```
const LICENSE_UPGRADE_PATHS = {
  single_to_team: { price_multiplier: 2.5 },
  single_to_agency: { price_multiplier: 5.0 },
  team_to_agency: { price_multiplier: 2.0 }
};
```

### Protection Mechanisms

- Watermark removal only after purchase
- Encrypted template storage
- Access logs for audit trails
- Periodic license validation checks

## Database/API Structure

### License Storage

```
CREATE TABLE licenses (
  id UUID PRIMARY KEY,
  purchase_id UUID REFERENCES purchases(id),
  license_type VARCHAR(20),
  restrictions JSONB,
  duration JSONB,
  terms_version VARCHAR(10),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE license_violations (
  id UUID PRIMARY KEY,
  license_id UUID REFERENCES licenses(id),
  violation_type VARCHAR(50),
  severity VARCHAR(10),
  details JSONB,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
```