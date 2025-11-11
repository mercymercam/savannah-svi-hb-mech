import React, { useMemo } from 'react';
import { FieldSet, FieldLegend, FieldGroup, FieldError } from '@/components/ui/field';
import { Label } from '@/components/ui/label';

// Define the type for our form state
export interface InputGroupValues {
  monsterAC: string;
  partyLevel: string;
  baseDamage: string;
}

interface InputGroupProps {
  values: InputGroupValues;
  onChange: (values: InputGroupValues) => void;
}

// Default presets as 3-tuples: [partyLevel, monsterAC, baseDamage]
const DEFAULT_PRESETS: Array<[number, number, number]> = [
  [1, 13, 8.5],
  [5, 15, 10],
  [10, 17, 12.5],
  [15, 19, 15],
  [20, 21, 20],
];

// Validators
const validators = {
  partyLevel: (value: string): { valid: boolean; error?: string } => {
    if (!value.trim()) return { valid: true }; // Empty is valid
    if (!/^\d+$/.test(value)) return { valid: false, error: 'Party Level must be a number' };
    const num = parseInt(value, 10);
    if (num < 1 || num > 20) return { valid: false, error: 'Party Level must be between 1 and 20' };
    return { valid: true };
  },
  monsterAC: (value: string): { valid: boolean; error?: string } => {
    if (!value.trim()) return { valid: true }; // Empty is valid
    if (!/^\d+$/.test(value)) return { valid: false, error: 'AC must be a number' };
    const num = parseInt(value, 10);
    if (num < 0 || num > 50) return { valid: false, error: 'AC must be between 0 and 50' };
    return { valid: true };
  },
  baseDamage: (value: string): { valid: boolean; error?: string } => {
    if (!value.trim()) return { valid: true }; // Empty is valid
    if (!/^\d+(\.\d+)?$/.test(value)) return { valid: false, error: 'Damage must be a valid number' };
    const num = parseFloat(value);
    if (num < 0) return { valid: false, error: 'Damage must be 0 or greater' };
    return { valid: true };
  },
};

// Helper to get placeholder values based on filled fields
const getPlaceholderValues = (values: InputGroupValues): InputGroupValues => {
  const filledCount = [values.partyLevel, values.monsterAC, values.baseDamage].filter(
    (v) => v.trim()
  ).length;

  if (filledCount === 0) {
    // No fields filled, use first preset
    return {
      partyLevel: '',
      monsterAC: String(DEFAULT_PRESETS[0][1]),
      baseDamage: String(DEFAULT_PRESETS[0][2]),
    };
  }

  // At least one field is filled, try to match a preset
  const partyLevelNum = values.partyLevel ? parseInt(values.partyLevel, 10) : undefined;
  const monsterACNum = values.monsterAC ? parseInt(values.monsterAC, 10) : undefined;
  const baseDamageNum = values.baseDamage ? parseFloat(values.baseDamage) : undefined;

  // Find matching preset based on filled values
  const matchingPreset = DEFAULT_PRESETS.find(([level, ac, damage]) => {
    if (partyLevelNum !== undefined && level !== partyLevelNum) return false;
    if (monsterACNum !== undefined && ac !== monsterACNum) return false;
    if (baseDamageNum !== undefined && damage !== baseDamageNum) return false;
    return true;
  });

  if (matchingPreset) {
    return {
      partyLevel: values.partyLevel || String(matchingPreset[0]),
      monsterAC: values.monsterAC || String(matchingPreset[1]),
      baseDamage: values.baseDamage || String(matchingPreset[2]),
    };
  }

  // No matching preset, use defaults based on what's filled
  return {
    partyLevel: values.partyLevel || String(DEFAULT_PRESETS[0][0]),
    monsterAC: values.monsterAC || String(DEFAULT_PRESETS[0][1]),
    baseDamage: values.baseDamage || String(DEFAULT_PRESETS[0][2]),
  };
};

export const InputGroup: React.FC<InputGroupProps> = ({ values, onChange }) => {
  const placeholders = useMemo(() => getPlaceholderValues(values), [values]);

  const handleChange = (field: keyof InputGroupValues, newValue: string) => {
    const updated = { ...values, [field]: newValue };
    onChange(updated);
  };

  const partyLevelValidation = validators.partyLevel(values.partyLevel);
  const monsterACValidation = validators.monsterAC(values.monsterAC);
  const baseDamageValidation = validators.baseDamage(values.baseDamage);

  return (
    <FieldSet>
      <FieldLegend>Attack Parameters</FieldLegend>
      <FieldGroup>
        {/* Party Level */}
        <div className="space-y-2">
          <Label htmlFor="party-level">Party Level</Label>
          <input
            id="party-level"
            type="text"
            inputMode="numeric"
            placeholder={`Default: ${placeholders.partyLevel}`}
            value={values.partyLevel}
            onChange={(e) => handleChange('partyLevel', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              partyLevelValidation.valid
                ? 'border-gray-300 focus:ring-blue-500'
                : 'border-red-500 focus:ring-red-500'
            }`}
          />
          {!partyLevelValidation.valid && partyLevelValidation.error && (
            <FieldError>{partyLevelValidation.error}</FieldError>
          )}
        </div>

        {/* Monster AC */}
        <div className="space-y-2">
          <Label htmlFor="monster-ac">Monster AC</Label>
          <input
            id="monster-ac"
            type="text"
            inputMode="numeric"
            placeholder={`Default: ${placeholders.monsterAC}`}
            value={values.monsterAC}
            onChange={(e) => handleChange('monsterAC', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              monsterACValidation.valid
                ? 'border-gray-300 focus:ring-blue-500'
                : 'border-red-500 focus:ring-red-500'
            }`}
          />
          {!monsterACValidation.valid && monsterACValidation.error && (
            <FieldError>{monsterACValidation.error}</FieldError>
          )}
        </div>

        {/* Base Damage */}
        <div className="space-y-2">
          <Label htmlFor="base-damage">Base Damage on Hit</Label>
          <input
            id="base-damage"
            type="text"
            inputMode="decimal"
            placeholder={`Default: ${placeholders.baseDamage}`}
            value={values.baseDamage}
            onChange={(e) => handleChange('baseDamage', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              baseDamageValidation.valid
                ? 'border-gray-300 focus:ring-blue-500'
                : 'border-red-500 focus:ring-red-500'
            }`}
          />
          {!baseDamageValidation.valid && baseDamageValidation.error && (
            <FieldError>{baseDamageValidation.error}</FieldError>
          )}
        </div>
      </FieldGroup>
    </FieldSet>
  );
};
