import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { cookieStorage } from 'zustand-cookie-storage';
import { InputGroupValues } from '@/components/input-group';

interface InputStore extends InputGroupValues {
  setMonsterAC: (value: string) => void;
  setPartyLevel: (value: string) => void;
  setBaseDamage: (value: string) => void;
  setToHitBonus: (value: string) => void;
  setHasAdvantage: (value: boolean) => void;
  setValues: (values: InputGroupValues) => void;
  reset: () => void;
}

const defaultValues: InputGroupValues = {
  monsterAC: '',
  partyLevel: '',
  baseDamage: '',
  toHitBonus: '',
  hasAdvantage: false,
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
      setValues: (values: InputGroupValues) => {
        // Just set the values as-is, don't apply preset logic here
        // The preset logic should only affect placeholders, not stored values
        set(values);
      },
      reset: () => set(defaultValues),
    }),
    {
      name: 'input-store',
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({
        monsterAC: state.monsterAC,
        partyLevel: state.partyLevel,
        baseDamage: state.baseDamage,
        toHitBonus: state.toHitBonus,
        hasAdvantage: state.hasAdvantage,
      }),
    }
  )
);
