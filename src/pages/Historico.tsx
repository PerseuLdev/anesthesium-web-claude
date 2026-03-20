import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Trash2,
  Calendar,
  User,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

import { useHistoryStore, Avaliacao } from '../lib/storage/historyStore';
import { usePatientStore, Patient } from '../lib/storage/patientStore';
import { useSessionStore } from '../lib/storage/sessionStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AvaliacaoDetailModal } from '../components/AvaliacaoDetailModal';

// ── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_COLORS: Record<string, string> = {
  Gasometria: 'bg-emerald-500/10 text-emerald-400',
  Drogas: 'bg-cyan-500/10 text-cyan-400',
  Escores: 'bg-blue-500/10 text-blue-400',
  Calculadoras: 'bg-purple-500/10 text-purple-400',
  Hemodinamica: 'bg-amber-500/10 text-amber-400',
};

// ── Patient Card (accordion) ─────────────────────────────────────────────────

function PatientCard({
  patient,
  avaliacoes,
  isCurrent,
  onSelectPatient,
  onViewAvaliacao,
  onDeleteAvaliacao,
}: {
  patient: Patient;
  avaliacoes: Avaliacao[];
  isCurrent: boolean;
  onSelectPatient: (id: string) => void;
  onViewAvaliacao: (a: Avaliacao) => void;
  onDeleteAvaliacao: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const firstDate = avaliacoes.length > 0
    ? new Date(Math.min(...avaliacoes.map((a) => new Date(a.data).getTime())))
    : new Date(patient.createdAt);
  const lastDate = avaliacoes.length > 0
    ? new Date(Math.max(...avaliacoes.map((a) => new Date(a.data).getTime())))
    : new Date(patient.createdAt);

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/40 overflow-hidden">
      {/* Card header — split into clickable info area + action buttons, NOT nested */}
      <div className="flex items-start justify-between p-4 gap-2">
        {/* Left: accordion toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-start gap-3 min-w-0 text-left"
        >
          <div className={`p-2 rounded-xl shrink-0 ${isCurrent ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}>
            <User className={`w-4 h-4 ${isCurrent ? 'text-emerald-400' : 'text-zinc-500'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{patient.nome}</span>
              {isCurrent && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                  atual
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {patient.idade != null && (
                <span className="text-xs text-zinc-500">{patient.idade} anos</span>
              )}
              {patient.sexo && (
                <span className="text-xs text-zinc-600">•</span>
              )}
              {patient.sexo && (
                <span className="text-xs text-zinc-500">{patient.sexo === 'M' ? 'Masc.' : 'Fem.'}</span>
              )}
              {patient.cirurgiaPlaneada && (
                <>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-xs text-zinc-500 truncate max-w-[140px]">{patient.cirurgiaPlaneada}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
              <Calendar className="w-3 h-3" />
              {format(firstDate, "dd/MM/yy", { locale: ptBR })}
              {avaliacoes.length > 0 && firstDate.getTime() !== lastDate.getTime() && (
                <> — {format(lastDate, "dd/MM/yy", { locale: ptBR })}</>
              )}
              {avaliacoes.length > 0 && (
                <span className="ml-1 text-zinc-500">• {avaliacoes.length} avaliação{avaliacoes.length !== 1 ? 'ões' : ''}</span>
              )}
            </div>
          </div>
        </button>

        {/* Right: separate action buttons (NOT inside accordion button) */}
        <div className="flex items-center gap-2 shrink-0">
          {!isCurrent && (
            <button
              onClick={() => onSelectPatient(patient.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 text-[10px] font-medium transition-colors active:scale-95"
            >
              <UserCheck className="w-3 h-3" />
              Restaurar
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 divide-y divide-white/5">
              {/* Allergies */}
              {patient.alergias && patient.alergias.length > 0 && (
                <div className="px-4 py-3 flex flex-wrap gap-1.5">
                  {patient.alergias.map((a) => (
                    <span key={a} className="px-2 py-0.5 rounded-md text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300">
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {/* Evaluations list */}
              {avaliacoes.length > 0 ? (
                avaliacoes.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${TIPO_COLORS[a.tipo] ?? 'bg-zinc-500/10 text-zinc-400'}`}>
                        {a.tipo}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {format(new Date(a.data), 'dd/MM HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => onViewAvaliacao(a)} className="text-zinc-400 hover:text-white text-xs h-7 px-2">
                        Ver
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteAvaliacao(a.id)} className="text-zinc-600 hover:text-rose-400 h-7 px-2">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-xs text-zinc-600 italic">Nenhuma avaliação registrada</p>
              )}

              {/* AI Summary */}
              {patient.aiSummary && (
                <div className="px-4 py-3">
                  <button
                    onClick={() => setSummaryExpanded((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Resumo IA
                    {summaryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <AnimatePresence>
                    {summaryExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500 prose-strong:text-indigo-300">
                          <Markdown>{patient.aiSummary}</Markdown>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function Historico() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { avaliacoes, removeAvaliacao, clearHistory } = useHistoryStore();
  const { currentPatient, patients, selectPatient } = usePatientStore();
  const setPacienteContext = useSessionStore((s) => s.setPacienteContext);

  const [selectedAvaliacao, setSelectedAvaliacao] = useState<Avaliacao | null>(null);

  // Build patient groups
  const allPatients: Array<{ patient: Patient; isCurrent: boolean }> = [
    ...(currentPatient ? [{ patient: currentPatient, isCurrent: true }] : []),
    ...patients.map((p) => ({ patient: p, isCurrent: false })),
  ];

  const linkedAvaliacoesByPatient = (patientId: string) =>
    avaliacoes.filter((a) => a.patientRecordId === patientId);

  const orphanAvaliacoes = avaliacoes.filter(
    (a) => !a.patientRecordId
  );

  const handleSelectPatient = (id: string) => {
    const restored = selectPatient(id);
    if (restored) {
      setPacienteContext({
        peso: restored.peso,
        altura: restored.altura,
        idade: restored.idade,
        sexo: restored.sexo,
        alergias: restored.alergias,
        capturedAt: new Date().toISOString(),
      });
      navigate('/paciente');
    }
  };

  const hasAny = allPatients.length > 0 || orphanAvaliacoes.length > 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-2xl">
            <History className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{t('common.history')}</h1>
            <p className="text-slate-400 text-sm">Por paciente — salvo localmente</p>
          </div>
        </div>

        {hasAny && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/30"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>

      {!hasAny ? (
        <div className="text-center py-20">
          <div className="bg-slate-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-10 h-10 text-slate-700" />
          </div>
          <p className="text-slate-400 text-lg">Nenhum histórico encontrado</p>
          <p className="text-slate-500 text-sm mt-2">Suas avaliações salvas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Patient sections */}
          {allPatients.length > 0 && (
            <div className="space-y-3">
              {allPatients.map(({ patient, isCurrent }) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  avaliacoes={linkedAvaliacoesByPatient(patient.id)}
                  isCurrent={isCurrent}
                  onSelectPatient={handleSelectPatient}
                  onViewAvaliacao={setSelectedAvaliacao}
                  onDeleteAvaliacao={removeAvaliacao}
                />
              ))}
            </div>
          )}

          {/* Orphan evaluations */}
          {orphanAvaliacoes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-zinc-600" />
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">
                  Avaliações sem paciente vinculado
                </p>
              </div>
              <div className="space-y-2">
                {orphanAvaliacoes.map((avaliacao) => (
                  <Card
                    key={avaliacao.id}
                    className="border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-colors"
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">{avaliacao.pacienteId}</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                              {avaliacao.tipo}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(avaliacao.data), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAvaliacao(avaliacao)}
                          className="text-slate-400 hover:text-white"
                        >
                          Ver detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAvaliacao(avaliacao.id)}
                          className="text-slate-500 hover:text-red-400 hover:bg-red-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAvaliacao && (
          <AvaliacaoDetailModal
            avaliacao={selectedAvaliacao}
            onClose={() => setSelectedAvaliacao(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
