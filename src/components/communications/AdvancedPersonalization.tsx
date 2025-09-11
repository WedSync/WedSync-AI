'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Variable,
  User,
  Hash,
  Calendar,
  MapPin,
  Heart,
  Gift,
  Utensils,
  Users,
  Settings,
  Code,
  Eye,
  Sparkles,
  Plus,
  X,
  Copy,
  Check,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PersonalizationToken {
  key: string;
  label: string;
  category: 'guest' | 'wedding' | 'couple' | 'venue' | 'custom';
  value?: string;
  fallback?: string;
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  format?: string; // For dates, numbers, etc.
  icon?: React.ElementType;
}

export interface ConditionalContent {
  id: string;
  name: string;
  condition: {
    field: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'contains'
      | 'greater_than'
      | 'less_than'
      | 'is_empty'
      | 'is_not_empty';
    value: string;
    logic?: 'and' | 'or';
  }[];
  content: string;
  priority: number;
}

export interface DynamicContentBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'conditional';
  content: string;
  settings?: {
    alignment?: 'left' | 'center' | 'right';
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    padding?: string;
    backgroundColor?: string;
    borderRadius?: string;
    link?: string;
  };
  conditions?: ConditionalContent[];
}

interface AdvancedPersonalizationProps {
  content: string;
  onContentChange: (content: string) => void;
  availableTokens?: PersonalizationToken[];
  guestData?: any;
  onPreview?: (personalizedContent: string) => void;
  className?: string;
}

const DEFAULT_TOKENS: PersonalizationToken[] = [
  // Guest tokens
  {
    key: '{{guest.first_name}}',
    label: 'Guest First Name',
    category: 'guest',
    icon: User,
  },
  {
    key: '{{guest.last_name}}',
    label: 'Guest Last Name',
    category: 'guest',
    icon: User,
  },
  {
    key: '{{guest.full_name}}',
    label: 'Guest Full Name',
    category: 'guest',
    icon: User,
  },
  {
    key: '{{guest.email}}',
    label: 'Guest Email',
    category: 'guest',
    icon: User,
  },
  {
    key: '{{guest.phone}}',
    label: 'Guest Phone',
    category: 'guest',
    icon: User,
  },
  {
    key: '{{guest.dietary}}',
    label: 'Dietary Requirements',
    category: 'guest',
    icon: Utensils,
  },
  {
    key: '{{guest.table_number}}',
    label: 'Table Number',
    category: 'guest',
    icon: Hash,
  },
  {
    key: '{{guest.rsvp_status}}',
    label: 'RSVP Status',
    category: 'guest',
    icon: Check,
  },
  {
    key: '{{guest.plus_one_name}}',
    label: 'Plus One Name',
    category: 'guest',
    icon: Users,
  },

  // Wedding tokens
  {
    key: '{{wedding.date}}',
    label: 'Wedding Date',
    category: 'wedding',
    icon: Calendar,
  },
  {
    key: '{{wedding.time}}',
    label: 'Wedding Time',
    category: 'wedding',
    icon: Calendar,
  },
  {
    key: '{{wedding.countdown}}',
    label: 'Days Until Wedding',
    category: 'wedding',
    icon: Calendar,
  },
  {
    key: '{{wedding.season}}',
    label: 'Wedding Season',
    category: 'wedding',
    icon: Calendar,
  },

  // Couple tokens
  {
    key: '{{couple.names}}',
    label: 'Couple Names',
    category: 'couple',
    icon: Heart,
  },
  {
    key: '{{couple.partner1}}',
    label: 'Partner 1 Name',
    category: 'couple',
    icon: Heart,
  },
  {
    key: '{{couple.partner2}}',
    label: 'Partner 2 Name',
    category: 'couple',
    icon: Heart,
  },
  {
    key: '{{couple.hashtag}}',
    label: 'Wedding Hashtag',
    category: 'couple',
    icon: Hash,
  },

  // Venue tokens
  {
    key: '{{venue.name}}',
    label: 'Venue Name',
    category: 'venue',
    icon: MapPin,
  },
  {
    key: '{{venue.address}}',
    label: 'Venue Address',
    category: 'venue',
    icon: MapPin,
  },
  {
    key: '{{venue.directions}}',
    label: 'Directions Link',
    category: 'venue',
    icon: MapPin,
  },
  {
    key: '{{venue.parking}}',
    label: 'Parking Info',
    category: 'venue',
    icon: MapPin,
  },
];

export function AdvancedPersonalization({
  content,
  onContentChange,
  availableTokens = DEFAULT_TOKENS,
  guestData,
  onPreview,
  className,
}: AdvancedPersonalizationProps) {
  const [activeTab, setActiveTab] = useState('tokens');
  const [selectedToken, setSelectedToken] =
    useState<PersonalizationToken | null>(null);
  const [customTokens, setCustomTokens] = useState<PersonalizationToken[]>([]);
  const [conditionalBlocks, setConditionalBlocks] = useState<
    ConditionalContent[]
  >([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const allTokens = useMemo(() => {
    return [...availableTokens, ...customTokens];
  }, [availableTokens, customTokens]);

  const tokensByCategory = useMemo(() => {
    return allTokens.reduce(
      (acc, token) => {
        if (!acc[token.category]) acc[token.category] = [];
        acc[token.category].push(token);
        return acc;
      },
      {} as Record<string, PersonalizationToken[]>,
    );
  }, [allTokens]);

  const insertToken = useCallback(
    (token: PersonalizationToken) => {
      const newContent = content + ' ' + token.key;
      onContentChange(newContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [content, onContentChange],
  );

  const copyToken = useCallback((token: PersonalizationToken) => {
    navigator.clipboard.writeText(token.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const addCustomToken = useCallback(() => {
    const newToken: PersonalizationToken = {
      key: `{{custom.token_${Date.now()}}}`,
      label: 'New Custom Token',
      category: 'custom',
      fallback: '',
    };
    setCustomTokens([...customTokens, newToken]);
    setSelectedToken(newToken);
  }, [customTokens]);

  const updateCustomToken = useCallback(
    (token: PersonalizationToken, updates: Partial<PersonalizationToken>) => {
      setCustomTokens(
        customTokens.map((t) =>
          t.key === token.key ? { ...t, ...updates } : t,
        ),
      );
    },
    [customTokens],
  );

  const removeCustomToken = useCallback(
    (token: PersonalizationToken) => {
      setCustomTokens(customTokens.filter((t) => t.key !== token.key));
      if (selectedToken?.key === token.key) {
        setSelectedToken(null);
      }
    },
    [customTokens, selectedToken],
  );

  const addConditionalBlock = useCallback(() => {
    const newBlock: ConditionalContent = {
      id: `block_${Date.now()}`,
      name: 'New Conditional Block',
      condition: [
        {
          field: 'guest.rsvp_status',
          operator: 'equals',
          value: 'confirmed',
        },
      ],
      content: '',
      priority: conditionalBlocks.length + 1,
    };
    setConditionalBlocks([...conditionalBlocks, newBlock]);
  }, [conditionalBlocks]);

  const updateConditionalBlock = useCallback(
    (id: string, updates: Partial<ConditionalContent>) => {
      setConditionalBlocks(
        conditionalBlocks.map((block) =>
          block.id === id ? { ...block, ...updates } : block,
        ),
      );
    },
    [conditionalBlocks],
  );

  const removeConditionalBlock = useCallback(
    (id: string) => {
      setConditionalBlocks(
        conditionalBlocks.filter((block) => block.id !== id),
      );
    },
    [conditionalBlocks],
  );

  const generatePreview = useCallback(() => {
    let personalizedContent = content;

    // Replace tokens with actual values
    allTokens.forEach((token) => {
      const value =
        guestData?.[
          token.key.replace('{{', '').replace('}}', '').replace('.', '_')
        ] ||
        token.fallback ||
        `[${token.label}]`;

      // Apply transformations
      let transformedValue = value;
      if (token.transform === 'uppercase')
        transformedValue = value.toUpperCase();
      if (token.transform === 'lowercase')
        transformedValue = value.toLowerCase();
      if (token.transform === 'capitalize')
        transformedValue = value.charAt(0).toUpperCase() + value.slice(1);

      personalizedContent = personalizedContent.replace(
        new RegExp(token.key, 'g'),
        transformedValue,
      );
    });

    // Process conditional blocks
    conditionalBlocks.forEach((block) => {
      const conditionMet = evaluateCondition(block.condition, guestData);
      if (conditionMet) {
        personalizedContent += '\n\n' + block.content;
      }
    });

    setPreviewContent(personalizedContent);
    setIsPreviewMode(true);
    onPreview?.(personalizedContent);
  }, [content, allTokens, conditionalBlocks, guestData, onPreview]);

  const evaluateCondition = (
    conditions: ConditionalContent['condition'],
    data: any,
  ): boolean => {
    return conditions.every((cond) => {
      const fieldValue = data?.[cond.field.replace('.', '_')];

      switch (cond.operator) {
        case 'equals':
          return fieldValue === cond.value;
        case 'not_equals':
          return fieldValue !== cond.value;
        case 'contains':
          return fieldValue?.includes(cond.value);
        case 'greater_than':
          return Number(fieldValue) > Number(cond.value);
        case 'less_than':
          return Number(fieldValue) < Number(cond.value);
        case 'is_empty':
          return !fieldValue || fieldValue === '';
        case 'is_not_empty':
          return !!fieldValue && fieldValue !== '';
        default:
          return false;
      }
    });
  };

  const generateAIContent = useCallback(async () => {
    // Simulate AI content generation
    const generatedContent = `Dear {{guest.first_name}},

We're delighted to invite you to celebrate the wedding of {{couple.names}} on {{wedding.date}}.

${aiPrompt}

The ceremony will begin at {{wedding.time}} at {{venue.name}}.

We look forward to celebrating with you!

Best regards,
{{couple.names}}`;

    onContentChange(generatedContent);
    setShowAIAssistant(false);
    setAiPrompt('');
  }, [aiPrompt, onContentChange]);

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Variable className="h-5 w-5" />
            Advanced Personalization
          </CardTitle>
          <CardDescription>
            Create dynamic, personalized messages for each guest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="conditional">Conditional</TabsTrigger>
              <TabsTrigger value="ai">AI Assistant</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="tokens" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Token Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Available Tokens
                    </CardTitle>
                    <CardDescription>Click to insert or copy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {Object.entries(tokensByCategory).map(
                          ([category, tokens]) => (
                            <div key={category}>
                              <h4 className="text-sm font-medium capitalize mb-2 text-muted-foreground">
                                {category}
                              </h4>
                              <div className="space-y-1">
                                {tokens.map((token) => {
                                  const Icon = token.icon || Variable;
                                  return (
                                    <div
                                      key={token.key}
                                      className={cn(
                                        'flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer',
                                        selectedToken?.key === token.key &&
                                          'bg-accent',
                                      )}
                                      onClick={() => setSelectedToken(token)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                          {token.label}
                                        </span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            insertToken(token);
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToken(token);
                                          }}
                                        >
                                          {copied ? (
                                            <Check className="h-3 w-3" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ),
                        )}

                        {/* Custom Tokens */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Custom
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={addCustomToken}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                          {customTokens.map((token) => (
                            <div
                              key={token.key}
                              className={cn(
                                'flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer',
                                selectedToken?.key === token.key && 'bg-accent',
                              )}
                              onClick={() => setSelectedToken(token)}
                            >
                              <span className="text-sm">{token.label}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCustomToken(token);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Token Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Token Settings</CardTitle>
                    <CardDescription>Configure selected token</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedToken ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Token Key</Label>
                          <Input
                            value={selectedToken.key}
                            readOnly={!customTokens.includes(selectedToken)}
                            onChange={(e) =>
                              updateCustomToken(selectedToken, {
                                key: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input
                            value={selectedToken.label}
                            readOnly={!customTokens.includes(selectedToken)}
                            onChange={(e) =>
                              updateCustomToken(selectedToken, {
                                label: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Fallback Value</Label>
                          <Input
                            value={selectedToken.fallback || ''}
                            placeholder="Value to use if data is missing"
                            onChange={(e) => {
                              if (customTokens.includes(selectedToken)) {
                                updateCustomToken(selectedToken, {
                                  fallback: e.target.value,
                                });
                              }
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Text Transform</Label>
                          <Select
                            value={selectedToken.transform || 'none'}
                            onValueChange={(value) => {
                              if (customTokens.includes(selectedToken)) {
                                updateCustomToken(selectedToken, {
                                  transform:
                                    value as PersonalizationToken['transform'],
                                });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="uppercase">
                                UPPERCASE
                              </SelectItem>
                              <SelectItem value="lowercase">
                                lowercase
                              </SelectItem>
                              <SelectItem value="capitalize">
                                Capitalize
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            This token will be replaced with actual guest data
                            when the message is sent.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[300px] text-center">
                        <Variable className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                          Select a token to configure its settings
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="conditional" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Conditional Content</h3>
                  <p className="text-sm text-muted-foreground">
                    Show different content based on guest attributes
                  </p>
                </div>
                <Button onClick={addConditionalBlock}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Condition
                </Button>
              </div>

              <div className="space-y-4">
                {conditionalBlocks.map((block) => (
                  <Card key={block.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <Input
                          value={block.name}
                          onChange={(e) =>
                            updateConditionalBlock(block.id, {
                              name: e.target.value,
                            })
                          }
                          className="w-64"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeConditionalBlock(block.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Conditions */}
                      <div className="space-y-2">
                        <Label>Conditions</Label>
                        {block.condition.map((cond, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            {index > 0 && (
                              <Select
                                value={cond.logic || 'and'}
                                onValueChange={(value) => {
                                  const newConditions = [...block.condition];
                                  newConditions[index] = {
                                    ...cond,
                                    logic: value as 'and' | 'or',
                                  };
                                  updateConditionalBlock(block.id, {
                                    condition: newConditions,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="and">AND</SelectItem>
                                  <SelectItem value="or">OR</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <Select
                              value={cond.field}
                              onValueChange={(value) => {
                                const newConditions = [...block.condition];
                                newConditions[index] = {
                                  ...cond,
                                  field: value,
                                };
                                updateConditionalBlock(block.id, {
                                  condition: newConditions,
                                });
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="guest.rsvp_status">
                                  RSVP Status
                                </SelectItem>
                                <SelectItem value="guest.dietary">
                                  Dietary Requirements
                                </SelectItem>
                                <SelectItem value="guest.table_number">
                                  Table Number
                                </SelectItem>
                                <SelectItem value="guest.plus_one">
                                  Has Plus One
                                </SelectItem>
                                <SelectItem value="guest.category">
                                  Guest Category
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={cond.operator}
                              onValueChange={(value) => {
                                const newConditions = [...block.condition];
                                newConditions[index] = {
                                  ...cond,
                                  operator: value as any,
                                };
                                updateConditionalBlock(block.id, {
                                  condition: newConditions,
                                });
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">
                                  Not Equals
                                </SelectItem>
                                <SelectItem value="contains">
                                  Contains
                                </SelectItem>
                                <SelectItem value="greater_than">
                                  Greater Than
                                </SelectItem>
                                <SelectItem value="less_than">
                                  Less Than
                                </SelectItem>
                                <SelectItem value="is_empty">
                                  Is Empty
                                </SelectItem>
                                <SelectItem value="is_not_empty">
                                  Is Not Empty
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              value={cond.value}
                              onChange={(e) => {
                                const newConditions = [...block.condition];
                                newConditions[index] = {
                                  ...cond,
                                  value: e.target.value,
                                };
                                updateConditionalBlock(block.id, {
                                  condition: newConditions,
                                });
                              }}
                              placeholder="Value"
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newConditions = block.condition.filter(
                                  (_, i) => i !== index,
                                );
                                updateConditionalBlock(block.id, {
                                  condition: newConditions,
                                });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newConditions = [
                              ...block.condition,
                              {
                                field: 'guest.rsvp_status',
                                operator: 'equals' as const,
                                value: '',
                                logic: 'and' as const,
                              },
                            ];
                            updateConditionalBlock(block.id, {
                              condition: newConditions,
                            });
                          }}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Add Condition
                        </Button>
                      </div>

                      {/* Content */}
                      <div className="space-y-2">
                        <Label>Content (shown when conditions are met)</Label>
                        <Textarea
                          value={block.content}
                          onChange={(e) =>
                            updateConditionalBlock(block.id, {
                              content: e.target.value,
                            })
                          }
                          placeholder="Enter content to show when conditions are met..."
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {conditionalBlocks.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground text-center">
                        No conditional blocks yet.
                        <br />
                        Add conditions to show different content based on guest
                        attributes.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    AI Content Assistant
                  </CardTitle>
                  <CardDescription>
                    Generate personalized content with AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Describe your message</Label>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., Create a warm, friendly reminder about the RSVP deadline, mentioning the wedding date and emphasizing how much we're looking forward to celebrating with them..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select defaultValue="friendly">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="romantic">Romantic</SelectItem>
                          <SelectItem value="humorous">Humorous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Message Type</Label>
                      <Select defaultValue="invitation">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invitation">Invitation</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                          <SelectItem value="thank_you">Thank You</SelectItem>
                          <SelectItem value="information">
                            Information
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Include Tokens</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_TOKENS.slice(0, 8).map((token) => (
                        <Badge
                          key={token.key}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            setAiPrompt(aiPrompt + ' ' + token.key)
                          }
                        >
                          {token.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={generateAIContent}
                    className="w-full"
                    disabled={!aiPrompt}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Content
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Preview</CardTitle>
                      <CardDescription>
                        See how your message will look with personalization
                      </CardDescription>
                    </div>
                    <Button onClick={generatePreview}>
                      <Eye className="mr-2 h-4 w-4" />
                      Generate Preview
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isPreviewMode ? (
                    <div className="space-y-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This preview shows how the message will appear to a
                          guest with sample data.
                        </AlertDescription>
                      </Alert>
                      <div className="p-4 border rounded-lg bg-accent/50">
                        <pre className="whitespace-pre-wrap text-sm">
                          {previewContent}
                        </pre>
                      </div>
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          onClick={() => setIsPreviewMode(false)}
                        >
                          Edit Content
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(previewContent);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        >
                          {copied ? (
                            <Check className="mr-2 h-4 w-4" />
                          ) : (
                            <Copy className="mr-2 h-4 w-4" />
                          )}
                          Copy Preview
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground text-center">
                        Click "Generate Preview" to see how your message
                        <br />
                        will look with personalization applied.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
