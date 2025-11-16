/**
 * Global type declarations for performance debugging tools
 */

declare global {
  interface Window {
    perfDebug: {
      /** Print all performance measurements to console in formatted tables */
      print: () => void;
      /** Print a summary of the latest calculation cycle */
      summary: () => void;
      /** Clear all performance marks and measurements */
      clear: () => void;
      /** Get raw performance measurements grouped by category */
      get: () => {
        worker: Array<{ name: string; duration: number; startTime: number }>;
        main: Array<{ name: string; duration: number; startTime: number }>;
        react: Array<{ name: string; duration: number; startTime: number }>;
      };
    };
    
    calcProfile: {
      /** Profile a single calculation with detailed timing breakdown */
      profile: (
        partyLevel: number,
        monsterAC: number,
        toHitBonus: number,
        baseDamage: string,
        hasAdvantage?: boolean,
        considerCrits?: boolean,
        viewMode?: 'relative' | 'absolute',
      ) => void;
      
      /** Run multiple calculations and report statistics */
      benchmark: (
        partyLevel: number,
        monsterAC: number,
        toHitBonus: number,
        baseDamage: string,
        iterations?: number,
        hasAdvantage?: boolean,
        considerCrits?: boolean,
        viewMode?: 'relative' | 'absolute',
      ) => void;
      
      /** Compare different base damage strings */
      compare: (
        damageStrings: string[],
        partyLevel?: number,
        monsterAC?: number,
        toHitBonus?: number,
      ) => void;
    };
  }
}

export {};
