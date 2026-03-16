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

export interface PacienteContext {
  peso?: number;
  altura?: number;
  idade?: number;
  sexo?: 'M' | 'F';
  alergias?: string[];
  capturedAt: string; // ISO 8601
}

interface SessionState {
  // Gasometria → Hemodinâmica
  gasometriaSnapshot: GasometriaSnapshot | null;
  bannerDismissed: boolean;
  setGasometriaSnapshot: (snapshot: GasometriaSnapshot) => void;
  dismissBanner: () => void;
  clearSnapshot: () => void;

  // Hemodinâmica → Drogas / Cirurgias AI
  pacienteContext: PacienteContext | null;
  pacienteBannerDismissed: boolean;
  setPacienteContext: (ctx: PacienteContext) => void;
  dismissPacienteBanner: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  gasometriaSnapshot: null,
  bannerDismissed: false,
  setGasometriaSnapshot: (snapshot) =>
    set({ gasometriaSnapshot: snapshot, bannerDismissed: false }),
  dismissBanner: () => set({ bannerDismissed: true }),
  clearSnapshot: () => set({ gasometriaSnapshot: null, bannerDismissed: false }),

  pacienteContext: null,
  pacienteBannerDismissed: false,
  setPacienteContext: (ctx) =>
    set({ pacienteContext: ctx, pacienteBannerDismissed: false }),
  dismissPacienteBanner: () => set({ pacienteBannerDismissed: true }),
}));
