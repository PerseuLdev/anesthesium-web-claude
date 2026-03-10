import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Aviso legal exibido abaixo de todo conteúdo gerado por IA.
 * Obrigatório para conformidade com CFM nº 2.299/2021 e LGPD.
 */
export function AiDisclaimer() {
  return (
    <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2">
      <AlertTriangle className="w-3 h-3 text-amber-500/70 shrink-0 mt-0.5" />
      <p className="text-[10px] text-zinc-600 leading-relaxed">
        <span className="font-semibold text-zinc-500">Aviso Legal (CFM nº 2.299/2021):</span>{' '}
        Esta sugestão é gerada por IA (Google Gemini / OpenRouter) e{' '}
        <span className="text-zinc-500">não substitui o julgamento clínico do médico</span>.
        Parâmetros clínicos são enviados a servidores externos para processamento.
        O Anesthesium não se responsabiliza por condutas tomadas com base nesta análise.
        Valide todas as informações antes de aplicar.
      </p>
    </div>
  );
}
