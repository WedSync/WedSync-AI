export interface TestResults {
  variant: string;
  conversions: number;
  total: number;
  conversionRate: number;
}

export interface StatisticalResult {
  pValue: number;
  isSignificant: boolean;
  confidenceInterval: [number, number];
  effectSize: number;
  power: number;
  recommendedAction: string;
}

export interface WeddingMetrics {
  openRate: number;
  responseRate: number;
  engagementRate: number;
  conversionRate: number;
  clientSatisfaction?: number;
}

/**
 * Calculate statistical significance using two-proportion z-test
 */
export function calculateSignificance(
  controlResults: TestResults,
  variantResults: TestResults,
  alpha: number = 0.05,
): StatisticalResult {
  const p1 = controlResults.conversionRate;
  const p2 = variantResults.conversionRate;
  const n1 = controlResults.total;
  const n2 = variantResults.total;

  // Pooled proportion
  const pooledP =
    (controlResults.conversions + variantResults.conversions) / (n1 + n2);
  const pooledQ = 1 - pooledP;

  // Standard error
  const se = Math.sqrt(pooledP * pooledQ * (1 / n1 + 1 / n2));

  // Z-score
  const z = (p2 - p1) / se;

  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  // Effect size (Cohen's h)
  const effectSize = 2 * (Math.asin(Math.sqrt(p2)) - Math.asin(Math.sqrt(p1)));

  // Confidence interval for difference in proportions
  const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const zCritical = getZCritical(alpha);
  const diff = p2 - p1;
  const confidenceInterval: [number, number] = [
    diff - zCritical * seDiff,
    diff + zCritical * seDiff,
  ];

  // Power calculation (simplified)
  const power = calculatePower(n1, n2, p1, p2, alpha);

  const isSignificant = pValue < alpha;

  let recommendedAction: string;
  if (!isSignificant) {
    recommendedAction = 'Continue test - not enough evidence';
  } else if (p2 > p1) {
    recommendedAction = `Implement variant - ${((p2 - p1) * 100).toFixed(1)}% improvement`;
  } else {
    recommendedAction = `Keep control - ${((p1 - p2) * 100).toFixed(1)}% better`;
  }

  return {
    pValue,
    isSignificant,
    confidenceInterval,
    effectSize,
    power,
    recommendedAction,
  };
}

/**
 * Calculate multi-variant test significance using Chi-square test
 */
export function calculateMultiVariantSignificance(
  variants: TestResults[],
  alpha: number = 0.05,
): {
  overallSignificant: boolean;
  pValue: number;
  pairwiseComparisons: Array<{
    variant1: string;
    variant2: string;
    result: StatisticalResult;
  }>;
} {
  // Chi-square test for overall significance
  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
  const totalTrials = variants.reduce((sum, v) => sum + v.total, 0);
  const overallRate = totalConversions / totalTrials;

  let chiSquare = 0;
  variants.forEach((variant) => {
    const expected = variant.total * overallRate;
    chiSquare += Math.pow(variant.conversions - expected, 2) / expected;
  });

  const degreesOfFreedom = variants.length - 1;
  const pValue = 1 - chiSquareCDF(chiSquare, degreesOfFreedom);
  const overallSignificant = pValue < alpha;

  // Pairwise comparisons with Bonferroni correction
  const pairwiseComparisons = [];
  const adjustedAlpha = alpha / ((variants.length * (variants.length - 1)) / 2);

  for (let i = 0; i < variants.length; i++) {
    for (let j = i + 1; j < variants.length; j++) {
      const result = calculateSignificance(
        variants[i],
        variants[j],
        adjustedAlpha,
      );
      pairwiseComparisons.push({
        variant1: variants[i].variant,
        variant2: variants[j].variant,
        result,
      });
    }
  }

  return {
    overallSignificant,
    pValue,
    pairwiseComparisons,
  };
}

/**
 * Calculate minimum sample size for A/B test
 */
export function calculateMinSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number,
  power: number = 0.8,
  alpha: number = 0.05,
): number {
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + minimumDetectableEffect);

  const zAlpha = getZCritical(alpha);
  const zBeta = getZCritical(1 - power);

  const pooledP = (p1 + p2) / 2;
  const pooledQ = 1 - pooledP;

  const n =
    (2 * pooledP * pooledQ * Math.pow(zAlpha + zBeta, 2)) /
    Math.pow(p2 - p1, 2);

  return Math.ceil(n);
}

/**
 * Calculate Bayesian credible interval
 */
export function calculateBayesianInterval(
  conversions: number,
  total: number,
  credibilityLevel: number = 0.95,
): [number, number] {
  // Using Beta distribution with uniform prior
  const alpha = conversions + 1;
  const beta = total - conversions + 1;

  const lowerTail = (1 - credibilityLevel) / 2;
  const upperTail = 1 - lowerTail;

  return [
    betaInverse(lowerTail, alpha, beta),
    betaInverse(upperTail, alpha, beta),
  ];
}

/**
 * Wedding-specific metrics analysis
 */
export function analyzeWeddingMetrics(
  controlMetrics: WeddingMetrics,
  variantMetrics: WeddingMetrics,
  sampleSize: number,
): {
  overallImprovement: number;
  keyInsights: string[];
  recommendations: string[];
} {
  const improvements = {
    openRate:
      ((variantMetrics.openRate - controlMetrics.openRate) /
        controlMetrics.openRate) *
      100,
    responseRate:
      ((variantMetrics.responseRate - controlMetrics.responseRate) /
        controlMetrics.responseRate) *
      100,
    engagementRate:
      ((variantMetrics.engagementRate - controlMetrics.engagementRate) /
        controlMetrics.engagementRate) *
      100,
    conversionRate:
      ((variantMetrics.conversionRate - controlMetrics.conversionRate) /
        controlMetrics.conversionRate) *
      100,
  };

  const overallImprovement =
    Object.values(improvements).reduce((sum, val) => sum + val, 0) / 4;

  const keyInsights: string[] = [];
  const recommendations: string[] = [];

  if (improvements.openRate > 5) {
    keyInsights.push(
      `Subject line improved open rates by ${improvements.openRate.toFixed(1)}%`,
    );
    recommendations.push('Apply this subject line style to future campaigns');
  }

  if (improvements.responseRate > 10) {
    keyInsights.push(
      `Response rate increased by ${improvements.responseRate.toFixed(1)}%`,
    );
    recommendations.push('This messaging style resonates better with couples');
  }

  if (improvements.conversionRate > 15) {
    keyInsights.push(
      `Conversion rate jumped by ${improvements.conversionRate.toFixed(1)}%`,
    );
    recommendations.push('Significant business impact - implement immediately');
  }

  if (sampleSize < 100) {
    recommendations.push('Consider running longer to increase confidence');
  }

  return {
    overallImprovement,
    keyInsights,
    recommendations,
  };
}

// Helper functions for statistical calculations

function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function erf(x: number): number {
  // Approximation of error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1 / (1 + p * x);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

function getZCritical(alpha: number): number {
  // Two-tailed z-critical values for common alpha levels
  const zTable: { [key: number]: number } = {
    0.01: 2.576,
    0.05: 1.96,
    0.1: 1.645,
  };

  return zTable[alpha] || 1.96;
}

function calculatePower(
  n1: number,
  n2: number,
  p1: number,
  p2: number,
  alpha: number,
): number {
  const pooledP = (n1 * p1 + n2 * p2) / (n1 + n2);
  const pooledQ = 1 - pooledP;

  const se1 = Math.sqrt(pooledP * pooledQ * (1 / n1 + 1 / n2));
  const se2 = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);

  const z = Math.abs(p2 - p1) / se2;
  const zCritical = getZCritical(alpha);

  return normalCDF(z - zCritical);
}

function chiSquareCDF(x: number, df: number): number {
  // Simplified chi-square CDF approximation
  if (x <= 0) return 0;
  if (df === 1) return 2 * normalCDF(Math.sqrt(x)) - 1;
  if (df === 2) return 1 - Math.exp(-x / 2);

  // Approximation for higher degrees of freedom
  const mean = df;
  const variance = 2 * df;
  const z = (x - mean) / Math.sqrt(variance);
  return normalCDF(z);
}

function betaInverse(p: number, alpha: number, beta: number): number {
  // Simplified beta inverse function approximation
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Newton-Raphson approximation
  let x = alpha / (alpha + beta); // Initial guess

  for (let i = 0; i < 10; i++) {
    const fx = incompleteBeta(x, alpha, beta) - p;
    const dfx =
      (Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1)) /
      betaFunction(alpha, beta);
    x = x - fx / dfx;

    if (Math.abs(fx) < 1e-10) break;
  }

  return Math.max(0, Math.min(1, x));
}

function incompleteBeta(x: number, a: number, b: number): number {
  // Simplified incomplete beta function
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Approximation using series expansion
  let sum = 0;
  for (let k = 0; k < 100; k++) {
    const term =
      (Math.pow(x, a + k) * Math.pow(1 - x, b)) /
      ((a + k) * betaFunction(a + k, b));
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }

  return sum;
}

function betaFunction(a: number, b: number): number {
  // Beta function B(a,b) = Γ(a)Γ(b)/Γ(a+b)
  return (gamma(a) * gamma(b)) / gamma(a + b);
}

function gamma(z: number): number {
  // Stirling's approximation for gamma function
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));

  z -= 1;
  let x = 0.99999999999980993;
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  for (let i = 0; i < coefficients.length; i++) {
    x += coefficients[i] / (z + i + 1);
  }

  const t = z + coefficients.length - 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
