import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { InputGroupValues } from '@/components/input-group';

interface InputStore extends InputGroupValues {
  setMonsterAC: (value: string) => void;
  setPartyLevel: (value: string) => void;
  setBaseDamage: (value: string) => void;
  setToHitBonus: (value: string) => void;
  setHasAdvantage: (value: boolean) => void;
  setViewMode: (value: 'relative' | 'absolute') => void;
  setValues: (values: InputGroupValues) => void;
  reset: () => void;
}

const defaultValues: InputGroupValues = {
  monsterAC: '',
  partyLevel: '',
  baseDamage: '',
  toHitBonus: '',
  hasAdvantage: false,
  viewMode: 'relative',
};

export const useInputStore = create<InputStore>()(
  persist(
    (set) => ({
      ...defaultValues,
      setMonsterAC: (value: string) => set({ monsterAC: value }),
      setPartyLevel: (value: string) => set({ partyLevel: value }),
      setBaseDamage: (value: string) => set({ baseDamage: value }),
      setToHitBonus: (value: string) => set({ toHitBonus: value }),
      setHasAdvantage: (value: boolean) => set({ hasAdvantage: value }),
      setViewMode: (value: 'relative' | 'absolute') => set({ viewMode: value }),
      setValues: (values: InputGroupValues) => {
        // Just set the values as-is, don't apply preset logic here
        // The preset logic should only affect placeholders, not stored values
        set(values);
      },
      reset: () => set(defaultValues),
    }),
    {
      name: 'dnd-hb-mech-input-store',
      // Use localStorage for client-side persistence (Vite/React app)
      // No need to specify storage - localStorage is the default
      partialize: (state) => ({
        monsterAC: state.monsterAC,
        partyLevel: state.partyLevel,
        baseDamage: state.baseDamage,
        toHitBonus: state.toHitBonus,
        hasAdvantage: state.hasAdvantage,
        viewMode: state.viewMode,
      }),
    }
  )
);
