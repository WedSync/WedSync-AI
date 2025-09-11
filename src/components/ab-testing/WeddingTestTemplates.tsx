'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Heart,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Camera,
  Utensils,
  Music,
  Flower,
  Crown,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Filter,
  Star,
  TrendingUp,
  Clock,
  Target,
} from 'lucide-react';

interface WeddingTestTemplate {
  id: string;
  name: string;
  category:
    | 'venue'
    | 'timeline'
    | 'payment'
    | 'followup'
    | 'vendor'
    | 'emergency';
  scenario: string;
  businessImpact: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  targetMetrics: string[];
  variants: {
    control: {
      name: string;
      subject: string;
      message: string;
      channel: string;
      timing?: string;
    };
    test: {
      name: string;
      subject: string;
      message: string;
      channel: string;
      timing?: string;
    };
  };
  expectedResults: {
    metric: string;
    expectedImprovement: string;
    reasoning: string;
  }[];
  weddingPhase: 'planning' | 'confirmed' | 'final_details' | 'post_wedding';
  audienceSegment: string;
  successCriteria: string;
  tips: string[];
}

const WEDDING_TEST_TEMPLATES: WeddingTestTemplate[] = [
  {
    id: 'venue-confirmation-urgency',
    name: 'Venue Confirmation: Urgency vs. Gentle Reminder',
    category: 'venue',
    scenario:
      'Couples are slow to confirm their venue selection, creating bottlenecks in the planning process.',
    businessImpact:
      'Faster venue confirmations lead to earlier payment collection and better planning timeline adherence.',
    difficulty: 'beginner',
    estimatedDuration: '7-14 days',
    targetMetrics: ['response_rate', 'conversion_rate'],
    variants: {
      control: {
        name: 'Gentle Reminder',
        subject: 'Gentle reminder about your venue selection',
        message:
          "Hi [Name], I hope you're doing well! When you have a moment, could you please confirm your venue choice? We're here to help if you have any questions. Best regards, [Planner]",
        channel: 'email',
      },
      test: {
        name: 'Urgent Timeline',
        subject: 'Action needed: Venue confirmation deadline approaching',
        message:
          'Hi [Name], We need to confirm your venue by [Date] to secure your preferred timeline and avoid delays. Can you please respond today? Time-sensitive. [Planner]',
        channel: 'email',
      },
    },
    expectedResults: [
      {
        metric: 'Response Rate',
        expectedImprovement: '25-40%',
        reasoning:
          'Urgency creates motivation to act immediately rather than procrastinate',
      },
      {
        metric: 'Response Time',
        expectedImprovement: '50%',
        reasoning:
          'Clear deadline removes ambiguity about when action is needed',
      },
    ],
    weddingPhase: 'planning',
    audienceSegment:
      "Couples who haven't responded to initial venue request within 3 days",
    successCriteria: 'Increase same-day responses by 30%',
    tips: [
      'Test during business hours vs. evening sends',
      "Consider follow-up with SMS if email doesn't work",
      'Track if urgent messaging affects client satisfaction scores',
    ],
  },

  {
    id: 'payment-reminder-emotional',
    name: 'Payment Reminders: Emotional vs. Business-like',
    category: 'payment',
    scenario:
      'Outstanding payment reminders have low response rates and couples seem to be ignoring them.',
    businessImpact:
      'Improved payment collection reduces cash flow issues and administrative overhead.',
    difficulty: 'intermediate',
    estimatedDuration: '14-21 days',
    targetMetrics: ['open_rate', 'conversion_rate', 'payment_completion'],
    variants: {
      control: {
        name: 'Business Invoice',
        subject: 'Invoice #[Number] - Payment Due',
        message:
          'Dear [Name], Your payment of $[Amount] is now due. Please remit payment by [Date] to avoid late fees. Invoice attached. Regards, [Company]',
        channel: 'email',
      },
      test: {
        name: 'Dream Wedding Focus',
        subject: 'One step closer to your dream wedding! 💍',
        message:
          "Hi [Name]! Your big day is getting closer! ✨ To keep everything on track for your perfect wedding, we just need your payment of $[Amount] by [Date]. We're so excited to make your dreams come true! 💕",
        channel: 'email',
      },
    },
    expectedResults: [
      {
        metric: 'Open Rate',
        expectedImprovement: '35%',
        reasoning:
          'Emotional subject lines with emojis increase curiosity and engagement',
      },
      {
        metric: 'Payment Completion',
        expectedImprovement: '20%',
        reasoning:
          'Connecting payment to dream outcome creates positive association',
      },
    ],
    weddingPhase: 'confirmed',
    audienceSegment: 'Couples with overdue payments (1-7 days)',
    successCriteria: 'Reduce payment collection time by 3 days on average',
    tips: [
      'A/B test emoji usage in subject lines',
      'Consider payment plan offers for non-responders',
      'Track client sentiment in follow-up surveys',
    ],
  },

  {
    id: 'timeline-communication-channel',
    name: 'Timeline Updates: Email vs. WhatsApp vs. SMS',
    category: 'timeline',
    scenario:
      "Important timeline changes aren't reaching couples quickly enough, causing confusion.",
    businessImpact:
      'Better communication reduces day-of issues and improves client satisfaction scores.',
    difficulty: 'advanced',
    estimatedDuration: '21-30 days',
    targetMetrics: [
      'delivery_rate',
      'read_rate',
      'response_rate',
      'client_satisfaction',
    ],
    variants: {
      control: {
        name: 'Email Update',
        subject: 'Important: Wedding timeline update',
        message:
          "Hi [Name], We've made some adjustments to your wedding timeline. Please review the attached updated schedule and let us know if you have questions.",
        channel: 'email',
      },
      test: {
        name: 'WhatsApp Instant',
        subject: 'Timeline Update',
        message:
          '🎉 Quick update on your wedding timeline! [Brief change]. Full details: [link]. Any questions? Just reply here!',
        channel: 'whatsapp',
      },
    },
    expectedResults: [
      {
        metric: 'Read Rate',
        expectedImprovement: '60%',
        reasoning: 'WhatsApp has 98% open rate vs 20% email open rate',
      },
      {
        metric: 'Response Time',
        expectedImprovement: '75%',
        reasoning: 'Real-time messaging encourages immediate responses',
      },
    ],
    weddingPhase: 'final_details',
    audienceSegment: 'Couples under 35 with WhatsApp',
    successCriteria: 'Achieve 90%+ message acknowledgment within 2 hours',
    tips: [
      'Respect opt-in preferences for WhatsApp',
      'Test different times of day for each channel',
      'Consider generational preferences (email vs. text)',
      'Track which channel leads to most questions/confusion',
    ],
  },

  {
    id: 'vendor-follow-up-personalization',
    name: 'Vendor Follow-ups: Generic vs. Ultra-Personalized',
    category: 'vendor',
    scenario:
      "Post-service vendor recommendations aren't getting much engagement from couples.",
    businessImpact:
      'Better vendor relationships through referrals, potential revenue sharing, improved client experience.',
    difficulty: 'intermediate',
    estimatedDuration: '14-21 days',
    targetMetrics: [
      'engagement_rate',
      'referral_conversion',
      'client_satisfaction',
    ],
    variants: {
      control: {
        name: 'Standard Follow-up',
        subject: 'How was your experience with [Vendor]?',
        message:
          "Hi [Name], We hope you had a great experience with [Vendor]. If you're happy with their service, would you consider leaving a review? Thank you!",
        channel: 'email',
      },
      test: {
        name: 'Ultra-Personal',
        subject: 'Those gorgeous [specific detail] photos! 📸',
        message:
          'Hi [Name]! Just saw the sneak peek of your [specific moments] - absolutely stunning! 😍 [Photographer] clearly captured the magic. Other couples always ask for photographer recs - mind if we share how amazing [they] were? ✨',
        channel: 'email',
      },
    },
    expectedResults: [
      {
        metric: 'Engagement Rate',
        expectedImprovement: '45%',
        reasoning:
          'Specific details show personal attention and genuine interest',
      },
      {
        metric: 'Referral Conversion',
        expectedImprovement: '30%',
        reasoning: 'Positive emotional context makes sharing feel natural',
      },
    ],
    weddingPhase: 'post_wedding',
    audienceSegment: 'Couples 1-2 weeks post-wedding',
    successCriteria: 'Double the vendor referral rate',
    tips: [
      'Collect specific details during planning process',
      'Time follow-ups when couples are most emotional (honeymoon return)',
      'Test including actual preview photos vs. text only',
    ],
  },

  {
    id: 'emergency-communication-tone',
    name: 'Emergency Changes: Calm vs. Urgent Tone',
    category: 'emergency',
    scenario:
      'Last-minute vendor cancellations or changes need immediate client attention.',
    businessImpact:
      'Quick resolution of emergencies protects wedding day success and client relationships.',
    difficulty: 'advanced',
    estimatedDuration: '7-10 days',
    targetMetrics: [
      'response_rate',
      'response_time',
      'client_satisfaction',
      'resolution_time',
    ],
    variants: {
      control: {
        name: 'Calm Professional',
        subject: 'Important update regarding your wedding',
        message:
          "Hi [Name], I need to discuss an important update about your wedding. When would be a good time for a call today? Don't worry - we have backup plans ready. [Planner]",
        channel: 'phone',
        timing: 'immediate',
      },
      test: {
        name: 'Urgent Action',
        subject: 'URGENT: Immediate action needed for your wedding',
        message:
          'Hi [Name], URGENT wedding update - please call me immediately at [number]. Time-sensitive issue that needs resolution today. Available until 9pm. [Planner]',
        channel: 'phone',
        timing: 'immediate',
      },
    },
    expectedResults: [
      {
        metric: 'Response Time',
        expectedImprovement: '40%',
        reasoning: 'Urgent language triggers immediate action',
      },
      {
        metric: 'Client Anxiety',
        expectedImprovement: '-20%',
        reasoning: 'May increase stress but leads to faster resolution',
      },
    ],
    weddingPhase: 'final_details',
    audienceSegment: 'All couples with emergencies',
    successCriteria: 'Contact client within 1 hour of emergency',
    tips: [
      'Have solutions ready before contacting',
      'Test multi-channel approach (call + text + email)',
      'Measure stress levels in post-crisis surveys',
      'Consider partner preferences (some prefer calm, others urgent)',
    ],
  },

  {
    id: 'consultation-booking-social-proof',
    name: 'Initial Consultations: Features vs. Social Proof',
    category: 'followup',
    scenario:
      'Inquiry-to-consultation conversion rates are lower than industry benchmarks.',
    businessImpact:
      'More consultations directly correlate with higher booking rates and revenue.',
    difficulty: 'beginner',
    estimatedDuration: '10-14 days',
    targetMetrics: ['booking_rate', 'response_rate', 'consultation_show_rate'],
    variants: {
      control: {
        name: 'Feature Focus',
        subject: "Let's plan your perfect wedding!",
        message:
          'Hi [Name], Thank you for your interest! We offer comprehensive planning services including vendor coordination, timeline management, and day-of coordination. Would you like to schedule a consultation?',
        channel: 'email',
      },
      test: {
        name: 'Social Proof',
        subject: 'Join 200+ couples who had stress-free weddings ✨',
        message:
          'Hi [Name], Thanks for reaching out! Last month, Sarah told us "I actually enjoyed my wedding planning because of [Company]!" 😊 15 minutes with us and you\'ll see why 96% of our couples refer friends. Coffee chat this week?',
        channel: 'email',
      },
    },
    expectedResults: [
      {
        metric: 'Consultation Booking',
        expectedImprovement: '35%',
        reasoning: 'Social proof reduces perceived risk and builds trust',
      },
      {
        metric: 'Show Rate',
        expectedImprovement: '15%',
        reasoning: 'Higher commitment from pre-qualified, convinced prospects',
      },
    ],
    weddingPhase: 'planning',
    audienceSegment: 'Fresh inquiries within 24 hours',
    successCriteria: 'Increase inquiry-to-consultation rate to 40%+',
    tips: [
      'Use real client names and quotes (with permission)',
      'Test specific numbers vs. general statements',
      'A/B test video testimonials vs. text',
      'Segment by inquiry source (social media vs. referral vs. Google)',
    ],
  },
];

const CATEGORY_ICONS = {
  venue: MapPin,
  timeline: Clock,
  payment: DollarSign,
  followup: Heart,
  vendor: Users,
  emergency: Target,
};

const CATEGORY_COLORS = {
  venue: 'blue',
  timeline: 'green',
  payment: 'purple',
  followup: 'pink',
  vendor: 'orange',
  emergency: 'red',
};

interface Props {
  onSelectTemplate: (template: WeddingTestTemplate) => void;
  onCreateFromTemplate: (template: WeddingTestTemplate) => void;
}

export default function WeddingTestTemplates({
  onSelectTemplate,
  onCreateFromTemplate,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] =
    useState<WeddingTestTemplate | null>(null);

  const filteredTemplates = WEDDING_TEST_TEMPLATES.filter((template) => {
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    const matchesDifficulty =
      selectedDifficulty === 'all' ||
      template.difficulty === selectedDifficulty;
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.scenario.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const categories = [
    ...new Set(WEDDING_TEST_TEMPLATES.map((t) => t.category)),
  ];
  const difficulties = [
    ...new Set(WEDDING_TEST_TEMPLATES.map((t) => t.difficulty)),
  ];

  const renderTemplateCard = (template: WeddingTestTemplate) => {
    const IconComponent = CATEGORY_ICONS[template.category];
    const colorClass = CATEGORY_COLORS[template.category];

    return (
      <Card
        key={template.id}
        className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary-200"
        onClick={() => setSelectedTemplate(template)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${colorClass}-100`}>
              <IconComponent className={`h-5 w-5 text-${colorClass}-600`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {template.category}
                </Badge>
                <Badge
                  variant={
                    template.difficulty === 'beginner'
                      ? 'default'
                      : template.difficulty === 'intermediate'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="text-xs"
                >
                  {template.difficulty}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{template.estimatedDuration}</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4">{template.scenario}</p>

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Expected Impact:
            </h4>
            <div className="space-y-1">
              {template.expectedResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-gray-700">
                    {result.metric}:{' '}
                    <span className="font-medium text-green-600">
                      +{result.expectedImprovement}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="h-4 w-4" />
              <span>{template.successCriteria}</span>
            </div>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCreateFromTemplate(template);
              }}
            >
              Use Template
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const renderTemplateDetail = (template: WeddingTestTemplate) => {
    const IconComponent = CATEGORY_ICONS[template.category];
    const colorClass = CATEGORY_COLORS[template.category];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-lg bg-${colorClass}-100`}>
            <IconComponent className={`h-6 w-6 text-${colorClass}-600`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {template.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{template.category}</Badge>
              <Badge variant="outline">{template.difficulty}</Badge>
              <Badge variant="outline">{template.weddingPhase}</Badge>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Test Scenario</h3>
          <p className="text-gray-700 mb-4">{template.scenario}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Business Impact
              </h4>
              <p className="text-sm text-gray-700">{template.businessImpact}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Target Audience
              </h4>
              <p className="text-sm text-gray-700">
                {template.audienceSegment}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              Control Variant
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Name
                </label>
                <p className="text-gray-900">
                  {template.variants.control.name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Subject
                </label>
                <p className="text-gray-900">
                  {template.variants.control.subject}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Message
                </label>
                <p className="text-gray-700 text-sm">
                  {template.variants.control.message}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Channel
                  </label>
                  <p className="text-gray-900 capitalize">
                    {template.variants.control.channel}
                  </p>
                </div>
                {template.variants.control.timing && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Timing
                    </label>
                    <p className="text-gray-900">
                      {template.variants.control.timing}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-600"></div>
              Test Variant
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Name
                </label>
                <p className="text-gray-900">{template.variants.test.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Subject
                </label>
                <p className="text-gray-900">
                  {template.variants.test.subject}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Message
                </label>
                <p className="text-gray-700 text-sm">
                  {template.variants.test.message}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Channel
                  </label>
                  <p className="text-gray-900 capitalize">
                    {template.variants.test.channel}
                  </p>
                </div>
                {template.variants.test.timing && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Timing
                    </label>
                    <p className="text-gray-900">
                      {template.variants.test.timing}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Expected Results</h3>
          <div className="space-y-4">
            {template.expectedResults.map((result, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{result.metric}</h4>
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-200"
                  >
                    +{result.expectedImprovement}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700">{result.reasoning}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pro Tips</h3>
          <ul className="space-y-2">
            {template.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">{tip}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={() => onCreateFromTemplate(template)}
            className="flex-1"
          >
            Create Test from Template
          </Button>
          <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
            Back to Templates
          </Button>
        </div>
      </div>
    );
  };

  if (selectedTemplate) {
    return renderTemplateDetail(selectedTemplate);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Wedding A/B Test Templates
        </h1>
        <p className="text-gray-600">
          Proven test scenarios designed specifically for wedding planners. Each
          template includes expected results and pro tips.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="h-4 w-4 inline mr-1" />
              Search
            </label>
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Category
            </label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty
            </label>
            <Select
              value={selectedDifficulty}
              onValueChange={setSelectedDifficulty}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {difficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedDifficulty('all');
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {filteredTemplates.length} of {WEDDING_TEST_TEMPLATES.length}{' '}
        templates
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(renderTemplateCard)}
      </div>

      {filteredTemplates.length === 0 && (
        <Card className="p-8 text-center">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No templates found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filters or search terms
          </p>
        </Card>
      )}
    </div>
  );
}
