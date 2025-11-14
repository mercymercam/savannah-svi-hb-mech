import { describe, it, expect } from "vitest";
import { RangeDist, d } from "./prob-eval";

describe("RangeDist", () => {
  describe("Combat Simulation - Ape vs PC", () => {
    it("should match Python implementation results for complex combat scenario", () => {
      // Test case from Python implementation
      const pc_ac = 15;
      const pc_hp = 122;
      const pc_init = RangeDist.largest(d(20).add(2), d(20).add(2).add(6));

      const ape_init = d(20).add(2);
      const ape_damage_on_normal_hit = d(6).repeatSum(2).add(3); // 2d6 + 3
      const ape_damage_on_crit_hit = d(6).repeatSum(4).add(3); // 4d6 + 3

      function ape_damage(attack_roll: number): RangeDist | number {
        // miss, hit, or crit
        if (attack_roll === 20) {
          return ape_damage_on_crit_hit;
        } else if (attack_roll + 5 >= pc_ac) {
          return ape_damage_on_normal_hit;
        } else {
          return 0;
        }
      }

      const ape_damage_dist = d(20).map(ape_damage);
      const ape_count = 100;

      function ape_damage_before_pc(pc_init_val: number): RangeDist {
        const ape_goes_first = ape_init.greaterThanOrEqual(pc_init_val);

        const single_ape_outcome = ape_goes_first.ite(ape_damage_dist, 0);

        return single_ape_outcome.repeatSum(ape_count);
      }

      const damage_done_to_pc = pc_init.map(ape_damage_before_pc);
      const chance_pc_dies = damage_done_to_pc.greaterThanOrEqual(pc_hp);

      // Expected result from Python: RangeDist.boolean(0.4164411950770846)
      expect(chance_pc_dies.min).toBe(0);
      expect(chance_pc_dies.max).toBe(1);
      expect(chance_pc_dies.p[1]).toBeCloseTo(0.4164411950770846, 10);

      // Expected Ape Attacks before PC dies: 21.76199902912563
      const expected_ape_attacks =
        ape_damage_dist.expectedRepeatsBeforeReaching(pc_hp);
      expect(expected_ape_attacks).toBeCloseTo(21.76199902912563, 8);

      // Expected Damage Done to PC: RangeDist.boolean(0.8009514480695552)
      const damage_from_25_attacks = ape_damage_dist.repeatSum(25);
      const chance_25_attacks_kills = damage_from_25_attacks.greaterThanOrEqual(pc_hp);
      expect(chance_25_attacks_kills.min).toBe(0);
      expect(chance_25_attacks_kills.max).toBe(1);
      expect(chance_25_attacks_kills.p[1]).toBeCloseTo(0.8009514480695552, 10);
    });
  });

  describe("Basic Operations", () => {
    it("should create a literal distribution", () => {
      const literal = RangeDist.literal(5);
      expect(literal.min).toBe(5);
      expect(literal.max).toBe(5);
      expect(literal.p[0]).toBe(1.0);
    });

    it("should create a boolean distribution", () => {
      const bool = RangeDist.boolean(0.7);
      expect(bool.min).toBe(0);
      expect(bool.max).toBe(1);
      expect(bool.p[0]).toBeCloseTo(0.3, 10);
      expect(bool.p[1]).toBeCloseTo(0.7, 10);
    });

    it("should create a dice distribution", () => {
      const d6 = d(6);
      expect(d6.min).toBe(1);
      expect(d6.max).toBe(6);
      expect(d6.p.length).toBe(6);
      for (let i = 0; i < 6; i++) {
        expect(d6.p[i]).toBeCloseTo(1 / 6, 10);
      }
    });

    it("should add distributions", () => {
      const d6_1 = d(6);
      const d6_2 = d(6);
      const sum = d6_1.add(d6_2);
      expect(sum.min).toBe(2);
      expect(sum.max).toBe(12);
    });

    it("should add constant to distribution", () => {
      const d6 = d(6);
      const sum = d6.add(3);
      expect(sum.min).toBe(4);
      expect(sum.max).toBe(9);
    });

    it("should compute largest of distributions", () => {
      const result = RangeDist.largest(d(20).add(2), d(20).add(8));
      // max(d20+2, d20+8) has min=max(3,9)=9 and max=max(22,28)=28
      expect(result.min).toBe(9);
      expect(result.max).toBe(28);
    });

    it("should compute smallest of distributions", () => {
      const result = RangeDist.smallest(d(20).add(2), d(20).add(8));
      // min(d20+2, d20+8) has min=min(3,9)=3 and max=min(22,28)=22
      expect(result.min).toBe(3);
      expect(result.max).toBe(22);
    });
  });

  describe("Comparison Operations", () => {
    it("should perform greater than comparison", () => {
      const d6 = d(6);
      const result = d6.greaterThan(3);
      expect(result.min).toBe(0);
      expect(result.max).toBe(1);
      expect(result.p[1]).toBeCloseTo(0.5, 10); // 4, 5, 6 are > 3
    });

    it("should perform greater than or equal comparison", () => {
      const d6 = d(6);
      const result = d6.greaterThanOrEqual(4);
      expect(result.min).toBe(0);
      expect(result.max).toBe(1);
      expect(result.p[1]).toBeCloseTo(0.5, 10); // 4, 5, 6 are >= 4
    });
  });

  describe("Advanced Operations", () => {
    it("should map over distribution values", () => {
      const d6 = d(6);
      const doubled = d6.map((v) => v * 2);
      expect(doubled.min).toBe(2);
      expect(doubled.max).toBe(12);
    });

    it("should perform if-then-else operation", () => {
      const coin = RangeDist.boolean(0.5);
      const result = coin.ite(10, 5);
      expect(result.min).toBe(5);
      expect(result.max).toBe(10);
      expect(result.p[0]).toBeCloseTo(0.5, 10); // probability of 5
      expect(result.p[result.p.length - 1]).toBeCloseTo(0.5, 10); // probability of 10
    });

    it("should repeat sum distributions", () => {
      const d6 = d(6);
      const sum = d6.repeatSum(2);
      expect(sum.min).toBe(2);
      expect(sum.max).toBe(12);
    });

    it("should negate distribution", () => {
      const dist = d(6);
      const negated = dist.negate();
      expect(negated.min).toBe(-6);
      expect(negated.max).toBe(-1);
    });
  });

  describe("Boolean Operations", () => {
    it("should perform AND operation", () => {
      const a = RangeDist.boolean(0.7);
      const b = RangeDist.boolean(0.6);
      const result = a.and(b);
      expect(result.min).toBe(0);
      expect(result.max).toBe(1);
      expect(result.p[1]).toBeCloseTo(0.42, 10); // 0.7 * 0.6
    });

    it("should perform OR operation", () => {
      const a = RangeDist.boolean(0.7);
      const b = RangeDist.boolean(0.6);
      const result = a.or(b);
      expect(result.min).toBe(0);
      expect(result.max).toBe(1);
      expect(result.p[1]).toBeCloseTo(0.88, 10); // 1 - (0.3 * 0.4)
    });

    it("should perform NOT operation", () => {
      const a = RangeDist.boolean(0.7);
      const result = a.not();
      expect(result.min).toBe(0);
      expect(result.max).toBe(1);
      expect(result.p[1]).toBeCloseTo(0.3, 10);
    });
  });

  describe("Additional Test Cases from Python Ground Truth", () => {
    describe("TEST CASE 1: Simple d6 comparisons", () => {
      it("should correctly calculate d6 > 4", () => {
        const d6 = d(6);
        const result = d6.greaterThan(4);
        expect(result.min).toBe(0);
        expect(result.max).toBe(1);
        expect(result.p[1]).toBeCloseTo(0.3333333333333333, 10);
      });

      it("should correctly calculate d6 >= 4", () => {
        const d6 = d(6);
        const result = d6.greaterThanOrEqual(4);
        expect(result.min).toBe(0);
        expect(result.max).toBe(1);
        expect(result.p[1]).toBeCloseTo(0.5, 10);
      });

      it("should correctly calculate d6 < 3", () => {
        const d6 = d(6);
        const result = d6.lessThan(3);
        expect(result.min).toBe(0);
        expect(result.max).toBe(1);
        expect(result.p[1]).toBeCloseTo(0.3333333333333333, 10);
      });

      it("should correctly calculate d6 <= 3", () => {
        const d6 = d(6);
        const result = d6.lessThanOrEqual(3);
        expect(result.min).toBe(0);
        expect(result.max).toBe(1);
        expect(result.p[1]).toBeCloseTo(0.5, 10);
      });
    });

    describe("TEST CASE 2: Dice addition", () => {
      it("should correctly calculate 2d6 range and probabilities", () => {
        const two_d6 = d(6).add(d(6));
        expect(two_d6.min).toBe(2);
        expect(two_d6.max).toBe(12);

        const result = two_d6.greaterThanOrEqual(7);
        expect(result.p[1]).toBeCloseTo(0.5833333333333334, 10);

        // Probability of rolling exactly 7
        const prob7 = two_d6.p[7 - two_d6.min];
        expect(prob7).toBeCloseTo(0.16666666666666669, 10);
      });
    });

    describe("TEST CASE 3: d20 attack roll vs AC", () => {
      it("should correctly calculate d20+5 vs AC 15 hit chance", () => {
        const attack_roll = d(20).add(5);
        const hits = attack_roll.greaterThanOrEqual(15);
        expect(hits.min).toBe(0);
        expect(hits.max).toBe(1);
        expect(hits.p[1]).toBeCloseTo(0.5499999999999999, 10);
      });
    });

    describe("TEST CASE 4: Advantage on d20", () => {
      it("should correctly calculate advantage hit chance", () => {
        const advantage = RangeDist.largest(d(20), d(20));
        expect(advantage.min).toBe(1);
        expect(advantage.max).toBe(20);

        const advantage_plus_5 = advantage.add(5);
        const hits_with_advantage = advantage_plus_5.greaterThanOrEqual(15);
        expect(hits_with_advantage.p[1]).toBeCloseTo(0.7975000000000004, 10);
      });
    });

    describe("TEST CASE 5: Disadvantage on d20", () => {
      it("should correctly calculate disadvantage hit chance", () => {
        const disadvantage = RangeDist.smallest(d(20), d(20));
        expect(disadvantage.min).toBe(1);
        expect(disadvantage.max).toBe(20);

        const disadvantage_plus_5 = disadvantage.add(5);
        const hits_with_disadvantage = disadvantage_plus_5.greaterThanOrEqual(15);
        expect(hits_with_disadvantage.p[1]).toBeCloseTo(0.3025000000000002, 10);
      });
    });

    describe("TEST CASE 6: Critical hit damage (3d6+4)", () => {
      it("should correctly calculate 3d6+4 damage distribution", () => {
        const crit_damage = d(6).repeatSum(3).add(4);
        expect(crit_damage.min).toBe(7);
        expect(crit_damage.max).toBe(22);

        const high_damage = crit_damage.greaterThanOrEqual(15);
        expect(high_damage.p[1]).toBeCloseTo(0.5, 10);
      });
    });

    describe("TEST CASE 7: Map - double all values of d6", () => {
      it("should correctly map and double d6 values", () => {
        const d6_doubled = d(6).map((x) => x * 2);
        expect(d6_doubled.min).toBe(2);
        expect(d6_doubled.max).toBe(12);

        const result = d6_doubled.greaterThanOrEqual(8);
        expect(result.p[1]).toBeCloseTo(0.5, 10);
      });
    });

    describe("TEST CASE 8: Conditional damage (ite)", () => {
      it("should correctly handle if-then-else conditional damage", () => {
        const coin_flip = RangeDist.boolean(0.5);
        const damage = coin_flip.ite(d(8).add(3), d(4).add(1));
        expect(damage.min).toBe(2);
        expect(damage.max).toBe(11);

        const heavy_damage = damage.greaterThanOrEqual(8);
        expect(heavy_damage.p[1]).toBeCloseTo(0.25, 10);
      });
    });

    describe("TEST CASE 9: Expected rolls to reach target", () => {
      it("should correctly calculate expected d6 rolls to reach 20", () => {
        const d6_die = d(6);
        const expected_rolls = d6_die.expectedRepeatsBeforeReaching(20);
        expect(expected_rolls).toBeCloseTo(6.190195198987437, 8);
      });
    });

    describe("TEST CASE 10: Complex attack with crit", () => {
      it("should correctly calculate complex attack damage with critical hits", () => {
        function calculate_damage(roll: number): RangeDist | number {
          if (roll === 20) {
            // Critical hit: 2d8+4
            return d(8).repeatSum(2).add(4);
          } else if (roll + 3 >= 14) {
            // Normal hit (AC 14, +3 to hit): 1d8+4
            return d(8).add(4);
          } else {
            return 0;
          }
        }

        const attack_damage = d(20).map(calculate_damage);
        expect(attack_damage.min).toBe(0);
        expect(attack_damage.max).toBe(20);

        const kills_target = attack_damage.greaterThanOrEqual(15);
        expect(kills_target.p[1]).toBeCloseTo(0.01640625, 10);
      });
    });
  });
});
