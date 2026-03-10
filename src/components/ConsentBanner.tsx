import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X } from 'lucide-react';

const CONSENT_KEY = 'anesthesium_ai_consent_v1';

/**
 * Banner de consentimento exibido uma vez por dispositivo.
 * Informa o usuário sobre o envio de dados clínicos a APIs externas de IA.
 * Requisito: LGPD (Lei 13.709/2018) — dados sensíveis de saúde.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed bottom-24 left-4 right-4 z-[60] max-w-lg mx-auto"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white mb-1">Privacidade e Recursos de IA</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Os recursos de IA enviam parâmetros clínicos anonimizados — sem nome, CPF ou
                  identificação do paciente — para servidores externos (
                  <span className="text-zinc-300 font-medium">Google Gemini / OpenRouter</span>).
                  Os dados podem incluir: pH, pressões, pesos, faixas etárias e valores laboratoriais.
                </p>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Em conformidade com a LGPD (Lei 13.709/2018) e as diretrizes CFM nº 2.299/2021.
                  A responsabilidade pela decisão clínica final é sempre do médico.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={accept}
                    className="flex-1 py-2 bg-white text-black text-xs font-semibold rounded-xl hover:bg-zinc-100 transition-colors active:scale-95"
                  >
                    Aceitar e continuar
                  </button>
                  <button
                    onClick={decline}
                    className="px-4 py-2 text-zinc-400 text-xs hover:text-white transition-colors border border-zinc-700 rounded-xl"
                  >
                    Recusar IA
                  </button>
                </div>
              </div>
              <button
                onClick={decline}
                className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
