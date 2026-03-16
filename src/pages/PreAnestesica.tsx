import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Pill,
  User,
  Heart,
  Sparkles,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ASA_CLASSES, MALLAMPATI_CLASSES, CORMACK_LEHANE_CLASSES } from '../constants/escores';
import { calcularApfel, calcularStopBang, calcularGoldman } from '../lib/clinical/escores';
import { useHistoryStore } from '../lib/storage/historyStore';
import { useSessionStore } from '../lib/storage/sessionStore';
import { usePatientStore } from '../lib/storage/patientStore';
import { gerarFichaAnestesica, DadosFichaAnestesica } from '../lib/services/clinicalAiService';
import { MEDICACOES_PERIOP } from '../constants/medicacoesPerio';
import Markdown from 'react-markdown';

// ── Helpers ─────────────────────────────────────────────────────────────────

const normalizeStr = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// ── Checkbox Row ─────────────────────────────────────────────────────────────

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function CheckboxRow({ label, checked, onChange }: CheckboxRowProps) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-800/30 cursor-pointer hover:bg-slate-800/50 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-900 flex-shrink-0"
      />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PreAnestesica() {
  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'ficha' | 'medicacoes'>('ficha');

  // ── SCORES STATE (unified — used across entire Ficha) ─────────────────────
  const [asa, setAsa] = useState(ASA_CLASSES[0]);
  const [mallampati, setMallampati] = useState(MALLAMPATI_CLASSES[0]);
  const [cormack, setCormack] = useState(CORMACK_LEHANE_CLASSES[0]);

  const [apfel, setApfel] = useState({
    sexoFeminino: false,
    naoFumante: false,
    usoOpioides: false,
    historicoNVPO: false,
  });

  const [stopBang, setStopBang] = useState({
    ronco: false,
    cansaco: false,
    apneiaObservada: false,
    pressaoAlta: false,
    imcMaior35: false,
    idadeMaior50: false,
    circunferenciaPescoco: false,
    sexoMasculino: false,
  });

  const [goldman, setGoldman] = useState({
    cirurgiaAltoRisco: false,
    historiaDoencaIsquemica: false,
    historiaInsuficienciaCardiaca: false,
    historiaDoencaCerebrovascular: false,
    diabetesInsulinoDependente: false,
    creatininaMaior2: false,
  });

  const [lemon, setLemon] = useState({
    aparenciaAnormal: false,
    regra332: false,
    mallampatiIIIIV: false,
    obstrucao: false,
    cervicalLimitada: false,
  });

  const [obese, setObese] = useState({
    imcMaior26: false,
    barba: false,
    edentulo: false,
    roncoSaos: false,
    idadeMaior55: false,
  });

  // ── TAB 2 STATE (Ficha Pré-Anestésica) ────────────────────────────────────
  const [fichaIdade, setFichaIdade] = useState<number | ''>('');
  const [fichaPeso, setFichaPeso] = useState<number | ''>('');
  const [fichaAltura, setFichaAltura] = useState<number | ''>('');
  const [fichaEmergencia, setFichaEmergencia] = useState(false);
  const [fichaULBT, setFichaULBT] = useState(1);
  const [fichaMETs, setFichaMETs] = useState<'baixo' | 'alto'>('baixo');
  const [fichaARISCAT, setFichaARISCAT] = useState<number | ''>('');
  const [fichaAlergias, setFichaAlergias] = useState('');
  const [fichaAiSuggestion, setFichaAiSuggestion] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // ── TAB 3 STATE (Medicações) ───────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // ── Session / History stores ───────────────────────────────────────────────
  const setPacienteContext = useSessionStore((s) => s.setPacienteContext);
  const addAvaliacao = useHistoryStore((s) => s.addAvaliacao);
  const currentPatient = usePatientStore((s) => s.currentPatient);
  const addEvaluationToPatient = usePatientStore((s) => s.addEvaluationToPatient);

  // ── Computed: Scores ───────────────────────────────────────────────────────
  const resApfel = calcularApfel(apfel);
  const resStopBang = calcularStopBang(stopBang);
  const resGoldman = calcularGoldman(goldman);
  const lemonScore = Object.values(lemon).filter(Boolean).length;
  const obeseScore = Object.values(obese).filter(Boolean).length;

  // ── Computed: Tab 2 ────────────────────────────────────────────────────────
  const fichaBMI =
    fichaAltura && fichaPeso
      ? Number(fichaPeso) / Math.pow(Number(fichaAltura) / 100, 2)
      : null;

  // ── Pre-populate ficha from patientStore when patient changes ─────────────
  useEffect(() => {
    if (currentPatient) {
      if (currentPatient.idade != null) setFichaIdade(currentPatient.idade);
      if (currentPatient.peso != null) setFichaPeso(currentPatient.peso);
      if (currentPatient.altura != null) setFichaAltura(currentPatient.altura);
      if (currentPatient.alergias?.length) {
        setFichaAlergias(currentPatient.alergias.join(', '));
      }
      // NOTE: ASA, Mallampati, Cormack are NOT auto-filled — require clinical evaluation
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatient?.id]);

  // ── Save PacienteContext when ficha data changes ───────────────────────────
  useEffect(() => {
    if (fichaPeso && fichaAltura && fichaIdade) {
      const alergiasParsed = fichaAlergias
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      setPacienteContext({
        peso: Number(fichaPeso),
        altura: Number(fichaAltura),
        idade: Number(fichaIdade),
        alergias: alergiasParsed.length > 0 ? alergiasParsed : undefined,
        capturedAt: new Date().toISOString(),
      });
    }
  }, [fichaPeso, fichaAltura, fichaIdade, fichaAlergias, setPacienteContext]);

  // ── Auto-save on unmount ───────────────────────────────────────────────────
  const stateRef = useRef({ asa, mallampati, cormack, resApfel, resStopBang, resGoldman, lemonScore, obeseScore, currentPatient, addEvaluationToPatient });

  useEffect(() => {
    stateRef.current = { asa, mallampati, cormack, resApfel, resStopBang, resGoldman, lemonScore, obeseScore, currentPatient, addEvaluationToPatient };
  }, [asa, mallampati, cormack, resApfel, resStopBang, resGoldman, lemonScore, obeseScore, currentPatient, addEvaluationToPatient]);

  useEffect(() => {
    return () => {
      const c = stateRef.current;
      if (
        c.resApfel.probabilidade > 10 ||
        c.resStopBang.score > 0 ||
        c.resGoldman.score > 0 ||
        c.asa.id !== 'I' ||
        c.lemonScore > 0 ||
        c.obeseScore > 0
      ) {
        const id = addAvaliacao({
          pacienteId: c.currentPatient?.nome ?? `PAC-${Math.floor(Math.random() * 10000)}`,
          patientRecordId: c.currentPatient?.id,
          tipo: 'Escores',
          dados: {
            asa: c.asa.id,
            mallampati: c.mallampati.id,
            cormack: c.cormack.id,
            lemon: c.lemonScore,
            obese: c.obeseScore,
          },
          resultado: {
            apfel: c.resApfel,
            stopBang: c.resStopBang,
            goldman: c.resGoldman,
          },
        });
        if (c.currentPatient) c.addEvaluationToPatient(id);
      }
    };
  }, [addAvaliacao]);

  // ── AI handler ─────────────────────────────────────────────────────────────
  const handleGerarFicha = async () => {
    setIsGeneratingAi(true);
    setFichaAiSuggestion(null);
    try {
      const dados: DadosFichaAnestesica = {
        idade: fichaIdade ? Number(fichaIdade) : undefined,
        peso: fichaPeso ? Number(fichaPeso) : undefined,
        altura: fichaAltura ? Number(fichaAltura) : undefined,
        imc: fichaBMI ?? undefined,
        asaClass: asa.id,
        emergencia: fichaEmergencia,
        mallampatiClass: mallampati.id,
        ulbt: fichaULBT,
        lemonScore: lemonScore,
        obeseScore: obeseScore,
        rcriScore: resGoldman.score,
        mets: fichaMETs === 'alto' ? 5 : 3,
        ariscatScore: fichaARISCAT ? Number(fichaARISCAT) : undefined,
      };
      const result = await gerarFichaAnestesica(dados);
      setFichaAiSuggestion(result);
    } catch {
      alert('Erro ao gerar análise. Verifique sua conexão.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // ── Medication filtering ───────────────────────────────────────────────────
  const filteredMeds = searchQuery.trim()
    ? MEDICACOES_PERIOP.filter((m) => {
        const q = normalizeStr(searchQuery);
        return (
          normalizeStr(m.classe).includes(q) ||
          m.drogas.some((d) => normalizeStr(d).includes(q))
        );
      })
    : MEDICACOES_PERIOP;

  // ── Manejo color helpers ───────────────────────────────────────────────────
  const manejoColor = {
    MANTER: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    SUSPENDER: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    AVALIAR: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/20 rounded-2xl">
          <ClipboardCheck className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Avaliação Pré-Anestésica</h1>
          <p className="text-slate-400 text-sm">Ficha unificada com escores e medicações perioperatórias</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl">
        {[
          { id: 'ficha', icon: User, label: 'Ficha Pré-Anestésica' },
          { id: 'medicacoes', icon: Pill, label: 'Medicações' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─────────────────────────────── TAB 1: FICHA PRÉ-ANESTÉSICA ──────── */}
      {activeTab === 'ficha' && (
        <motion.div
          key="ficha"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Patient data */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados do Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Idade (anos)"
                  type="number"
                  min={0}
                  max={120}
                  placeholder="Ex: 45"
                  value={fichaIdade}
                  onChange={(e) =>
                    setFichaIdade(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
                <Input
                  label="Peso (kg)"
                  type="number"
                  min={0}
                  placeholder="Ex: 70"
                  value={fichaPeso}
                  onChange={(e) =>
                    setFichaPeso(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
                <Input
                  label="Altura (cm)"
                  type="number"
                  min={0}
                  placeholder="Ex: 170"
                  value={fichaAltura}
                  onChange={(e) =>
                    setFichaAltura(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>
              {fichaBMI !== null && (
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    fichaBMI >= 40
                      ? 'bg-rose-950/30 border-rose-500/30'
                      : fichaBMI >= 30
                      ? 'bg-amber-950/30 border-amber-500/30'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span className="text-xs text-slate-400 uppercase tracking-wider">IMC calculado:</span>
                  <span
                    className={`font-bold font-mono ${
                      fichaBMI >= 40 ? 'text-rose-400' : fichaBMI >= 30 ? 'text-amber-400' : 'text-white'
                    }`}
                  >
                    {fichaBMI.toFixed(1)} kg/m²
                  </span>
                  <span className="text-xs text-slate-500">
                    {fichaBMI >= 40
                      ? '(Obesidade Grau III)'
                      : fichaBMI >= 35
                      ? '(Obesidade Grau II)'
                      : fichaBMI >= 30
                      ? '(Obesidade Grau I)'
                      : fichaBMI >= 25
                      ? '(Sobrepeso)'
                      : '(Eutrófico)'}
                  </span>
                </div>
              )}
              <Input
                label="Alergias conhecidas"
                type="text"
                placeholder="Ex: Penicilina, Látex, AINH"
                value={fichaAlergias}
                onChange={(e) => setFichaAlergias(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* ASA + Emergência */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-blue-400">Classificação ASA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ASA_CLASSES.map((classe) => (
                  <button
                    key={classe.id}
                    onClick={() => setAsa(classe)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      asa.id === classe.id
                        ? `border-${classe.cor.split('-')[1]}-500 bg-${classe.cor.split('-')[1]}-500/10`
                        : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${classe.cor}`} />
                      <p
                        className={`font-bold text-sm ${
                          asa.id === classe.id ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        ASA {classe.id}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{classe.descricao}</p>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-rose-500/20 bg-rose-950/20 cursor-pointer hover:bg-rose-950/30 transition-colors">
                <input
                  type="checkbox"
                  checked={fichaEmergencia}
                  onChange={(e) => setFichaEmergencia(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900 bg-slate-900"
                />
                <span className="text-sm font-semibold text-rose-300">
                  Cirurgia de Emergência (ASA {asa.id}E)
                </span>
              </label>

              {/* Apfel — Risco NVPO */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Risco NVPO{' '}
                  <span className="text-xs text-slate-500">(Índice de Apfel)</span>
                </p>
                <div className="space-y-3">
                  {(
                    [
                      ['sexoFeminino', 'Sexo Feminino'],
                      ['naoFumante', 'Não Fumante'],
                      ['usoOpioides', 'Uso de Opioides Pós-op'],
                      ['historicoNVPO', 'Histórico de NVPO/Cinetose'],
                    ] as const
                  ).map(([key, label]) => (
                    <CheckboxRow
                      key={key}
                      label={label}
                      checked={apfel[key]}
                      onChange={(v) => setApfel({ ...apfel, [key]: v })}
                    />
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Risco NVPO</span>
                  <span className="font-bold font-mono text-lg text-white">{resApfel.probabilidade}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Via Aérea */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-amber-400">Via Aérea</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mallampati */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">Mallampati Modificado</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MALLAMPATI_CLASSES.map((classe) => (
                    <button
                      key={classe.id}
                      onClick={() => setMallampati(classe)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        mallampati.id === classe.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'
                      }`}
                    >
                      <p
                        className={`font-bold text-sm ${
                          mallampati.id === classe.id ? 'text-blue-400' : 'text-slate-300'
                        }`}
                      >
                        Classe {classe.id}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{classe.descricao}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ULBT */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Upper Lip Bite Test (ULBT)
                </p>
                <div className="flex gap-3">
                  {[
                    { v: 1, label: 'Classe 1', desc: 'Lábio superior coberto' },
                    { v: 2, label: 'Classe 2', desc: 'Borda do lábio visível' },
                    { v: 3, label: 'Classe 3', desc: 'Não consegue morder' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setFichaULBT(opt.v)}
                      className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                        fichaULBT === opt.v
                          ? opt.v === 3
                            ? 'border-rose-500 bg-rose-500/10'
                            : opt.v === 2
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-emerald-500 bg-emerald-500/10'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'
                      }`}
                    >
                      <p
                        className={`font-bold text-sm ${
                          fichaULBT === opt.v
                            ? opt.v === 3
                              ? 'text-rose-400'
                              : opt.v === 2
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* OBESE */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Critérios OBESE{' '}
                  <span className="text-xs text-slate-500">(ventilação difícil com máscara)</span>
                </p>
                <div className="space-y-3">
                  <CheckboxRow
                    label="O — Obesidade (IMC > 26)"
                    checked={obese.imcMaior26}
                    onChange={(v) => setObese({ ...obese, imcMaior26: v })}
                  />
                  <CheckboxRow
                    label="B — Barba presente"
                    checked={obese.barba}
                    onChange={(v) => setObese({ ...obese, barba: v })}
                  />
                  <CheckboxRow
                    label="E — Edêntulo (sem dentes)"
                    checked={obese.edentulo}
                    onChange={(v) => setObese({ ...obese, edentulo: v })}
                  />
                  <CheckboxRow
                    label="S — Ronco habitual / SAOS"
                    checked={obese.roncoSaos}
                    onChange={(v) => setObese({ ...obese, roncoSaos: v })}
                  />
                  <CheckboxRow
                    label="E — Elderly (idade > 55 anos)"
                    checked={obese.idadeMaior55}
                    onChange={(v) => setObese({ ...obese, idadeMaior55: v })}
                  />
                </div>
              </div>

              {/* LEMON */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Escore LEMON{' '}
                  <span className="text-xs text-slate-500">(intubação difícil)</span>
                </p>
                <div className="space-y-3">
                  <CheckboxRow
                    label="L — Aparência externa anormal"
                    checked={lemon.aparenciaAnormal}
                    onChange={(v) => setLemon({ ...lemon, aparenciaAnormal: v })}
                  />
                  <CheckboxRow
                    label="E — Regra 3-3-2 alterada"
                    checked={lemon.regra332}
                    onChange={(v) => setLemon({ ...lemon, regra332: v })}
                  />
                  <CheckboxRow
                    label="M — Mallampati III ou IV"
                    checked={lemon.mallampatiIIIIV}
                    onChange={(v) => setLemon({ ...lemon, mallampatiIIIIV: v })}
                  />
                  <CheckboxRow
                    label="O — Obstrução de via aérea / Obesidade"
                    checked={lemon.obstrucao}
                    onChange={(v) => setLemon({ ...lemon, obstrucao: v })}
                  />
                  <CheckboxRow
                    label="N — Mobilidade cervical reduzida"
                    checked={lemon.cervicalLimitada}
                    onChange={(v) => setLemon({ ...lemon, cervicalLimitada: v })}
                  />
                </div>
              </div>

              {/* STOP-BANG — Rastreio SAOS */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Rastreio SAOS{' '}
                  <span className="text-xs text-slate-500">(STOP-BANG)</span>
                </p>
                <div className="space-y-3">
                  {(
                    [
                      ['ronco', 'Ronco alto?'],
                      ['cansaco', 'Cansaço/fadiga diurna?'],
                      ['apneiaObservada', 'Apneia observada?'],
                      ['pressaoAlta', 'Pressão alta?'],
                      ['imcMaior35', 'IMC > 35?'],
                      ['idadeMaior50', 'Idade > 50?'],
                      ['circunferenciaPescoco', 'Pescoço > 40cm?'],
                      ['sexoMasculino', 'Sexo masculino?'],
                    ] as const
                  ).map(([key, label]) => (
                    <CheckboxRow
                      key={key}
                      label={label}
                      checked={stopBang[key]}
                      onChange={(v) => setStopBang({ ...stopBang, [key]: v })}
                    />
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">STOP-BANG</span>
                  <span
                    className={`font-bold font-mono text-lg ${
                      resStopBang.score >= 5
                        ? 'text-rose-400'
                        : resStopBang.score >= 3
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {resStopBang.score}/8 — {resStopBang.risco}
                  </span>
                </div>
              </div>

              {/* Via aérea inline alerts */}
              <AnimatePresence>
                {lemonScore >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/30 border border-rose-500/20"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-300">
                      <span className="font-semibold">LEMON {lemonScore}/5</span> — Videolaringoscópio
                      como 1ª escolha. Planejar via aérea difícil.
                    </p>
                  </motion.div>
                )}
                {obeseScore >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-300">
                      <span className="font-semibold">OBESE {obeseScore}/5</span> — Risco aumentado de
                      ventilação difícil com máscara facial.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Cardiovascular */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Avaliação Cardiovascular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* METs */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">Capacidade Funcional (METs)</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFichaMETs('baixo')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      fichaMETs === 'baixo'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'
                    }`}
                  >
                    <p
                      className={`font-bold ${fichaMETs === 'baixo' ? 'text-amber-400' : 'text-slate-300'}`}
                    >
                      ≤ 4 METs
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Atividade leve (caminhada lenta, tarefas domésticas simples)
                    </p>
                  </button>
                  <button
                    onClick={() => setFichaMETs('alto')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      fichaMETs === 'alto'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'
                    }`}
                  >
                    <p
                      className={`font-bold ${fichaMETs === 'alto' ? 'text-emerald-400' : 'text-slate-300'}`}
                    >
                      &gt; 4 METs
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Atividade moderada (subir escadas, caminhada rápida)
                    </p>
                  </button>
                </div>
              </div>

              {/* RCRI */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">
                  RCRI — Índice de Risco Cardíaco Revisado (Lee)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CheckboxRow
                    label="Cirurgia de alto risco"
                    checked={goldman.cirurgiaAltoRisco}
                    onChange={(v) => setGoldman({ ...goldman, cirurgiaAltoRisco: v })}
                  />
                  <CheckboxRow
                    label="Doença isquêmica cardíaca"
                    checked={goldman.historiaDoencaIsquemica}
                    onChange={(v) => setGoldman({ ...goldman, historiaDoencaIsquemica: v })}
                  />
                  <CheckboxRow
                    label="Insuficiência cardíaca congestiva"
                    checked={goldman.historiaInsuficienciaCardiaca}
                    onChange={(v) => setGoldman({ ...goldman, historiaInsuficienciaCardiaca: v })}
                  />
                  <CheckboxRow
                    label="Doença cerebrovascular (AVC/AIT)"
                    checked={goldman.historiaDoencaCerebrovascular}
                    onChange={(v) => setGoldman({ ...goldman, historiaDoencaCerebrovascular: v })}
                  />
                  <CheckboxRow
                    label="Diabetes insulino-dependente"
                    checked={goldman.diabetesInsulinoDependente}
                    onChange={(v) => setGoldman({ ...goldman, diabetesInsulinoDependente: v })}
                  />
                  <CheckboxRow
                    label="Creatinina > 2.0 mg/dL"
                    checked={goldman.creatininaMaior2}
                    onChange={(v) => setGoldman({ ...goldman, creatininaMaior2: v })}
                  />
                </div>
                <div
                  className={`mt-3 p-3 rounded-xl border flex justify-between items-center ${
                    resGoldman.score >= 3
                      ? 'bg-rose-950/30 border-rose-500/30'
                      : resGoldman.score >= 1
                      ? 'bg-amber-950/30 border-amber-500/30'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <span className="text-xs text-slate-400 uppercase tracking-wider">RCRI Score</span>
                  <span
                    className={`font-bold font-mono text-lg ${
                      resGoldman.score >= 3
                        ? 'text-rose-400'
                        : resGoldman.score >= 1
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {resGoldman.score}/6
                  </span>
                </div>
              </div>

              {/* ARISCAT */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">
                  ARISCAT{' '}
                  <span className="text-xs text-slate-500">(risco pulmonar pós-operatório, 0–100)</span>
                </p>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Score ARISCAT (deixe em branco se não calculado)"
                  value={fichaARISCAT}
                  onChange={(e) =>
                    setFichaARISCAT(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
                {fichaARISCAT !== '' && (
                  <p
                    className={`text-xs mt-1 font-medium ${
                      Number(fichaARISCAT) >= 45
                        ? 'text-rose-400'
                        : Number(fichaARISCAT) >= 26
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {Number(fichaARISCAT) >= 45
                      ? 'Alto risco de complicação pulmonar (> 45)'
                      : Number(fichaARISCAT) >= 26
                      ? 'Risco intermediário (26–44)'
                      : 'Baixo risco (< 26)'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Risk Summary Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-emerald-500/30 bg-emerald-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  Resumo Pré-operatório
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Estado Físico</p>
                    <p className="text-lg font-bold text-white">
                      ASA {asa.id}{fichaEmergencia ? 'E' : ''}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Via Aérea</p>
                    <p className="text-lg font-bold text-white">
                      M{mallampati.id} / C{cormack.id}
                    </p>
                    {(['III', 'IV'].includes(mallampati.id) || ['III', 'IV'].includes(cormack.id)) && (
                      <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Via difícil
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">LEMON</p>
                    <p
                      className={`text-lg font-bold ${
                        lemonScore >= 4 ? 'text-rose-400' : lemonScore >= 3 ? 'text-amber-400' : 'text-white'
                      }`}
                    >
                      {lemonScore}/5
                    </p>
                    {lemonScore >= 3 && (
                      <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Intubação difícil
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">OBESE</p>
                    <p
                      className={`text-lg font-bold ${obeseScore >= 2 ? 'text-amber-400' : 'text-white'}`}
                    >
                      {obeseScore}/5
                    </p>
                    {obeseScore >= 2 && (
                      <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Ventilação difícil
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Risco NVPO</p>
                    <p className="text-lg font-bold text-white">{resApfel.probabilidade}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Risco Cardíaco</p>
                    <p className="text-lg font-bold text-white">{resGoldman.riscoMACE}% MACE</p>
                  </div>
                </div>

                {/* Alert rows */}
                {(lemonScore >= 3 || obeseScore >= 2) && (
                  <div className="mt-4 space-y-2">
                    {lemonScore >= 3 && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/30 border border-rose-500/20">
                        <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-300">
                          <span className="font-semibold">LEMON {lemonScore}/5</span> — Risco{' '}
                          {lemonScore >= 4 ? 'alto' : 'moderado'} de intubação difícil. Preparar videolaringoscópio
                          como 1ª escolha e dispositivos de via aérea difícil.
                        </p>
                      </div>
                    )}
                    {obeseScore >= 2 && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-300">
                          <span className="font-semibold">OBESE {obeseScore}/5</span> — Risco aumentado de
                          ventilação difícil com máscara facial. Confirmar vedação e ter dispositivo
                          supraglótico disponível.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Synthesis */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-violet-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Síntese com IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                Gere uma análise SBAR executiva baseada nos dados da ficha para briefing pré-indução.
              </p>
              <Button
                onClick={handleGerarFicha}
                disabled={isGeneratingAi}
                className="w-full"
                variant="ai"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando análise...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Síntese com IA
                  </>
                )}
              </Button>

              <AnimatePresence>
                {fichaAiSuggestion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl bg-slate-950 border border-violet-700/40 prose prose-invert prose-sm max-w-none"
                  >
                    <Markdown>{fichaAiSuggestion}</Markdown>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─────────────────────────────── TAB 2: MEDICAÇÕES ─────────────────── */}
      {activeTab === 'medicacoes' && (
        <motion.div
          key="medicacoes"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar fármaco ou classe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/5 bg-black/40 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 focus:bg-white/5 transition-all"
            />
          </div>

          {/* No results */}
          {filteredMeds.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">
                Fármaco não listado. Consulte o protocolo institucional e avaliação pré-anestésica.
              </p>
            </div>
          )}

          {/* Med cards */}
          <div className="space-y-3">
            {filteredMeds.map((med) => {
              const isExpanded = expandedCard === med.classe;
              return (
                <Card key={med.classe} className="border-slate-800 bg-slate-900/50 overflow-hidden">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedCard(isExpanded ? null : med.classe)}
                  >
                    <div className="flex items-start justify-between p-5 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-widest border ${manejoColor[med.manejo]}`}
                          >
                            {med.manejo}
                          </span>
                          <span className="text-sm font-semibold text-white">{med.classe}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-200">{med.manejoTexto}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {med.drogas.join(', ')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-3 border-t border-slate-800 pt-4">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              Fármacos incluídos
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {med.drogas.map((droga) => (
                                <span
                                  key={droga}
                                  className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700"
                                >
                                  {droga}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              Considerações
                            </p>
                            <p className="text-sm text-slate-300">{med.consideracoes}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 mt-2">{med.evidencia}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
