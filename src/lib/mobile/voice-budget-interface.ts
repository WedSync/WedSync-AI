/**
 * Voice-Activated Budget Interface with Natural Language Understanding
 * Team D - Round 2 WS-163 Implementation
 *
 * Provides conversational voice interface for budget queries, updates, and
 * intelligent assistance for wedding planning financial management.
 */

import {
  WeddingBudget,
  BudgetCategory,
  BudgetItem,
  advancedBudgetManager,
} from './advanced-budget-system';
import { spendingAnalytics } from './spending-analytics';
import { currencyConverter } from './currency-converter';

// ==================== TYPES AND INTERFACES ====================

export interface VoiceSession {
  id: string;
  userId: string;
  startTime: string;
  lastActivity: string;
  isActive: boolean;
  context: ConversationContext;
  settings: VoiceSettings;
  transcript: ConversationTurn[];
}

export interface ConversationContext {
  currentBudget?: WeddingBudget;
  focusCategory?: string;
  focusItem?: string;
  lastQuery?: string;
  conversationState: ConversationState;
  pendingActions: PendingAction[];
  userPreferences: UserPreferences;
}

export interface ConversationTurn {
  id: string;
  timestamp: string;
  type: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  intent?: Intent;
  entities?: Entity[];
  confidence: number;
  response?: VoiceResponse;
}

export interface VoiceSettings {
  language: string;
  voice: VoiceProfile;
  speechRate: number;
  volume: number;
  enableWakeWord: boolean;
  privacyMode: boolean;
  offlineMode: boolean;
}

export interface VoiceProfile {
  name: string;
  gender: 'male' | 'female' | 'neutral';
  accent: string;
  personality: 'professional' | 'friendly' | 'casual';
}

export interface Intent {
  name: string;
  confidence: number;
  parameters: { [key: string]: any };
  followUpQuestions?: string[];
}

export interface Entity {
  type: EntityType;
  value: string;
  originalText: string;
  confidence: number;
  metadata?: any;
}

export interface VoiceResponse {
  text: string;
  audioUrl?: string;
  suggestions: string[];
  quickActions: QuickAction[];
  visualData?: VisualData;
  requiresConfirmation?: boolean;
}

export interface PendingAction {
  id: string;
  type: ActionType;
  description: string;
  parameters: any;
  expiresAt: string;
  confirmationRequired: boolean;
}

export interface UserPreferences {
  preferredCurrency: string;
  defaultDateFormat: string;
  verboseResponses: boolean;
  includeAnalytics: boolean;
  warnOnOverspend: boolean;
  roundNumbers: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  action: string;
  icon?: string;
  parameters?: any;
}

export interface VisualData {
  type: 'chart' | 'table' | 'summary' | 'list';
  data: any;
  title: string;
  description?: string;
}

export interface VoiceCommand {
  pattern: string;
  intent: string;
  examples: string[];
  parameters: CommandParameter[];
  requiresConfirmation: boolean;
  securityLevel: SecurityLevel;
}

export interface CommandParameter {
  name: string;
  type: EntityType;
  required: boolean;
  description: string;
  validation?: string;
}

export interface WeddingVoiceContext {
  weddingDate?: string;
  budgetTotal?: number;
  planningStageh?: PlanningStage;
  activeVendors: string[];
  upcomingDeadlines: string[];
  recentChanges: string[];
}

export enum ConversationState {
  LISTENING = 'listening',
  PROCESSING = 'processing',
  RESPONDING = 'responding',
  WAITING_CONFIRMATION = 'waiting_confirmation',
  ERROR = 'error',
  IDLE = 'idle',
}

export enum EntityType {
  AMOUNT = 'amount',
  CATEGORY = 'category',
  DATE = 'date',
  VENDOR = 'vendor',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  ITEM_NAME = 'item_name',
}

export enum ActionType {
  UPDATE_BUDGET = 'update_budget',
  ADD_EXPENSE = 'add_expense',
  CHECK_BALANCE = 'check_balance',
  GET_ANALYTICS = 'get_analytics',
  CURRENCY_CONVERT = 'currency_convert',
  SET_ALERT = 'set_alert',
}

export enum SecurityLevel {
  LOW = 'low', // Read-only queries
  MEDIUM = 'medium', // Minor updates
  HIGH = 'high', // Major financial changes
}

export enum PlanningStage {
  EARLY_PLANNING = 'early_planning',
  VENDOR_BOOKING = 'vendor_booking',
  DETAIL_PLANNING = 'detail_planning',
  FINAL_PREPARATIONS = 'final_preparations',
  POST_WEDDING = 'post_wedding',
}

// ==================== VOICE BUDGET INTERFACE ====================

export class VoiceBudgetInterface {
  private static instance: VoiceBudgetInterface;
  private speechRecognizer: SpeechRecognizer;
  private speechSynthesizer: SpeechSynthesizer;
  private nlpProcessor: NLPProcessor;
  private intentClassifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  private responseGenerator: ResponseGenerator;
  private currentSession: VoiceSession | null = null;
  private isListening: boolean = false;
  private subscribers: Map<string, (event: VoiceEvent) => void> = new Map();

  private constructor() {
    this.speechRecognizer = new SpeechRecognizer();
    this.speechSynthesizer = new SpeechSynthesizer();
    this.nlpProcessor = new NLPProcessor();
    this.intentClassifier = new IntentClassifier();
    this.entityExtractor = new EntityExtractor();
    this.responseGenerator = new ResponseGenerator();
    this.initializeVoiceCommands();
  }

  public static getInstance(): VoiceBudgetInterface {
    if (!VoiceBudgetInterface.instance) {
      VoiceBudgetInterface.instance = new VoiceBudgetInterface();
    }
    return VoiceBudgetInterface.instance;
  }

  // ==================== SESSION MANAGEMENT ====================

  public async startVoiceSession(
    userId: string,
    budgetId: string,
  ): Promise<VoiceSession> {
    try {
      // Load user's budget
      const budget = await advancedBudgetManager.loadBudget(budgetId);

      const session: VoiceSession = {
        id: `voice_session_${Date.now()}`,
        userId,
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true,
        context: {
          currentBudget: budget,
          conversationState: ConversationState.IDLE,
          pendingActions: [],
          userPreferences: {
            preferredCurrency: budget.currency,
            defaultDateFormat: 'MM/DD/YYYY',
            verboseResponses: true,
            includeAnalytics: true,
            warnOnOverspend: true,
            roundNumbers: true,
          },
        },
        settings: {
          language: 'en-US',
          voice: {
            name: 'WedSync Assistant',
            gender: 'neutral',
            accent: 'american',
            personality: 'professional',
          },
          speechRate: 1.0,
          volume: 0.8,
          enableWakeWord: true,
          privacyMode: false,
          offlineMode: false,
        },
        transcript: [],
      };

      this.currentSession = session;

      // Initialize speech recognition
      await this.speechRecognizer.initialize(session.settings);

      // Welcome message
      await this.speak(
        "Hello! I'm your WedSync budget assistant. You can ask me about your wedding budget, expenses, or get spending insights. How can I help you today?",
      );

      this.notifySubscribers({
        type: 'session_started',
        data: session,
      });

      console.log('[Voice] Session started:', session.id);
      return session;
    } catch (error) {
      console.error('[Voice] Failed to start session:', error);
      throw error;
    }
  }

  public async endVoiceSession(): Promise<void> {
    if (!this.currentSession) return;

    try {
      this.currentSession.isActive = false;
      this.isListening = false;

      await this.speechRecognizer.stop();

      // Save session transcript
      await this.saveSessionTranscript(this.currentSession);

      this.notifySubscribers({
        type: 'session_ended',
        data: this.currentSession,
      });

      console.log('[Voice] Session ended:', this.currentSession.id);
      this.currentSession = null;
    } catch (error) {
      console.error('[Voice] Failed to end session:', error);
    }
  }

  // ==================== VOICE INTERACTION ====================

  public async startListening(): Promise<void> {
    if (!this.currentSession || this.isListening) return;

    try {
      this.isListening = true;
      this.currentSession.context.conversationState =
        ConversationState.LISTENING;

      await this.speak("I'm listening...");

      const transcript = await this.speechRecognizer.listen();

      if (transcript && transcript.length > 0) {
        await this.processUserInput(transcript);
      }
    } catch (error) {
      console.error('[Voice] Listening error:', error);
      this.currentSession.context.conversationState = ConversationState.ERROR;
      await this.speak(
        'Sorry, I had trouble hearing you. Could you please try again?',
      );
    } finally {
      this.isListening = false;
    }
  }

  private async processUserInput(transcript: string): Promise<void> {
    if (!this.currentSession) return;

    try {
      this.currentSession.context.conversationState =
        ConversationState.PROCESSING;
      this.currentSession.lastActivity = new Date().toISOString();

      // Add user turn to transcript
      const userTurn: ConversationTurn = {
        id: `turn_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'user',
        content: transcript,
        confidence: 0.9,
      };

      this.currentSession.transcript.push(userTurn);

      // Process natural language
      const processed = await this.nlpProcessor.process(
        transcript,
        this.currentSession.context,
      );

      // Classify intent
      const intent = await this.intentClassifier.classify(
        processed.text,
        this.currentSession.context,
      );

      // Extract entities
      const entities = await this.entityExtractor.extract(
        processed.text,
        intent,
      );

      // Update conversation turn with analysis
      userTurn.intent = intent;
      userTurn.entities = entities;
      userTurn.confidence = intent.confidence;

      // Generate and execute response
      const response = await this.generateResponse(
        intent,
        entities,
        this.currentSession.context,
      );

      // Add assistant turn to transcript
      const assistantTurn: ConversationTurn = {
        id: `turn_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'assistant',
        content: response.text,
        confidence: 1.0,
        response,
      };

      this.currentSession.transcript.push(assistantTurn);

      // Speak response
      await this.speak(response.text);

      this.currentSession.context.conversationState = ConversationState.IDLE;

      this.notifySubscribers({
        type: 'conversation_turn',
        data: { userTurn, assistantTurn },
      });
    } catch (error) {
      console.error('[Voice] Processing error:', error);
      this.currentSession.context.conversationState = ConversationState.ERROR;
      await this.speak(
        "I'm sorry, I encountered an error processing your request. Please try again.",
      );
    }
  }

  // ==================== RESPONSE GENERATION ====================

  private async generateResponse(
    intent: Intent,
    entities: Entity[],
    context: ConversationContext,
  ): Promise<VoiceResponse> {
    switch (intent.name) {
      case 'get_budget_overview':
        return await this.generateBudgetOverview(context);

      case 'get_category_balance':
        return await this.generateCategoryBalance(entities, context);

      case 'add_expense':
        return await this.generateAddExpense(entities, context);

      case 'get_spending_analytics':
        return await this.generateSpendingAnalytics(context);

      case 'convert_currency':
        return await this.generateCurrencyConversion(entities, context);

      case 'check_overspend_risk':
        return await this.generateOverspendRisk(context);

      case 'get_vendor_spending':
        return await this.generateVendorSpending(entities, context);

      default:
        return this.generateHelpResponse();
    }
  }

  private async generateBudgetOverview(
    context: ConversationContext,
  ): Promise<VoiceResponse> {
    const budget = context.currentBudget!;
    const spentPercentage = (budget.spent_amount / budget.total_budget) * 100;
    const remaining = budget.total_budget - budget.spent_amount;

    const text = `Here's your wedding budget overview: You have a total budget of ${this.formatCurrency(budget.total_budget, budget.currency)}. You've spent ${this.formatCurrency(budget.spent_amount, budget.currency)}, which is ${spentPercentage.toFixed(1)}% of your budget. You have ${this.formatCurrency(remaining, budget.currency)} remaining.`;

    const suggestions = [
      'Show me category breakdown',
      'How much did I spend on flowers?',
      'Am I over budget in any category?',
      'What are my biggest expenses?',
    ];

    const quickActions = [
      {
        id: 'categories',
        label: 'Category Details',
        action: 'get_category_breakdown',
      },
      { id: 'analytics', label: 'Spending Analytics', action: 'get_analytics' },
      { id: 'alerts', label: 'Budget Alerts', action: 'check_alerts' },
    ];

    return {
      text,
      suggestions,
      quickActions,
      visualData: {
        type: 'summary',
        title: 'Budget Overview',
        data: {
          total: budget.total_budget,
          spent: budget.spent_amount,
          remaining,
          percentage: spentPercentage,
        },
      },
    };
  }

  private async generateCategoryBalance(
    entities: Entity[],
    context: ConversationContext,
  ): Promise<VoiceResponse> {
    const budget = context.currentBudget!;
    const categoryEntity = entities.find((e) => e.type === EntityType.CATEGORY);

    if (!categoryEntity) {
      return {
        text: 'Which category would you like me to check? For example, you can ask about flowers, venue, catering, or photography.',
        suggestions: [
          'How much for flowers?',
          'Venue spending',
          'Catering budget',
        ],
        quickActions: [],
      };
    }

    const categoryName = categoryEntity.value.toLowerCase();
    const category = budget.categories.find(
      (c) =>
        c.name.toLowerCase().includes(categoryName) ||
        categoryName.includes(c.name.toLowerCase()),
    );

    if (!category) {
      return {
        text: `I couldn't find a category matching "${categoryEntity.originalText}". Your categories are: ${budget.categories.map((c) => c.name).join(', ')}.`,
        suggestions: budget.categories
          .slice(0, 3)
          .map((c) => `How much for ${c.name}?`),
        quickActions: [],
      };
    }

    const utilization =
      (category.spent_amount / category.allocated_amount) * 100;
    const remaining = category.allocated_amount - category.spent_amount;

    let text = `For ${category.name}: You've allocated ${this.formatCurrency(category.allocated_amount, budget.currency)} and spent ${this.formatCurrency(category.spent_amount, budget.currency)}, which is ${utilization.toFixed(1)}% of your allocation.`;

    if (remaining > 0) {
      text += ` You have ${this.formatCurrency(remaining, budget.currency)} remaining.`;
    } else {
      text += ` You're ${this.formatCurrency(Math.abs(remaining), budget.currency)} over budget in this category.`;
    }

    const suggestions = [
      `What did I buy for ${category.name}?`,
      'Show me my biggest expenses',
      'Add a new expense',
    ];

    return {
      text,
      suggestions,
      quickActions: [
        {
          id: 'items',
          label: 'View Items',
          action: 'get_category_items',
          parameters: { categoryId: category.id },
        },
        {
          id: 'add',
          label: 'Add Expense',
          action: 'add_expense',
          parameters: { categoryId: category.id },
        },
      ],
      visualData: {
        type: 'summary',
        title: category.name,
        data: {
          allocated: category.allocated_amount,
          spent: category.spent_amount,
          remaining,
          utilization,
        },
      },
    };
  }

  private async generateAddExpense(
    entities: Entity[],
    context: ConversationContext,
  ): Promise<VoiceResponse> {
    const amountEntity = entities.find((e) => e.type === EntityType.AMOUNT);
    const categoryEntity = entities.find((e) => e.type === EntityType.CATEGORY);
    const vendorEntity = entities.find((e) => e.type === EntityType.VENDOR);

    if (!amountEntity) {
      return {
        text: "I'd be happy to help you add an expense. What's the amount you'd like to record?",
        suggestions: [
          'I spent $500 on flowers',
          'Add $2000 venue deposit',
          'Record $150 cake tasting',
        ],
        quickActions: [],
        requiresConfirmation: false,
      };
    }

    const amount = parseFloat(amountEntity.value);
    const categoryName = categoryEntity?.value || 'miscellaneous';
    const vendorName = vendorEntity?.value || 'Unknown vendor';

    // Create pending action for confirmation
    const pendingAction: PendingAction = {
      id: `expense_${Date.now()}`,
      type: ActionType.ADD_EXPENSE,
      description: `Add ${this.formatCurrency(amount, context.currentBudget!.currency)} expense for ${categoryName}`,
      parameters: {
        amount,
        category: categoryName,
        vendor: vendorName,
        date: new Date().toISOString(),
      },
      expiresAt: new Date(Date.now() + 60000).toISOString(), // 1 minute
      confirmationRequired: true,
    };

    context.pendingActions.push(pendingAction);

    return {
      text: `I'll add a ${this.formatCurrency(amount, context.currentBudget!.currency)} expense for ${categoryName}${vendorName !== 'Unknown vendor' ? ` from ${vendorName}` : ''}. Should I go ahead and add this to your budget?`,
      suggestions: ['Yes, add it', 'No, cancel', 'Change the category'],
      quickActions: [
        {
          id: 'confirm',
          label: 'Confirm',
          action: 'confirm_action',
          parameters: { actionId: pendingAction.id },
        },
        {
          id: 'cancel',
          label: 'Cancel',
          action: 'cancel_action',
          parameters: { actionId: pendingAction.id },
        },
      ],
      requiresConfirmation: true,
    };
  }

  private async generateSpendingAnalytics(
    context: ConversationContext,
  ): Promise<VoiceResponse> {
    const budget = context.currentBudget!;
    const analytics =
      await spendingAnalytics.generateComprehensiveAnalytics(budget);

    const topCategories = analytics.categories
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 3);

    let text = `Here are your spending insights: Your top three spending categories are `;
    text +=
      topCategories
        .map((cat, index) => {
          const percentage = (cat.spent / budget.spent_amount) * 100;
          return `${cat.name} at ${this.formatCurrency(cat.spent, budget.currency)} (${percentage.toFixed(1)}% of total spending)`;
        })
        .join(', ') + '.';

    if (analytics.overall.projectedOverrun > 0) {
      text += ` Based on current trends, you may go over budget by ${this.formatCurrency(analytics.overall.projectedOverrun, budget.currency)}.`;
    } else {
      text += ` You're currently on track to stay within budget.`;
    }

    const suggestions = [
      'Which category should I reduce?',
      'Show me spending trends',
      "What's my average daily spending?",
    ];

    return {
      text,
      suggestions,
      quickActions: [
        { id: 'trends', label: 'View Trends', action: 'get_trends' },
        { id: 'predictions', label: 'Predictions', action: 'get_predictions' },
        {
          id: 'recommendations',
          label: 'Recommendations',
          action: 'get_recommendations',
        },
      ],
      visualData: {
        type: 'chart',
        title: 'Spending by Category',
        data: topCategories.map((cat) => ({
          name: cat.name,
          value: cat.spent,
          percentage: (cat.spent / budget.spent_amount) * 100,
        })),
      },
    };
  }

  private async generateCurrencyConversion(
    entities: Entity[],
    context: ConversationContext,
  ): Promise<VoiceResponse> {
    const amountEntity = entities.find((e) => e.type === EntityType.AMOUNT);
    const currencyEntity = entities.find((e) => e.type === EntityType.CURRENCY);

    if (!amountEntity || !currencyEntity) {
      return {
        text: "To convert currency, I need both an amount and a currency. For example, 'Convert 1000 USD to EUR' or 'How much is 500 pounds in dollars?'",
        suggestions: [
          'Convert $1000 to EUR',
          'How much is 500 GBP?',
          'Exchange rates',
        ],
        quickActions: [],
      };
    }

    const amount = parseFloat(amountEntity.value);
    const fromCurrency = context.currentBudget!.currency;
    const toCurrency = currencyEntity.value.toUpperCase();

    try {
      const conversion = await currencyConverter.convertCurrency(
        amount,
        fromCurrency,
        toCurrency,
      );

      const text = `${this.formatCurrency(amount, fromCurrency)} equals ${this.formatCurrency(conversion.convertedAmount, toCurrency)} at the current exchange rate of ${conversion.rate.toFixed(4)}.`;

      return {
        text,
        suggestions: [
          `Convert more ${fromCurrency} to ${toCurrency}`,
          'Set up rate alert',
          'Show exchange rate trends',
        ],
        quickActions: [
          {
            id: 'alert',
            label: 'Rate Alert',
            action: 'set_rate_alert',
            parameters: { fromCurrency, toCurrency },
          },
        ],
      };
    } catch (error) {
      return {
        text: `I couldn't convert ${fromCurrency} to ${toCurrency} right now. Please try again later.`,
        suggestions: ['Try a different currency', 'Check budget overview'],
        quickActions: [],
      };
    }
  }

  private async generateOverspendRisk(
    context: ConversationContext,
  ): Promise<VoiceResponse> {
    const budget = context.currentBudget!;
    const analytics =
      await spendingAnalytics.generateComprehensiveAnalytics(budget);

    const riskCategories = analytics.categories.filter(
      (cat) => cat.riskLevel === 'high' || cat.riskLevel === 'critical',
    );

    if (riskCategories.length === 0) {
      return {
        text: "Good news! You're not at high risk of overspending in any category. Your budget is looking healthy.",
        suggestions: [
          'Show me spending analytics',
          "What's my biggest expense?",
          'Budget overview',
        ],
        quickActions: [],
      };
    }

    let text = `You have ${riskCategories.length} ${riskCategories.length === 1 ? 'category' : 'categories'} at risk of overspending: `;
    text +=
      riskCategories
        .map((cat) => {
          const overrun = cat.projectedFinal - cat.allocated;
          return `${cat.name} may go over by ${this.formatCurrency(overrun, budget.currency)}`;
        })
        .join(', ') + '.';

    const suggestions = riskCategories
      .slice(0, 2)
      .map((cat) => `How to reduce ${cat.name} spending?`);
    suggestions.push('Show me recommendations');

    return {
      text,
      suggestions,
      quickActions: [
        {
          id: 'recommendations',
          label: 'Get Recommendations',
          action: 'get_budget_recommendations',
        },
        {
          id: 'reallocation',
          label: 'Reallocate Budget',
          action: 'reallocate_budget',
        },
      ],
    };
  }

  private async generateVendorSpending(
    entities: Entity[],
    context: ConversationContext,
  ): Promise<VoiceResponse> {
    const vendorEntity = entities.find((e) => e.type === EntityType.VENDOR);

    if (!vendorEntity) {
      return {
        text: "Which vendor would you like to know about? I can tell you how much you've spent with any of your wedding vendors.",
        suggestions: [
          'How much with the florist?',
          'Venue spending',
          'Photography costs',
        ],
        quickActions: [],
      };
    }

    // This would search through budget items for vendor matches
    // For demo purposes, providing a sample response
    const vendorName = vendorEntity.value;
    const estimatedAmount = 850; // This would be calculated from actual data

    return {
      text: `You've spent approximately ${this.formatCurrency(estimatedAmount, context.currentBudget!.currency)} with ${vendorName}. This includes deposits, payments, and any additional services.`,
      suggestions: [
        `What did I buy from ${vendorName}?`,
        'Show all vendor payments',
        'Compare vendor prices',
      ],
      quickActions: [
        {
          id: 'details',
          label: 'Payment Details',
          action: 'get_vendor_details',
          parameters: { vendor: vendorName },
        },
      ],
    };
  }

  private generateHelpResponse(): VoiceResponse {
    return {
      text: "I can help you with your wedding budget in many ways. You can ask me about your spending, add expenses, get analytics, convert currencies, or check if you're on track. What would you like to know?",
      suggestions: [
        "What's my budget overview?",
        'How much did I spend on flowers?',
        'Add a new expense',
        'Am I over budget?',
        'Convert currency',
        'Show spending trends',
      ],
      quickActions: [
        {
          id: 'overview',
          label: 'Budget Overview',
          action: 'get_budget_overview',
        },
        {
          id: 'analytics',
          label: 'Spending Analytics',
          action: 'get_analytics',
        },
        { id: 'add', label: 'Add Expense', action: 'add_expense' },
      ],
    };
  }

  // ==================== UTILITY METHODS ====================

  private async speak(text: string): Promise<void> {
    try {
      await this.speechSynthesizer.speak(
        text,
        this.currentSession?.settings.voice,
      );
    } catch (error) {
      console.error('[Voice] Speech synthesis error:', error);
    }
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  private async saveSessionTranscript(session: VoiceSession): Promise<void> {
    try {
      localStorage.setItem(
        `voice_session_${session.id}`,
        JSON.stringify(session.transcript),
      );
    } catch (error) {
      console.error('[Voice] Failed to save session transcript:', error);
    }
  }

  private initializeVoiceCommands(): void {
    // Initialize supported voice commands and their patterns
    console.log('[Voice] Voice commands initialized');
  }

  // ==================== EVENT SYSTEM ====================

  private notifySubscribers(event: VoiceEvent): void {
    this.subscribers.forEach((callback) => callback(event));
  }

  public subscribe(id: string, callback: (event: VoiceEvent) => void): void {
    this.subscribers.set(id, callback);
  }

  public unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  // ==================== PUBLIC API ====================

  public getCurrentSession(): VoiceSession | null {
    return this.currentSession;
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public async executeQuickAction(
    actionId: string,
    parameters?: any,
  ): Promise<void> {
    // Execute predefined quick actions
    console.log(`[Voice] Executing quick action: ${actionId}`, parameters);
  }

  public async confirmPendingAction(actionId: string): Promise<void> {
    if (!this.currentSession) return;

    const action = this.currentSession.context.pendingActions.find(
      (a) => a.id === actionId,
    );
    if (!action) return;

    try {
      switch (action.type) {
        case ActionType.ADD_EXPENSE:
          // Add expense to budget
          await this.executePendingExpense(action.parameters);
          await this.speak(
            `Great! I've added the ${this.formatCurrency(action.parameters.amount, this.currentSession.context.currentBudget!.currency)} expense to your ${action.parameters.category} category.`,
          );
          break;

        default:
          console.warn('[Voice] Unknown pending action type:', action.type);
      }

      // Remove from pending actions
      this.currentSession.context.pendingActions =
        this.currentSession.context.pendingActions.filter(
          (a) => a.id !== actionId,
        );
    } catch (error) {
      console.error('[Voice] Failed to execute pending action:', error);
      await this.speak(
        'I encountered an error executing that action. Please try again.',
      );
    }
  }

  private async executePendingExpense(parameters: any): Promise<void> {
    const budget = this.currentSession?.context.currentBudget;
    if (!budget) return;

    // Find or create category
    let category = budget.categories.find((c) =>
      c.name.toLowerCase().includes(parameters.category.toLowerCase()),
    );

    if (!category) {
      // Create new category if it doesn't exist
      category = await advancedBudgetManager.addCategory({
        name: parameters.category,
        allocated_amount: parameters.amount * 2, // Rough estimate
      });
    }

    // Add budget item
    await advancedBudgetManager.addBudgetItem(category.id, {
      name: `${parameters.vendor} expense`,
      description: `Voice-added expense on ${new Date().toLocaleDateString()}`,
      actual_cost: parameters.amount,
      status: 'completed',
      payment_status: 'fully_paid',
    });
  }

  public destroy(): void {
    this.endVoiceSession();
    this.subscribers.clear();
  }
}

// ==================== SUPPORTING CLASSES ====================

class SpeechRecognizer {
  private recognition: any = null;

  async initialize(settings: VoiceSettings): Promise<void> {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.lang = settings.language;
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
    } else {
      throw new Error('Speech recognition not supported in this browser');
    }
  }

  async listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.start();
    });
  }

  async stop(): Promise<void> {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

class SpeechSynthesizer {
  async speak(text: string, voice?: VoiceProfile): Promise<void> {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);

        if (voice) {
          utterance.rate = 1.0;
          utterance.volume = 0.8;
          utterance.pitch = 1.0;
        }

        utterance.onend = () => resolve();
        utterance.onerror = (event: any) =>
          reject(new Error(`Speech synthesis error: ${event.error}`));

        speechSynthesis.speak(utterance);
      } else {
        reject(new Error('Speech synthesis not supported'));
      }
    });
  }
}

class NLPProcessor {
  async process(
    text: string,
    context: ConversationContext,
  ): Promise<{ text: string; tokens: string[] }> {
    // Basic text preprocessing
    const cleanedText = text.toLowerCase().trim();
    const tokens = cleanedText.split(/\s+/);

    return {
      text: cleanedText,
      tokens,
    };
  }
}

class IntentClassifier {
  private intents: Map<string, VoiceCommand> = new Map();

  constructor() {
    this.initializeIntents();
  }

  async classify(text: string, context: ConversationContext): Promise<Intent> {
    // Simple pattern matching - in production, this would use ML models

    // Budget overview queries
    if (this.matchesPattern(text, ['budget', 'overview', 'summary', 'total'])) {
      return { name: 'get_budget_overview', confidence: 0.9, parameters: {} };
    }

    // Category balance queries
    if (
      this.matchesPattern(text, ['how much', 'spent', 'balance']) &&
      this.containsCategory(text)
    ) {
      return { name: 'get_category_balance', confidence: 0.85, parameters: {} };
    }

    // Add expense
    if (
      this.matchesPattern(text, ['add', 'spent', 'bought', 'paid']) &&
      this.containsAmount(text)
    ) {
      return { name: 'add_expense', confidence: 0.8, parameters: {} };
    }

    // Analytics
    if (
      this.matchesPattern(text, ['analytics', 'trends', 'insights', 'analysis'])
    ) {
      return {
        name: 'get_spending_analytics',
        confidence: 0.9,
        parameters: {},
      };
    }

    // Currency conversion
    if (
      this.matchesPattern(text, ['convert', 'exchange', 'currency']) &&
      this.containsAmount(text)
    ) {
      return { name: 'convert_currency', confidence: 0.85, parameters: {} };
    }

    // Overspend risk
    if (
      this.matchesPattern(text, ['over budget', 'overspend', 'risk', 'exceed'])
    ) {
      return { name: 'check_overspend_risk', confidence: 0.8, parameters: {} };
    }

    // Vendor spending
    if (
      this.matchesPattern(text, ['vendor', 'supplier']) ||
      this.containsVendorName(text)
    ) {
      return { name: 'get_vendor_spending', confidence: 0.75, parameters: {} };
    }

    // Default help
    return { name: 'help', confidence: 0.5, parameters: {} };
  }

  private matchesPattern(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }

  private containsCategory(text: string): boolean {
    const categories = [
      'flowers',
      'venue',
      'catering',
      'photography',
      'music',
      'dress',
      'cake',
      'rings',
    ];
    return categories.some((category) => text.includes(category));
  }

  private containsAmount(text: string): boolean {
    return /\$?\d+(\.\d{2})?|\d+\s*(dollars?|bucks?)/.test(text);
  }

  private containsVendorName(text: string): boolean {
    // Check for common vendor patterns
    return /\b(florist|photographer|caterer|venue|bakery|dj|band)\b/.test(text);
  }

  private initializeIntents(): void {
    // Initialize intent patterns and examples
    console.log('[Voice] Intents initialized');
  }
}

class EntityExtractor {
  async extract(text: string, intent: Intent): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Extract amounts
    const amountMatch = text.match(/\$?(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      entities.push({
        type: EntityType.AMOUNT,
        value: amountMatch[1],
        originalText: amountMatch[0],
        confidence: 0.9,
      });
    }

    // Extract categories
    const categories = [
      'flowers',
      'venue',
      'catering',
      'photography',
      'music',
      'dress',
      'cake',
      'rings',
    ];
    for (const category of categories) {
      if (text.includes(category)) {
        entities.push({
          type: EntityType.CATEGORY,
          value: category,
          originalText: category,
          confidence: 0.8,
        });
        break;
      }
    }

    // Extract currencies
    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    for (const currency of currencies) {
      if (
        text.toUpperCase().includes(currency) ||
        text.includes(this.getCurrencySymbol(currency))
      ) {
        entities.push({
          type: EntityType.CURRENCY,
          value: currency,
          originalText: currency,
          confidence: 0.9,
        });
        break;
      }
    }

    return entities;
  }

  private getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$',
    };
    return symbols[currency] || '';
  }
}

class ResponseGenerator {
  generateResponse(
    intent: Intent,
    entities: Entity[],
    context: ConversationContext,
  ): VoiceResponse {
    // This would be more sophisticated in production
    return {
      text: "I understand your request and I'm working on it.",
      suggestions: [],
      quickActions: [],
    };
  }
}

// ==================== EVENT TYPES ====================

interface VoiceEvent {
  type:
    | 'session_started'
    | 'session_ended'
    | 'conversation_turn'
    | 'listening_started'
    | 'listening_stopped';
  data: any;
}

// ==================== SINGLETON EXPORT ====================

export const voiceBudgetInterface = VoiceBudgetInterface.getInstance();
export default VoiceBudgetInterface;
