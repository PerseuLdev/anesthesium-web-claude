import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, Activity, AlertTriangle, Copy, Check,
  Loader2, Sparkles, ChevronDown, ChevronRight,
  Zap, Droplets, FlaskConical, User,
  Download, Clock, X,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { useSessionStore, GasometriaSnapshot } from '../lib/storage/sessionStore';
import { usePatientStore } from '../lib/storage/patientStore';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  calcularG3Pro,
  G3ProInput,
  G3ProResult,
  G3PRO_REFS,
} from '../lib/clinical/g3pro';
import { useHistoryStore } from '../lib/storage/historyStore';
import { gerarInterpretacaoG3Pro } from '../lib/services/clinicalAiService';
import { AiDisclaimer } from '../components/AiDisclaimer';

// ─── Tipos de Tab ────────────────────────────────────────────
type InputTab = 'antropometria' | 'pressoes' | 'gases' | 'eletrolitos';
type ResultTab = 'hemo' | 'acido_base' | 'eletrolitos';

// ─── Disponibilidade de grupos opcionais ─────────────────────
interface DisponibilidadeState {
  gasometriaVenosa: boolean;
  pressaoPulmonar: boolean;
  variacaoPressao: boolean;
}

// Defaults dos grupos quando habilitados
const GROUP_DEFAULTS = {
  gasometriaVenosa: { svo2: 70, pvo2: 38, pvco2: 46 },
  pressaoPulmonar:  { papm: 18, pcp: 10 },
  variacaoPressao:  { pp_max: 125, pp_min: 110 },
};

// ─── Defaults ────────────────────────────────────────────────
const DEFAULTS: G3ProInput = {
  peso: 70, altura: 170, idade: 55, sexo: 'M',
  fc: 80, pas: 120, pad: 75, pvc: 8,
  papm: null, pcp: null,
  pp_max: null, pp_min: null,
  hb: 12, sao2: 97, pao2: 95, paco2: 40,
  ph: 7.40, hco3: 24, lactato: 1.2,
  svo2: null, pvo2: null, pvco2: null,
  na: 140, cl: 104, k: 4.0, ca: 9.0, mg: 2.0, fosfato: 3.5,
  alb: 3.5, glicose: 100, ureia: 35, osm_medida: 290,
};

// ─── Helper: valor colorido ───────────────────────────────────
function getValueColor(value: number, min: number, max: number): string {
  if (value < min) return 'text-rose-400';
  if (value > max) return 'text-emerald-400';
  return 'text-cyan-400';
}

interface ColoredValueProps {
  value: number;
  refKey: keyof typeof G3PRO_REFS;
  decimals?: number;
  unit?: string;
}
function ColoredValue({ value, refKey, decimals = 1, unit }: ColoredValueProps) {
  const ref = G3PRO_REFS[refKey];
  const color = getValueColor(value, ref.min, ref.max);
  const formatted = decimals === 0 ? Math.round(value).toString() : value.toFixed(decimals);
  return (
    <span className={`font-mono font-bold tabular-nums ${color}`}>
      {formatted}
      {unit && <span className="text-zinc-500 text-[10px] font-sans ml-0.5">{unit}</span>}
    </span>
  );
}

// ─── Helper: valor nullable ───────────────────────────────────
function NAValue() {
  return <span className="font-mono text-zinc-500 text-sm">N/A</span>;
}

interface NullableColoredValueProps extends Omit<ColoredValueProps, 'value'> {
  value: number | null;
}
function NullableColoredValue({ value, ...rest }: NullableColoredValueProps) {
  if (value === null) return <NAValue />;
  return <ColoredValue value={value} {...rest} />;
}

function NullableValue({ value, decimals = 1, unit }: { value: number | null; decimals?: number; unit?: string }) {
  if (value === null) return <NAValue />;
  const formatted = decimals === 0 ? Math.round(value).toString() : value.toFixed(decimals);
  return (
    <span className="font-mono font-bold text-zinc-200">
      {formatted}
      {unit && <span className="text-zinc-500 text-[10px] font-sans ml-0.5">{unit}</span>}
    </span>
  );
}

// ─── Helper: row de resultado ─────────────────────────────────
function ResultRow({
  label, children, ref_range,
}: { label: string; children: React.ReactNode; ref_range?: string }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">{label}</span>
      <div className="flex items-baseline gap-2">
        {children}
        {ref_range && <span className="text-[10px] text-zinc-600 font-mono">[{ref_range}]</span>}
      </div>
    </div>
  );
}

// ─── Componente de Input numérico local ───────────────────────
interface NumInputProps {
  label: string;
  name: keyof G3ProInput;
  value: number | null;
  onChange: (name: keyof G3ProInput, val: number) => void;
  placeholder?: string;
  step?: string;
  disabled?: boolean;
}
function NumInput({ label, name, value, onChange, placeholder, step = '0.1', disabled }: NumInputProps) {
  if (disabled) {
    return (
      <div>
        <label className="block text-xs text-zinc-600 mb-2 uppercase tracking-wider font-mono">{label}</label>
        <div className="h-10 flex items-center px-3 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-600 text-sm font-mono cursor-not-allowed select-none">
          N/D
        </div>
      </div>
    );
  }
  return (
    <Input
      label={label}
      type="number"
      step={step}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(name, parseFloat(e.target.value) || 0)}
    />
  );
}

// ─── Toggle de grupo de dados ─────────────────────────────────
function ToggleGrupo({
  label, descricao, enabled, onToggle,
}: { label: string; descricao: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-between w-full py-2.5 px-3 rounded-xl border transition-all ${
        enabled
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          : 'border-white/8 bg-white/[0.02] text-zinc-500 hover:border-white/15 hover:bg-white/5'
      }`}
    >
      <div className="text-left">
        <span className="text-[10px] uppercase tracking-widest font-mono block">{label}</span>
        <span className="text-[9px] text-zinc-600 font-mono">{descricao}</span>
      </div>
      <div className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ml-3 ${enabled ? 'bg-rose-500' : 'bg-zinc-700'}`}>
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
    </button>
  );
}

// ─── Aviso de dados indisponíveis ─────────────────────────────
function AvailabilityNotice({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
      <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Accordion de seção de resultado ─────────────────────────
function ResultSection({
  id, title, icon: Icon, iconColor, badge, isOpen, onToggle, children,
}: {
  id: ResultTab;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden bg-black/20">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-bold uppercase tracking-widest text-zinc-200">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              {badge}
            </span>
          )}
        </div>
        {isOpen
          ? <ChevronDown className="w-4 h-4 text-zinc-500" />
          : <ChevronRight className="w-4 h-4 text-zinc-500" />
        }
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 28 }}
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Banner: importar dados de gasometria ─────────────────────
interface GasometriaBannerProps {
  snapshot: GasometriaSnapshot;
  onImport: () => void;
  onDismiss: () => void;
}

function GasometriaBanner({ snapshot, onImport, onDismiss }: GasometriaBannerProps) {
  const ageLabel = (() => {
    const diffMin = Math.floor((Date.now() - new Date(snapshot.capturedAt).getTime()) / 60000);
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin === 1) return '1 min atrás';
    if (diffMin < 60) return `${diffMin} min atrás`;
    const h = Math.floor(diffMin / 60);
    return h === 1 ? '1 h atrás' : `${h} h atrás`;
  })();

  const campos = ['pH', 'PaCO2', 'HCO3', snapshot.PaO2 != null ? 'PaO2' : null, 'Lactato', 'Na', 'Cl', 'Alb']
    .filter(Boolean).join(' · ');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3"
    >
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Download className="w-4 h-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
          Dados de Gasometria Disponíveis
        </p>
        <p className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
          <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
          {ageLabel} &nbsp;·&nbsp; {campos}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onImport}
          className="h-8 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider hover:bg-amber-500/30 transition-colors"
        >
          Importar
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          aria-label="Ignorar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export function Hemodinamica() {
  const [formData, setFormData] = useState<G3ProInput>(DEFAULTS);
  const [disponivel, setDisponivel] = useState<DisponibilidadeState>({
    gasometriaVenosa: false,
    pressaoPulmonar:  false,
    variacaoPressao:  false,
  });
  const [activeInputTab, setActiveInputTab] = useState<InputTab>('antropometria');
  const [resultado, setResultado] = useState<G3ProResult | null>(null);
  const [openSections, setOpenSections] = useState<Record<ResultTab, boolean>>({
    hemo: true, acido_base: false, eletrolitos: false,
  });
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentAvaliacaoId, setCurrentAvaliacaoId] = useState<string | null>(null);

  const addAvaliacao = useHistoryStore((s) => s.addAvaliacao);
  const updateAvaliacao = useHistoryStore((s) => s.updateAvaliacao);
  const currentPatient = usePatientStore((s) => s.currentPatient);
  const addEvaluationToPatient = usePatientStore((s) => s.addEvaluationToPatient);

  const gasometriaSnapshot = useSessionStore((s) => s.gasometriaSnapshot);
  const bannerDismissed    = useSessionStore((s) => s.bannerDismissed);
  const dismissBanner      = useSessionStore((s) => s.dismissBanner);
  const showImportBanner   = gasometriaSnapshot !== null && !bannerDismissed;
  const setPacienteContext = useSessionStore((s) => s.setPacienteContext);

  const handleChange = (name: keyof G3ProInput, val: number | string) => {
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleToggleGrupo = (grupo: keyof DisponibilidadeState) => {
    const novoEstado = !disponivel[grupo];
    setDisponivel((prev) => ({ ...prev, [grupo]: novoEstado }));
    if (novoEstado) {
      setFormData((prev) => ({ ...prev, ...GROUP_DEFAULTS[grupo] }));
    } else {
      const nullValues = Object.fromEntries(
        Object.keys(GROUP_DEFAULTS[grupo]).map((k) => [k, null])
      );
      setFormData((prev) => ({ ...prev, ...nullValues }));
    }
  };

  const handleImportGasometria = () => {
    if (!gasometriaSnapshot) return;
    setFormData((prev) => ({
      ...prev,
      ph:      gasometriaSnapshot.pH,
      paco2:   gasometriaSnapshot.PaCO2,
      hco3:    gasometriaSnapshot.HCO3,
      pao2:    gasometriaSnapshot.PaO2 ?? prev.pao2,
      lactato: gasometriaSnapshot.Lactato,
      na:      gasometriaSnapshot.Na,
      cl:      gasometriaSnapshot.Cl,
      alb:     gasometriaSnapshot.Albumina,
    }));
    setActiveInputTab('gases');
    dismissBanner();
  };

  const handleCalcular = (e: React.FormEvent) => {
    e.preventDefault();
    const res = calcularG3Pro(formData);
    setResultado(res);
    setAiSuggestion(null);
    setCopied(false);
    setOpenSections({ hemo: true, acido_base: true, eletrolitos: true });
    setPacienteContext({
      peso:   formData.peso,
      altura: formData.altura,
      idade:  formData.idade,
      sexo:   formData.sexo,
      capturedAt: new Date().toISOString(),
    });
    const id = addAvaliacao({
      pacienteId: currentPatient?.nome ?? `G3-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      patientRecordId: currentPatient?.id,
      tipo: 'Hemodinamica',
      dados: formData,
      resultado: res,
    });
    setCurrentAvaliacaoId(id);
    if (currentPatient) addEvaluationToPatient(id);
  };

  const handleGenerateAi = async () => {
    if (!resultado) return;
    setIsGeneratingAi(true);
    try {
      const plan = await gerarInterpretacaoG3Pro(formData, resultado);
      setAiSuggestion(plan);
      if (currentAvaliacaoId) updateAvaliacao(currentAvaliacaoId, { aiSuggestion: plan });
    } catch {
      alert('Erro ao gerar interpretação. Verifique a conexão e tente novamente.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopy = () => {
    if (!resultado) return;
    const { hemo, acido_base, eletrolitos } = resultado;
    const fmtN = (v: number | null, d = 1) => v !== null ? v.toFixed(d) : 'N/A';
    const text = [
      '═══ G3-Pro · Análise Hemodinâmica Integrada ═══',
      `IC: ${fmtN(hemo.ic, 2)} L/min/m² | IRVS: ${fmtN(hemo.irvs, 0)} | DeltaPP: ${hemo.deltapp !== null ? hemo.deltapp.toFixed(1) + '%' : 'N/A'}`,
      `Gap CO2: ${fmtN(hemo.gap_co2)} mmHg | Ratio: ${fmtN(hemo.ratio, 2)} | CPO: ${fmtN(hemo.cpo, 2)} W`,
      `Lactato: ${formData.lactato} mmol/L | ERO2: ${hemo.ero2 !== null ? hemo.ero2.toFixed(1) + '%' : 'N/A'}`,
      hemo.choque ? `Padrão: CHOQUE ${hemo.choque.toUpperCase()}` : '',
      '',
      '─── Ácido-Base ───',
      `${acido_base.diag_primario}`,
      acido_base.diag_secundario || '',
      `AG corrigido: ${acido_base.ag_corr.toFixed(1)} | SIG: ${acido_base.sig.toFixed(1)}`,
      '',
      '─── Eletrólitos ───',
      `Na corr: ${eletrolitos.na_corr.toFixed(1)} | K real: ${eletrolitos.k_real.toFixed(1)} | Ca corr: ${eletrolitos.ca_corr.toFixed(1)}`,
      `Gap Osm: ${eletrolitos.gap_osm.toFixed(1)} | Prod Ca×P: ${eletrolitos.prod_ca_p.toFixed(1)}`,
      aiSuggestion ? `\n═══ Interpretação IA ═══\n${aiSuggestion}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleSection = (id: ResultTab) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const inputTabs: { id: InputTab; label: string; icon: React.ElementType }[] = [
    { id: 'antropometria', label: 'Paciente', icon: User },
    { id: 'pressoes',      label: 'Pressões', icon: Activity },
    { id: 'gases',         label: 'Gases', icon: Droplets },
    { id: 'eletrolitos',   label: 'Eletrólitos', icon: FlaskConical },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center">
          <Heart className="w-6 h-6 text-rose-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white uppercase">
            G3-Pro · Hemodinâmica
          </h1>
          <p className="text-zinc-500 text-sm font-mono mt-1">
            INTEGRATED HEMODYNAMIC DECISION ENGINE · Fick + Boston + Stewart
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ══ COLUNA ESQUERDA — INPUTS ══ */}
        <div className="lg:col-span-5">
          <form onSubmit={handleCalcular} className="space-y-5">

            {/* Banner de importação da gasometria */}
            <AnimatePresence>
              {showImportBanner && (
                <GasometriaBanner
                  snapshot={gasometriaSnapshot!}
                  onImport={handleImportGasometria}
                  onDismiss={dismissBanner}
                />
              )}
            </AnimatePresence>

            {/* Tabs de input */}
            <div className="grid grid-cols-4 p-1 bg-black/40 border border-white/5 rounded-xl gap-1">
              {inputTabs.map((tab) => {
                const isActive = activeInputTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveInputTab(tab.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                      isActive
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <Card>
              <CardContent className="pt-5">
                <AnimatePresence mode="wait">

                  {/* Tab 1 — Antropometria */}
                  {activeInputTab === 'antropometria' && (
                    <motion.div key="ant" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono border-b border-white/5 pb-2">
                        Antropometria e Identificação
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <NumInput label="Peso (kg)" name="peso" value={formData.peso} onChange={handleChange} placeholder="70" step="0.5" />
                        <NumInput label="Altura (cm)" name="altura" value={formData.altura} onChange={handleChange} placeholder="170" step="1" />
                        <NumInput label="Idade (anos)" name="idade" value={formData.idade} onChange={handleChange} placeholder="55" step="1" />
                        <div>
                          <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider font-mono">Sexo</label>
                          <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl gap-1">
                            {(['M', 'F'] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => handleChange('sexo', s)}
                                className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-widest rounded-lg transition-all ${
                                  formData.sexo === s
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                                }`}
                              >
                                {s === 'M' ? 'Masc' : 'Fem'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 2 — Pressões e Vitais */}
                  {activeInputTab === 'pressoes' && (
                    <motion.div key="pres" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono border-b border-white/5 pb-2">
                        Vitais e Pressões Invasivas
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <NumInput label="FC (bpm)" name="fc" value={formData.fc} onChange={handleChange} placeholder="80" step="1" />
                        <NumInput label="PAS (mmHg)" name="pas" value={formData.pas} onChange={handleChange} placeholder="120" step="1" />
                        <NumInput label="PAD (mmHg)" name="pad" value={formData.pad} onChange={handleChange} placeholder="75" step="1" />
                        <NumInput label="PVC (mmHg)" name="pvc" value={formData.pvc} onChange={handleChange} placeholder="8" step="1" />
                      </div>

                      {/* Toggle — Pressão Pulmonar */}
                      <ToggleGrupo
                        label="Pressão Pulmonar disponível"
                        descricao="Swan-Ganz / Cateter de Artéria Pulmonar"
                        enabled={disponivel.pressaoPulmonar}
                        onToggle={() => handleToggleGrupo('pressaoPulmonar')}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <NumInput label="PAP Média (mmHg)" name="papm" value={formData.papm} onChange={handleChange} placeholder="18" step="1" disabled={!disponivel.pressaoPulmonar} />
                        <NumInput label="PCP / Wedge (mmHg)" name="pcp" value={formData.pcp} onChange={handleChange} placeholder="10" step="1" disabled={!disponivel.pressaoPulmonar} />
                      </div>

                      {/* Toggle — VPP */}
                      <ToggleGrupo
                        label="Variação de Pressão de Pulso disponível"
                        descricao="Ventilação mecânica + linha arterial invasiva"
                        enabled={disponivel.variacaoPressao}
                        onToggle={() => handleToggleGrupo('variacaoPressao')}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <NumInput label="PP Máx (mmHg)" name="pp_max" value={formData.pp_max} onChange={handleChange} placeholder="125" step="1" disabled={!disponivel.variacaoPressao} />
                        <NumInput label="PP Mín (mmHg)" name="pp_min" value={formData.pp_min} onChange={handleChange} placeholder="110" step="1" disabled={!disponivel.variacaoPressao} />
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 3 — Gases e Oximetria */}
                  {activeInputTab === 'gases' && (
                    <motion.div key="gas" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono border-b border-white/5 pb-2">
                        Gasometria e Oximetria
                      </p>
                      <p className="text-[10px] text-rose-400/70 font-mono">— Arterial —</p>
                      <div className="grid grid-cols-2 gap-4">
                        <NumInput label="Hb (g/dL)" name="hb" value={formData.hb} onChange={handleChange} placeholder="12" />
                        <NumInput label="SaO2 (%)" name="sao2" value={formData.sao2} onChange={handleChange} placeholder="97" step="1" />
                        <NumInput label="PaO2 (mmHg)" name="pao2" value={formData.pao2} onChange={handleChange} placeholder="95" step="1" />
                        <NumInput label="PaCO2 (mmHg)" name="paco2" value={formData.paco2} onChange={handleChange} placeholder="40" step="1" />
                        <NumInput label="pH" name="ph" value={formData.ph} onChange={handleChange} placeholder="7.40" step="0.01" />
                        <NumInput label="HCO3 (mEq/L)" name="hco3" value={formData.hco3} onChange={handleChange} placeholder="24" />
                        <NumInput label="Lactato (mmol/L)" name="lactato" value={formData.lactato} onChange={handleChange} placeholder="1.2" />
                      </div>

                      {/* Toggle — Gasometria Venosa */}
                      <ToggleGrupo
                        label="Gasometria venosa disponível"
                        descricao="Linha central — SvO2 / PvO2 / PvCO2"
                        enabled={disponivel.gasometriaVenosa}
                        onToggle={() => handleToggleGrupo('gasometriaVenosa')}
                      />
                      <p className={`text-[10px] font-mono transition-colors ${disponivel.gasometriaVenosa ? 'text-indigo-400/70' : 'text-zinc-600'}`}>
                        — Venoso misto / central —
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <NumInput label="SvO2 (%)" name="svo2" value={formData.svo2} onChange={handleChange} placeholder="70" step="1" disabled={!disponivel.gasometriaVenosa} />
                        <NumInput label="PvO2 (mmHg)" name="pvo2" value={formData.pvo2} onChange={handleChange} placeholder="38" step="1" disabled={!disponivel.gasometriaVenosa} />
                        <NumInput label="PvCO2 (mmHg)" name="pvco2" value={formData.pvco2} onChange={handleChange} placeholder="46" step="1" disabled={!disponivel.gasometriaVenosa} />
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 4 — Eletrólitos */}
                  {activeInputTab === 'eletrolitos' && (
                    <motion.div key="elet" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono border-b border-white/5 pb-2">
                        Eletrólitos e Bioquímica
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <NumInput label="Na⁺ (mEq/L)" name="na" value={formData.na} onChange={handleChange} placeholder="140" step="1" />
                        <NumInput label="Cl⁻ (mEq/L)" name="cl" value={formData.cl} onChange={handleChange} placeholder="104" step="1" />
                        <NumInput label="K⁺ (mEq/L)" name="k" value={formData.k} onChange={handleChange} placeholder="4.0" />
                        <NumInput label="Ca²⁺ (mg/dL)" name="ca" value={formData.ca} onChange={handleChange} placeholder="9.0" />
                        <NumInput label="Mg (mg/dL)" name="mg" value={formData.mg} onChange={handleChange} placeholder="2.0" />
                        <NumInput label="Fosfato (mg/dL)" name="fosfato" value={formData.fosfato} onChange={handleChange} placeholder="3.5" />
                        <NumInput label="Albumina (g/dL)" name="alb" value={formData.alb} onChange={handleChange} placeholder="3.5" />
                        <NumInput label="Glicose (mg/dL)" name="glicose" value={formData.glicose} onChange={handleChange} placeholder="100" step="1" />
                        <NumInput label="Ureia (mg/dL)" name="ureia" value={formData.ureia} onChange={handleChange} placeholder="35" step="1" />
                        <NumInput label="Osm Medida (mOsm/kg)" name="osm_medida" value={formData.osm_medida} onChange={handleChange} placeholder="290" step="1" />
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Navegação entre tabs inline */}
            <div className="flex gap-2">
              {activeInputTab !== 'antropometria' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1 border border-white/10 text-zinc-400"
                  onClick={() => {
                    const order: InputTab[] = ['antropometria', 'pressoes', 'gases', 'eletrolitos'];
                    const idx = order.indexOf(activeInputTab);
                    setActiveInputTab(order[idx - 1]);
                  }}
                >
                  ← Anterior
                </Button>
              )}
              {activeInputTab !== 'eletrolitos' ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                  onClick={() => {
                    const order: InputTab[] = ['antropometria', 'pressoes', 'gases', 'eletrolitos'];
                    const idx = order.indexOf(activeInputTab);
                    setActiveInputTab(order[idx + 1]);
                  }}
                >
                  Próximo →
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 h-12 text-base tracking-widest uppercase text-white bg-rose-500 hover:bg-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]"
                >
                  Calcular G3-Pro
                </Button>
              )}
            </div>

            {/* Botão calcular sempre visível no bottom */}
            {activeInputTab !== 'eletrolitos' && (
              <Button
                type="submit"
                className="w-full h-12 text-base tracking-widest uppercase text-white bg-rose-500/80 hover:bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)] border border-rose-500/30"
              >
                Calcular com dados atuais
              </Button>
            )}

            <p className="text-center text-xs text-zinc-600">
              Parâmetros hemodinâmicos são estimativas calculadas pelo Princípio de Fick.
              Utilize como suporte clínico, não como substituto de medição direta.
            </p>
          </form>
        </div>

        {/* ══ COLUNA DIREITA — RESULTADOS ══ */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {resultado ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                className="space-y-4"
              >
                {/* ── Cabeçalho de resultado ── */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      resultado.hemo.choque
                        ? 'bg-rose-500 animate-pulse'
                        : resultado.hemo.ic === null
                          ? 'bg-zinc-600'
                          : 'bg-emerald-500'
                    }`} />
                    <span className="text-xs text-zinc-400 uppercase tracking-widest font-mono">
                      {resultado.hemo.choque
                        ? `Choque ${resultado.hemo.choque.charAt(0).toUpperCase() + resultado.hemo.choque.slice(1)}`
                        : resultado.hemo.ic === null
                          ? 'Hemodinâmica incompleta'
                          : 'Sem padrão de choque'}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleCopy} className="w-8 h-8 text-zinc-400 hover:text-white">
                    {copied ? <Check className="w-4 h-4 text-rose-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                {/* ── Legenda de cores ── */}
                <div className="flex items-center gap-4 px-1">
                  {[
                    { color: 'bg-cyan-400',    label: 'Normal' },
                    { color: 'bg-rose-400',    label: 'Abaixo' },
                    { color: 'bg-emerald-400', label: 'Acima'  },
                    { color: 'bg-zinc-500',    label: 'N/A'    },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                      <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider">{label}</span>
                    </div>
                  ))}
                </div>

                {/* ── Chips de alerta ── */}
                {(resultado.hemo.alertas.length > 0 || resultado.eletrolitos.alertas.length > 0) && (
                  <div className="space-y-2">
                    {[...resultado.hemo.alertas, ...resultado.eletrolitos.alertas].map((alert, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-300 leading-relaxed">{alert}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Seção 1: Hemodinâmica ── */}
                <ResultSection
                  id="hemo"
                  title="Hemodinâmica e Perfusão"
                  icon={Heart}
                  iconColor="text-rose-400"
                  badge={resultado.hemo.choque ? resultado.hemo.choque : undefined}
                  isOpen={openSections.hemo}
                  onToggle={() => toggleSection('hemo')}
                >
                  <div className="space-y-1 mt-2">

                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mb-3">— Fluxo e Débito (Fick) —</p>

                    {resultado.hemo.ic === null && (
                      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 mb-3">
                        <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">
                          Gasometria venosa não informada — cálculos por Fick indisponíveis
                        </span>
                      </div>
                    )}

                    <ResultRow label="Índice Cardíaco (IC)" ref_range="2.5–4.0 L/min/m²">
                      <NullableColoredValue value={resultado.hemo.ic} refKey="ic" decimals={2} unit="L/min/m²" />
                    </ResultRow>
                    <ResultRow label="Débito Cardíaco (DC)">
                      <NullableValue value={resultado.hemo.dc} decimals={2} unit="L/min" />
                    </ResultRow>
                    <ResultRow label="Vol. Sistólico (VS)" ref_range="60–100 mL">
                      <NullableColoredValue value={resultado.hemo.vs} refKey="vs" decimals={1} unit="mL" />
                    </ResultRow>
                    <ResultRow label="IS (índice)" ref_range="33–50 mL/m²">
                      <NullableColoredValue value={resultado.hemo.is_index} refKey="is_index" decimals={1} unit="mL/m²" />
                    </ResultRow>

                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mb-3 mt-4">— Transporte de O₂ —</p>
                    <ResultRow label="DO2i" ref_range="520–720 mL/min/m²">
                      <NullableColoredValue value={resultado.hemo.do2i} refKey="do2i" decimals={1} unit="mL/min/m²" />
                    </ResultRow>
                    <ResultRow label="Extração O₂ (ERO2)" ref_range="22–30%">
                      <NullableColoredValue value={resultado.hemo.ero2} refKey="ero2" decimals={1} unit="%" />
                    </ResultRow>
                    <ResultRow label="C(a-v)O₂ (DAV)">
                      <NullableValue value={resultado.hemo.dav_o2} decimals={2} unit="mL/dL" />
                    </ResultRow>

                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mb-3 mt-4">— Resistências —</p>
                    <ResultRow label="IRVS" ref_range="1700–2400">
                      <NullableColoredValue value={resultado.hemo.irvs} refKey="irvs" decimals={0} unit="dyn·s·cm⁻⁵·m²" />
                    </ResultRow>
                    <ResultRow label="IRVP" ref_range="< 250">
                      {resultado.hemo.irvp !== null
                        ? <ColoredValue value={resultado.hemo.irvp} refKey="irvp" decimals={0} unit="dyn·s·cm⁻⁵·m²" />
                        : <NAValue />
                      }
                    </ResultRow>
                    <ResultRow label="PAM calc.">
                      <span className="font-mono font-bold text-cyan-400">{resultado.hemo.pam.toFixed(1)} <span className="text-zinc-500 text-[10px]">mmHg</span></span>
                    </ResultRow>

                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mb-3 mt-4">— Contratilidade e Perfusão —</p>
                    <ResultRow label="CPO (Poder Cardíaco)" ref_range="> 0.6W">
                      <NullableColoredValue value={resultado.hemo.cpo} refKey="cpo" decimals={2} unit="W" />
                    </ResultRow>
                    <ResultRow label="LVSWI" ref_range="44–64 g·m/m²">
                      <NullableColoredValue value={resultado.hemo.lvswi} refKey="lvswi" decimals={1} unit="g·m/m²" />
                    </ResultRow>
                    <ResultRow label="RVSWI" ref_range="4–8 g·m/m²">
                      {resultado.hemo.rvswi !== null
                        ? <ColoredValue value={resultado.hemo.rvswi} refKey="rvswi" decimals={1} unit="g·m/m²" />
                        : <NAValue />
                      }
                    </ResultRow>

                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mb-3 mt-4">— Micro-hemodinâmica —</p>
                    <ResultRow label="DeltaPP (fluido-resp.)" ref_range="< 13%">
                      {resultado.hemo.deltapp !== null
                        ? <ColoredValue value={resultado.hemo.deltapp} refKey="deltapp" decimals={1} unit="%" />
                        : <NAValue />
                      }
                    </ResultRow>
                    <ResultRow label="Gap V-A CO₂" ref_range="2–6 mmHg">
                      <NullableColoredValue value={resultado.hemo.gap_co2} refKey="gap_co2" decimals={1} unit="mmHg" />
                    </ResultRow>
                    <ResultRow label="Ratio ΔCO₂/C(a-v)O₂" ref_range="< 1.4">
                      {resultado.hemo.ratio !== null
                        ? <ColoredValue value={resultado.hemo.ratio} refKey="ratio" decimals={2} />
                        : <NAValue />
                      }
                    </ResultRow>
                  </div>
                </ResultSection>

                {/* ── Seção 2: Ácido-Base ── */}
                <ResultSection
                  id="acido_base"
                  title="Ácido-Base e Gases"
                  icon={Activity}
                  iconColor="text-indigo-400"
                  isOpen={openSections.acido_base}
                  onToggle={() => toggleSection('acido_base')}
                >
                  <div className="space-y-1 mt-2">
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                      <p className="text-sm font-bold text-white">{resultado.acido_base.diag_primario}</p>
                      {resultado.acido_base.diag_secundario && (
                        <p className="text-xs text-indigo-300 mt-1 leading-relaxed">{resultado.acido_base.diag_secundario}</p>
                      )}
                    </div>

                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mb-3">— Abordagem de Boston —</p>
                    <ResultRow label="AG corrigido" ref_range="8–12 mEq/L">
                      <ColoredValue value={resultado.acido_base.ag_corr} refKey="ag_corr" decimals={1} unit="mEq/L" />
                    </ResultRow>
                    <ResultRow label="AG bruto">
                      <span className="font-mono font-bold text-zinc-200">{resultado.acido_base.ag.toFixed(1)} <span className="text-zinc-500 text-[10px]">mEq/L</span></span>
                    </ResultRow>
                    <ResultRow label="pCO2 esperada (Winters)">
                      <span className="font-mono font-bold text-zinc-200">{resultado.acido_base.pco2_esp.toFixed(1)} <span className="text-zinc-500 text-[10px]">mmHg</span></span>
                    </ResultRow>
                    <ResultRow label="Delta Gap">
                      <span className={`font-mono font-bold ${resultado.acido_base.delta_gap > 1.6 ? 'text-rose-400' : resultado.acido_base.delta_gap < 1.0 && resultado.acido_base.ag_corr > 12 ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {resultado.acido_base.delta_gap.toFixed(2)}
                      </span>
                    </ResultRow>

                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mb-3 mt-4">— Abordagem de Stewart —</p>
                    <ResultRow label="SIDe">
                      <span className="font-mono font-bold text-zinc-200">{resultado.acido_base.side.toFixed(1)} <span className="text-zinc-500 text-[10px]">mEq/L</span></span>
                    </ResultRow>
                    <ResultRow label="SIG (ânions não medidos)" ref_range="-2 a +2">
                      <ColoredValue value={resultado.acido_base.sig} refKey="sig" decimals={1} unit="mEq/L" />
                    </ResultRow>
                    <ResultRow label="ATOT (tampões fracos)">
                      <span className="font-mono font-bold text-zinc-200">{resultado.acido_base.atot.toFixed(1)}</span>
                    </ResultRow>
                  </div>
                </ResultSection>

                {/* ── Seção 3: Eletrólitos ── */}
                <ResultSection
                  id="eletrolitos"
                  title="Eletrolítico e Metabólico"
                  icon={Zap}
                  iconColor="text-amber-400"
                  isOpen={openSections.eletrolitos}
                  onToggle={() => toggleSection('eletrolitos')}
                >
                  <div className="space-y-1 mt-2">
                    <ResultRow label="Na⁺ corrigido (glicose)" ref_range="135–145 mEq/L">
                      <ColoredValue value={resultado.eletrolitos.na_corr} refKey="na_corr" decimals={1} unit="mEq/L" />
                    </ResultRow>
                    <ResultRow label="K⁺ real (pH-corrigido)" ref_range="3.5–5.1 mEq/L">
                      <ColoredValue value={resultado.eletrolitos.k_real} refKey="k_real" decimals={1} unit="mEq/L" />
                    </ResultRow>
                    <ResultRow label="Ca²⁺ corrigido (albumina)" ref_range="8.5–10.5 mg/dL">
                      <ColoredValue value={resultado.eletrolitos.ca_corr} refKey="ca_corr" decimals={1} unit="mg/dL" />
                    </ResultRow>
                    <ResultRow label="Osmolalidade calc." ref_range="275–295 mOsm/kg">
                      <ColoredValue value={resultado.eletrolitos.osm_calc} refKey="osm_calc" decimals={1} unit="mOsm/kg" />
                    </ResultRow>
                    <ResultRow label="Gap osmolar" ref_range="< 10 mOsm/kg">
                      <ColoredValue value={resultado.eletrolitos.gap_osm} refKey="gap_osm" decimals={1} unit="mOsm/kg" />
                    </ResultRow>
                    <ResultRow label="Produto Ca × P" ref_range="< 55">
                      <ColoredValue value={resultado.eletrolitos.prod_ca_p} refKey="prod_ca_p" decimals={1} />
                    </ResultRow>
                  </div>
                </ResultSection>

                {/* ── Painel de IA ── */}
                <div className="mt-2 pt-2">
                  {!aiSuggestion && !isGeneratingAi ? (
                    <Button
                      onClick={handleGenerateAi}
                      className="w-full h-14 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 tracking-widest uppercase text-sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Interpretação Clínica Integrada (IA)
                    </Button>
                  ) : isGeneratingAi ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mb-3" />
                      <p className="text-sm text-indigo-300 animate-pulse">Analisando plausibilidade clínica dos dados...</p>
                      <p className="text-xs text-zinc-600 mt-1">Fick + Boston + Stewart → IA Intensivista</p>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          Interpretação Clínica Integrada
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateAi}
                          className="h-6 text-[10px] text-indigo-400 hover:text-indigo-300 px-2"
                        >
                          Regerar
                        </Button>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500 prose-strong:text-indigo-300 prose-headings:text-indigo-300 prose-headings:text-sm prose-h2:mt-4 prose-h2:mb-2">
                        <Markdown>{aiSuggestion}</Markdown>
                      </div>
                      <AiDisclaimer />
                    </motion.div>
                  )}
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center p-12"
              >
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full border border-dashed border-zinc-700 flex items-center justify-center mx-auto mb-5">
                    <Heart className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 font-medium text-lg">Aguardando Dados</p>
                  <p className="text-zinc-600 text-sm mt-2 max-w-[300px] mx-auto leading-relaxed">
                    Preencha os parâmetros e pressione{' '}
                    <span className="text-rose-400 font-mono">Calcular G3-Pro</span>{' '}
                    para análise hemodinâmica integrada.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2 text-[10px] text-zinc-600 font-mono">
                    {['Fick', 'Boston', 'Stewart', 'Winters', 'DeltaPP', 'Ratio CO₂'].map((t) => (
                      <span key={t} className="px-2 py-1 rounded-full border border-zinc-800">{t}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
