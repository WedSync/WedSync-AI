'use client';

/**
 * High-Performance Statistical Engine for A/B Testing
 * Pre-computed lookup tables for < 200ms calculations
 */

// Pre-computed Z-table for critical values (99.9% coverage)
const Z_TABLE: { [key: string]: number } = {
  '0.001': 3.291,
  '0.002': 3.09,
  '0.005': 2.807,
  '0.010': 2.576,
  '0.020': 2.326,
  '0.025': 2.241,
  '0.050': 1.96,
  '0.100': 1.645,
  '0.150': 1.44,
  '0.200': 1.282,
  '0.250': 1.15,
  '0.300': 1.036,
};

// Pre-computed T-table for small samples (df: 1-30, common alpha levels)
const T_TABLE: { [key: string]: { [key: string]: number } } = {
  '1': { '0.05': 12.706, '0.01': 63.657, '0.001': 636.619 },
  '2': { '0.05': 4.303, '0.01': 9.925, '0.001': 31.598 },
  '3': { '0.05': 3.182, '0.01': 5.841, '0.001': 12.924 },
  '5': { '0.05': 2.571, '0.01': 4.032, '0.001': 6.869 },
  '10': { '0.05': 2.228, '0.01': 3.169, '0.001': 4.587 },
  '15': { '0.05': 2.131, '0.01': 2.947, '0.001': 4.073 },
  '20': { '0.05': 2.086, '0.01': 2.845, '0.001': 3.85 },
  '25': { '0.05': 2.06, '0.01': 2.787, '0.001': 3.725 },
  '30': { '0.05': 2.042, '0.01': 2.75, '0.001': 3.646 },
};

export interface TestVariant {
  id: string;
  name: string;
  conversions: number;
  totalExposures: number;
  conversionRate: number;
  isControl: boolean;
}

export interface StatisticalResult {
  pValue: number;
  isSignificant: boolean;
  confidenceInterval: [number, number];
  effectSize: number;
  power: number;
  recommendedAction: string;
  wilsonScoreInterval: [number, number];
  relativeLift: number;
  absoluteLift: number;
}

export interface MultiVariantResult {
  overallSignificant: boolean;
  overallPValue: number;
  winnerVariant?: string;
  pairwiseComparisons: PairwiseComparison[];
  bonferroniCorrected: boolean;
}

export interface PairwiseComparison {
  variant1: string;
  variant2: string;
  pValue: number;
  isSignificant: boolean;
  effectSize: number;
  confidenceInterval: [number, number];
}

export class StatisticalEngine {
  /**
   * Calculate A/B test significance with optimized algorithms
   */
  static calculateABTestSignificance(
    variantA: TestVariant,
    variantB: TestVariant,
    confidenceLevel: number = 0.95,
  ): StatisticalResult {
    const alpha = 1 - confidenceLevel;
    const p1 = variantA.conversionRate;
    const p2 = variantB.conversionRate;
    const n1 = variantA.totalExposures;
    const n2 = variantB.totalExposures;

    // Quick validation for minimum sample size
    if (n1 < 10 || n2 < 10) {
      return this.createInsufficientDataResult();
    }

    // Pooled proportion and standard error
    const pooledP = (variantA.conversions + variantB.conversions) / (n1 + n2);
    const pooledSE = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    // Z-score calculation
    const zScore = Math.abs(p2 - p1) / pooledSE;

    // P-value using pre-computed lookup
    const pValue = 2 * (1 - this.normalCDF(zScore));

    // Effect size (Cohen's h)
    const effectSize =
      2 * (Math.asin(Math.sqrt(p2)) - Math.asin(Math.sqrt(p1)));

    // Confidence interval for difference
    const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
    const zCritical = this.getZCritical(alpha);
    const diff = p2 - p1;
    const confidenceInterval: [number, number] = [
      diff - zCritical * seDiff,
      diff + zCritical * seDiff,
    ];

    // Wilson Score Intervals for both variants
    const wilsonA = this.calculateWilsonScoreInterval(
      variantA.conversions,
      n1,
      confidenceLevel,
    );
    const wilsonB = this.calculateWilsonScoreInterval(
      variantB.conversions,
      n2,
      confidenceLevel,
    );
    const wilsonScoreInterval: [number, number] = [
      wilsonB[0] - wilsonA[1], // Conservative lower bound
      wilsonB[1] - wilsonA[0], // Conservative upper bound
    ];

    // Power calculation
    const power = this.calculatePower(n1, n2, p1, p2, alpha);

    // Business metrics
    const relativeLift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;
    const absoluteLift = (p2 - p1) * 100;

    const isSignificant = pValue < alpha;

    return {
      pValue,
      isSignificant,
      confidenceInterval,
      effectSize,
      power,
      recommendedAction: this.generateRecommendation(
        isSignificant,
        p1,
        p2,
        power,
        n1 + n2,
      ),
      wilsonScoreInterval,
      relativeLift,
      absoluteLift,
    };
  }

  /**
   * Multi-variant testing with ANOVA and Bonferroni correction
   */
  static calculateMultiVariantSignificance(
    variants: TestVariant[],
    confidenceLevel: number = 0.95,
  ): MultiVariantResult {
    if (variants.length < 2) {
      throw new Error('At least 2 variants required for testing');
    }

    const alpha = 1 - confidenceLevel;

    // One-way ANOVA for overall significance
    const overallResult = this.performANOVA(variants, alpha);

    // Pairwise comparisons with Bonferroni correction
    const numComparisons = (variants.length * (variants.length - 1)) / 2;
    const adjustedAlpha = alpha / numComparisons;

    const pairwiseComparisons: PairwiseComparison[] = [];

    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        const comparison = this.compareTwoVariants(
          variants[i],
          variants[j],
          adjustedAlpha,
        );
        pairwiseComparisons.push(comparison);
      }
    }

    // Determine winner if overall significant
    let winnerVariant: string | undefined;
    if (overallResult.isSignificant) {
      winnerVariant = variants.reduce((winner, current) =>
        current.conversionRate > winner.conversionRate ? current : winner,
      ).name;
    }

    return {
      overallSignificant: overallResult.isSignificant,
      overallPValue: overallResult.pValue,
      winnerVariant,
      pairwiseComparisons,
      bonferroniCorrected: true,
    };
  }

  /**
   * Bayesian A/B testing with credible intervals
   */
  static calculateBayesianABTest(
    variantA: TestVariant,
    variantB: TestVariant,
    priorAlpha: number = 1,
    priorBeta: number = 1,
  ): {
    probabilityBWins: number;
    credibleIntervalA: [number, number];
    credibleIntervalB: [number, number];
    expectedLoss: number;
  } {
    // Beta posterior parameters
    const alphaA = variantA.conversions + priorAlpha;
    const betaA = variantA.totalExposures - variantA.conversions + priorBeta;
    const alphaB = variantB.conversions + priorAlpha;
    const betaB = variantB.totalExposures - variantB.conversions + priorBeta;

    // Monte Carlo simulation for P(B > A)
    const simulations = 10000;
    let bWinsCount = 0;
    let totalLoss = 0;

    for (let i = 0; i < simulations; i++) {
      const sampleA = this.betaRandom(alphaA, betaA);
      const sampleB = this.betaRandom(alphaB, betaB);

      if (sampleB > sampleA) {
        bWinsCount++;
      }

      // Expected loss calculation
      const loss = Math.max(0, sampleA - sampleB);
      totalLoss += loss;
    }

    const probabilityBWins = bWinsCount / simulations;
    const expectedLoss = totalLoss / simulations;

    // 95% credible intervals
    const credibleIntervalA = this.betaCredibleInterval(alphaA, betaA);
    const credibleIntervalB = this.betaCredibleInterval(alphaB, betaB);

    return {
      probabilityBWins,
      credibleIntervalA,
      credibleIntervalB,
      expectedLoss,
    };
  }

  /**
   * Minimum sample size calculation for desired power
   */
  static calculateRequiredSampleSize(
    baselineConversionRate: number,
    minimumDetectableEffect: number,
    power: number = 0.8,
    alpha: number = 0.05,
  ): number {
    const p1 = baselineConversionRate;
    const p2 = p1 * (1 + minimumDetectableEffect);

    const zAlpha = this.getZCritical(alpha);
    const zBeta = this.getZCritical(1 - power);

    const pooledP = (p1 + p2) / 2;

    const numerator =
      Math.pow(zAlpha + zBeta, 2) * (p1 * (1 - p1) + p2 * (1 - p2));
    const denominator = Math.pow(p2 - p1, 2);

    return Math.ceil(numerator / denominator);
  }

  /**
   * Sequential testing with alpha spending functions
   */
  static calculateSequentialTestBoundary(
    currentN: number,
    maxN: number,
    alpha: number = 0.05,
    spendingFunction: 'obrien-fleming' | 'pocock' = 'obrien-fleming',
  ): number {
    const fraction = currentN / maxN;

    if (spendingFunction === 'obrien-fleming') {
      // O'Brien-Fleming boundary
      const spent =
        2 *
        (1 -
          this.normalCDF(this.getZCritical(alpha / 2) / Math.sqrt(fraction)));
      return this.getZCritical(spent / 2);
    } else {
      // Pocock boundary
      return this.getZCritical(alpha / 2) * Math.sqrt(fraction);
    }
  }

  // Private helper methods

  private static performANOVA(variants: TestVariant[], alpha: number) {
    const k = variants.length;
    const totalN = variants.reduce((sum, v) => sum + v.totalExposures, 0);
    const totalConversions = variants.reduce(
      (sum, v) => sum + v.conversions,
      0,
    );
    const overallRate = totalConversions / totalN;

    // Between-group sum of squares
    let ssBetween = 0;
    variants.forEach((variant) => {
      const diff = variant.conversionRate - overallRate;
      ssBetween += variant.totalExposures * diff * diff;
    });

    // Within-group sum of squares (for proportions)
    let ssWithin = 0;
    variants.forEach((variant) => {
      const p = variant.conversionRate;
      ssWithin += variant.totalExposures * p * (1 - p);
    });

    const dfBetween = k - 1;
    const dfWithin = totalN - k;

    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;

    const fStatistic = msBetween / msWithin;

    // Approximate F-distribution with normal for large samples
    const pValue = 1 - this.fCDF(fStatistic, dfBetween, dfWithin);

    return {
      isSignificant: pValue < alpha,
      pValue,
      fStatistic,
    };
  }

  private static compareTwoVariants(
    variantA: TestVariant,
    variantB: TestVariant,
    alpha: number,
  ): PairwiseComparison {
    const result = this.calculateABTestSignificance(
      variantA,
      variantB,
      1 - alpha,
    );

    return {
      variant1: variantA.name,
      variant2: variantB.name,
      pValue: result.pValue,
      isSignificant: result.isSignificant,
      effectSize: result.effectSize,
      confidenceInterval: result.confidenceInterval,
    };
  }

  private static calculateWilsonScoreInterval(
    successes: number,
    total: number,
    confidenceLevel: number,
  ): [number, number] {
    if (total === 0) return [0, 0];

    const z = this.getZCritical(1 - confidenceLevel);
    const p = successes / total;
    const n = total;

    const center = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
    const margin =
      (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) /
      (1 + (z * z) / n);

    return [Math.max(0, center - margin), Math.min(1, center + margin)];
  }

  private static calculatePower(
    n1: number,
    n2: number,
    p1: number,
    p2: number,
    alpha: number,
  ): number {
    const pooledP = (n1 * p1 + n2 * p2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
    const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);

    const delta = Math.abs(p2 - p1);
    const zCritical = this.getZCritical(alpha);
    const zPower = (delta - zCritical * se) / seDiff;

    return this.normalCDF(zPower);
  }

  private static normalCDF(z: number): number {
    // High-precision approximation
    const a1 = 0.31938153;
    const a2 = -0.356563782;
    const a3 = 1.781477937;
    const a4 = -1.821255978;
    const a5 = 1.330274429;

    const k = 1 / (1 + 0.2316419 * Math.abs(z));
    const cdf =
      1 -
      (1 / Math.sqrt(2 * Math.PI)) *
        Math.exp(-0.5 * z * z) *
        (a1 * k +
          a2 * k * k +
          a3 * Math.pow(k, 3) +
          a4 * Math.pow(k, 4) +
          a5 * Math.pow(k, 5));

    return z >= 0 ? cdf : 1 - cdf;
  }

  private static getZCritical(alpha: number): number {
    // Use pre-computed lookup table for common values
    const key = alpha.toFixed(3);
    if (Z_TABLE[key]) {
      return Z_TABLE[key];
    }

    // Linear interpolation for intermediate values
    const keys = Object.keys(Z_TABLE).map(Number).sort();
    for (let i = 0; i < keys.length - 1; i++) {
      if (alpha >= keys[i] && alpha <= keys[i + 1]) {
        const ratio = (alpha - keys[i]) / (keys[i + 1] - keys[i]);
        return (
          Z_TABLE[keys[i].toString()] +
          ratio *
            (Z_TABLE[keys[i + 1].toString()] - Z_TABLE[keys[i].toString()])
        );
      }
    }

    return 1.96; // Default for 95% confidence
  }

  private static betaRandom(alpha: number, beta: number): number {
    // Simple beta distribution generator using gamma distribution
    const gamma1 = this.gammaRandom(alpha);
    const gamma2 = this.gammaRandom(beta);
    return gamma1 / (gamma1 + gamma2);
  }

  private static gammaRandom(shape: number): number {
    // Marsaglia and Tsang's method for gamma distribution
    if (shape < 1) {
      return this.gammaRandom(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  private static normalRandom(): number {
    // Box-Muller transform
    let spare: number | null = null;

    if (spare !== null) {
      const temp = spare;
      spare = null;
      return temp;
    }

    const u1 = Math.random();
    const u2 = Math.random();
    const mag = Math.sqrt(-2 * Math.log(u1));

    spare = mag * Math.sin(2 * Math.PI * u2);
    return mag * Math.cos(2 * Math.PI * u2);
  }

  private static betaCredibleInterval(
    alpha: number,
    beta: number,
  ): [number, number] {
    // Approximation using normal distribution for large alpha + beta
    if (alpha + beta > 50) {
      const mean = alpha / (alpha + beta);
      const variance =
        (alpha * beta) / ((alpha + beta) * (alpha + beta) * (alpha + beta + 1));
      const std = Math.sqrt(variance);

      return [Math.max(0, mean - 1.96 * std), Math.min(1, mean + 1.96 * std)];
    }

    // For smaller samples, use quantile approximation
    const mean = alpha / (alpha + beta);
    const mode =
      alpha > 1 && beta > 1 ? (alpha - 1) / (alpha + beta - 2) : mean;

    // Simple symmetric interval around mode
    const spread = 0.4 / Math.sqrt(alpha + beta);
    return [Math.max(0, mode - spread), Math.min(1, mode + spread)];
  }

  private static fCDF(f: number, df1: number, df2: number): number {
    // Approximation for F-distribution CDF
    // For large df, F approaches chi-square/df1
    if (df2 > 30) {
      const chi2 = f * df1;
      return this.chiSquareCDF(chi2, df1);
    }

    // Simple approximation for smaller df
    return 1 / (1 + Math.exp(-f + 1));
  }

  private static chiSquareCDF(x: number, df: number): number {
    if (x <= 0) return 0;
    if (df === 1) return 2 * this.normalCDF(Math.sqrt(x)) - 1;
    if (df === 2) return 1 - Math.exp(-x / 2);

    // Wilson-Hilferty approximation
    const h = 2 / (9 * df);
    const z = (Math.pow(x / df, 1 / 3) - (1 - h)) / Math.sqrt(h);
    return this.normalCDF(z);
  }

  private static generateRecommendation(
    isSignificant: boolean,
    p1: number,
    p2: number,
    power: number,
    totalSample: number,
  ): string {
    if (!isSignificant) {
      if (power < 0.8) {
        return 'Insufficient power - continue testing or increase sample size';
      }
      return 'No significant difference found - either variant can be used';
    }

    const improvement =
      ((Math.max(p1, p2) - Math.min(p1, p2)) / Math.min(p1, p2)) * 100;
    const winner = p2 > p1 ? 'variant' : 'control';

    if (improvement > 20) {
      return `Strong winner: ${winner} shows ${improvement.toFixed(1)}% improvement - implement immediately`;
    } else if (improvement > 10) {
      return `Clear winner: ${winner} shows ${improvement.toFixed(1)}% improvement - safe to implement`;
    } else {
      return `Marginal winner: ${winner} shows ${improvement.toFixed(1)}% improvement - consider business impact`;
    }
  }

  private static createInsufficientDataResult(): StatisticalResult {
    return {
      pValue: 1,
      isSignificant: false,
      confidenceInterval: [0, 0],
      effectSize: 0,
      power: 0,
      recommendedAction:
        'Insufficient data - need at least 10 samples per variant',
      wilsonScoreInterval: [0, 0],
      relativeLift: 0,
      absoluteLift: 0,
    };
  }
}

export default StatisticalEngine;
