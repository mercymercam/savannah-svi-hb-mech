// Presets as 4-tuples: [partyLevel, monsterAC, baseDamage, toHitBonus]
export const DEFAULT_PRESETS: Array<[number, number, number, number]> = [
  [1, 13, 5.5+3, 5],
  [2, 13, 5.5+3, 5],
  [3, 13, 5.5+3, 5],
  [4, 14, 5.5+3, 5],
  [5, 14, 5.5+3, 6],
  [6, 14, 5.5+3, 6],
  [7, 15, 5.5+3, 6],
  [8, 15, 5.5+3+3, 6],
  [9, 15, 5.5+3+4, 7],
  [10, 16, 5.5+3+4, 7],
  [11, 16, 5.5+3+4, 7],
  [12, 16, 5.5+3+4, 7],
  [13, 16, 5.5+3+5, 8],
  [14, 17, 5.5+3+5, 8],
  [15, 17, 5.5+3+5, 8],
  [16, 17, 5.5+3+5, 8],
  [17, 18, 5.5+3+6, 9],
  [18, 18, 5.5+3+6, 9],
  [19, 18, 5.5+3+6, 9],
  [20, 19, 5.5+3+6, 9],
];

/**
 * Finds the best matching preset based on filled values.
 * Priority: Party Level > AC > Base Damage
 * For baseDamage, finds the closest match if exact match doesn't exist.
 */
export const findMatchingPreset = (
  partyLevel?: number,
  monsterAC?: number,
  baseDamage?: number,
  toHitBonus?: number
): [number, number, number, number] | undefined => {
  // If Party Level is set, find preset matching Party Level
  if (partyLevel !== undefined) {
    return DEFAULT_PRESETS.find(([level]) => level === partyLevel);
  }

  if (toHitBonus !== undefined) {
    return DEFAULT_PRESETS.find(([, , , toHit]) => toHit === toHitBonus);
  }

  // If AC is set, find preset matching AC
  if (monsterAC !== undefined) {
    return DEFAULT_PRESETS.find(([, ac]) => ac === monsterAC);
  }

  // If Base Damage is set, find exact match or closest match
  if (baseDamage !== undefined) {
    const exactMatch = DEFAULT_PRESETS.find(([, , damage]) => damage === baseDamage);
    if (exactMatch) {
      return exactMatch;
    }

    // Find closest match by minimum absolute difference
    return DEFAULT_PRESETS.reduce((closest, current) => {
      const currentDiff = Math.abs(current[2] - baseDamage);
      const closestDiff = Math.abs(closest[2] - baseDamage);
      return currentDiff < closestDiff ? current : closest;
    });
  }

  return undefined;
};

/**
 * Gets the appropriate default values based on which fields are set.
 * Uses preset matching with priority: Party Level > AC > Base Damage
 */
export const getDefaultValues = (
  partyLevel?: string,
  monsterAC?: string,
  baseDamage?: string,
  toHitBonus?: string
): { partyLevel: string; monsterAC: string; baseDamage: string; toHitBonus: string } => {
  const partyLevelNum = partyLevel ? parseInt(partyLevel, 10) : undefined;
  const monsterACNum = monsterAC ? parseInt(monsterAC, 10) : undefined;
  const baseDamageNum = baseDamage ? parseFloat(baseDamage) : undefined;
  const toHitBonusNum = toHitBonus ? parseInt(toHitBonus, 10) : undefined;

  // Count how many are set
  const setCount = [partyLevelNum, monsterACNum, baseDamageNum, toHitBonusNum].filter(
    (v) => v !== undefined
  ).length;

  if (setCount === 0) {
    // No values set, use first preset
    return {
      partyLevel: String(DEFAULT_PRESETS[0][0]),
      monsterAC: String(DEFAULT_PRESETS[0][1]),
      baseDamage: String(DEFAULT_PRESETS[0][2]),
      toHitBonus: String(DEFAULT_PRESETS[0][3]),
    };
  }

  // At least one value is set, find matching preset
  const matchingPreset = findMatchingPreset(partyLevelNum, monsterACNum, baseDamageNum);

  if (matchingPreset) {
    return {
      partyLevel: partyLevelNum !== undefined ? String(partyLevelNum) : String(matchingPreset[0]),
      monsterAC: monsterACNum !== undefined ? String(monsterACNum) : String(matchingPreset[1]),
      baseDamage: baseDamageNum !== undefined ? String(baseDamageNum) : String(matchingPreset[2]),
      toHitBonus: toHitBonusNum !== undefined ? String(toHitBonusNum) : String(matchingPreset[3]),
    };
  }

  // No matching preset found, return the values as-is or with first preset as fallback
  return {
    partyLevel: partyLevelNum !== undefined ? String(partyLevelNum) : String(DEFAULT_PRESETS[0][0]),
    monsterAC: monsterACNum !== undefined ? String(monsterACNum) : String(DEFAULT_PRESETS[0][1]),
    baseDamage: baseDamageNum !== undefined ? String(baseDamageNum) : String(DEFAULT_PRESETS[0][2]),
    toHitBonus: toHitBonusNum !== undefined ? String(toHitBonusNum) : String(DEFAULT_PRESETS[0][3]),
  };
};
