import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Trash2, Calendar, User, X, Activity, Droplet, FileText, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

import { useHistoryStore, Avaliacao } from '../lib/storage/historyStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Historico() {
  const { t } = useTranslation();
  const { avaliacoes, removeAvaliacao, clearHistory } = useHistoryStore();
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<Avaliacao | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Grave': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'Moderada': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Leve': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const isAbnormal = (val: number, min: number, max: number) => val < min || val > max;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-2xl">
            <History className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{t('common.history')}</h1>
            <p className="text-slate-400 text-sm">Avaliações salvas localmente</p>
          </div>
        </div>
        
        {avaliacoes.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearHistory} className="text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/30">
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>

      {avaliacoes.length === 0 ? (
        <div className="text-center py-20">
          <div className="bg-slate-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-10 h-10 text-slate-700" />
          </div>
          <p className="text-slate-400 text-lg">Nenhum histórico encontrado</p>
          <p className="text-slate-500 text-sm mt-2">Suas avaliações salvas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {avaliacoes.map((avaliacao) => (
            <Card key={avaliacao.id} className="border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-colors">
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
      )}

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {selectedAvaliacao && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAvaliacao(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50 p-4"
            >
              {selectedAvaliacao.tipo === 'Gasometria' && (
                <Card className="border-emerald-500/20 bg-emerald-950/10 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                  <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4 mb-4 bg-black/40">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-emerald-400 text-sm uppercase tracking-widest">
                        <FileText className="w-4 h-4" />
                        Analysis Output
                      </CardTitle>
                      <p className="text-xs text-zinc-500 mt-1">
                        Paciente: {selectedAvaliacao.pacienteId} • {format(new Date(selectedAvaliacao.data), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedAvaliacao(null)} className="w-8 h-8 text-zinc-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Input Summary Chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className={`px-2 py-1 rounded-md text-xs font-mono border ${isAbnormal(selectedAvaliacao.resultado.inputOriginal.pH, 7.35, 7.45) ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
                        pH: {selectedAvaliacao.resultado.inputOriginal.pH} <span className="text-zinc-500 ml-1">[7.35-7.45]</span>
                      </div>
                      <div className={`px-2 py-1 rounded-md text-xs font-mono border ${isAbnormal(selectedAvaliacao.resultado.inputOriginal.PaCO2, 35, 45) ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
                        pCO2: {selectedAvaliacao.resultado.inputOriginal.PaCO2} <span className="text-zinc-500 ml-1">[35-45]</span>
                      </div>
                      <div className={`px-2 py-1 rounded-md text-xs font-mono border ${isAbnormal(selectedAvaliacao.resultado.inputOriginal.HCO3, 22, 26) ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
                        HCO3: {selectedAvaliacao.resultado.inputOriginal.HCO3} <span className="text-zinc-500 ml-1">[22-26]</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{t('gasometry.primary_disorder')}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityColor(selectedAvaliacao.resultado.severidade)}`}>
                          {selectedAvaliacao.resultado.severidade}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-white tracking-tight">{selectedAvaliacao.resultado.disturbioPrimario}</p>
                      {selectedAvaliacao.resultado.compensacao && (
                        <p className="text-sm font-mono text-emerald-400 mt-1">{selectedAvaliacao.resultado.compensacao}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Oxigenação</p>
                        <p className="text-lg font-bold text-white tracking-tight">{selectedAvaliacao.resultado.sdra}</p>
                        <p className="text-xs font-mono text-zinc-400 mt-2">P/F: <span className="text-emerald-400">{Math.round(selectedAvaliacao.resultado.pfRatio)}</span></p>
                      </div>
                      
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Ânion Gap</p>
                        <p className="text-lg font-bold text-white tracking-tight">{selectedAvaliacao.resultado.anionGap.toFixed(1)} <span className="text-xs text-zinc-500 font-mono">mEq/L</span></p>
                        <p className="text-xs font-mono text-zinc-400 mt-2">Corr: <span className="text-emerald-400">{selectedAvaliacao.resultado.anionGapCorrigido.toFixed(1)}</span></p>
                      </div>
                    </div>

                    {selectedAvaliacao.resultado.deltaDelta !== undefined && (
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Delta-Delta</p>
                        <p className="text-xl font-mono text-white">{selectedAvaliacao.resultado.deltaDelta.toFixed(2)} <span className="text-xs text-zinc-500 font-sans ml-1">(Normal: 1.0 - 2.0)</span></p>
                        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{selectedAvaliacao.resultado.deltaDeltaInterpretacao}</p>
                      </div>
                    )}

                    {selectedAvaliacao.resultado.causasProvaveis && (
                      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                        <p className="text-[10px] text-cyan-400 uppercase tracking-widest mb-1 font-bold">Causas Prováveis</p>
                        <p className="text-zinc-300 text-sm leading-relaxed">{selectedAvaliacao.resultado.causasProvaveis}</p>
                      </div>
                    )}

                    <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-[10px] text-emerald-400 uppercase tracking-widest mb-2 font-bold">Clinical Interpretation</p>
                      <p className="text-zinc-200 leading-relaxed text-sm">{selectedAvaliacao.resultado.interpretacao}</p>
                    </div>

                    {selectedAvaliacao.aiSuggestion && (
                      <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mt-4">
                        <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-4">
                          <Sparkles className="w-3 h-3" />
                          Plano Terapêutico Sugerido (IA)
                        </p>
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500 prose-strong:text-indigo-300">
                          <Markdown>{selectedAvaliacao.aiSuggestion}</Markdown>
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>
              )}

              {selectedAvaliacao.tipo === 'Drogas' && (
                <Card className="border-cyan-500/20 bg-cyan-950/10 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                  <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4 mb-4 bg-black/40">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-cyan-400 text-sm uppercase tracking-widest">
                        <Activity className="w-4 h-4" />
                        Prescrição de Drogas
                      </CardTitle>
                      <p className="text-xs text-zinc-500 mt-1">
                        Paciente: {selectedAvaliacao.pacienteId} • {format(new Date(selectedAvaliacao.data), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedAvaliacao(null)} className="w-8 h-8 text-zinc-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="px-2 py-1 rounded-md text-xs font-mono bg-white/5 border border-white/10 text-zinc-300">
                        Peso: {selectedAvaliacao.dados.peso} kg
                      </div>
                      <div className="px-2 py-1 rounded-md text-xs font-mono bg-white/5 border border-white/10 text-zinc-300">
                        Idade: {selectedAvaliacao.dados.idade} anos
                      </div>
                      <div className="px-2 py-1 rounded-md text-xs font-mono bg-white/5 border border-white/10 text-zinc-300">
                        Tipo: {selectedAvaliacao.dados.tipo}
                      </div>
                    </div>

                    {selectedAvaliacao.resultado?.prescricao?.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Medicamentos Selecionados</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedAvaliacao.resultado.prescricao.map((droga: any) => (
                            <div key={droga.nome} className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg">
                              <span className="text-sm font-medium text-white">{droga.nome}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 italic">Nenhum medicamento selecionado na prescrição.</p>
                    )}

                    {selectedAvaliacao.resultado?.interacoes && (
                      <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mt-4">
                        <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-4">
                          <Sparkles className="w-3 h-3" />
                          Análise de Interações (IA)
                        </p>
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500 prose-strong:text-indigo-300">
                          <Markdown>{selectedAvaliacao.resultado.interacoes}</Markdown>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {selectedAvaliacao.tipo === 'Escores' && (
                <Card className="border-blue-500/20 bg-blue-950/10 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                  <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4 mb-4 bg-black/40">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-blue-400 text-sm uppercase tracking-widest">
                        <Activity className="w-4 h-4" />
                        Avaliação Pré-operatória
                      </CardTitle>
                      <p className="text-xs text-zinc-500 mt-1">
                        Paciente: {selectedAvaliacao.pacienteId} • {format(new Date(selectedAvaliacao.data), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedAvaliacao(null)} className="w-8 h-8 text-zinc-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">ASA</p>
                        <p className="text-lg font-bold text-white tracking-tight">{selectedAvaliacao.dados.asa}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Via Aérea</p>
                        <p className="text-lg font-bold text-white tracking-tight">M{selectedAvaliacao.dados.mallampati} / C{selectedAvaliacao.dados.cormack}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Risco NVPO (Apfel)</p>
                        <p className="text-lg font-bold text-white tracking-tight">{selectedAvaliacao.resultado.apfel.probabilidade}%</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Risco Cardíaco (MACE)</p>
                        <p className="text-lg font-bold text-white tracking-tight">{selectedAvaliacao.resultado.goldman.riscoMACE}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedAvaliacao.tipo === 'Calculadoras' && (
                <Card className="border-purple-500/20 bg-purple-950/10 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                  <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4 mb-4 bg-black/40">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-purple-400 text-sm uppercase tracking-widest">
                        <Activity className="w-4 h-4" />
                        Cálculos Clínicos
                      </CardTitle>
                      <p className="text-xs text-zinc-500 mt-1">
                        Paciente: {selectedAvaliacao.pacienteId} • {format(new Date(selectedAvaliacao.data), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedAvaliacao(null)} className="w-8 h-8 text-zinc-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="px-2 py-1 rounded-md text-xs font-mono bg-white/5 border border-white/10 text-zinc-300">
                        Altura: {selectedAvaliacao.dados.altura} cm
                      </div>
                      <div className="px-2 py-1 rounded-md text-xs font-mono bg-white/5 border border-white/10 text-zinc-300">
                        Peso: {selectedAvaliacao.dados.peso} kg
                      </div>
                      <div className="px-2 py-1 rounded-md text-xs font-mono bg-white/5 border border-white/10 text-zinc-300">
                        Idade: {selectedAvaliacao.dados.idade} anos
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">IBW</p>
                        <p className="text-lg font-bold text-white tracking-tight">{selectedAvaliacao.resultado.ibw.toFixed(1)} kg</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Volume Corrente</p>
                        <p className="text-lg font-bold text-white tracking-tight">{selectedAvaliacao.resultado.vc.toFixed(0)} mL</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">IMC</p>
                        <p className="text-lg font-bold text-white tracking-tight">{selectedAvaliacao.resultado.imc.toFixed(1)}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Clearance Cr</p>
                        <p className="text-lg font-bold text-white tracking-tight">{selectedAvaliacao.resultado.crcl.toFixed(1)} mL/min</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
