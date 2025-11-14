/**
 * RangeDist - A class for representing and manipulating discrete probability distributions over integer ranges
 */
class RangeDist {
  readonly min: number;
  readonly max: number;
  readonly p: Float64Array;

  constructor(min: number, max: number, p: Float64Array | number[]) {
    if (min > max) {
      throw new Error("Minimum must be no greater than maximum.");
    }
    if (p.length !== max - min + 1) {
      throw new Error(
        "Probability array length must match the range size."
      );
    }
    const sum = Array.from(p).reduce((a, b) => a + b, 0);
    if (!RangeDist.isClose(sum, 1.0)) {
      throw new Error("Probabilities must sum to 1.");
    }
    if (Array.from(p).some((prob) => prob < 0)) {
      throw new Error("Probabilities must be non-negative.");
    }

    this.min = min;
    this.max = max;
    this.p = new Float64Array(p);
  }

  private static isClose(a: number, b: number, tolerance: number = 1e-9): boolean {
    return Math.abs(a - b) < tolerance;
  }

  /**
   * Create a RangeDist that represents a Bernoulli random variable (0 or 1)
   */
  static boolean(p: number = 0.5): RangeDist {
    if (!(0 <= p && p <= 1)) {
      throw new Error("Probability must be between 0 and 1.");
    }
    return new RangeDist(0, 1, new Float64Array([1 - p, p]));
  }

  /**
   * Create a RangeDist that represents a single deterministic value
   */
  static literal(val: number): RangeDist {
    if (!Number.isInteger(val)) {
      throw new TypeError("Value must be an integer.");
    }
    return new RangeDist(val, val, new Float64Array([1.0]));
  }

  toString(): string {
    if (this.min === 0 && this.max === 1) {
      return `RangeDist.boolean(${this.p[1]})`;
    }
    if (this.min === this.max) {
      return `RangeDist.literal(${this.min})`;
    }
    return `RangeDist(${this.min}, ${this.max}):\n  ${Array.from(this.p).join(", ")}`;
  }

  private static maxOrMin(
    fn: (a: number, b: number) => number,
    ...args: Array<RangeDist | number>
  ): RangeDist {
    if (args.length === 0) {
      throw new Error("At least one argument must be provided");
    }

    // Convert any integer arguments to RangeDist literals
    const dists: RangeDist[] = args.map((arg) => {
      if (typeof arg === "number") {
        return RangeDist.literal(arg);
      } else if (arg instanceof RangeDist) {
        return arg;
      } else {
        throw new TypeError(
          `Arguments must be instances of RangeDist or integers, got ${typeof arg}`
        );
      }
    });

    if (dists.length === 1) {
      return dists[0];
    }

    // Start with the first distribution
    let result = dists[0];

    // Combine with each remaining distribution
    for (let d = 1; d < dists.length; d++) {
      const other = dists[d];
      const newMin = fn(result.min, other.min);
      const newMax = fn(result.max, other.max);

      const newP = new Float64Array(newMax - newMin + 1);

      for (let i = 0; i < result.p.length; i++) {
        for (let j = 0; j < other.p.length; j++) {
          const iVal = result.min + i;
          const jVal = other.min + j;
          const val = fn(iVal, jVal);
          const newIndex = val - newMin;

          newP[newIndex] += result.p[i] * other.p[j];
        }
      }

      result = new RangeDist(newMin, newMax, newP);
    }

    return result;
  }

  /**
   * Construct a new RangeDist that represents max(a,b) of two or more distributions
   */
  static largest(...args: Array<RangeDist | number>): RangeDist {
    return this.maxOrMin(Math.max, ...args);
  }

  /**
   * Construct a new RangeDist that represents min(a,b) of two or more distributions
   */
  static smallest(...args: Array<RangeDist | number>): RangeDist {
    return this.maxOrMin(Math.min, ...args);
  }

  /**
   * Add two RangeDist objects together
   */
  add(other: RangeDist | number): RangeDist {
    if (typeof other === "number") {
      return new RangeDist(
        this.min + other,
        this.max + other,
        new Float64Array(this.p)
      );
    }
    if (!(other instanceof RangeDist)) {
      throw new TypeError(
        "Argument must be an instance of RangeDist or an integer."
      );
    }

    const newMin = this.min + other.min;
    const newMax = this.max + other.max;

    return new RangeDist(newMin, newMax, RangeDist.convolve(this.p, other.p));
  }

  private static convolve(a: Float64Array, b: Float64Array): Float64Array {
    const result = new Float64Array(a.length + b.length - 1);
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        result[i + j] += a[i] * b[j];
      }
    }
    return result;
  }

  /**
   * Negate the RangeDist, effectively flipping it around 0
   */
  negate(): RangeDist {
    const reversed = new Float64Array(this.p.length);
    for (let i = 0; i < this.p.length; i++) {
      reversed[i] = this.p[this.p.length - 1 - i];
    }
    return new RangeDist(-this.max, -this.min, reversed);
  }

  private cmp(other: RangeDist | number, op: (a: number, b: number) => boolean): RangeDist {
    const newMin = 0;
    const newMax = 1;
    const newP = new Float64Array(2);

    const otherDist =
      typeof other === "number" ? RangeDist.literal(other) : other;

    if (!(otherDist instanceof RangeDist)) {
      throw new TypeError(
        "Argument must be an instance of RangeDist or an integer."
      );
    }

    for (let iVal = this.min; iVal <= this.max; iVal++) {
      for (let jVal = otherDist.min; jVal <= otherDist.max; jVal++) {
        if (op(iVal, jVal)) {
          newP[1] +=
            this.p[iVal - this.min] * otherDist.p[jVal - otherDist.min];
        }
      }
    }

    newP[0] = 1.0 - newP[1];
    return new RangeDist(newMin, newMax, newP);
  }

  /**
   * Greater than comparison between RangeDist and another RangeDist or integer
   */
  greaterThan(other: RangeDist | number): RangeDist {
    return this.cmp(other, (a, b) => a > b);
  }

  /**
   * Greater than or equal comparison
   */
  greaterThanOrEqual(other: RangeDist | number): RangeDist {
    return this.cmp(other, (a, b) => a >= b);
  }

  /**
   * Less than comparison
   */
  lessThan(other: RangeDist | number): RangeDist {
    return this.cmp(other, (a, b) => a < b);
  }

  /**
   * Less than or equal comparison
   */
  lessThanOrEqual(other: RangeDist | number): RangeDist {
    return this.cmp(other, (a, b) => a <= b);
  }

  /**
   * Boolean AND operation between two RangeDist objects
   * Only valid for Boolean distributions (min=0, max=1)
   */
  and(other: RangeDist): RangeDist {
    if (!(other instanceof RangeDist)) {
      throw new TypeError("Argument must be an instance of RangeDist.");
    }
    if (
      this.min !== 0 ||
      this.max !== 1 ||
      other.min !== 0 ||
      other.max !== 1
    ) {
      throw new Error(
        "Both RangeDist objects must be Boolean distributions (min=0, max=1)."
      );
    }

    return RangeDist.boolean(this.p[1] * other.p[1]);
  }

  /**
   * Boolean OR operation between two RangeDist objects
   * Only valid for Boolean distributions (min=0, max=1)
   */
  or(other: RangeDist): RangeDist {
    if (!(other instanceof RangeDist)) {
      throw new TypeError("Argument must be an instance of RangeDist.");
    }
    if (
      this.min !== 0 ||
      this.max !== 1 ||
      other.min !== 0 ||
      other.max !== 1
    ) {
      throw new Error(
        "Both RangeDist objects must be Boolean distributions (min=0, max=1)."
      );
    }

    return RangeDist.boolean(1.0 - this.p[0] * other.p[0]);
  }

  /**
   * Boolean NOT operation for a RangeDist
   * Only valid for Boolean distributions (min=0, max=1)
   */
  not(): RangeDist {
    if (this.min !== 0 || this.max !== 1) {
      throw new Error(
        "RangeDist must be a Boolean distribution (min=0, max=1)."
      );
    }

    return RangeDist.boolean(this.p[0]);
  }

  /**
   * Apply a function for each value in the RangeDist. The outcome is then a weighted sum of the returned RangeDists or integers.
   * The function must return either a RangeDist or an integer.
   */
  map(
    func: (v: number) => RangeDist | number
  ): RangeDist {
    const funcWrappedLit = (v: number): RangeDist => {
      const result = func(v);
      if (result instanceof RangeDist) {
        return result;
      } else if (typeof result === "number") {
        return RangeDist.literal(result);
      } else {
        throw new TypeError(
          "Function must return a RangeDist or an integer."
        );
      }
    };

    const applied: RangeDist[] = [];
    for (let v = this.min; v <= this.max; v++) {
      applied.push(funcWrappedLit(v));
    }

    const newMin = Math.min(...applied.map((dist) => dist.min));
    const newMax = Math.max(...applied.map((dist) => dist.max));
    const newP = new Float64Array(newMax - newMin + 1);

    for (let i = 0; i < applied.length; i++) {
      const dist = applied[i];
      const p = this.p[i];
      for (let j = 0; j < dist.p.length; j++) {
        newP[dist.min - newMin + j] += p * dist.p[j];
      }
    }

    return new RangeDist(newMin, newMax, newP);
  }

  /**
   * If-then-else construct for Boolean RangeDist
   * Simple wrapper around map that applies conditional logic
   */
  ite(
    thenValue: RangeDist | number,
    elseValue: RangeDist | number
  ): RangeDist {
    if (this.min !== 0 || this.max !== 1) {
      throw new Error(
        "RangeDist must be a Boolean distribution (two outcomes)."
      );
    }

    return this.map((v) => (v === 1 ? thenValue : elseValue));
  }

  /**
   * Create a new RangeDist that represents the sum of this RangeDist repeated n times.
   * This is not multiplication, but rather a sum of n independent instances
   */
  repeatSum(n: number): RangeDist {
    let d = RangeDist.literal(0);
    for (let i = 0; i < n; i++) {
      d = d.add(this);
    }
    return d;
  }

  /**
   * Calculate the expected number of times this RangeDist must be repeated (added to itself)
   * before the sum is greater than or equal to the target value.
   * Example: expected number of d6 rolls before sum >= 20
   */
  expectedRepeatsBeforeReaching(target: number): number {
    if (this.min < 0) {
      throw new Error(
        "`expectedRepeatsBeforeReaching` only supports non-negative RangeDists."
      );
    }

    if (target > 1000) {
      console.warn(
        "Warning, `expectedRepeatsBeforeReaching` is not optimized for large targets, this may take a while."
      );
    }

    const n = target + 1;
    const T = Array.from({ length: n }, () => new Float64Array(n));
    const x0 = new Float64Array(n);
    x0[0] = 1.0;

    for (let i = 0; i < n; i++) {
      const start = i + this.min;
      const end = Math.min(i + this.max + 1, n);
      for (let j = start; j < end; j++) {
        T[j][i] = this.p[j - start];
      }
      if (end - start < this.p.length) {
        let remainder = 0;
        for (let j = end - start; j < this.p.length; j++) {
          remainder += this.p[j];
        }
        T[n - 1][i] += remainder;
      }
    }

    T[n - 1][n - 1] = 0.0; // Last row is absorbing state

    // Solve (I - T) * v = x0, then multiply by T
    const I_minus_T: number[][] = Array.from({ length: n }, () =>
      new Array(n).fill(0)
    );
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        I_minus_T[i][j] = (i === j ? 1.0 : 0.0) - T[i][j];
      }
    }

    const solved_x0 = RangeDist.gaussianElimination(I_minus_T, Array.from(x0));
    
    // Multiply T @ solved_x0 to get v
    const v = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        v[i] += T[i][j] * solved_x0[j];
      }
    }

    // Solve (I - T) * expected_turns_for = v
    const expected_turns_for = RangeDist.gaussianElimination(I_minus_T, v);

    return expected_turns_for[n - 1];
  }

  /**
   * Gaussian elimination for solving linear systems Ax=b
   */
  private static gaussianElimination(
    A: number[][],
    b: number[]
  ): number[] {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }

      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

      if (Math.abs(aug[i][i]) < 1e-10) {
        throw new Error("Singular matrix");
      }

      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i] / aug[i][i];
        for (let j = i; j <= n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j];
      }
      x[i] /= aug[i][i];
    }

    return x;
  }
}

/**
 * Create a uniform distribution for a d-sided die (1 to n_sides)
 */
function d(nSides: number): RangeDist {
  return new RangeDist(
    1,
    nSides,
    new Float64Array(Array(nSides).fill(1 / nSides))
  );
}

export { RangeDist, d };
