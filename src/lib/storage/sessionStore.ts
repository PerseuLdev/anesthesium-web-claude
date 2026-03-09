import { create } from 'zustand';

export interface GasometriaSnapshot {
  pH: number;
  PaCO2: number;   // sempre em mmHg (conversão feita antes de salvar)
  HCO3: number;
  PaO2?: number;   // undefined se gasometria venosa
  Lactato: number;
  Na: number;
  Cl: number;
  Albumina: number;
  capturedAt: string; // ISO 8601
}

interface SessionState {
  gasometriaSnapshot: GasometriaSnapshot | null;
  bannerDismissed: boolean;
  setGasometriaSnapshot: (snapshot: GasometriaSnapshot) => void;
  dismissBanner: () => void;
  clearSnapshot: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  gasometriaSnapshot: null,
  bannerDismissed: false,
  setGasometriaSnapshot: (snapshot) =>
    set({ gasometriaSnapshot: snapshot, bannerDismissed: false }),
  dismissBanner: () => set({ bannerDismissed: true }),
  clearSnapshot: () => set({ gasometriaSnapshot: null, bannerDismissed: false }),
}));
