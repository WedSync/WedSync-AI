import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { withRateLimit } from "@/lib/api-middleware";
import { generateSecureToken } from "@/lib/crypto-utils";
import { auditPayment } from "@/lib/security-audit-logger";

// Initialize Stripe with conditional setup
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    })
  : null;

// Log warning if Stripe is not configured
if (!stripe) {
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

import { mapLegacyTier } from "@/lib/stripe-config";

// Define valid price IDs - these should match your Stripe dashboard
const VALID_PRICE_IDS: Record<string, { monthly: string; yearly: string }> = {
  pro: {
    monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID || "",
  },
  professional: {
    // Alias for backward compatibility
    monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID || "",
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || "",
  },
  scale: {
    // Alias for backward compatibility
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || "",
    yearly: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || "",
  },
};

// Validate that all price IDs are configured
function validatePriceConfiguration() {
  const requiredVars = [
    "STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID",
    "STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID",
    "STRIPE_BUSINESS_MONTHLY_PRICE_ID",
    "STRIPE_BUSINESS_ANNUAL_PRICE_ID",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
  }
}

// Run validation on startup
validatePriceConfiguration();

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!stripe) {
    return NextResponse.json({ error: "Payment processing is not configured" }, { status: 503 });
  }

  // Apply rate limiting for payment endpoints
  return withRateLimit(
    request,
    { limit: 5, type: "payment" }, // 5 requests per minute for payment endpoints
    async () => {
      try {
        // Authentication check
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return NextResponse.json(
            { error: "Unauthorized - No valid auth token" },
            { status: 401 }
          );
        }

        const token = authHeader.replace("Bearer ", "");

        // Verify the user with Supabase
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return NextResponse.json({ error: "Unauthorized - Invalid auth token" }, { status: 401 });
        }

        // Get user's organization
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("organization_id, role")
          .eq("user_id", user.id)
          .single();

        if (!userProfile?.organization_id) {
          return NextResponse.json({ error: "No organization found for user" }, { status: 403 });
        }

        // Check if user has permission to upgrade (must be OWNER or ADMIN)
        if (userProfile.role !== "OWNER" && userProfile.role !== "ADMIN") {
          return NextResponse.json(
            { error: "Insufficient permissions to manage subscription" },
            { status: 403 }
          );
        }

        // Get organization details
        const { data: organization } = await supabase
          .from("organizations")
          .select("id, name, billing_email, stripe_customer_id, subscription_status")
          .eq("id", userProfile.organization_id)
          .single();

        if (!organization) {
          return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Check if already has an active subscription
        if (organization.subscription_status === "active") {
          return NextResponse.json(
            {
              error:
                "Organization already has an active subscription. Please manage it from your account settings.",
            },
            { status: 400 }
          );
        }

        // Parse and validate request body with enhanced security
        let body;
        try {
          const rawBody = await request.text();

          // Validate request size (prevent DoS)
          if (rawBody.length > 2048) {
            // 2KB limit
            return NextResponse.json({ error: "Request payload too large" }, { status: 413 });
          }

          body = JSON.parse(rawBody);
        } catch (_parseError) {
          return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const { tier, billingCycle = "monthly", idempotencyKey } = body;

        // Generate request ID for tracking
        const requestId = generateSecureToken(16);

        // Use provided idempotency key or generate one
        const checkoutIdempotencyKey =
          idempotencyKey || `checkout_${user.id}_${Date.now()}_${requestId}`;

        // Log checkout attempt
        await auditPayment.checkoutAttempt(
          user.id,
          userProfile.organization_id,
          {
            tier: tier,
            billing_cycle: billingCycle,
            request_id: requestId,
            idempotency_key: checkoutIdempotencyKey,
          },
          request
        );

        // Enhanced input validation and sanitization
        if (!tier || typeof tier !== "string") {
          return NextResponse.json(
            { error: "Subscription tier is required and must be a string" },
            { status: 400 }
          );
        }

        // Sanitize input - remove potential malicious characters
        const sanitizedTier = tier.trim().replace(/[^a-zA-Z0-9_-]/g, "");
        const sanitizedBillingCycle = (billingCycle || "monthly").trim().replace(/[^a-zA-Z]/g, "");

        if (sanitizedTier.length === 0 || sanitizedTier.length > 20) {
          return NextResponse.json({ error: "Invalid tier format" }, { status: 400 });
        }

        // Map tier to our subscription system
        const mappedTier = mapLegacyTier(sanitizedTier);

        // Don't allow checkout for free tier
        if (mappedTier === "FREE") {
          return NextResponse.json(
            { error: "Free tier does not require payment" },
            { status: 400 }
          );
        }

        // Validate tier against whitelist
        const tierLower = sanitizedTier.toLowerCase();
        if (!VALID_PRICE_IDS[tierLower] && !VALID_PRICE_IDS[mappedTier.toLowerCase()]) {
          return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 });
        }

        // Validate billing cycle against whitelist
        if (sanitizedBillingCycle !== "monthly" && sanitizedBillingCycle !== "yearly") {
          return NextResponse.json(
            { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
            { status: 400 }
          );
        }

        // Get the correct price ID using sanitized values
        let priceId = VALID_PRICE_IDS[tierLower]?.[sanitizedBillingCycle];

        // If not found, try the mapped tier
        if (!priceId) {
          priceId = VALID_PRICE_IDS[mappedTier.toLowerCase()]?.[sanitizedBillingCycle];
        }

        if (!priceId) {
          return NextResponse.json(
            { error: "Price configuration error. Please contact support." },
            { status: 500 }
          );
        }

        // Verify the price ID exists in Stripe
        try {
          await stripe.prices.retrieve(priceId);
        } catch (_priceError) {
          return NextResponse.json(
            { error: "Invalid price configuration. Please contact support." },
            { status: 500 }
          );
        }

        const origin =
          request.headers.get("origin") ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000";

        // Create or retrieve Stripe customer
        let stripeCustomerId = organization.stripe_customer_id;

        if (!stripeCustomerId) {
          // Create new Stripe customer
          const customer = await stripe.customers.create({
            email: organization.billing_email || user.email,
            name: organization.name,
            metadata: {
              organization_id: organization.id,
              user_id: user.id,
            },
          });

          stripeCustomerId = customer.id;

          // Save customer ID to organization
          await supabase
            .from("organizations")
            .update({ stripe_customer_id: stripeCustomerId })
            .eq("id", organization.id);
        }

        // Create checkout session with customer and idempotency key
        const session = await stripe.checkout.sessions.create(
          {
            customer: stripeCustomerId,
            payment_method_types: ["card"],
            line_items: [
              {
                price: priceId,
                quantity: 1,
              },
            ],
            mode: "subscription",
            success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${origin}/pricing?canceled=true`,
            allow_promotion_codes: true,
            billing_address_collection: "required",
            customer_update: {
              address: "auto",
              name: "auto",
            },
            metadata: {
              organization_id: organization.id,
              user_id: user.id,
              tier: tierLower,
              billingCycle: sanitizedBillingCycle,
              idempotency_key: checkoutIdempotencyKey,
            },
            subscription_data: {
              trial_period_days: 14,
              metadata: {
                organization_id: organization.id,
                tier: mappedTier,
                billingCycle: sanitizedBillingCycle,
              },
            },
          },
          {
            idempotencyKey: checkoutIdempotencyKey,
          }
        );

        // Log successful checkout session creation
        await auditPayment.checkoutSuccess(
          user.id,
          organization.id,
          {
            session_id: session.id,
            stripe_customer_id: stripeCustomerId,
            price_id: priceId,
            tier: mappedTier,
            billing_cycle: sanitizedBillingCycle,
            request_id: requestId,
            idempotency_key: checkoutIdempotencyKey,
          },
          request
        );

        const response = NextResponse.json({
          url: session.url,
          sessionId: session.id,
        });

        // Add additional security headers for payment responses
        response.headers.set("X-Content-Type-Options", "nosniff");
        response.headers.set("X-Frame-Options", "DENY");
        response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");

        return response;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Log checkout failure
        if (user && userProfile?.organization_id) {
          await auditPayment.checkoutFailure(
            user.id,
            userProfile.organization_id,
            {
              error: errorMessage,
              tier: sanitizedTier,
              billing_cycle: sanitizedBillingCycle,
              request_id: requestId,
            },
            request
          );
        }

        // Don't expose internal error details to client
        return NextResponse.json(
          { error: "Failed to create checkout session. Please try again." },
          { status: 500 }
        );
      }
    }
  );
}
