import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Patient {
  id: string;
  nome: string;
  idade?: number;
  peso?: number;
  altura?: number;
  sexo?: 'M' | 'F';
  alergias?: string[];
  fichaPreAnestesica?: string;
  cirurgiaPlaneada?: string;
  createdAt: string;
  archivedAt?: string;
  aiSummary?: string;
  avaliacaoIds: string[];
}

interface PatientState {
  currentPatient: Patient | null;
  patients: Patient[]; // archived
  setCurrentPatient: (p: Patient) => void;
  clearCurrentPatient: () => void;
  updateCurrentPatient: (updates: Partial<Patient>) => void;
  addEvaluationToPatient: (avaliacaoId: string) => void;
  archiveCurrentPatient: () => Patient | null;
  updateArchivedPatient: (id: string, updates: Partial<Patient>) => void;
  selectPatient: (id: string) => Patient | null;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const usePatientStore = create<PatientState>()(
  persist(
    (set, get) => ({
      currentPatient: null,
      patients: [],

      setCurrentPatient: (p) => set({ currentPatient: p }),

      clearCurrentPatient: () => set({ currentPatient: null }),

      updateCurrentPatient: (updates) =>
        set((state) =>
          state.currentPatient
            ? { currentPatient: { ...state.currentPatient, ...updates } }
            : {}
        ),

      addEvaluationToPatient: (avaliacaoId) =>
        set((state) =>
          state.currentPatient
            ? {
                currentPatient: {
                  ...state.currentPatient,
                  avaliacaoIds: [
                    ...state.currentPatient.avaliacaoIds,
                    avaliacaoId,
                  ],
                },
              }
            : {}
        ),

      archiveCurrentPatient: () => {
        const { currentPatient } = get();
        if (!currentPatient) return null;
        const archived: Patient = {
          ...currentPatient,
          archivedAt: new Date().toISOString(),
        };
        set((state) => ({
          patients: [archived, ...state.patients],
          currentPatient: null,
        }));
        return archived;
      },

      updateArchivedPatient: (id, updates) =>
        set((state) => ({
          patients: state.patients.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      selectPatient: (id) => {
        const { patients, currentPatient } = get();
        const patient = patients.find((p) => p.id === id);
        if (!patient) return null;
        const restored: Patient = { ...patient, archivedAt: undefined };
        const archivedCurrent: Patient | null = currentPatient
          ? { ...currentPatient, archivedAt: new Date().toISOString() }
          : null;
        set((state) => ({
          currentPatient: restored,
          patients: [
            ...(archivedCurrent ? [archivedCurrent] : []),
            ...state.patients.filter((p) => p.id !== id),
          ],
        }));
        return restored;
      },
    }),
    {
      name: 'anesthesium-patients',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function createNewPatient(
  data: Omit<Patient, 'id' | 'createdAt' | 'avaliacaoIds'>
): Patient {
  return {
    ...data,
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).substring(2),
    createdAt: new Date().toISOString(),
    avaliacaoIds: [],
  };
}
