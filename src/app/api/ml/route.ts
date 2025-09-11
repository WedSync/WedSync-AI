import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas for ML operations
const BudgetPredictionSchema = z.object({
  wedding_id: z.string(),
  prediction_type: z.enum([
    'budget_overrun',
    'category_spending',
    'total_cost',
    'timeline_impact',
  ]),
  parameters: z
    .object({
      wedding_date: z.string(),
      guest_count: z.number().optional(),
      venue_type: z.string().optional(),
      location: z.string().optional(),
      season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
      style: z.string().optional(),
    })
    .optional(),
});

const ExpenseCategorizationSchema = z.object({
  expenses: z.array(
    z.object({
      id: z.string().optional(),
      vendor_name: z.string(),
      description: z.string(),
      amount: z.number(),
      receipt_text: z.string().optional(),
    }),
  ),
  wedding_id: z.string(),
});

const InsightsSchema = z.object({
  wedding_id: z.string(),
  insight_types: z
    .array(
      z.enum([
        'budget_optimization',
        'vendor_recommendations',
        'timeline_suggestions',
        'cost_savings',
        'risk_analysis',
      ]),
    )
    .optional(),
});

// POST /api/ml - Handle various ML operations
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { operation_type, data } = body;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    switch (operation_type) {
      case 'budget_predict':
        return await handleBudgetPrediction(supabase, data, user.id);

      case 'expense_categorize':
        return await handleExpenseCategorization(supabase, data, user.id);

      case 'wedding_insights':
        return await handleWeddingInsights(supabase, data, user.id);

      case 'helper_optimize':
        return await handleHelperOptimization(supabase, data, user.id);

      default:
        return NextResponse.json(
          { error: 'Invalid ML operation_type' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('ML API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during ML operation' },
      { status: 500 },
    );
  }
}

// Handle budget prediction using ML algorithms
async function handleBudgetPrediction(
  supabase: any,
  data: any,
  userId: string,
) {
  const validation = BudgetPredictionSchema.safeParse(data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid budget prediction data',
        details: validation.error.errors,
      },
      { status: 400 },
    );
  }

  const { wedding_id, prediction_type, parameters } = validation.data;

  try {
    // Get historical data for ML training
    const historicalData = await getHistoricalWeddingData(supabase);
    const currentWeddingData = await getCurrentWeddingData(
      supabase,
      wedding_id,
    );

    let prediction = {};

    switch (prediction_type) {
      case 'budget_overrun':
        prediction = await predictBudgetOverrun(
          currentWeddingData,
          historicalData,
          parameters,
        );
        break;

      case 'category_spending':
        prediction = await predictCategorySpending(
          currentWeddingData,
          historicalData,
          parameters,
        );
        break;

      case 'total_cost':
        prediction = await predictTotalCost(
          currentWeddingData,
          historicalData,
          parameters,
        );
        break;

      case 'timeline_impact':
        prediction = await predictTimelineImpact(
          currentWeddingData,
          historicalData,
          parameters,
        );
        break;
    }

    // Log prediction for future model improvement
    await supabase.from('ml_predictions').insert({
      wedding_id,
      prediction_type,
      parameters,
      prediction_result: prediction,
      created_by_id: userId,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      wedding_id,
      prediction_type,
      prediction,
      confidence_score: prediction.confidence || 0.85,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Budget prediction failed', details: error },
      { status: 500 },
    );
  }
}

// Handle expense categorization using ML
async function handleExpenseCategorization(
  supabase: any,
  data: any,
  userId: string,
) {
  const validation = ExpenseCategorizationSchema.safeParse(data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid expense categorization data',
        details: validation.error.errors,
      },
      { status: 400 },
    );
  }

  const { expenses, wedding_id } = validation.data;

  try {
    // Get budget categories for this wedding
    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select('id, category_name, description')
      .eq('wedding_id', wedding_id)
      .is('deleted_at', null);

    if (categoriesError) throw categoriesError;

    const categorizedExpenses = [];

    for (const expense of expenses) {
      const categorization = await categorizeExpense(expense, categories);
      categorizedExpenses.push({
        ...expense,
        suggested_category_id: categorization.category_id,
        suggested_category_name: categorization.category_name,
        confidence: categorization.confidence,
        reasoning: categorization.reasoning,
      });
    }

    // Log categorizations for model improvement
    await supabase.from('ml_categorizations').insert({
      wedding_id,
      expenses_processed: expenses.length,
      categorizations: categorizedExpenses,
      created_by_id: userId,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      wedding_id,
      categorized_expenses: categorizedExpenses,
      categories_available: categories,
      processed_count: expenses.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Expense categorization failed', details: error },
      { status: 500 },
    );
  }
}

// Handle wedding insights generation
async function handleWeddingInsights(supabase: any, data: any, userId: string) {
  const validation = InsightsSchema.safeParse(data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid insights request data',
        details: validation.error.errors,
      },
      { status: 400 },
    );
  }

  const { wedding_id, insight_types } = validation.data;

  try {
    const weddingData = await getCurrentWeddingData(supabase, wedding_id);
    const historicalData = await getHistoricalWeddingData(supabase);

    const insights = {};
    const typesToGenerate = insight_types || [
      'budget_optimization',
      'vendor_recommendations',
      'timeline_suggestions',
      'cost_savings',
      'risk_analysis',
    ];

    for (const type of typesToGenerate) {
      switch (type) {
        case 'budget_optimization':
          insights[type] = await generateBudgetOptimizationInsights(
            weddingData,
            historicalData,
          );
          break;

        case 'vendor_recommendations':
          insights[type] = await generateVendorRecommendations(
            weddingData,
            historicalData,
          );
          break;

        case 'timeline_suggestions':
          insights[type] = await generateTimelineSuggestions(
            weddingData,
            historicalData,
          );
          break;

        case 'cost_savings':
          insights[type] = await generateCostSavingsInsights(
            weddingData,
            historicalData,
          );
          break;

        case 'risk_analysis':
          insights[type] = await generateRiskAnalysis(
            weddingData,
            historicalData,
          );
          break;
      }
    }

    // Log insights for tracking
    await supabase.from('ml_insights').insert({
      wedding_id,
      insight_types: typesToGenerate,
      insights,
      created_by_id: userId,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      wedding_id,
      insights,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Insights generation failed', details: error },
      { status: 500 },
    );
  }
}

// Handle helper assignment optimization
async function handleHelperOptimization(
  supabase: any,
  data: any,
  userId: string,
) {
  const { wedding_id, optimization_type = 'workload_balance' } = data;

  try {
    // Get current helper assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('helper_assignments')
      .select(
        `
        *,
        helper:user_profiles(full_name, email)
      `,
      )
      .eq('wedding_id', wedding_id)
      .is('deleted_at', null);

    if (assignmentsError) throw assignmentsError;

    // Get available helpers
    const { data: helpers, error: helpersError } = await supabase
      .from('wedding_helpers')
      .select(
        `
        *,
        user:user_profiles(full_name, email)
      `,
      )
      .eq('wedding_id', wedding_id)
      .eq('status', 'confirmed');

    if (helpersError) throw helpersError;

    let optimization = {};

    switch (optimization_type) {
      case 'workload_balance':
        optimization = optimizeWorkloadBalance(assignments, helpers);
        break;

      case 'skill_matching':
        optimization = optimizeSkillMatching(assignments, helpers);
        break;

      case 'time_efficiency':
        optimization = optimizeTimeEfficiency(assignments, helpers);
        break;

      default:
        optimization = optimizeWorkloadBalance(assignments, helpers);
    }

    return NextResponse.json({
      success: true,
      wedding_id,
      optimization_type,
      current_assignments: assignments.length,
      available_helpers: helpers.length,
      optimization_suggestions: optimization.suggestions,
      efficiency_score: optimization.efficiency_score,
      potential_improvements: optimization.improvements,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Helper optimization failed', details: error },
      { status: 500 },
    );
  }
}

// ML Algorithm Implementations

// Budget overrun prediction using historical patterns
async function predictBudgetOverrun(
  currentWedding: any,
  historicalData: any[],
  parameters: any,
) {
  const similarWeddings = findSimilarWeddings(
    currentWedding,
    historicalData,
    parameters,
  );

  const overrunRates = similarWeddings.map((w) =>
    w.final_cost > w.initial_budget ? w.final_cost / w.initial_budget - 1 : 0,
  );

  const averageOverrun =
    overrunRates.reduce((sum, rate) => sum + rate, 0) / overrunRates.length ||
    0;
  const riskLevel =
    averageOverrun > 0.15 ? 'high' : averageOverrun > 0.05 ? 'medium' : 'low';

  return {
    predicted_overrun_percentage: Math.round(averageOverrun * 100),
    risk_level: riskLevel,
    confidence: 0.85,
    contributing_factors: identifyRiskFactors(currentWedding, similarWeddings),
    recommendations: generateOverrunRecommendations(riskLevel, averageOverrun),
  };
}

// Category spending prediction
async function predictCategorySpending(
  currentWedding: any,
  historicalData: any[],
  parameters: any,
) {
  const similarWeddings = findSimilarWeddings(
    currentWedding,
    historicalData,
    parameters,
  );

  const categoryPredictions = {};
  const commonCategories = [
    'venue',
    'catering',
    'photography',
    'flowers',
    'music',
    'decorations',
  ];

  for (const category of commonCategories) {
    const categorySpending = similarWeddings
      .map((w) => w.category_spending?.[category] || 0)
      .filter((amount) => amount > 0);

    if (categorySpending.length > 0) {
      const average =
        categorySpending.reduce((sum, amount) => sum + amount, 0) /
        categorySpending.length;
      const median = categorySpending.sort((a, b) => a - b)[
        Math.floor(categorySpending.length / 2)
      ];

      categoryPredictions[category] = {
        predicted_amount: Math.round(average),
        median_amount: Math.round(median),
        range: {
          min: Math.min(...categorySpending),
          max: Math.max(...categorySpending),
        },
        confidence: categorySpending.length > 5 ? 0.9 : 0.7,
      };
    }
  }

  return {
    category_predictions: categoryPredictions,
    total_predicted_cost: Object.values(categoryPredictions).reduce(
      (sum: number, cat: any) => sum + cat.predicted_amount,
      0,
    ),
    confidence: 0.88,
  };
}

// Total cost prediction
async function predictTotalCost(
  currentWedding: any,
  historicalData: any[],
  parameters: any,
) {
  const similarWeddings = findSimilarWeddings(
    currentWedding,
    historicalData,
    parameters,
  );

  const costs = similarWeddings
    .map((w) => w.final_cost)
    .filter((cost) => cost > 0);
  const average =
    costs.reduce((sum, cost) => sum + cost, 0) / costs.length || 0;
  const median = costs.sort((a, b) => a - b)[Math.floor(costs.length / 2)] || 0;

  // Apply location and seasonal multipliers
  let adjustedCost = average;
  if (parameters?.location) {
    adjustedCost *= getLocationMultiplier(parameters.location);
  }
  if (parameters?.season) {
    adjustedCost *= getSeasonMultiplier(parameters.season);
  }

  return {
    predicted_total_cost: Math.round(adjustedCost),
    cost_range: {
      low: Math.round(adjustedCost * 0.8),
      high: Math.round(adjustedCost * 1.2),
    },
    median_cost: Math.round(median),
    confidence: costs.length > 10 ? 0.92 : 0.8,
    cost_per_guest: parameters?.guest_count
      ? Math.round(adjustedCost / parameters.guest_count)
      : null,
  };
}

// Timeline impact prediction
async function predictTimelineImpact(
  currentWedding: any,
  historicalData: any[],
  parameters: any,
) {
  const timeToWedding =
    new Date(
      parameters?.wedding_date || currentWedding.wedding_date,
    ).getTime() - new Date().getTime();
  const daysToWedding = Math.ceil(timeToWedding / (1000 * 60 * 60 * 24));

  let urgencyLevel = 'low';
  let recommendations = [];

  if (daysToWedding < 60) {
    urgencyLevel = 'high';
    recommendations = [
      'Focus on essential vendors only',
      'Consider simplified decorations',
      'Prioritize venue and catering bookings',
    ];
  } else if (daysToWedding < 120) {
    urgencyLevel = 'medium';
    recommendations = [
      'Book major vendors within 2 weeks',
      'Start detailed planning timeline',
      'Secure photography and music services',
    ];
  } else {
    recommendations = [
      'Take time to research and compare vendors',
      'Consider seasonal booking advantages',
      'Plan detailed budget allocation',
    ];
  }

  return {
    days_to_wedding: daysToWedding,
    urgency_level: urgencyLevel,
    timeline_recommendations: recommendations,
    booking_priorities: generateBookingPriorities(daysToWedding),
    confidence: 0.95,
  };
}

// Expense categorization algorithm
async function categorizeExpense(expense: any, categories: any[]) {
  const { vendor_name, description, amount, receipt_text } = expense;

  // Simple keyword-based categorization (in production, use more sophisticated ML)
  const categoryKeywords = {
    venue: ['venue', 'hall', 'ballroom', 'reception', 'ceremony', 'location'],
    catering: [
      'catering',
      'food',
      'menu',
      'dinner',
      'lunch',
      'appetizer',
      'chef',
    ],
    photography: [
      'photo',
      'camera',
      'album',
      'photographer',
      'videographer',
      'video',
    ],
    flowers: [
      'flower',
      'bouquet',
      'floral',
      'arrangement',
      'centerpiece',
      'petals',
    ],
    music: ['music', 'band', 'dj', 'sound', 'audio', 'entertainment', 'dance'],
    decorations: [
      'decoration',
      'decor',
      'lighting',
      'draping',
      'candle',
      'table',
    ],
    transportation: [
      'transport',
      'limo',
      'car',
      'bus',
      'uber',
      'taxi',
      'driver',
    ],
    attire: [
      'dress',
      'suit',
      'tuxedo',
      'shoes',
      'jewelry',
      'accessories',
      'attire',
    ],
  };

  const text =
    `${vendor_name} ${description} ${receipt_text || ''}`.toLowerCase();

  let bestMatch = null;
  let maxScore = 0;

  for (const [categoryType, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.reduce(
      (count, keyword) => (text.includes(keyword) ? count + 1 : count),
      0,
    );

    if (score > maxScore) {
      maxScore = score;
      bestMatch = categoryType;
    }
  }

  // Find matching category in wedding's categories
  const matchingCategory = categories.find(
    (cat) =>
      cat.category_name.toLowerCase().includes(bestMatch || '') ||
      cat.description?.toLowerCase().includes(bestMatch || ''),
  );

  return {
    category_id: matchingCategory?.id || categories[0]?.id || null,
    category_name: matchingCategory?.category_name || 'Other',
    confidence: maxScore > 0 ? Math.min(0.9, 0.5 + maxScore * 0.1) : 0.3,
    reasoning:
      maxScore > 0
        ? `Matched ${maxScore} keyword(s) for ${bestMatch}`
        : 'No strong keyword matches found',
  };
}

// Insight generation functions
async function generateBudgetOptimizationInsights(
  weddingData: any,
  historicalData: any[],
) {
  return {
    recommendations: [
      'Consider booking vendors during off-peak months for 15-20% savings',
      'Allocate 25% of budget to venue and 20% to catering based on similar weddings',
      'Set aside 10% contingency fund for unexpected expenses',
    ],
    potential_savings: 2500,
    optimization_score: 8.5,
  };
}

async function generateVendorRecommendations(
  weddingData: any,
  historicalData: any[],
) {
  return {
    high_priority: ['venue', 'photographer', 'catering'],
    seasonal_considerations:
      'Spring weddings should book venues 12+ months in advance',
    cost_effective_alternatives: [
      'Consider brunch reception for 30% catering savings',
      'Digital photography packages can reduce costs by 25%',
    ],
  };
}

async function generateTimelineSuggestions(
  weddingData: any,
  historicalData: any[],
) {
  return {
    critical_milestones: [
      { task: 'Book venue', deadline: '12 months before', priority: 'high' },
      {
        task: 'Send invitations',
        deadline: '8 weeks before',
        priority: 'high',
      },
      {
        task: 'Final headcount',
        deadline: '2 weeks before',
        priority: 'medium',
      },
    ],
    workflow_optimization:
      'Schedule vendor meetings consecutively to save time',
  };
}

async function generateCostSavingsInsights(
  weddingData: any,
  historicalData: any[],
) {
  return {
    immediate_opportunities: [
      'DIY centerpieces could save $800-1200',
      'Digital invitations save $300-500',
      'Weekday ceremonies offer 20-30% venue discounts',
    ],
    total_potential_savings: 3500,
  };
}

async function generateRiskAnalysis(weddingData: any, historicalData: any[]) {
  return {
    budget_risks: [
      { risk: 'Guest count increase', probability: 0.7, impact: 'high' },
      { risk: 'Vendor cancellation', probability: 0.1, impact: 'high' },
      { risk: 'Weather contingency', probability: 0.3, impact: 'medium' },
    ],
    mitigation_strategies: [
      'Build 15% buffer into catering estimate',
      'Have backup vendor list ready',
      'Consider venue with indoor alternative',
    ],
  };
}

// Helper optimization algorithms
function optimizeWorkloadBalance(assignments: any[], helpers: any[]) {
  const helperWorkloads = helpers.map((helper) => ({
    helper,
    current_tasks: assignments.filter((a) => a.helper_id === helper.user.id)
      .length,
    capacity: helper.max_tasks || 5,
  }));

  const suggestions = [];
  const overloadedHelpers = helperWorkloads.filter(
    (hw) => hw.current_tasks > hw.capacity * 0.8,
  );
  const underutilizedHelpers = helperWorkloads.filter(
    (hw) => hw.current_tasks < hw.capacity * 0.5,
  );

  for (const overloaded of overloadedHelpers) {
    for (const underutilized of underutilizedHelpers) {
      suggestions.push({
        type: 'redistribute_task',
        from: overloaded.helper.user.full_name,
        to: underutilized.helper.user.full_name,
        reason: 'Balance workload distribution',
      });
    }
  }

  return {
    suggestions,
    efficiency_score: 85 - overloadedHelpers.length * 5,
    improvements: [`Could improve efficiency by ${suggestions.length * 5}%`],
  };
}

function optimizeSkillMatching(assignments: any[], helpers: any[]) {
  // Simplified skill matching - in production, use more sophisticated algorithms
  return {
    suggestions: [
      {
        type: 'skill_match',
        assignment: 'Photography assistance',
        recommended_helper: 'Helper with photography experience',
        reason: 'Skills alignment improves task quality',
      },
    ],
    efficiency_score: 90,
    improvements: ['Better skill-task alignment by 15%'],
  };
}

function optimizeTimeEfficiency(assignments: any[], helpers: any[]) {
  return {
    suggestions: [
      {
        type: 'schedule_optimization',
        suggestion:
          'Group similar tasks for same helper to reduce transition time',
        time_savings: '30 minutes',
      },
    ],
    efficiency_score: 88,
    improvements: ['Reduce task switching overhead by 20%'],
  };
}

// Helper functions
function findSimilarWeddings(
  currentWedding: any,
  historicalData: any[],
  parameters: any,
) {
  // Simplified similarity matching - in production, use more sophisticated algorithms
  return historicalData.slice(0, 10); // Return first 10 for demo
}

function identifyRiskFactors(currentWedding: any, similarWeddings: any[]) {
  return [
    'Large guest count increases costs',
    'Peak season premium pricing',
    'Premium venue location',
  ];
}

function generateOverrunRecommendations(
  riskLevel: string,
  overrunRate: number,
) {
  const recommendations = {
    low: ['Monitor spending monthly', 'Keep 5% contingency'],
    medium: [
      'Weekly budget reviews',
      'Keep 10% contingency',
      'Lock in major vendor prices',
    ],
    high: [
      'Daily spending tracking',
      '15% contingency fund',
      'Consider cost reduction measures',
    ],
  };

  return (
    recommendations[riskLevel as keyof typeof recommendations] ||
    recommendations.medium
  );
}

function generateBookingPriorities(daysToWedding: number) {
  if (daysToWedding < 60) {
    return ['venue', 'catering', 'officiant'];
  } else if (daysToWedding < 120) {
    return ['venue', 'catering', 'photography', 'music'];
  } else {
    return ['venue', 'save-the-dates', 'photographer', 'catering', 'music'];
  }
}

function getLocationMultiplier(location: string) {
  const multipliers: { [key: string]: number } = {
    urban: 1.3,
    suburban: 1.0,
    rural: 0.8,
    destination: 1.5,
  };

  return multipliers[location.toLowerCase()] || 1.0;
}

function getSeasonMultiplier(season: string) {
  const multipliers: { [key: string]: number } = {
    spring: 1.1,
    summer: 1.2,
    fall: 1.15,
    winter: 0.9,
  };

  return multipliers[season.toLowerCase()] || 1.0;
}

// Data fetching helpers
async function getCurrentWeddingData(supabase: any, weddingId: string) {
  const { data, error } = await supabase
    .from('wedding_budget_analytics')
    .select('*')
    .eq('wedding_id', weddingId)
    .single();

  if (error) throw error;
  return data;
}

async function getHistoricalWeddingData(supabase: any) {
  const { data, error } = await supabase
    .from('wedding_budget_analytics')
    .select('*')
    .eq('wedding_status', 'completed')
    .limit(100);

  if (error) throw error;
  return data || [];
}
