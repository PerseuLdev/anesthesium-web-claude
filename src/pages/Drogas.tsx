import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pill, Search, AlertCircle, Check, Plus, X, Activity, Loader2,
  Sparkles, UserCheck, FlaskConical, Zap, Brain,
  Heart, Shield, Syringe, Droplets, RotateCcw,
  ArrowLeftRight, User, ChevronDown, TriangleAlert,
  Trash2, Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

import { DRUGS, Droga, PROTOCOLOS_SEDACAO, ProtocoloSedacao } from '../constants/drogas';
import { calcularDroga } from '../lib/clinical/drogas';
import { calcularIBW, calcularABW, calcularIMC, calcularVolumeCorrente } from '../lib/clinical/calculadoras';
import { checkDrugInteractions, sugerirPrescricao } from '../lib/services/clinicalAiService';
import { detectarInteracoes } from '../constants/interacoes';
import { useHistoryStore } from '../lib/storage/historyStore';
import { useSessionStore } from '../lib/storage/sessionStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
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


function getDilucaoText(droga: Droga): string {
  if (droga.observacoes?.toLowerCase().includes('diluição') || droga.observacoes?.toLowerCase().includes('diluir')) {
    return droga.observacoes;
  }
  const total = droga.concentracaoPadrao * droga.volumeAmpola;
  return `${droga.volumeAmpola} mL · ${droga.concentracaoPadrao} mg/mL · ${total.toFixed(0)} mg/ampola`;
}

// ── Protocols for Calculator tab ──────────────────────────────
const PROTOCOLOS_CALC = [
  {
    id: 'ketodex', nome: 'KETODEX', contexto: 'Procedimento', cor: 'purple' as const,
    descricao: 'Ketamina + Dexmedetomidina — sedação procedural com preservação de via aérea',
    drogas: [
      { nome: 'Ketamina', bolus: { dose: 0.5, unidade: 'mg/kg', descricao: 'Bolus de indução' }, infusao: { min: 0.1, max: 0.3, unidade: 'mg/kg/h' }, concPadrao: 50 },
      { nome: 'Dexmedetomidina', bolus: { dose: 1, unidade: 'mcg/kg', descricao: 'Bolus em 10 min (opcional)' }, infusao: { min: 0.2, max: 0.7, unidade: 'mcg/kg/h' }, concPadrao: 4 },
    ],
  },
  {
    id: 'tiva', nome: 'TIVA', contexto: 'Centro Cirúrgico', cor: 'amber' as const,
    descricao: 'Anestesia Total IV — Propofol + Remifentanil + Rocurônio',
    drogas: [
      { nome: 'Propofol', bolus: { dose: 2, unidade: 'mg/kg', descricao: 'Indução' }, infusao: { min: 25, max: 75, unidade: 'mcg/kg/min' }, concPadrao: 10 },
      { nome: 'Remifentanil', bolus: null, infusao: { min: 0.05, max: 0.5, unidade: 'mcg/kg/min' }, concPadrao: 0.05 },
      { nome: 'Rocurônio', bolus: { dose: 0.6, unidade: 'mg/kg', descricao: 'Bloqueio neuromuscular' }, infusao: null, concPadrao: 10 },
    ],
  },
  {
    id: 'rsi', nome: 'RSI', contexto: 'Emergência', cor: 'rose' as const,
    descricao: 'Sequência Rápida de Intubação',
    drogas: [
      { nome: 'Ketamina', bolus: { dose: 1.5, unidade: 'mg/kg', descricao: 'Indução ISR' }, infusao: null, concPadrao: 50 },
      { nome: 'Succinilcolina', bolus: { dose: 1.5, unidade: 'mg/kg', descricao: 'Bloqueio rápido' }, infusao: null, concPadrao: 20 },
    ],
  },
  {
    id: 'sedacao-consciente', nome: 'Sed. Consciente', contexto: 'Procedimento', cor: 'emerald' as const,
    descricao: 'Mantém reflexos — Midazolam + Fentanil',
    drogas: [
      { nome: 'Midazolam', bolus: { dose: 0.05, unidade: 'mg/kg', descricao: 'Titulado IV lento' }, infusao: null, concPadrao: 5 },
      { nome: 'Fentanil', bolus: { dose: 1.5, unidade: 'mcg/kg', descricao: 'Analgesia' }, infusao: null, concPadrao: 0.05 },
    ],
  },
  {
    id: 'uti-sedacao', nome: 'Sedação UTI', contexto: 'UTI', cor: 'indigo' as const,
    descricao: 'RASS -2 a 0 — Propofol + Fentanil (± Dexmedetomidina)',
    drogas: [
      { nome: 'Propofol', bolus: null, infusao: { min: 10, max: 50, unidade: 'mcg/kg/min' }, concPadrao: 10 },
      { nome: 'Fentanil', bolus: null, infusao: { min: 0.5, max: 1.5, unidade: 'mcg/kg/h' }, concPadrao: 0.05 },
      { nome: 'Dexmedetomidina', bolus: null, infusao: { min: 0.2, max: 0.7, unidade: 'mcg/kg/h' }, concPadrao: 4 },
    ],
  },
  {
    id: 'hemo-instavel', nome: 'Instab. Hemodinâmica', contexto: 'Emergência', cor: 'orange' as const,
    descricao: 'Paciente instável — Etomidato + Fentanil + Rocurônio',
    drogas: [
      { nome: 'Etomidato', bolus: { dose: 0.3, unidade: 'mg/kg', descricao: 'Indução (menor depressão CV)' }, infusao: null, concPadrao: 2 },
      { nome: 'Fentanil', bolus: { dose: 1, unidade: 'mcg/kg', descricao: 'Analgesia cuidadosa' }, infusao: null, concPadrao: 0.05 },
      { nome: 'Rocurônio', bolus: { dose: 1.2, unidade: 'mg/kg', descricao: 'RSI dose' }, infusao: null, concPadrao: 10 },
    ],
  },
];

type ProtocalcDroga = typeof PROTOCOLOS_CALC[0]['drogas'][0];

const calcDoseProtocolo = (droga: ProtocalcDroga, pesoKg: number) => {
  const results: { label: string; valor: string; mL: string }[] = [];
  if (droga.bolus) {
    const doseTotal = droga.bolus.dose * pesoKg;
    const isMcg = droga.bolus.unidade.includes('mcg');
    const mL = doseTotal / (isMcg ? droga.concPadrao * 1000 : droga.concPadrao);
    results.push({
      label: `Bolus — ${droga.bolus.descricao}`,
      valor: `${doseTotal.toFixed(1)} ${isMcg ? 'mcg' : 'mg'}`,
      mL: `${mL.toFixed(1)} mL`,
    });
  }
  if (droga.infusao) {
    const toMgH = (val: number, unit: string) => {
      if (unit.includes('mcg/kg/min')) return val * pesoKg * 60 / 1000;
      if (unit.includes('mcg/kg/h')) return val * pesoKg / 1000;
      return val * pesoKg;
    };
    const minMg = toMgH(droga.infusao.min, droga.infusao.unidade);
    const maxMg = toMgH(droga.infusao.max, droga.infusao.unidade);
    const minMlh = minMg / droga.concPadrao;
    const maxMlh = maxMg / droga.concPadrao;
    results.push({
      label: `Infusão`,
      valor: `${droga.infusao.min}–${droga.infusao.max} ${droga.infusao.unidade}`,
      mL: `${minMlh.toFixed(1)}–${maxMlh.toFixed(1)} mL/h`,
    });
  }
  return results;
};

// ── Component ─────────────────────────────────────────────────

export function Drogas() {
  const { t } = useTranslation();

  // Patient inputs
  const [inputPeso, setInputPeso] = useState<number | ''>(70);
  const [inputAltura, setInputAltura] = useState<number | ''>('');
  const [inputIdade, setInputIdade] = useState<number | ''>(30);
  const [inputTipo, setInputTipo] = useState<'Adulto' | 'Pediátrico'>('Adulto');
  const [inputSexo, setInputSexo] = useState<'M' | 'F'>('M');

  // Calculator tabs
  const [calcTab, setCalcTab] = useState<'paciente' | 'gotejamento' | 'conversao' | 'protocolos'>('paciente');
  // Gotejamento
  const [gotaDose, setGotaDose] = useState<number | ''>('');
  const [gotaUnidade, setGotaUnidade] = useState<'mcg_kg_min' | 'mg_min'>('mcg_kg_min');
  const [gotaConc, setGotaConc] = useState<number | ''>('');
  // Conversão
  const [convDe, setConvDe] = useState<'mcgkgmin' | 'mcgmin' | 'mlh_macro' | 'mlh_micro'>('mcgkgmin');
  const [convValor, setConvValor] = useState<number | ''>(5);
  // Protocolos (calc)
  const [protCalcSel, setProtCalcSel] = useState<string>('ketodex');

  // Drug card expand/collapse
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Drag refs for class filter
  const filterRef = useRef<HTMLDivElement>(null);
  const isDraggingFilter = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  // Derived values for calculation (reactive)
  const peso = Number(inputPeso) || 70;
  const idade = Number(inputIdade) || 30;
  const tipo = inputTipo;

  // Filter state
  const [busca, setBusca] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('Todos');

  // Protocol state
  const [protocoloSelecionado, setProtocoloSelecionado] = useState<string | null>(null);

  // Prescription state
  const [prescricao, setPrescricao] = useState<Droga[]>([]);
  const [interacoes, setInteracoes] = useState<string | null>(null);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);


  // Checklist state
  const [showChecklist, setShowChecklist] = useState(false);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [dosesRaw, setDosesRaw] = useState<Record<string, string>>({});
  const [cenarioPrescricao, setCenarioPrescricao] = useState('Centro Cirúrgico');
  const [sugestaoPrescrição, setSugestaoPrescrição] = useState<string | null>(null);
  const [isSugerindoPrescricao, setIsSugerindoPrescricao] = useState(false);

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
    if (pacienteContext.peso != null) setInputPeso(pacienteContext.peso);
    if (pacienteContext.altura != null) setInputAltura(pacienteContext.altura);
    if (pacienteContext.sexo != null) setInputSexo(pacienteContext.sexo);
    if (pacienteContext.idade != null) {
      setInputIdade(pacienteContext.idade);
      setInputTipo(pacienteContext.idade < 18 ? 'Pediátrico' : 'Adulto');
    }
  }, [pacienteContext]);

  // ESC to close checklist
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowChecklist(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  const handleNumberChange = (setter: React.Dispatch<React.SetStateAction<number | ''>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setter(val === '' ? '' : Number(val));
    };

  const togglePrescricao = (droga: Droga) => {
    // Init dose default when adding
    setQuantidades(q => {
      if (q[droga.nome] !== undefined) return q;
      const defaultDose = droga.doseBolus?.min ?? droga.doseInfusao?.min ?? 1;
      return { ...q, [droga.nome]: defaultDose };
    });
    setPrescricao(prev => {
      const exists = prev.find(d => d.nome === droga.nome);
      const newPrescricao = exists ? prev.filter(d => d.nome !== droga.nome) : [...prev, droga];
      if (!currentAvaliacaoId && newPrescricao.length > 0) {
        const id = addAvaliacao({
          pacienteId: `PAC-${Math.floor(Math.random() * 10000)}`,
          tipo: 'Drogas',
          dados: { peso, idade, tipo },
          resultado: { prescricao: newPrescricao, interacoes: null },
        });
        setCurrentAvaliacaoId(id);
      } else if (currentAvaliacaoId) {
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
      setProtocoloSelecionado(null);
      setPrescricao([]);
      setInteracoes(null);
      return;
    }
    const drogas = DRUGS.filter(d => protocolo.drogas.includes(d.nome));
    setPrescricao(drogas);
    setProtocoloSelecionado(protocolo.id);
    setInteracoes(null);
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


  // Local automatic interactions (instant, no API)
  const interacoesLocais = useMemo(
    () => detectarInteracoes(prescricao.map(d => d.nome)),
    [prescricao]
  );

  const handleSugerirPrescricao = async () => {
    setIsSugerindoPrescricao(true);
    setSugestaoPrescrição(null);
    try {
      const paciente = {
        peso: pacienteContext?.peso,
        idade: pacienteContext?.idade,
        sexo: pacienteContext?.sexo,
        alergias: pacienteContext?.alergias,
      };
      const result = await sugerirPrescricao(paciente, cenarioPrescricao);
      setSugestaoPrescrição(result);
    } catch {
      alert('Erro ao consultar IA. Tente novamente.');
    } finally {
      setIsSugerindoPrescricao(false);
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
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('drugs.type')}</label>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 h-10">
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
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 h-10">
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
          </div>
        </CardContent>
      </Card>

      {/* ── Sugerir Prescrição por IA ─────────────────────────── */}
      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
          <Brain className="w-3 h-3" />
          Sugerir Prescrição por IA
        </p>
        <div className="flex gap-2 items-end">
          <select
            value={cenarioPrescricao}
            onChange={e => { setCenarioPrescricao(e.target.value); setSugestaoPrescrição(null); }}
            className="flex-1 h-10 px-3 rounded-xl border border-white/10 bg-black/40 text-zinc-200 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            {['Centro Cirúrgico', 'UTI', 'Emergência / Pronto-Socorro', 'Procedimento Ambulatorial', 'Sedação Diagnóstica'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button
            onClick={handleSugerirPrescricao}
            disabled={isSugerindoPrescricao}
            className="h-10 bg-purple-600 hover:bg-purple-500 text-white shrink-0"
          >
            {isSugerindoPrescricao ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
          </Button>
        </div>
        {sugestaoPrescrição && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-3"
          >
            <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Brain className="w-3 h-3" />
              Sugestão de Prescrição — {cenarioPrescricao}
            </p>
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-purple-500 prose-strong:text-purple-300 prose-headings:text-purple-300">
              <Markdown>{sugestaoPrescrição}</Markdown>
            </div>
            <AiDisclaimer />
            {(() => {
              const sugeridas = DRUGS.filter(d =>
                sugestaoPrescrição.toLowerCase().includes(d.nome.toLowerCase())
              );
              if (sugeridas.length === 0) return null;
              return (
                <button
                  onClick={() => {
                    sugeridas.forEach(d => {
                      if (!prescricao.find(p => p.nome === d.nome)) {
                        togglePrescricao(d);
                      }
                    });
                    setShowChecklist(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-sm font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar à PM ({sugeridas.length} droga{sugeridas.length !== 1 ? 's' : ''})
                </button>
              );
            })()}
          </motion.div>
        )}
      </div>

      {/* ── Calculadoras (tabbed) ─────────────────────────────── */}
      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-white/5">
          {([
            { id: 'paciente',    icon: User,           label: 'Paciente' },
            { id: 'gotejamento', icon: Droplets,        label: 'Gotejamento' },
            { id: 'conversao',   icon: ArrowLeftRight,  label: 'Conversão' },
            { id: 'protocolos',  icon: FlaskConical,    label: 'Protocolos' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setCalcTab(tab.id)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-3 px-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                calcTab === tab.id
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-white/3'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {/* ─ Paciente ─ */}
          {calcTab === 'paciente' && (() => {
            const alturaNum = Number(inputAltura) || 0;
            const pesoNum   = Number(inputPeso)   || 0;
            const ibw  = alturaNum > 100 ? calcularIBW(alturaNum, inputSexo) : null;
            const imc  = alturaNum > 0 && pesoNum > 0 ? calcularIMC(alturaNum, pesoNum) : null;
            const abw  = ibw !== null && imc !== null && imc > 30 ? calcularABW(pesoNum, ibw) : null;
            const vt   = ibw !== null ? calcularVolumeCorrente(ibw) : null;
            const imcColor = imc === null ? '' : imc < 18.5 ? 'text-blue-400' : imc < 25 ? 'text-emerald-400' : imc < 30 ? 'text-amber-400' : 'text-rose-400';
            const imcLabel = imc === null ? '' : imc < 18.5 ? 'Baixo peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obesidade';
            return ibw === null && imc === null ? (
              <p className="text-xs text-zinc-600 py-2">Preencha Peso, Altura e Sexo para ver os cálculos.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ibw !== null && <div className="p-3 rounded-xl bg-black/40 border border-white/5"><p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">PIE</p><p className="text-xl font-mono text-white">{ibw.toFixed(1)} <span className="text-xs text-zinc-500">kg</span></p><p className="text-[10px] text-zinc-600 mt-0.5">Peso Ideal</p></div>}
                {imc !== null && <div className="p-3 rounded-xl bg-black/40 border border-white/5"><p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">IMC</p><p className={`text-xl font-mono ${imcColor}`}>{imc.toFixed(1)}</p><p className="text-[10px] text-zinc-600 mt-0.5">{imcLabel}</p></div>}
                {abw !== null && <div className="p-3 rounded-xl bg-black/40 border border-white/5"><p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">PIA</p><p className="text-xl font-mono text-white">{abw.toFixed(1)} <span className="text-xs text-zinc-500">kg</span></p><p className="text-[10px] text-zinc-600 mt-0.5">Peso Ajustado</p></div>}
                {vt !== null && <div className="p-3 rounded-xl bg-black/40 border border-white/5"><p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">VT</p><p className="text-xl font-mono text-white">{vt.toFixed(0)} <span className="text-xs text-zinc-500">mL</span></p><p className="text-[10px] text-zinc-600 mt-0.5">Vol. Corrente</p></div>}
              </div>
            );
          })()}

          {/* ─ Gotejamento ─ */}
          {calcTab === 'gotejamento' && (() => {
            const dose = Number(gotaDose) || 0;
            const conc = Number(gotaConc) || 0;
            const p = Number(inputPeso) || 70;
            const mlh = dose && conc
              ? gotaUnidade === 'mcg_kg_min'
                ? (dose * p * 60) / (conc * 1000)
                : (dose * 60) / conc
              : null;
            const macro = mlh !== null ? (mlh * 20) / 60 : null;
            const micro = mlh !== null ? mlh : null;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Dose</label>
                    <input type="number" value={gotaDose} onChange={e => setGotaDose(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0" className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/40 text-zinc-100 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Unidade</label>
                    <select value={gotaUnidade} onChange={e => setGotaUnidade(e.target.value as 'mcg_kg_min' | 'mg_min')}
                      className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/40 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors">
                      <option value="mcg_kg_min">mcg/kg/min</option>
                      <option value="mg_min">mg/min</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Conc. (mg/mL)</label>
                    <input type="number" value={gotaConc} onChange={e => setGotaConc(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0" className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/40 text-zinc-100 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Peso (kg)</label>
                    <input type="number" value={inputPeso} readOnly
                      className="w-full h-10 px-3 rounded-xl border border-white/5 bg-black/20 text-zinc-400 text-sm cursor-not-allowed" />
                  </div>
                </div>
                {mlh !== null && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center"><p className="text-[9px] text-cyan-500 uppercase tracking-wider font-bold mb-1">mL/h</p><p className="text-lg font-mono text-cyan-300">{mlh.toFixed(2)}</p></div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center"><p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Macro gts/min</p><p className="text-lg font-mono text-white">{macro!.toFixed(1)}</p></div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center"><p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Micro gts/min</p><p className="text-lg font-mono text-white">{micro!.toFixed(1)}</p></div>
                  </div>
                )}
                <p className="text-[10px] text-zinc-600 italic">Macrogotas: 20 gts/mL · Microgotas: 60 gts/mL</p>
              </div>
            );
          })()}

          {/* ─ Conversão ─ */}
          {calcTab === 'conversao' && (() => {
            const v = Number(convValor) || 0;
            const p = Number(inputPeso) || 70;
            let resultado = '';
            if (convDe === 'mcgkgmin') resultado = `${(v * p * 60 / 1000).toFixed(2)} mg/h`;
            else if (convDe === 'mcgmin') resultado = `${(v * 60 / 1000).toFixed(2)} mg/h`;
            else if (convDe === 'mlh_macro') resultado = `${(v * 20 / 60).toFixed(1)} gts/min (macro) · ${(v).toFixed(1)} microgotas/min`;
            else resultado = `${(v / 3).toFixed(1)} gts/min (macro) · ${(v).toFixed(1)} microgotas/min`;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Converter de</label>
                    <select value={convDe} onChange={e => setConvDe(e.target.value as 'mcgkgmin' | 'mcgmin' | 'mlh_macro' | 'mlh_micro')}
                      className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/40 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors">
                      <option value="mcgkgmin">mcg/kg/min → mg/h</option>
                      <option value="mcgmin">mcg/min → mg/h</option>
                      <option value="mlh_macro">mL/h → gotas/min</option>
                      <option value="mlh_micro">microgotas/min → gotas/min</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Valor</label>
                    <input type="number" value={convValor} onChange={e => setConvValor(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/40 text-zinc-100 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
                  </div>
                </div>
                {(convDe === 'mcgkgmin') && (
                  <p className="text-[10px] text-zinc-500">Peso usado: {p} kg (do campo acima)</p>
                )}
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-[9px] text-cyan-500 uppercase tracking-wider font-bold mb-1">Resultado</p>
                  <p className="text-base font-mono text-cyan-300">{resultado}</p>
                </div>
              </div>
            );
          })()}

          {/* ─ Protocolos ─ */}
          {calcTab === 'protocolos' && (() => {
            const pesoCalc = Number(inputPeso) || 70;
            const prot = PROTOCOLOS_CALC.find(p => p.id === protCalcSel)!;
            const colors = getProtocoloColors(prot.cor);
            return (
              <div className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {PROTOCOLOS_CALC.map(p => {
                    const c = getProtocoloColors(p.cor);
                    return (
                      <button key={p.id} onClick={() => setProtCalcSel(p.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${protCalcSel === p.id ? c.active : c.chip}`}>
                        {p.nome}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-500 italic">{prot.descricao}</p>
                <div className="space-y-2">
                  {prot.drogas.map(droga => {
                    const doses = calcDoseProtocolo(droga, pesoCalc);
                    return (
                      <div key={droga.nome} className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <p className="text-xs font-bold text-white mb-2">{droga.nome}</p>
                        {doses.map((d, i) => (
                          <div key={i} className="flex justify-between items-baseline text-[11px] py-0.5">
                            <span className="text-zinc-500">{d.label}</span>
                            <span className="font-mono text-zinc-300">{d.valor} <span className="text-cyan-400">→ {d.mL}</span></span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-600 italic">Peso: {pesoCalc} kg · Concentrações padrão; confirme com protocolo institucional.</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Protocols ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Protocolos Rápidos</span>
          </div>
          {protocoloAtivo && (
            <button
              onClick={() => { setProtocoloSelecionado(null); setPrescricao([]); setInteracoes(null); }}
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

      {/* ── Floating pill cart button ──────────────────────────── */}
      <AnimatePresence>
        {prescricao.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 16 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            onClick={() => setShowChecklist(true)}
            title="Prescrição atual"
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-cyan-500 text-black shadow-xl shadow-cyan-500/30 flex items-center justify-center z-40 hover:bg-cyan-400 active:scale-95 transition-colors"
          >
            <Pill className="w-6 h-6" />
            <motion.span
              key={prescricao.length}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black text-cyan-400 border border-cyan-500/50 flex items-center justify-center text-[10px] font-black"
            >
              {prescricao.length}
            </motion.span>
            {interacoesLocais.some(i => i.severidade === 'critica') && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-black absolute -bottom-0.5 -right-0.5" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Checklist drawer (left) ────────────────────────────── */}
      <AnimatePresence>
        {showChecklist && (
          <>
            {/* Overlay — click right side to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              onClick={() => setShowChecklist(false)}
            />
            {/* Panel — slides from left */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 bottom-0 z-50 bg-[#0a0a0a] border-r border-white/10 flex flex-col"
              style={{ width: 'min(360px, 85vw)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="overflow-y-auto flex-1">
                <div className="p-5 space-y-5 pb-10">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        Prescrição Atual
                        {protocoloAtivo && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-normal ${getProtocoloColors(protocoloAtivo.cor).chip}`}>
                            {protocoloAtivo.nome}
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">{prescricao.length} medicamento(s)</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setPrescricao([]);
                          setInteracoes(null);
                          setSugestaoPrescrição(null);
                          setProtocoloSelecionado(null);
                          setQuantidades({});
                          setDosesRaw({});
                        }}
                        className="h-8 px-3 rounded-full text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Limpar
                      </button>
                      <button
                        onClick={() => setShowChecklist(false)}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Drug list with dose inputs */}
                  <div className="space-y-2">
                    {prescricao.map(droga => {
                      const bolus = droga.doseBolus;
                      const infusao = droga.doseInfusao;
                      const ref = bolus ?? (infusao ? { min: infusao.min, max: infusao.max, unidade: infusao.unidade } : null);
                      const defaultDose = ref ? ref.min : 1;
                      const dose = quantidades[droga.nome] ?? defaultDose;
                      const isHigh = ref && dose > ref.max;
                      return (
                        <div key={droga.nome} className={`p-3 rounded-2xl border space-y-2 transition-colors ${isHigh ? 'bg-amber-500/5 border-amber-500/30' : 'bg-white/5 border-white/5'}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{droga.nome}</p>
                              <span className={`inline-block px-1.5 py-0.5 mt-0.5 text-[9px] uppercase tracking-widest font-bold border rounded ${getDrugClassColor(droga.classe)}`}>
                                {droga.classe}
                              </span>
                            </div>
                            {/* Dose input */}
                            {ref ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  min={0}
                                  step={ref.unidade.includes('mcg') ? 0.1 : 0.05}
                                  value={dosesRaw[droga.nome] ?? String(dose)}
                                  onChange={e => {
                                    const raw = e.target.value;
                                    setDosesRaw(r => ({ ...r, [droga.nome]: raw }));
                                    const v = parseFloat(raw);
                                    if (!isNaN(v)) setQuantidades(q => ({ ...q, [droga.nome]: v }));
                                  }}
                                  className={`w-16 h-8 px-2 rounded-lg border text-sm font-mono text-center bg-black/40 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isHigh ? 'border-amber-500/50 text-amber-300' : 'border-white/10 text-white focus:border-cyan-500/50'}`}
                                />
                                <span className="text-[10px] text-zinc-500 whitespace-nowrap">{ref.unidade}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-600 italic">sem dose padrão</span>
                            )}
                            {/* Remove */}
                            <button
                              onClick={() => togglePrescricao(droga)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {/* High dose warning */}
                          {isHigh && (
                            <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                              <TriangleAlert className="w-3 h-3 shrink-0" />
                              <span>Dose acima do máximo recomendado ({ref!.max} {ref!.unidade})</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Automatic local interactions */}
                  {interacoesLocais.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Interações Detectadas
                      </p>
                      {interacoesLocais.map((interacao, i) => {
                        const severidadeStyle = {
                          critica:  'border-rose-500/30 bg-rose-500/10 text-rose-300',
                          moderada: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                          info:     'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
                        }[interacao.severidade];
                        const iconColor = {
                          critica:  'text-rose-400',
                          moderada: 'text-amber-400',
                          info:     'text-cyan-400',
                        }[interacao.severidade];
                        return (
                          <div key={i} className={`p-3 rounded-2xl border ${severidadeStyle}`}>
                            <div className="flex items-start gap-2">
                              <TriangleAlert className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${iconColor}`} />
                              <div>
                                <p className="text-xs font-bold">{interacao.titulo}</p>
                                <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{interacao.mensagem}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* AI buttons */}
                  <div className="space-y-3">
                    {/* Verificar interações por IA */}
                    {prescricao.length >= 2 && (
                      <div className="space-y-2">
                        <Button
                          onClick={handleCheckInteractions}
                          disabled={isCheckingInteractions}
                          className="w-full bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                        >
                          {isCheckingInteractions ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Verificar Interações (IA)
                        </Button>
                        {interacoes && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-2xl bg-black/40 border border-indigo-500/20"
                          >
                            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-3">
                              <Sparkles className="w-3 h-3" />
                              Análise de Interações (IA)
                            </p>
                            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500 prose-strong:text-indigo-300">
                              <Markdown>{interacoes}</Markdown>
                            </div>
                            <AiDisclaimer />
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Sugestão de prescrição (espelhada do bloco principal) */}
                    {sugestaoPrescrição && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-3"
                      >
                        <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <Brain className="w-3 h-3" />
                          Sugestão — {cenarioPrescricao}
                        </p>
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-purple-500 prose-strong:text-purple-300 prose-headings:text-purple-300">
                          <Markdown>{sugestaoPrescrição}</Markdown>
                        </div>
                        <AiDisclaimer />
                      </motion.div>
                    )}

                  </div>

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Class filter chips ────────────────────────────────── */}
      <div
        ref={filterRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none select-none"
        style={{ cursor: isDraggingFilter.current ? 'grabbing' : 'grab' }}
        onMouseDown={(e) => {
          if (!filterRef.current) return;
          isDraggingFilter.current = true;
          dragStart.current = { x: e.pageX, scrollLeft: filterRef.current.scrollLeft };
          filterRef.current.style.cursor = 'grabbing';
        }}
        onMouseMove={(e) => {
          if (!isDraggingFilter.current || !filterRef.current) return;
          e.preventDefault();
          filterRef.current.scrollLeft = dragStart.current.scrollLeft - (e.pageX - dragStart.current.x);
        }}
        onMouseUp={() => {
          isDraggingFilter.current = false;
          if (filterRef.current) filterRef.current.style.cursor = 'grab';
        }}
        onMouseLeave={() => {
          isDraggingFilter.current = false;
          if (filterRef.current) filterRef.current.style.cursor = 'grab';
        }}
      >
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

            const isExpanded = expandedCard === droga.nome;
            const hasAlergia = (pacienteContext?.alergias ?? []).some(
              a => droga.nome.toLowerCase().includes(a.toLowerCase()) || droga.classe.toLowerCase().includes(a.toLowerCase())
            );

            return (
              <motion.div
                key={droga.nome}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
              >
                <Card className={`transition-all ${
                  isSelected
                    ? 'border-indigo-500/50 bg-indigo-950/10 shadow-[0_0_20px_rgba(99,102,241,0.08)]'
                    : 'hover:border-white/10 bg-zinc-900/20'
                }`}>
                  {/* Card header — always visible, click to expand */}
                  <div
                    className="flex items-center justify-between gap-2 p-4 cursor-pointer select-none"
                    onClick={() => setExpandedCard(isExpanded ? null : droga.nome)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">{droga.nome}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-[9px] uppercase tracking-widest font-bold border rounded-md ${classColor}`}>
                          {hasAlergia && <TriangleAlert className="w-2.5 h-2.5" />}
                          {droga.classe}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); togglePrescricao(droga); }}
                      className={`w-8 h-8 rounded-full shrink-0 transition-all ${
                        isSelected
                          ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Expandable content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-white/5 pt-3">
                          {/* Allergy alert */}
                          {hasAlergia && (
                            <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                              <TriangleAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <p className="text-[11px] text-rose-300 font-medium">Possível alergia registrada — confirme com paciente</p>
                            </div>
                          )}

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
                              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
                                <Droplets className="w-3 h-3 text-zinc-600 shrink-0" />
                                <p className="text-[10px] text-zinc-600 font-mono leading-tight">{getDilucaoText(droga)}</p>
                              </div>
                            </div>
                          )}

                          {/* Clinical alert */}
                          {calculo.alerta && (
                            <div className="flex items-start gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-rose-300 leading-relaxed">{calculo.alerta}</p>
                            </div>
                          )}

                          {/* Ampoule / observations */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                            <Droplets className="w-3 h-3 text-zinc-600 shrink-0" />
                            <p className="text-[10px] text-zinc-600 font-mono">{getDilucaoText(droga)}</p>
                          </div>
                          {droga.observacoes && (
                            <p className="text-[10px] text-zinc-600 italic leading-relaxed">{droga.observacoes}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
