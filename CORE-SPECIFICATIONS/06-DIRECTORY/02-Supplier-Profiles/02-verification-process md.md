# 02-verification-process.md

## What to Build

An automated and manual verification system to ensure directory quality and build trust with couples.

## Key Technical Requirements

### Verification Types

```
interface VerificationStatus {
  business_verified: boolean;
  insurance_verified: boolean;
  social_media_verified: boolean;
  portfolio_verified: boolean;
  reviews_verified: boolean;
  background_checked: boolean;
  payment_verified: boolean;
}

interface VerificationProcess {
  verification_type: VerificationType;
  status: 'pending' | 'approved' | 'rejected' | 'requires_info';
  submitted_at: Date;
  reviewed_at?: Date;
  reviewer_id?: string;
  notes?: string;
  documents: VerificationDocument[];
}
```

### Automated Checks

1. **Business Registration**
    - Companies House API (UK)
    - Better Business Bureau API (US)
    - Local business registry APIs
2. **Social Media Verification**
    - Domain matching between website and social profiles
    - Follower count thresholds
    - Post frequency and engagement
3. **Portfolio Authenticity**
    - Reverse image search
    - EXIF data analysis
    - Watermark detection

### Manual Review Queue

```
export async function processVerificationQueue() {
  const pendingVerifications = await getPendingVerifications();
  
  for (const verification of pendingVerifications) {
    const autoCheckResult = await runAutomatedChecks(verification);
    
    if (autoCheckResult.confidence > 0.8) {
      await approveVerification([verification.id](http://verification.id));
    } else if (autoCheckResult.confidence < 0.3) {
      await rejectVerification([verification.id](http://verification.id), autoCheckResult.reasons);
    } else {
      await flagForManualReview([verification.id](http://verification.id));
    }
  }
}
```

## Critical Implementation Notes

### Verification Badges

- **Blue Checkmark**: Basic business verification
- **Gold Shield**: Full verification + insurance
- **Premium Crown**: Highest tier with background check
- **WedSync Connected**: Active platform user

### Document Processing

```
interface VerificationDocument {
  id: string;
  type: 'insurance' | 'license' | 'certification';
  file_url: string;
  extracted_data: ExtractedData;
  expiry_date?: Date;
  verification_status: DocumentStatus;
}

// Use OCR to extract key information
export async function processInsuranceDocument(file: File) {
  const ocrResult = await extractTextFromImage(file);
  
  return {
    policy_number: extractPolicyNumber(ocrResult.text),
    coverage_amount: extractCoverageAmount(ocrResult.text),
    expiry_date: extractExpiryDate(ocrResult.text),
    insurer_name: extractInsurerName(ocrResult.text)
  };
}
```

### Expiry Monitoring

- Send renewal reminders 30 days before expiry
- Automatic status downgrade after expiry
- Grace period of 7 days for renewals
- Email notifications to supplier and admin

### Verification API

- `POST /api/verification/submit` - Submit verification documents
- `GET /api/verification/status/{supplier_id}` - Check status
- `PUT /api/verification/update` - Update verification info
- `POST /api/verification/appeal` - Appeal rejection