import { describe, it, expect } from "vitest";
import {

DEFAULT_PRESETS,
findMatchingPreset,
getDefaultValues,
} from "./presets";

describe("DEFAULT_PRESETS", () => {
it("has 20 presets and expected first/last entries", () => {
    expect(DEFAULT_PRESETS).toHaveLength(20);
    expect(DEFAULT_PRESETS[0]).toEqual([1, 13, 8.5, 5]);
    expect(DEFAULT_PRESETS[19]).toEqual([20, 19, 14.5, 9]);
});

it("contains specific computed entries", () => {
    // level 8: 5.5 + 3 + 3 = 11.5
    expect(DEFAULT_PRESETS.find(([lvl]) => lvl === 8)).toEqual([8, 15, 11.5, 6]);
    // level 9: 5.5 + 3 + 4 = 12.5
    expect(DEFAULT_PRESETS.find(([lvl]) => lvl === 9)).toEqual([9, 15, 12.5, 7]);
});
});

describe("findMatchingPreset", () => {
it("returns preset matching party level when provided", () => {
    const preset = findMatchingPreset(5, undefined, undefined);
    expect(preset).toEqual([5, 14, 8.5, 6]);
});

it("returns first preset matching monster AC when party level not provided", () => {
    const preset = findMatchingPreset(undefined, 16, undefined);
    // first preset with AC 16 is level 10
    expect(preset).toEqual([10, 16, 12.5, 7]);
});

it("returns first preset matching exact baseDamage when provided", () => {
    const preset = findMatchingPreset(undefined, undefined, 12.5);
    // first occurrence of 12.5 is level 9
    expect(preset).toEqual([9, 15, 12.5, 7]);
});

it("returns closest preset by baseDamage when exact match not found", () => {
    const preset = findMatchingPreset(undefined, undefined, 13.0);
    // Closest to 13.0 is 12.5 (level 9)
    expect(preset).toEqual([9, 15, 12.5, 7]);
});

it("returns undefined when no criteria provided or no match found", () => {
    expect(findMatchingPreset()).toBeUndefined();
    // AC that doesn't exist in presets
    expect(findMatchingPreset(undefined, 999, undefined)).toBeUndefined();
});
});

describe("getDefaultValues", () => {
it("returns first preset as strings when no inputs provided", () => {
    const vals = getDefaultValues(undefined, undefined, undefined, undefined);
    expect(vals).toEqual({
        partyLevel: "1",
        monsterAC: "13",
        baseDamage: "8.5",
        toHitBonus: "5",
    });
});

it("uses provided partyLevel and fills others from matching preset", () => {
    const vals = getDefaultValues("5", undefined, undefined, undefined);
    expect(vals).toEqual({
        partyLevel: "5",
        monsterAC: "14",
        baseDamage: "8.5",
        toHitBonus: "6",
    });
});

it("uses provided monsterAC and fills others from matching preset", () => {
    const vals = getDefaultValues(undefined, "16", undefined, undefined);
    expect(vals).toEqual({
        partyLevel: "10",
        monsterAC: "16",
        baseDamage: "12.5",
        toHitBonus: "7",
    });
});

it("uses provided baseDamage (closest match) and fills others from matching preset", () => {
    const vals = getDefaultValues(undefined, undefined, "13", undefined);
    // closest preset to 13 is the 12.5 entry (level 9)
    // and we always leave alone what we find so it gets set to "13"
    expect(vals).toEqual({
        partyLevel: "9",
        monsterAC: "15",
        baseDamage: "13",
        toHitBonus: "7",
    });
});

it("preserves explicit toHitBonus when provided", () => {
    const vals = getDefaultValues("1", undefined, undefined, "42");
    expect(vals).toEqual({
        partyLevel: "1",
        monsterAC: "13",
        baseDamage: "8.5",
        toHitBonus: "42",
    });
});
});