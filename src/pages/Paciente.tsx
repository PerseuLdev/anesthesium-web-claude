import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserRound,
  UserPlus,
  UserMinus,
  Activity,
  Pill,
  ClipboardCheck,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { usePatientStore } from '../lib/storage/patientStore';
import { useHistoryStore } from '../lib/storage/historyStore';
import { useSessionStore } from '../lib/storage/sessionStore';

const TIPO_COLORS: Record<string, string> = {
  Gasometria: 'bg-emerald-500/20 text-emerald-400',
  Drogas: 'bg-cyan-500/20 text-cyan-400',
  Escores: 'bg-blue-500/20 text-blue-400',
  Calculadoras: 'bg-purple-500/20 text-purple-400',
  Hemodinamica: 'bg-amber-500/20 text-amber-400',
};

function avaliacaoSummary(a: any): string {
  if (a.tipo === 'Gasometria' && a.resultado?.disturbioPrimario) {
    return `${a.resultado.disturbioPrimario}`;
  }
  if (a.tipo === 'Drogas' && a.resultado?.prescricao?.length) {
    return `${a.resultado.prescricao.length} med.`;
  }
  if (a.tipo === 'Escores' && a.dados?.asa) {
    return `ASA ${a.dados.asa}`;
  }
  if (a.tipo === 'Hemodinamica' && a.resultado?.hemo?.choque) {
    return `Choque ${a.resultado.hemo.choque}`;
  }
  return '';
}

export function Paciente() {
  const navigate = useNavigate();
  const { currentPatient, clearCurrentPatient } = usePatientStore();
  const avaliacoes = useHistoryStore((s) => s.avaliacoes);
  const gasometriaSnapshot = useSessionStore((s) => s.gasometriaSnapshot);

  const [fichaExpanded, setFichaExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const linkedAvaliacoes = currentPatient
    ? avaliacoes.filter((a) => currentPatient.avaliacaoIds.includes(a.id))
    : [];

  const isAbnormal = (val: number, min: number, max: number) =>
    val < min || val > max;

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-500/20 rounded-xl">
            <UserRound className="w-4 h-4 text-violet-400" />
          </div>
          <span className="text-sm font-semibold text-white">Paciente Atual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/paciente/novo')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium transition-colors active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Novo
          </button>
          {currentPatient && (
            <button
              onClick={() => clearCurrentPatient()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-300 text-xs font-medium transition-colors active:scale-95"
            >
              <UserMinus className="w-3.5 h-3.5" />
              Avulso
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-4 pb-8">
        {!currentPatient ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">Modo avulso ativo</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Nenhum paciente vinculado. Todas as funcionalidades estão disponíveis, mas as avaliações não serão agrupadas por paciente no histórico.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/paciente/novo')}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400 text-sm font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar novo paciente
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Patient info card */}
            <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 space-y-4">
              {/* Nome + meta chips */}
              <div>
                <p className="text-xl font-bold text-white tracking-tight">{currentPatient.nome}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Cadastrado em {format(new Date(currentPatient.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentPatient.idade != null && (
                  <span className="px-2 py-1 rounded-md text-xs bg-white/5 border border-white/10 text-zinc-300">
                    {currentPatient.idade} anos
                  </span>
                )}
                {currentPatient.sexo && (
                  <span className="px-2 py-1 rounded-md text-xs bg-white/5 border border-white/10 text-zinc-300">
                    {currentPatient.sexo === 'M' ? 'Masculino' : 'Feminino'}
                  </span>
                )}
                {currentPatient.peso != null && (
                  <span className="px-2 py-1 rounded-md text-xs bg-white/5 border border-white/10 text-zinc-300">
                    {currentPatient.peso} kg
                  </span>
                )}
                {currentPatient.altura != null && (
                  <span className="px-2 py-1 rounded-md text-xs bg-white/5 border border-white/10 text-zinc-300">
                    {currentPatient.altura} cm
                  </span>
                )}
              </div>

              {/* Alergias */}
              {currentPatient.alergias && currentPatient.alergias.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Alergias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentPatient.alergias.map((a) => (
                      <span key={a} className="px-2 py-0.5 rounded-md text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cirurgia planejada */}
              {currentPatient.cirurgiaPlaneada && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Procedimento</p>
                  <p className="text-sm text-zinc-200">{currentPatient.cirurgiaPlaneada}</p>
                </div>
              )}

              {/* Ficha pré-anestésica collapsible */}
              {currentPatient.fichaPreAnestesica && (
                <div>
                  <button
                    onClick={() => setFichaExpanded((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Ficha pré-anestésica
                    {fichaExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                  <AnimatePresence>
                    {fichaExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-2 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-black/30 rounded-xl p-3 border border-white/5">
                          {currentPatient.fichaPreAnestesica}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Gasometria snapshot */}
            {gasometriaSnapshot && (
              <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-[10px] text-emerald-400 uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />
                  Gasometria Recente
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'pH', val: gasometriaSnapshot.pH, min: 7.35, max: 7.45 },
                    { label: 'pCO₂', val: gasometriaSnapshot.PaCO2, min: 35, max: 45 },
                    { label: 'HCO₃', val: gasometriaSnapshot.HCO3, min: 22, max: 26 },
                  ].map(({ label, val, min, max }) => (
                    <span
                      key={label}
                      className={`px-2 py-1 rounded-md text-xs font-mono border ${
                        isAbnormal(val, min, max)
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-white/5 border-white/10 text-zinc-300'
                      }`}
                    >
                      {label}: {val}
                    </span>
                  ))}
                  {gasometriaSnapshot.Lactato != null && (
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-mono border ${
                        gasometriaSnapshot.Lactato > 2
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-white/5 border-white/10 text-zinc-300'
                      }`}
                    >
                      Lac: {gasometriaSnapshot.Lactato}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {format(new Date(gasometriaSnapshot.capturedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}

            {/* Linked evaluations */}
            {linkedAvaliacoes.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-black/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <Pill className="w-3.5 h-3.5 text-zinc-500" />
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                    Avaliações ({linkedAvaliacoes.length})
                  </p>
                </div>
                <div className="divide-y divide-white/5">
                  {linkedAvaliacoes.map((a) => {
                    const summary = avaliacaoSummary(a);
                    return (
                      <div key={a.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${TIPO_COLORS[a.tipo] ?? 'bg-zinc-500/20 text-zinc-400'}`}>
                            {a.tipo}
                          </span>
                          {summary && (
                            <span className="text-xs text-zinc-400 truncate">{summary}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-600 shrink-0">
                          {format(new Date(a.data), 'dd/MM HH:mm')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI summary (if archived patient was restored — unlikely for currentPatient, but defensive) */}
            {currentPatient.aiSummary && (
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
                <button
                  onClick={() => setSummaryExpanded((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
                    Resumo IA — Atendimento Anterior
                  </span>
                  {summaryExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </button>
                <AnimatePresence>
                  {summaryExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500 prose-strong:text-indigo-300">
                        <Markdown>{currentPatient.aiSummary}</Markdown>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
