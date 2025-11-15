import React, { useMemo } from 'react';
import { FieldSet } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getDefaultValues } from '@/lib/presets';

// Define the type for our form state
export interface InputGroupValues {
  monsterAC: string;
  partyLevel: string;
  baseDamage: string;
  toHitBonus: string;
  hasAdvantage: boolean;
  viewMode: 'relative' | 'absolute';
}

interface InputGroupProps {
  values: InputGroupValues;
  onChange: (values: InputGroupValues) => void;
}

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
    
    // Check if it's a simple number (with optional sign: +3.5, -3.5, .5, +.5, etc.)
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(value)) {
      const num = parseFloat(value);
      if (num < 0) return { valid: false, error: 'Damage must be 0 or greater' };
      return { valid: true };
    }
    
    // Check if it's dice notation with arbitrary sequences (e.g., "3d6+5" or "1d10+3d8-5")
    if (/^([+-])?(?:\d+d\d+|[\d.]+)(?:[+-](?:\d+d\d+|[\d.]+))*$/i.test(value)) {
      // Extract all dice expressions and validate die size is <= 20
      const diceMatches = value.match(/\d*d(\d+)/gi);
      if (diceMatches) {
        for (const diceExpr of diceMatches) {
          const dieSizeMatch = diceExpr.match(/d(\d+)/i);
          if (dieSizeMatch) {
            const dieSize = parseInt(dieSizeMatch[1], 10);
            if (dieSize > 20) {
              return { valid: false, error: 'Dice size must be d20 or smaller' };
            }
          }
        }
      }
      return { valid: true };
    }
    
    return { valid: false, error: 'Damage must be a number or dice notation (e.g., "3d6+5" or "1d10+3d8-5")' };
  },
  toHitBonus: (value: string): { valid: boolean; error?: string } => {
    if (!value.trim()) return { valid: true }; // Empty is valid
    if (!/^-?\d+$/.test(value)) return { valid: false, error: 'To-Hit Bonus must be a number' };
    const num = parseInt(value, 10);
    if (num < -2 || num > 50) return { valid: false, error: 'To-Hit Bonus must be between -2 and 50' };
    return { valid: true };
  },
};

// Helper to get placeholder values based on filled fields
const getPlaceholderValues = (values: InputGroupValues): Omit<InputGroupValues, 'hasAdvantage' | 'viewMode'> => {
  const defaults = getDefaultValues(values.partyLevel, values.monsterAC, values.baseDamage, values.toHitBonus);
  return { partyLevel: defaults.partyLevel, monsterAC: defaults.monsterAC, baseDamage: defaults.baseDamage, toHitBonus: defaults.toHitBonus };
};

export const InputGroup: React.FC<InputGroupProps> = ({ values, onChange }) => {
  const placeholders = useMemo(() => getPlaceholderValues(values), [values]);

  const handleChange = (field: keyof InputGroupValues, newValue: string | boolean) => {
    const updated = { ...values, [field]: newValue };
    onChange(updated);
  };

  const partyLevelValidation = validators.partyLevel(values.partyLevel);
  const monsterACValidation = validators.monsterAC(values.monsterAC);
  const baseDamageValidation = validators.baseDamage(values.baseDamage);
  const toHitBonusValidation = validators.toHitBonus(values.toHitBonus);

  return (
    <FieldSet className="border-0 gap-0 p-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Party Level */}
        <div className="space-y-2">
          <Label htmlFor="party-level" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Party Level
          </Label>
          <input
            id="party-level"
            type="text"
            inputMode="numeric"
            placeholder={`Default: ${placeholders.partyLevel}`}
            value={values.partyLevel}
            onChange={(e) => handleChange('partyLevel', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
              partyLevelValidation.valid
                ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                : 'border-red-500 dark:border-red-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/20'
            }`}
          />
          {!partyLevelValidation.valid && partyLevelValidation.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{partyLevelValidation.error}</p>
          )}
        </div>

        {/* Monster AC */}
        <div className="space-y-2">
          <Label htmlFor="monster-ac" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Monster AC
          </Label>
          <input
            id="monster-ac"
            type="text"
            inputMode="numeric"
            placeholder={`Default: ${placeholders.monsterAC}`}
            value={values.monsterAC}
            onChange={(e) => handleChange('monsterAC', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
              monsterACValidation.valid
                ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                : 'border-red-500 dark:border-red-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/20'
            }`}
          />
          {!monsterACValidation.valid && monsterACValidation.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{monsterACValidation.error}</p>
          )}
        </div>

        {/* Base Damage */}
        <div className="space-y-2">
          <Label htmlFor="base-damage" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Base Damage on Hit
          </Label>
          <input
            id="base-damage"
            type="text"
            inputMode="decimal"
            placeholder={`Default: ${placeholders.baseDamage}`}
            value={values.baseDamage}
            onChange={(e) => handleChange('baseDamage', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
              baseDamageValidation.valid
                ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                : 'border-red-500 dark:border-red-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/20'
            }`}
          />
          {!baseDamageValidation.valid && baseDamageValidation.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{baseDamageValidation.error}</p>
          )}
        </div>

        {/* To-Hit Bonus */}
        <div className="space-y-2">
          <Label htmlFor="to-hit-bonus" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            To-Hit Bonus
          </Label>
          <input
            id="to-hit-bonus"
            type="text"
            inputMode="numeric"
            placeholder={`Default: ${placeholders.toHitBonus}`}
            value={values.toHitBonus}
            onChange={(e) => handleChange('toHitBonus', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
              toHitBonusValidation.valid
                ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                : 'border-red-500 dark:border-red-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/20'
            }`}
          />
          {!toHitBonusValidation.valid && toHitBonusValidation.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{toHitBonusValidation.error}</p>
          )}
        </div>

        {/* Has Advantage Switch */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex items-end">
          <div className="flex items-center space-x-2">
            <Switch
              id="has-advantage"
              checked={values.hasAdvantage}
              onCheckedChange={(checked) => handleChange('hasAdvantage', checked)}
            />
            <Label htmlFor="has-advantage" className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer mb-0">
              Has Advantage
            </Label>
          </div>
        </div>

        {/* View Mode Switch */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex items-end">
          <div className="flex items-center space-x-2">
            <Switch
              id="view-mode"
              checked={values.viewMode === 'absolute'}
              onCheckedChange={(checked) => handleChange('viewMode', checked ? 'absolute' : 'relative')}
            />
            <Label htmlFor="view-mode" className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer mb-0">
              Absolute Damage View
            </Label>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              ({values.viewMode === 'absolute' ? 'showing total damage' : 'showing damage gain vs no d4s'})
            </span>
          </div>
        </div>
      </div>
    </FieldSet>
  );
};
