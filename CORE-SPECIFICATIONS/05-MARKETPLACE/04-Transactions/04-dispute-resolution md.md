# 04-dispute-resolution.md

## What to Build

A fair dispute resolution system for handling conflicts between creators and buyers, including mediation and escalation paths.

## Key Technical Requirements

### Dispute Management System

```
interface Dispute {
  id: string;
  purchase_id: string;
  initiator: 'buyer' | 'creator';
  type: DisputeType;
  status: DisputeStatus;
  evidence: Evidence[];
  messages: DisputeMessage[];
  resolution?: Resolution;
  escalated: boolean;
  created_at: Date;
  resolved_at?: Date;
}

enum DisputeType {
  QUALITY_ISSUE = 'quality_issue',
  COPYRIGHT_CLAIM = 'copyright_claim',
  FALSE_ADVERTISING = 'false_advertising',
  UNAUTHORIZED_USE = 'unauthorized_use',
  REFUND_DENIAL = 'refund_denial'
}

enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  AWAITING_RESPONSE = 'awaiting_response',
  MEDIATION = 'mediation',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated'
}
```

### Dispute Filing Flow

```
const DisputeForm = ({ purchase }) => {
  const [type, setType] = useState<DisputeType>();
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<File[]>([]);
  
  const handleSubmit = async () => {
    const dispute = await [api.post](http://api.post)('/disputes', {
      purchase_id: [purchase.id](http://purchase.id),
      type,
      description,
      evidence: await uploadEvidence(evidence)
    });
    
    router.push(`/disputes/${[dispute.id](http://dispute.id)}`);
  };
  
  return (
    <Form onSubmit={handleSubmit}>
      <h3>File a Dispute</h3>
      
      <RadioGroup 
        label="Dispute Type"
        value={type}
        onChange={setType}
      >
        <Radio value="quality_issue">
          Template quality not as advertised
        </Radio>
        <Radio value="copyright_claim">
          Template contains copyrighted material
        </Radio>
        <Radio value="false_advertising">
          Misleading description or preview
        </Radio>
        <Radio value="refund_denial">
          Unfair refund denial
        </Radio>
      </RadioGroup>
      
      <Textarea
        label="Describe the issue"
        value={description}
        onChange={(e) => setDescription([e.target](http://e.target).value)}
        minLength={100}
        required
      />
      
      <FileUpload
        label="Evidence"
        accept="image/*,.pdf,.zip"
        multiple
        maxSize={10 * 1024 * 1024} // 10MB
        onChange={setEvidence}
      />
      
      <Alert type="info">
        Disputes are first handled between parties. 
        WedSync mediates if no resolution within 72 hours.
      </Alert>
      
      <Button type="submit">File Dispute</Button>
    </Form>
  );
};
```

### Dispute Resolution Interface

```
const DisputeResolution = ({ dispute }) => {
  const [messages, setMessages] = useState(dispute.messages);
  const [newMessage, setNewMessage] = useState('');
  const isMediator = useIsMediator();
  
  return (
    <div className="dispute-resolution">
      <DisputeHeader dispute={dispute} />
      
      <div className="dispute-timeline">
        {[messages.map](http://messages.map)(msg => (
          <MessageBubble 
            key={[msg.id](http://msg.id)}
            message={msg}
            isMediator={msg.sender_role === 'mediator'}
          />
        ))}
      </div>
      
      <div className="dispute-actions">
        {dispute.status === 'open' && (
          <OfferResolution dispute={dispute} />
        )}
        
        {isMediator && (
          <MediatorActions dispute={dispute} />
        )}
      </div>
      
      <MessageInput
        value={newMessage}
        onChange={setNewMessage}
        onSend={handleSendMessage}
      />
    </div>
  );
};
```

### Mediation System

```
class MediationService {
  async escalateToMediation(disputeId: string) {
    const dispute = await db.disputes.findById(disputeId);
    
    // Check if eligible for mediation
    const hoursSinceCreated = this.getHoursSince(dispute.created_at);
    if (hoursSinceCreated < 72) {
      throw new Error('Allow 72 hours for direct resolution first');
    }
    
    // Assign mediator
    const mediator = await this.assignMediator(dispute);
    
    // Update status
    dispute.status = 'mediation';
    dispute.mediator_id = [mediator.id](http://mediator.id);
    dispute.escalated_at = new Date();
    await [dispute.save](http://dispute.save)();
    
    // Notify parties
    await this.notifyMediation(dispute, mediator);
    
    return dispute;
  }
  
  async mediatorDecision(disputeId: string, decision: MediatorDecision) {
    const dispute = await db.disputes.findById(disputeId);
    
    // Apply decision
    switch (decision.type) {
      case 'full_refund':
        await this.processFullRefund(dispute.purchase_id);
        break;
      
      case 'partial_refund':
        await this.processPartialRefund(
          dispute.purchase_id, 
          decision.amount
        );
        break;
      
      case 'no_action':
        // Dispute closed in buyer's favor
        break;
      
      case 'warning':
        await this.issueWarning([decision.party](http://decision.party), decision.reason);
        break;
    }
    
    // Close dispute
    dispute.status = 'resolved';
    dispute.resolution = decision;
    dispute.resolved_at = new Date();
    await [dispute.save](http://dispute.save)();
  }
}
```

### Automated Resolution Rules

```
class AutoResolution {
  async checkAutoResolve(dispute: Dispute) {
    // Auto-resolve duplicate purchase claims
    if (dispute.type === 'duplicate_purchase') {
      const isDuplicate = await this.verifyDuplicate(dispute.purchase_id);
      if (isDuplicate) {
        return this.autoResolve(dispute, 'full_refund');
      }
    }
    
    // Auto-resolve clear copyright violations
    if (dispute.type === 'copyright_claim') {
      const violation = await this.copyrightCheck(dispute.evidence);
      if (violation.confidence > 0.95) {
        return this.autoResolve(dispute, 'remove_template');
      }
    }
    
    // Auto-escalate if no response in 72 hours
    const lastResponse = this.getLastResponse(dispute);
    if (this.getHoursSince(lastResponse) > 72) {
      return this.escalateToMediation([dispute.id](http://dispute.id));
    }
  }
}
```

## Critical Implementation Notes

### Escalation Path

1. Direct resolution (72 hours)
2. WedSync mediation (5 days)
3. External arbitration (if >£500)
4. Legal action (last resort)

### Evidence Requirements

- Screenshots of issues
- Original files for comparison
- Communication logs
- Purchase receipts
- Installation attempts

### Resolution Options

```
const RESOLUTION_TYPES = {
  full_refund: { buyer_gets: 100, creator_keeps: 0 },
  partial_refund: { buyer_gets: 50, creator_keeps: 50 },
  replacement: { buyer_gets: 'new_template', creator_keeps: 100 },
  credit: { buyer_gets: 'platform_credit', creator_keeps: 100 },
  no_action: { buyer_gets: 0, creator_keeps: 100 }
};
```

## Database/API Structure

```
CREATE TABLE disputes (
  id UUID PRIMARY KEY,
  purchase_id UUID REFERENCES purchases(id),
  initiator_id UUID,
  type VARCHAR(50),
  status VARCHAR(20),
  mediator_id UUID,
  resolution JSONB,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE dispute_messages (
  id UUID PRIMARY KEY,
  dispute_id UUID REFERENCES disputes(id),
  sender_id UUID,
  sender_role VARCHAR(20), -- buyer, creator, mediator
  message TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ
);
```