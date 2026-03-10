import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pill, Search, AlertCircle, Check, Plus, X, Activity, Loader2,
  Sparkles, UserCheck, FlaskConical, ChevronRight, Zap, Brain,
  Heart, Shield, Syringe, Droplets, RotateCcw, Calculator,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

import { DRUGS, Droga, PROTOCOLOS_SEDACAO, ProtocoloSedacao } from '../constants/drogas';
import { calcularDroga } from '../lib/clinical/drogas';
import { calcularIBW, calcularABW, calcularIMC, calcularVolumeCorrente } from '../lib/clinical/calculadoras';
import { checkDrugInteractions, sugerirProtocoloSedacao } from '../lib/services/clinicalAiService';
import { useHistoryStore } from '../lib/storage/historyStore';
import { useSessionStore } from '../lib/storage/sessionStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { AiDisclaimer } from '../components/AiDisclaimer';

// ── Helpers ───────────────────────────────────────────────────

const getDrugClassColor = (classe: string) => {
  switch (classe.toLowerCase()) {
    case 'hipnótico': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    case 'bloqueador neuromuscular': return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
    case 'reversor': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    case 'opioide': return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    case 'vasopressor': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    case 'inotrópico': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    case 'anestésico local': return 'text-teal-400 border-teal-500/30 bg-teal-500/10';
    case 'anticolinérgico': return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    case 'antiarrítmico': return 'text-red-400 border-red-500/30 bg-red-500/10';
    case 'alfa-2 agonista': return 'text-slate-300 border-slate-500/30 bg-slate-500/10';
    default: return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
  }
};

const getProtocoloColors = (cor: ProtocoloSedacao['cor']) => {
  const map = {
    amber:  { chip: 'border-amber-500/40 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400', active: 'border-amber-500 bg-amber-500/20 text-amber-200' },
    cyan:   { chip: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300', dot: 'bg-cyan-400', active: 'border-cyan-500 bg-cyan-500/20 text-cyan-200' },
    rose:   { chip: 'border-rose-500/40 bg-rose-500/10 text-rose-300', dot: 'bg-rose-400', active: 'border-rose-500 bg-rose-500/20 text-rose-200' },
    emerald:{ chip: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400', active: 'border-emerald-500 bg-emerald-500/20 text-emerald-200' },
    indigo: { chip: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300', dot: 'bg-indigo-400', active: 'border-indigo-500 bg-indigo-500/20 text-indigo-200' },
    purple: { chip: 'border-purple-500/40 bg-purple-500/10 text-purple-300', dot: 'bg-purple-400', active: 'border-purple-500 bg-purple-500/20 text-purple-200' },
    orange: { chip: 'border-orange-500/40 bg-orange-500/10 text-orange-300', dot: 'bg-orange-400', active: 'border-orange-500 bg-orange-500/20 text-orange-200' },
  };
  return map[cor];
};

const getContextoIcon = (contexto: ProtocoloSedacao['contexto']) => {
  switch (contexto) {
    case 'Centro Cirúrgico': return <Syringe className="w-3 h-3" />;
    case 'UTI': return <Heart className="w-3 h-3" />;
    case 'Procedimento': return <Shield className="w-3 h-3" />;
    case 'Emergência': return <Zap className="w-3 h-3" />;
  }
};

const CLASSES_FILTRO = [
  'Todos',
  'Hipnótico',
  'Opioide',
  'Bloqueador Neuromuscular',
  'Reversor',
  'Vasopressor',
  'Inotrópico',
  'Anestésico Local',
  'Anticolinérgico',
  'Antiarrítmico',
  'Alfa-2 Agonista',
];

const CLASSES_LABEL: Record<string, string> = {
  'Todos': 'Todos',
  'Hipnótico': 'Hipnóticos',
  'Opioide': 'Opioides',
  'Bloqueador Neuromuscular': 'BNM',
  'Reversor': 'Reversores',
  'Vasopressor': 'Vasopressores',
  'Inotrópico': 'Inotrópicos',
  'Anestésico Local': 'A. Locais',
  'Anticolinérgico': 'Anticolinérgicos',
  'Antiarrítmico': 'Antiarrítmicos',
  'Alfa-2 Agonista': 'Alfa-2',
};

const CENARIOS_IA = [
  'Centro Cirúrgico — Cirurgia Eletiva',
  'Centro Cirúrgico — Cirurgia de Emergência',
  'Indução de Sequência Rápida (RSI)',
  'Sedação em UTI — Ventilação Mecânica',
  'Sedação Consciente para Procedimento',
  'Paciente Hemodinamicamente Instável',
  'Paciente Pediátrico',
  'Paciente Idoso / ASA III–IV',
];

function getDilucaoText(droga: Droga): string {
  if (droga.observacoes?.toLowerCase().includes('diluição') || droga.observacoes?.toLowerCase().includes('diluir')) {
    return droga.observacoes;
  }
  const total = droga.concentracaoPadrao * droga.volumeAmpola;
  return `${droga.volumeAmpola} mL · ${droga.concentracaoPadrao} mg/mL · ${total.toFixed(0)} mg/ampola`;
}

// ── Component ─────────────────────────────────────────────────

export function Drogas() {
  const { t } = useTranslation();

  // Patient inputs
  const [inputPeso, setInputPeso] = useState<number | ''>(70);
  const [inputAltura, setInputAltura] = useState<number | ''>('');
  const [inputIdade, setInputIdade] = useState<number | ''>(30);
  const [inputTipo, setInputTipo] = useState<'Adulto' | 'Pediátrico'>('Adulto');
  const [inputSexo, setInputSexo] = useState<'M' | 'F'>('M');
  const [showCalculadoras, setShowCalculadoras] = useState(false);

  // Confirmed for calculation
  const [peso, setPeso] = useState<number>(70);
  const [idade, setIdade] = useState<number>(30);
  const [tipo, setTipo] = useState<'Adulto' | 'Pediátrico'>('Adulto');

  // Filter state
  const [busca, setBusca] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('Todos');

  // Protocol state
  const [protocoloSelecionado, setProtocoloSelecionado] = useState<string | null>(null);

  // Prescription state
  const [prescricao, setPrescricao] = useState<Droga[]>([]);
  const [interacoes, setInteracoes] = useState<string | null>(null);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);

  // AI protocol suggestion state
  const [showIAPanel, setShowIAPanel] = useState(false);
  const [cenarioIA, setCenarioIA] = useState(CENARIOS_IA[0]);
  const [iaSugestao, setIaSugestao] = useState<string | null>(null);
  const [isLoadingIA, setIsLoadingIA] = useState(false);

  // History
  const [currentAvaliacaoId, setCurrentAvaliacaoId] = useState<string | null>(null);
  const addAvaliacao = useHistoryStore(state => state.addAvaliacao);
  const updateAvaliacao = useHistoryStore(state => state.updateAvaliacao);

  // Patient context from session
  const pacienteContext         = useSessionStore((s) => s.pacienteContext);
  const pacienteBannerDismissed = useSessionStore((s) => s.pacienteBannerDismissed);
  const dismissPacienteBanner   = useSessionStore((s) => s.dismissPacienteBanner);
  const showPacienteBanner      = pacienteContext !== null && !pacienteBannerDismissed;

  useEffect(() => {
    if (!pacienteContext) return;
    if (pacienteContext.peso != null) {
      setInputPeso(pacienteContext.peso);
      setPeso(pacienteContext.peso);
    }
    if (pacienteContext.altura != null) setInputAltura(pacienteContext.altura);
    if (pacienteContext.sexo != null) setInputSexo(pacienteContext.sexo);
    if (pacienteContext.idade != null) {
      setInputIdade(pacienteContext.idade);
      setIdade(pacienteContext.idade);
      const tipoDerivado: 'Adulto' | 'Pediátrico' = pacienteContext.idade < 18 ? 'Pediátrico' : 'Adulto';
      setInputTipo(tipoDerivado);
      setTipo(tipoDerivado);
    }
  }, [pacienteContext]);

  // Filtered drugs
  const drogasFiltradas = useMemo(() => {
    return DRUGS.filter(d => {
      const matchBusca = busca === '' ||
        d.nome.toLowerCase().includes(busca.toLowerCase()) ||
        d.classe.toLowerCase().includes(busca.toLowerCase());
      const matchClasse = filtroClasse === 'Todos' || d.classe === filtroClasse;
      return matchBusca && matchClasse;
    });
  }, [busca, filtroClasse]);

  // Handlers
  const handleConfirm = () => {
    const newPeso = Number(inputPeso) || 0;
    const newIdade = Number(inputIdade) || 0;
    setPeso(newPeso);
    setIdade(newIdade);
    setTipo(inputTipo);

    const id = addAvaliacao({
      pacienteId: `PAC-${Math.floor(Math.random() * 10000)}`,
      tipo: 'Drogas',
      dados: { peso: newPeso, idade: newIdade, tipo: inputTipo },
      resultado: { prescricao, interacoes },
    });
    setCurrentAvaliacaoId(id);
  };

  const handleNumberChange = (setter: React.Dispatch<React.SetStateAction<number | ''>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setter(val === '' ? '' : Number(val));
    };

  const togglePrescricao = (droga: Droga) => {
    setPrescricao(prev => {
      const exists = prev.find(d => d.nome === droga.nome);
      const newPrescricao = exists ? prev.filter(d => d.nome !== droga.nome) : [...prev, droga];
      if (currentAvaliacaoId) {
        updateAvaliacao(currentAvaliacaoId, { resultado: { prescricao: newPrescricao, interacoes: null } });
      }
      return newPrescricao;
    });
    setInteracoes(null);
    // Clear protocol selection if manual toggle
    setProtocoloSelecionado(null);
  };

  const aplicarProtocolo = (protocolo: ProtocoloSedacao) => {
    if (protocoloSelecionado === protocolo.id) {
      // Deselect
      setProtocoloSelecionado(null);
      setPrescricao([]);
      setInteracoes(null);
      setIaSugestao(null);
      return;
    }
    const drogas = DRUGS.filter(d => protocolo.drogas.includes(d.nome));
    setPrescricao(drogas);
    setProtocoloSelecionado(protocolo.id);
    setInteracoes(null);
    setIaSugestao(null);
  };

  const handleCheckInteractions = async () => {
    if (prescricao.length < 2) return;
    setIsCheckingInteractions(true);
    try {
      const result = await checkDrugInteractions(prescricao);
      setInteracoes(result);
      if (currentAvaliacaoId) {
        updateAvaliacao(currentAvaliacaoId, {
          resultado: { prescricao, interacoes: result },
          aiSuggestion: result
        });
      }
    } catch {
      alert('Erro ao verificar interações. Tente novamente.');
    } finally {
      setIsCheckingInteractions(false);
    }
  };

  const handleSugerirIA = async () => {
    setIsLoadingIA(true);
    setIaSugestao(null);
    try {
      const paciente = pacienteContext ? {
        peso: pacienteContext.peso,
        idade: pacienteContext.idade,
        sexo: pacienteContext.sexo,
      } : undefined;
      const result = await sugerirProtocoloSedacao(cenarioIA, paciente);
      setIaSugestao(result);
    } catch {
      alert('Erro ao consultar IA. Tente novamente.');
    } finally {
      setIsLoadingIA(false);
    }
  };

  const protocoloAtivo = PROTOCOLOS_SEDACAO.find(p => p.id === protocoloSelecionado);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center">
          <Pill className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white uppercase">{t('drugs.title')}</h1>
          <p className="text-zinc-500 text-sm font-mono mt-1">PHARMACOLOGY & DOSING ENGINE</p>
        </div>
      </div>

      {/* Patient banner */}
      <AnimatePresence>
        {showPacienteBanner && pacienteContext && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3"
          >
            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Dados do Paciente Importados</p>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {[
                  pacienteContext.peso  != null ? `Peso: ${pacienteContext.peso} kg` : null,
                  pacienteContext.idade != null ? `Idade: ${pacienteContext.idade} a` : null,
                  pacienteContext.idade != null ? (pacienteContext.idade < 18 ? 'Pediátrico' : 'Adulto') : null,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissPacienteBanner}
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient inputs */}
      <Card className="bg-black/40 border-white/5">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label={t('drugs.weight')}
              type="number"
              value={inputPeso}
              onChange={handleNumberChange(setInputPeso)}
            />
            <Input
              label="Altura (cm)"
              type="number"
              value={inputAltura}
              onChange={handleNumberChange(setInputAltura)}
            />
            <Input
              label={t('drugs.age')}
              type="number"
              value={inputIdade}
              onChange={handleNumberChange(setInputIdade)}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('drugs.type')}</label>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 h-12">
                <button
                  className={`flex-1 rounded-lg text-sm font-medium transition-all ${inputTipo === 'Adulto' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  onClick={() => setInputTipo('Adulto')}
                >
                  {t('drugs.adult')}
                </button>
                <button
                  className={`flex-1 rounded-lg text-sm font-medium transition-all ${inputTipo === 'Pediátrico' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  onClick={() => setInputTipo('Pediátrico')}
                >
                  {t('drugs.pediatric')}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sexo</label>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 h-12">
                <button
                  className={`flex-1 rounded-lg text-sm font-medium transition-all ${inputSexo === 'M' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  onClick={() => setInputSexo('M')}
                >
                  Masc
                </button>
                <button
                  className={`flex-1 rounded-lg text-sm font-medium transition-all ${inputSexo === 'F' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  onClick={() => setInputSexo('F')}
                >
                  Fem
                </button>
              </div>
            </div>
            <Button
              onClick={handleConfirm}
              className="col-span-2 md:col-span-1 h-16 md:h-12 w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.2)] whitespace-nowrap text-base md:text-sm"
            >
              <Check className="w-4 h-4 mr-2 shrink-0" />
              Atualizar Doses
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Calculadoras ──────────────────────────────────────── */}
      {(() => {
        const alturaNum = Number(inputAltura) || 0;
        const pesoNum   = Number(inputPeso)   || 0;
        const ibw  = alturaNum > 100 ? calcularIBW(alturaNum, inputSexo) : null;
        const imc  = alturaNum > 0 && pesoNum > 0 ? calcularIMC(alturaNum, pesoNum) : null;
        const abw  = ibw !== null && imc !== null && imc > 30 ? calcularABW(pesoNum, ibw) : null;
        const vt   = ibw !== null ? calcularVolumeCorrente(ibw) : null;
        const hasData = ibw !== null || imc !== null;
        const imcColor = imc === null ? '' : imc < 18.5 ? 'text-blue-400' : imc < 25 ? 'text-emerald-400' : imc < 30 ? 'text-amber-400' : 'text-rose-400';
        const imcLabel = imc === null ? '' : imc < 18.5 ? 'Baixo peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obesidade';
        return (
          <div>
            <button
              onClick={() => setShowCalculadoras(v => !v)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors mb-3"
            >
              <Calculator className="w-4 h-4" />
              Calculadoras
              <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${showCalculadoras ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence>
              {showCalculadoras && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {!hasData ? (
                    <p className="text-xs text-zinc-600 pb-3">Preencha Peso, Altura e Sexo para ver os cálculos.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-2">
                      {ibw !== null && (
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">PIE</p>
                          <p className="text-xl font-mono text-white">{ibw.toFixed(1)} <span className="text-xs text-zinc-500">kg</span></p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">Peso Ideal</p>
                        </div>
                      )}
                      {imc !== null && (
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">IMC</p>
                          <p className={`text-xl font-mono ${imcColor}`}>{imc.toFixed(1)}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{imcLabel}</p>
                        </div>
                      )}
                      {abw !== null && (
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">PIA</p>
                          <p className="text-xl font-mono text-white">{abw.toFixed(1)} <span className="text-xs text-zinc-500">kg</span></p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">Peso Ajustado</p>
                        </div>
                      )}
                      {vt !== null && (
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">VT</p>
                          <p className="text-xl font-mono text-white">{vt.toFixed(0)} <span className="text-xs text-zinc-500">mL</span></p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">Vol. Corrente</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* ── Protocols ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Protocolos Rápidos</span>
          </div>
          {protocoloAtivo && (
            <button
              onClick={() => { setProtocoloSelecionado(null); setPrescricao([]); setInteracoes(null); setIaSugestao(null); }}
              className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar protocolo
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {PROTOCOLOS_SEDACAO.map(protocolo => {
            const colors = getProtocoloColors(protocolo.cor);
            const isActive = protocoloSelecionado === protocolo.id;
            return (
              <motion.button
                key={protocolo.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => aplicarProtocolo(protocolo)}
                className={`shrink-0 flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                  isActive ? colors.active : colors.chip
                } hover:opacity-90`}
              >
                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                <div>
                  <p className="text-xs font-bold whitespace-nowrap">{protocolo.nome}</p>
                  <p className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                    {getContextoIcon(protocolo.contexto)}
                    {protocolo.contexto}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
        {protocoloAtivo && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-zinc-500 mt-2 pl-1 italic"
          >
            {protocoloAtivo.descricao}
          </motion.p>
        )}
      </div>

      {/* ── Prescription panel ────────────────────────────────── */}
      <AnimatePresence>
        {prescricao.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-indigo-500/20 bg-indigo-950/10 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-indigo-400 text-sm uppercase tracking-widest">
                      <Activity className="w-4 h-4" />
                      Prescrição Atual
                      {protocoloAtivo && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border font-normal ${getProtocoloColors(protocoloAtivo.cor).chip}`}>
                          {protocoloAtivo.nome}
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-xs text-zinc-500 mt-1">{prescricao.length} medicamento(s) selecionado(s)</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowIAPanel(v => !v); setIaSugestao(null); }}
                      className="text-purple-400 border border-purple-500/30 hover:bg-purple-500/10"
                    >
                      <Brain className="w-3.5 h-3.5 mr-1.5" />
                      Sugerir por IA
                    </Button>
                    {prescricao.length >= 2 && (
                      <Button
                        size="sm"
                        onClick={handleCheckInteractions}
                        disabled={isCheckingInteractions}
                        className="bg-indigo-500 text-white hover:bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                      >
                        {isCheckingInteractions ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Verificar Interações
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Drug chips */}
                <div className="flex flex-wrap gap-2">
                  {prescricao.map(droga => (
                    <div key={droga.nome} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg">
                      <span className="text-sm font-medium text-white">{droga.nome}</span>
                      <button
                        onClick={() => togglePrescricao(droga)}
                        className="text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* IA panel */}
                <AnimatePresence>
                  {showIAPanel && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-3"
                    >
                      <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                        <Brain className="w-3 h-3" />
                        Protocolo Personalizado — IA
                      </p>
                      <div className="flex gap-2 flex-wrap items-end">
                        <div className="flex-1 min-w-48">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Cenário Clínico</label>
                          <select
                            value={cenarioIA}
                            onChange={e => setCenarioIA(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/40 text-zinc-200 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                          >
                            {CENARIOS_IA.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <Button
                          onClick={handleSugerirIA}
                          disabled={isLoadingIA}
                          className="h-10 bg-purple-600 hover:bg-purple-500 text-white shrink-0"
                        >
                          {isLoadingIA ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mr-1" />
                          )}
                          Consultar
                        </Button>
                      </div>
                      {iaSugestao && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 p-4 rounded-xl bg-black/40 border border-purple-500/10"
                        >
                          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-purple-500 prose-strong:text-purple-300 prose-headings:text-purple-300">
                            <Markdown>{iaSugestao}</Markdown>
                          </div>
                          <AiDisclaimer />
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Interactions result */}
                {interacoes && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-black/40 border border-indigo-500/20"
                  >
                    <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-4">
                      <Sparkles className="w-3 h-3" />
                      Análise de Interações (IA)
                    </p>
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500 prose-strong:text-indigo-300">
                      <Markdown>{interacoes}</Markdown>
                    </div>
                    <AiDisclaimer />
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Class filter chips ────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CLASSES_FILTRO.map(cls => (
          <button
            key={cls}
            onClick={() => setFiltroClasse(cls)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${
              filtroClasse === cls
                ? 'bg-white/10 border-white/20 text-white'
                : 'border-white/5 text-zinc-600 hover:text-zinc-400 hover:border-white/10'
            }`}
          >
            {CLASSES_LABEL[cls] || cls}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
        <input
          type="text"
          placeholder="Buscar droga ou classe..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full h-12 pl-12 pr-4 rounded-2xl border border-white/5 bg-black/40 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/5 transition-all shadow-inner"
        />
      </div>

      {/* ── Drug grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {drogasFiltradas.map((droga) => {
            const calculo = calcularDroga({ peso, idade, tipo, droga });
            const classColor = getDrugClassColor(droga.classe);
            const isSelected = prescricao.some(d => d.nome === droga.nome);

            return (
              <motion.div
                key={droga.nome}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              >
                <Card className={`h-full flex flex-col transition-all ${
                  isSelected
                    ? 'border-indigo-500/50 bg-indigo-950/10 shadow-[0_0_20px_rgba(99,102,241,0.08)]'
                    : 'hover:border-white/10 bg-zinc-900/20'
                }`}>
                  {/* Card header */}
                  <CardHeader className="pb-3 border-b border-white/5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-lg text-white tracking-tight leading-tight">{droga.nome}</CardTitle>
                        <span className={`inline-flex items-center px-2 py-0.5 mt-1.5 text-[9px] uppercase tracking-widest font-bold border rounded-md ${classColor}`}>
                          {droga.classe}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePrescricao(droga)}
                          className={`w-8 h-8 rounded-full transition-all ${
                            isSelected
                              ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                              : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 flex-1 flex flex-col gap-3">
                    {/* Bolus */}
                    {calculo.doseBolusMin !== undefined && (
                      <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2 font-bold">{t('drugs.bolus')}</p>
                        <div className="flex justify-between items-baseline">
                          <p className="text-base font-mono text-white">
                            {calculo.doseBolusMin.toFixed(1)}
                            {calculo.doseBolusMin !== calculo.doseBolusMax ? ` – ${calculo.doseBolusMax?.toFixed(1)}` : ''}
                            <span className="text-[10px] text-zinc-500 font-sans ml-1">{calculo.unidadeBolus}</span>
                          </p>
                          <p className="text-base font-mono text-cyan-400">
                            {calculo.volumeBolusMin?.toFixed(1)}
                            {calculo.volumeBolusMin !== calculo.volumeBolusMax ? ` – ${calculo.volumeBolusMax?.toFixed(1)}` : ''}
                            <span className="text-[10px] font-sans text-cyan-500/50 ml-1">mL</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Infusion */}
                    {calculo.doseInfusaoMin !== undefined && (
                      <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2 font-bold">{t('drugs.infusion')}</p>
                        <div className="flex justify-between items-baseline">
                          <p className="text-base font-mono text-white">
                            {calculo.doseInfusaoMin.toFixed(1)}
                            {calculo.doseInfusaoMin !== calculo.doseInfusaoMax ? ` – ${calculo.doseInfusaoMax?.toFixed(1)}` : ''}
                            <span className="text-[10px] text-zinc-500 font-sans ml-1">{calculo.unidadeInfusao}</span>
                          </p>
                          <p className="text-lg font-mono font-bold text-purple-400">
                            {calculo.taxaInfusaoMin?.toFixed(1)}
                            {calculo.taxaInfusaoMin !== calculo.taxaInfusaoMax ? ` – ${calculo.taxaInfusaoMax?.toFixed(1)}` : ''}
                            <span className="text-[10px] font-sans text-purple-500/60 ml-1">mL/h</span>
                          </p>
                        </div>
                        {/* Dilution guide */}
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
                          <Droplets className="w-3 h-3 text-zinc-600 shrink-0" />
                          <p className="text-[10px] text-zinc-600 font-mono leading-tight">
                            {getDilucaoText(droga)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Alert */}
                    {calculo.alerta && (
                      <div className="mt-auto flex items-start gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-rose-300 leading-relaxed">{calculo.alerta}</p>
                      </div>
                    )}

                    {/* Observations */}
                    {droga.observacoes && !calculo.alerta && (
                      <p className="mt-auto text-[10px] text-zinc-600 italic leading-relaxed">
                        {droga.observacoes}
                      </p>
                    )}

                    {/* Ampoule info (compact, no infusion) */}
                    {calculo.doseInfusaoMin === undefined && (
                      <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-white/5">
                        <Droplets className="w-3 h-3 text-zinc-600 shrink-0" />
                        <p className="text-[10px] text-zinc-600 font-mono">
                          {getDilucaoText(droga)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {drogasFiltradas.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma droga encontrada</p>
        </div>
      )}
    </div>
  );
}
