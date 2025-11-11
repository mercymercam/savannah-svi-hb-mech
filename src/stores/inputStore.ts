import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { cookieStorage } from 'zustand-cookie-storage';
import { InputGroupValues } from '@/components/input-group';

interface InputStore extends InputGroupValues {
  setMonsterAC: (value: string) => void;
  setPartyLevel: (value: string) => void;
  setBaseDamage: (value: string) => void;
  setValues: (values: InputGroupValues) => void;
  reset: () => void;
}

const defaultValues: InputGroupValues = {
  monsterAC: '',
  partyLevel: '',
  baseDamage: '',
};

export const useInputStore = create<InputStore>()(
  persist(
    (set) => ({
      ...defaultValues,
      setMonsterAC: (value: string) => set({ monsterAC: value }),
      setPartyLevel: (value: string) => set({ partyLevel: value }),
      setBaseDamage: (value: string) => set({ baseDamage: value }),
      setValues: (values: InputGroupValues) => set(values),
      reset: () => set(defaultValues),
    }),
    {
      name: 'input-store',
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({
        monsterAC: state.monsterAC,
        partyLevel: state.partyLevel,
        baseDamage: state.baseDamage,
      }),
    }
  )
);
