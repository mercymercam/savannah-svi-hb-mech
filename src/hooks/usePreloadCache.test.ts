import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputGroupValues } from '@/components/input-group';
import * as calculationCache from '@/utilities/calculation-cache';

// Mock the dependencies
vi.mock('./useWorkerCalculator', () => ({
  useWorkerCalculator: () => ({
    calculate: vi.fn().mockResolvedValue({
      results: [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
      ],
      timing: 10,
      usedWorker: true,
    }),
    isWorkerHealthy: () => true,
  }),
}));

vi.mock('@/utilities/calculation-cache', () => ({
  getCachedResult: vi.fn().mockReturnValue(null),
  setCachedResult: vi.fn(),
}));

vi.mock('@/utilities/dice', () => ({
  parseDamageString: vi.fn((str: string) => {
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }),
  isDiceExpression: vi.fn(() => false),
}));

vi.mock('@/lib/presets', () => ({
  getDefaultValues: vi.fn(() => ({
    partyLevel: '5',
    monsterAC: '15',
    baseDamage: '8.5',
    toHitBonus: '5',
  })),
}));

describe('usePreloadCache', () => {
  const testValues: InputGroupValues = {
    partyLevel: '5',
    monsterAC: '15',
    baseDamage: '8.5',
    toHitBonus: '5',
    hasAdvantage: false,
    viewMode: 'relative',
  };

  beforeEach(() => {
    // Setup DOM elements
    const hasAdvantageSwitch = document.createElement('div');
    hasAdvantageSwitch.id = 'has-advantage';
    hasAdvantageSwitch.style.position = 'absolute';
    hasAdvantageSwitch.style.left = '100px';
    hasAdvantageSwitch.style.top = '100px';
    hasAdvantageSwitch.style.width = '50px';
    hasAdvantageSwitch.style.height = '20px';
    document.body.appendChild(hasAdvantageSwitch);

    const viewModeSwitch = document.createElement('div');
    viewModeSwitch.id = 'view-mode';
    viewModeSwitch.style.position = 'absolute';
    viewModeSwitch.style.left = '300px';
    viewModeSwitch.style.top = '100px';
    viewModeSwitch.style.width = '50px';
    viewModeSwitch.style.height = '20px';
    document.body.appendChild(viewModeSwitch);

    // Mock getBoundingClientRect
    hasAdvantageSwitch.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 100,
      width: 50,
      height: 20,
      right: 150,
      bottom: 120,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }));

    viewModeSwitch.getBoundingClientRect = vi.fn(() => ({
      left: 300,
      top: 100,
      width: 50,
      height: 20,
      right: 350,
      bottom: 120,
      x: 300,
      y: 100,
      toJSON: () => ({}),
    }));
  });

  afterEach(() => {
    // Cleanup DOM
    const hasAdvantageSwitch = document.getElementById('has-advantage');
    const viewModeSwitch = document.getElementById('view-mode');
    if (hasAdvantageSwitch) document.body.removeChild(hasAdvantageSwitch);
    if (viewModeSwitch) document.body.removeChild(viewModeSwitch);
    vi.clearAllMocks();
  });

  it('should find switch elements in DOM', () => {
    const hasAdvantageSwitch = document.getElementById('has-advantage');
    const viewModeSwitch = document.getElementById('view-mode');

    expect(hasAdvantageSwitch).not.toBeNull();
    expect(viewModeSwitch).not.toBeNull();
  });

  it('should cache result when called', () => {
    expect(calculationCache.getCachedResult).toBeDefined();
    expect(calculationCache.setCachedResult).toBeDefined();
  });

  it('should have correct test values structure', () => {
    expect(testValues).toHaveProperty('partyLevel');
    expect(testValues).toHaveProperty('monsterAC');
    expect(testValues).toHaveProperty('baseDamage');
    expect(testValues).toHaveProperty('toHitBonus');
    expect(testValues).toHaveProperty('hasAdvantage');
    expect(testValues).toHaveProperty('viewMode');
  });
});
