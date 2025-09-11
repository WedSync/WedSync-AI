import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas for Custom Questions System
const CustomQuestionSchema = z.object({
  event_id: z.string().uuid(),
  question_text: z.string().min(1).max(500),
  question_type: z.enum([
    'text',
    'multiple_choice',
    'checkbox',
    'number',
    'date',
    'email',
    'phone',
    'textarea',
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For multiple choice/checkbox
  placeholder_text: z.string().optional(),
  validation_rules: z
    .object({
      min_length: z.number().optional(),
      max_length: z.number().optional(),
      min_value: z.number().optional(),
      max_value: z.number().optional(),
      pattern: z.string().optional(), // Regex pattern
    })
    .optional(),
  display_order: z.coerce.number().default(0),
  help_text: z.string().optional(),
  category: z
    .enum([
      'dietary',
      'accommodation',
      'transport',
      'entertainment',
      'contact',
      'preferences',
      'other',
    ])
    .default('other'),
});

const UpdateCustomQuestionSchema = z.object({
  question_text: z.string().min(1).max(500).optional(),
  question_type: z
    .enum([
      'text',
      'multiple_choice',
      'checkbox',
      'number',
      'date',
      'email',
      'phone',
      'textarea',
    ])
    .optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  placeholder_text: z.string().optional(),
  validation_rules: z
    .object({
      min_length: z.number().optional(),
      max_length: z.number().optional(),
      min_value: z.number().optional(),
      max_value: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
  display_order: z.coerce.number().optional(),
  help_text: z.string().optional(),
  category: z
    .enum([
      'dietary',
      'accommodation',
      'transport',
      'entertainment',
      'contact',
      'preferences',
      'other',
    ])
    .optional(),
});

const CustomResponseSchema = z.object({
  response_id: z.string().uuid(),
  question_id: z.string().uuid(),
  answer_text: z.string().optional(),
  answer_json: z.any().optional(), // For complex answers like arrays
});

const QuestionQuerySchema = z.object({
  event_id: z.string().uuid().optional(),
  category: z
    .enum([
      'dietary',
      'accommodation',
      'transport',
      'entertainment',
      'contact',
      'preferences',
      'other',
    ])
    .optional(),
  include_responses: z.enum(['true', 'false']).optional(),
  include_analytics: z.enum(['true', 'false']).optional(),
});

// GET /api/rsvp/custom-questions - Get custom questions
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = req.nextUrl.searchParams;

    const queryData = QuestionQuerySchema.parse({
      event_id: searchParams.get('event_id'),
      category: searchParams.get('category'),
      include_responses: searchParams.get('include_responses') || 'false',
      include_analytics: searchParams.get('include_analytics') || 'false',
    });

    // Get current user (vendors) or allow public access for specific events
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    let query = supabase.from('rsvp_custom_questions').select(`
        *,
        rsvp_events!inner (
          id,
          event_name,
          vendor_id
        )
      `);

    // Apply access control
    if (queryData.event_id) {
      query = query.eq('event_id', queryData.event_id);

      // For vendor access, verify ownership
      if (user) {
        query = query.eq('rsvp_events.vendor_id', user.id);
      }
      // For public access, questions are visible (needed for RSVP forms)
    } else if (user) {
      // Vendor access for all their events
      query = query.eq('rsvp_events.vendor_id', user.id);
    } else {
      return NextResponse.json(
        { error: 'Event ID required for public access' },
        { status: 400 },
      );
    }

    // Apply filters
    if (queryData.category) {
      query = query.eq('category', queryData.category);
    }

    const { data: questions, error } = await query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching custom questions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch custom questions' },
        { status: 500 },
      );
    }

    let responseData: any = { questions };

    // Include responses if requested (vendor only)
    if (queryData.include_responses === 'true' && user && questions?.length) {
      const questionsWithResponses = await Promise.all(
        questions.map(async (question) => {
          const { data: responses } = await supabase
            .from('rsvp_custom_responses')
            .select(
              `
              *,
              rsvp_responses (
                id,
                response_status,
                rsvp_invitations (
                  guest_name
                )
              )
            `,
            )
            .eq('question_id', question.id);

          return {
            ...question,
            responses: responses || [],
          };
        }),
      );

      responseData.questions = questionsWithResponses;
    }

    // Include analytics if requested (vendor only)
    if (queryData.include_analytics === 'true' && user && queryData.event_id) {
      try {
        const analytics = await getCustomQuestionAnalytics(queryData.event_id);
        responseData.analytics = analytics;
      } catch (analyticsError) {
        console.error(
          'Error fetching custom question analytics:',
          analyticsError,
        );
        responseData.analytics_error = 'Failed to load analytics';
      }
    }

    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 },
      );
    }
    console.error('Error in GET /api/rsvp/custom-questions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/rsvp/custom-questions - Create custom question
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user (vendor only)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = CustomQuestionSchema.parse(body);

    // Verify event ownership
    const { data: event, error: eventError } = await supabase
      .from('rsvp_events')
      .select('id, event_name')
      .eq('id', validatedData.event_id)
      .eq('vendor_id', user.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        {
          error: 'Event not found or unauthorized',
        },
        { status: 404 },
      );
    }

    // Validate options for multiple choice/checkbox questions
    if (['multiple_choice', 'checkbox'].includes(validatedData.question_type)) {
      if (!validatedData.options || validatedData.options.length === 0) {
        return NextResponse.json(
          {
            error:
              'Options are required for multiple choice and checkbox questions',
          },
          { status: 400 },
        );
      }
    }

    // Set display order if not provided
    if (validatedData.display_order === 0) {
      const { count } = await supabase
        .from('rsvp_custom_questions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', validatedData.event_id);

      validatedData.display_order = (count || 0) + 1;
    }

    // Create custom question
    const { data: question, error } = await supabase
      .from('rsvp_custom_questions')
      .insert({
        ...validatedData,
        options: validatedData.options
          ? JSON.stringify(validatedData.options)
          : null,
        validation_rules: validatedData.validation_rules
          ? JSON.stringify(validatedData.validation_rules)
          : null,
      })
      .select(
        `
        *,
        rsvp_events (
          event_name
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error creating custom question:', error);
      return NextResponse.json(
        { error: 'Failed to create custom question' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        question: {
          ...question,
          options: question.options ? JSON.parse(question.options) : null,
          validation_rules: question.validation_rules
            ? JSON.parse(question.validation_rules)
            : null,
        },
        message: 'Custom question created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 },
      );
    }
    console.error('Error in POST /api/rsvp/custom-questions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT /api/rsvp/custom-questions/[id] - Update custom question
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const questionId = url.pathname.split('/').pop();

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 },
      );
    }

    // Get current user (vendor only)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = UpdateCustomQuestionSchema.parse(body);

    // Verify question ownership
    const { data: question, error: fetchError } = await supabase
      .from('rsvp_custom_questions')
      .select(
        `
        *,
        rsvp_events (
          vendor_id,
          event_name
        )
      `,
      )
      .eq('id', questionId)
      .single();

    if (fetchError || !question || question.rsvp_events.vendor_id !== user.id) {
      return NextResponse.json(
        {
          error: 'Question not found or unauthorized',
        },
        { status: 404 },
      );
    }

    // Validate options for multiple choice/checkbox questions
    if (
      validatedData.question_type &&
      ['multiple_choice', 'checkbox'].includes(validatedData.question_type)
    ) {
      if (!validatedData.options || validatedData.options.length === 0) {
        return NextResponse.json(
          {
            error:
              'Options are required for multiple choice and checkbox questions',
          },
          { status: 400 },
        );
      }
    }

    // Update custom question
    const { data: updatedQuestion, error } = await supabase
      .from('rsvp_custom_questions')
      .update({
        ...validatedData,
        options: validatedData.options
          ? JSON.stringify(validatedData.options)
          : undefined,
        validation_rules: validatedData.validation_rules
          ? JSON.stringify(validatedData.validation_rules)
          : undefined,
      })
      .eq('id', questionId)
      .select(
        `
        *,
        rsvp_events (
          event_name
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error updating custom question:', error);
      return NextResponse.json(
        { error: 'Failed to update custom question' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      question: {
        ...updatedQuestion,
        options: updatedQuestion.options
          ? JSON.parse(updatedQuestion.options)
          : null,
        validation_rules: updatedQuestion.validation_rules
          ? JSON.parse(updatedQuestion.validation_rules)
          : null,
      },
      message: 'Custom question updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 },
      );
    }
    console.error('Error in PUT /api/rsvp/custom-questions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/rsvp/custom-questions/[id] - Delete custom question
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const questionId = url.pathname.split('/').pop();

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 },
      );
    }

    // Get current user (vendor only)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify question ownership and get details
    const { data: question, error: fetchError } = await supabase
      .from('rsvp_custom_questions')
      .select(
        `
        *,
        rsvp_events (
          vendor_id
        )
      `,
      )
      .eq('id', questionId)
      .single();

    if (fetchError || !question || question.rsvp_events.vendor_id !== user.id) {
      return NextResponse.json(
        {
          error: 'Question not found or unauthorized',
        },
        { status: 404 },
      );
    }

    // Check for existing responses
    const { count: responseCount } = await supabase
      .from('rsvp_custom_responses')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', questionId);

    if ((responseCount || 0) > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete question that has responses. Consider disabling it instead.',
        },
        { status: 400 },
      );
    }

    // Delete custom question
    const { error } = await supabase
      .from('rsvp_custom_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      console.error('Error deleting custom question:', error);
      return NextResponse.json(
        { error: 'Failed to delete custom question' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Custom question deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/rsvp/custom-questions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/rsvp/custom-questions/responses - Submit custom question responses
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await req.json();
    const { responses } = z
      .object({
        responses: z.array(CustomResponseSchema).min(1),
      })
      .parse(body);

    // Verify all responses belong to the same RSVP response
    const responseIds = [...new Set(responses.map((r) => r.response_id))];
    if (responseIds.length !== 1) {
      return NextResponse.json(
        {
          error: 'All responses must belong to the same RSVP response',
        },
        { status: 400 },
      );
    }

    const rsvpResponseId = responseIds[0];

    // Verify RSVP response exists
    const { data: rsvpResponse, error: rsvpError } = await supabase
      .from('rsvp_responses')
      .select(
        `
        id,
        event_id,
        rsvp_invitations (
          guest_name
        )
      `,
      )
      .eq('id', rsvpResponseId)
      .single();

    if (rsvpError || !rsvpResponse) {
      return NextResponse.json(
        { error: 'RSVP response not found' },
        { status: 404 },
      );
    }

    // Verify all questions belong to the same event
    const questionIds = responses.map((r) => r.question_id);
    const { data: questions, error: questionsError } = await supabase
      .from('rsvp_custom_questions')
      .select('id, event_id, required, question_text')
      .in('id', questionIds)
      .eq('event_id', rsvpResponse.event_id);

    if (questionsError) {
      return NextResponse.json(
        { error: 'Error validating questions' },
        { status: 500 },
      );
    }

    if (questions?.length !== questionIds.length) {
      return NextResponse.json(
        {
          error: 'Some questions do not belong to this event',
        },
        { status: 400 },
      );
    }

    // Validate required questions are answered
    const requiredQuestions = questions.filter((q) => q.required);
    const answeredQuestionIds = responses
      .filter((r) => r.answer_text || r.answer_json)
      .map((r) => r.question_id);

    const missingRequired = requiredQuestions.filter(
      (q) => !answeredQuestionIds.includes(q.id),
    );
    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error: 'Required questions must be answered',
          missing_questions: missingRequired.map((q) => q.question_text),
        },
        { status: 400 },
      );
    }

    // Delete existing responses for these questions
    await supabase
      .from('rsvp_custom_responses')
      .delete()
      .eq('response_id', rsvpResponseId)
      .in('question_id', questionIds);

    // Insert new responses
    const responsesToInsert = responses
      .filter((r) => r.answer_text || r.answer_json) // Only insert non-empty responses
      .map((r) => ({
        response_id: r.response_id,
        question_id: r.question_id,
        answer_text: r.answer_text || null,
        answer_json: r.answer_json ? JSON.stringify(r.answer_json) : null,
      }));

    if (responsesToInsert.length > 0) {
      const { data: insertedResponses, error: insertError } = await supabase
        .from('rsvp_custom_responses')
        .insert(responsesToInsert).select(`
          *,
          rsvp_custom_questions (
            question_text,
            question_type
          )
        `);

      if (insertError) {
        console.error('Error inserting custom responses:', insertError);
        return NextResponse.json(
          { error: 'Failed to save responses' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        responses: insertedResponses,
        message: 'Custom question responses saved successfully',
      });
    } else {
      return NextResponse.json({
        responses: [],
        message: 'No responses to save',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 },
      );
    }
    console.error(
      'Error in PATCH /api/rsvp/custom-questions/responses:',
      error,
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function to get custom question analytics
async function getCustomQuestionAnalytics(eventId: string) {
  const supabase = await createClient();

  try {
    // Get all questions for the event
    const { data: questions, error: questionsError } = await supabase
      .from('rsvp_custom_questions')
      .select(
        `
        *,
        rsvp_custom_responses (
          answer_text,
          answer_json,
          rsvp_responses (
            response_status
          )
        )
      `,
      )
      .eq('event_id', eventId);

    if (questionsError) {
      throw questionsError;
    }

    const analytics = {
      total_questions: questions?.length || 0,
      total_responses: 0,
      response_rate_by_question: {} as Record<string, number>,
      popular_answers: {} as Record<string, Record<string, number>>,
      completion_rate: 0,
      question_categories: {} as Record<string, number>,
    };

    // Get total RSVP responses for this event
    const { count: totalRsvpResponses } = await supabase
      .from('rsvp_responses')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    questions?.forEach((question) => {
      const responses = question.rsvp_custom_responses || [];
      const responseCount = responses.length;

      analytics.total_responses += responseCount;

      // Response rate for this question
      analytics.response_rate_by_question[question.question_text] =
        totalRsvpResponses
          ? Math.round((responseCount / totalRsvpResponses) * 100)
          : 0;

      // Popular answers for multiple choice/checkbox questions
      if (['multiple_choice', 'checkbox'].includes(question.question_type)) {
        analytics.popular_answers[question.question_text] = {};

        responses.forEach((response: any) => {
          const answer = response.answer_text || 'No answer';
          analytics.popular_answers[question.question_text][answer] =
            (analytics.popular_answers[question.question_text][answer] || 0) +
            1;
        });
      }

      // Question categories
      analytics.question_categories[question.category] =
        (analytics.question_categories[question.category] || 0) + 1;
    });

    // Overall completion rate
    analytics.completion_rate =
      questions?.length && totalRsvpResponses
        ? Math.round(
            (analytics.total_responses /
              (questions.length * totalRsvpResponses)) *
              100,
          )
        : 0;

    return analytics;
  } catch (error) {
    console.error('Error calculating custom question analytics:', error);
    return null;
  }
}
