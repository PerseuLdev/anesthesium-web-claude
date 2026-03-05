import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Avaliacao {
  id: string;
  data: string;
  pacienteId: string; // código/leito
  tipo: 'Gasometria' | 'Drogas' | 'Escores' | 'Calculadoras' | 'Hemodinamica';
  dados: any;
  resultado: any;
  aiSuggestion?: string | null;
}

interface HistoryState {
  avaliacoes: Avaliacao[];
  addAvaliacao: (avaliacao: Omit<Avaliacao, 'id' | 'data'>) => string;
  updateAvaliacao: (id: string, updates: Partial<Avaliacao>) => void;
  removeAvaliacao: (id: string) => void;
  clearHistory: () => void;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      avaliacoes: [],
      addAvaliacao: (avaliacao) => {
        const id = generateId();
        set((state) => ({
          avaliacoes: [
            {
              ...avaliacao,
              id,
              data: new Date().toISOString(),
            },
            ...state.avaliacoes,
          ],
        }));
        return id;
      },
      updateAvaliacao: (id, updates) => set((state) => ({
        avaliacoes: state.avaliacoes.map((a) => a.id === id ? { ...a, ...updates } : a),
      })),
      removeAvaliacao: (id) => set((state) => ({
        avaliacoes: state.avaliacoes.filter((a) => a.id !== id),
      })),
      clearHistory: () => set({ avaliacoes: [] }),
    }),
    {
      name: 'anesthesium-history',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
