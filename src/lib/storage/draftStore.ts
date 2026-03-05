import { create } from 'zustand';
import { GasometriaInput, GasometriaOutput } from '../clinical/gasometria';

interface DraftState {
  gasometriaInput: Partial<GasometriaInput>;
  gasometriaResultado: GasometriaOutput | null;
  aiSuggestion: string | null;
  setGasometriaDraft: (input: Partial<GasometriaInput>, resultado: GasometriaOutput | null, aiSuggestion?: string | null) => void;
}

export const useDraftStore = create<DraftState>((set) => ({
  gasometriaInput: { Albumina: 4.0, FiO2: 21 },
  gasometriaResultado: null,
  aiSuggestion: null,
  setGasometriaDraft: (input, resultado, aiSuggestion = null) => set({ gasometriaInput: input, gasometriaResultado: resultado, aiSuggestion }),
}));
