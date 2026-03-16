import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, ArrowLeftRight, Droplets, FlaskConical, X } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import {
  calcularIBW,
  calcularABW,
  calcularVolumeCorrente,
  calcularBSA,
  calcularIMC,
  calcularClearanceCreatinina
} from '../lib/clinical/calculadoras';
import { useHistoryStore } from '../lib/storage/historyStore';
import { useSessionStore } from '../lib/storage/sessionStore';

export function Calculadoras() {
  const { t } = useTranslation();

  const [altura, setAltura] = useState<number | ''>(170);
  const [peso, setPeso] = useState<number | ''>(70);
  const [idade, setIdade] = useState<number | ''>(40);
  const [sexo, setSexo] = useState<'M' | 'F'>('M');
  const [creatinina, setCreatinina] = useState<number | ''>(1.0);

  // Cross-module: Gasometria snapshot
  const gasometriaSnapshot = useSessionStore(s => s.gasometriaSnapshot);
  const [gasoBannerDismissed, setGasoBannerDismissed] = useState(false);

  // Advanced modules state
  const [activeModule, setActiveModule] = useState<'conversao' | 'gotejamento' | 'protocolos'>('conversao');

  // Conversão de Unidades
  const [convDe, setConvDe] = useState<'mcgkgmin' | 'mcgmin' | 'mlh_macro' | 'mlh_micro'>('mcgkgmin');
  const [convValor, setConvValor] = useState<number | ''>(5);
  const [convPesoConv, setConvPesoConv] = useState<number | ''>(70);

  // Gotejamento
  const [gotaDose, setGotaDose] = useState<number | ''>('');
  const [gotaUnidade, setGotaUnidade] = useState<'mg_min' | 'mcg_kg_min'>('mcg_kg_min');
  const [gotaConc, setGotaConc] = useState<number | ''>('');
  const [gotaPeso, setGotaPeso] = useState<number | ''>(70);

  // Protocolos
  const [protPeso, setProtPeso] = useState<number | ''>(70);
  const [protSelecionado, setProtSelecionado] = useState<string>('ketodex');

  const numAltura = Number(altura) || 0;
  const numPeso = Number(peso) || 0;
  const numIdade = Number(idade) || 0;
  const numCreatinina = Number(creatinina) || 0;

  const ibw = calcularIBW(numAltura, sexo);
  const abw = calcularABW(numPeso, ibw);
  const vc = calcularVolumeCorrente(ibw);
  const bsa = calcularBSA(numAltura, numPeso);
  const imc = calcularIMC(numAltura, numPeso);
  const crcl = calcularClearanceCreatinina(numIdade, numPeso, numCreatinina, sexo);

  // Auto-save on unmount if changed from defaults
  const addAvaliacao = useHistoryStore(state => state.addAvaliacao);
  const stateRef = React.useRef({ numAltura, numPeso, numIdade, sexo, numCreatinina, ibw, abw, vc, bsa, imc, crcl });

  React.useEffect(() => {
    stateRef.current = { numAltura, numPeso, numIdade, sexo, numCreatinina, ibw, abw, vc, bsa, imc, crcl };
  }, [numAltura, numPeso, numIdade, sexo, numCreatinina, ibw, abw, vc, bsa, imc, crcl]);

  React.useEffect(() => {
    return () => {
      const current = stateRef.current;
      if (current.numAltura !== 170 || current.numPeso !== 70 || current.numIdade !== 40 || current.numCreatinina !== 1.0) {
        addAvaliacao({
          pacienteId: `PAC-${Math.floor(Math.random() * 10000)}`,
          tipo: 'Calculadoras',
          dados: {
            altura: current.numAltura,
            peso: current.numPeso,
            idade: current.numIdade,
            sexo: current.sexo,
            creatinina: current.numCreatinina
          },
          resultado: {
            ibw: current.ibw,
            abw: current.abw,
            vc: current.vc,
            bsa: current.bsa,
            imc: current.imc,
            crcl: current.crcl
          }
        });
      }
    };
  }, [addAvaliacao]);

  const handleNumberChange = (setter: React.Dispatch<React.SetStateAction<number | ''>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setter(val === '' ? '' : Number(val));
  };

  // Conversão de Unidades
  const calcConversao = () => {
    const v = Number(convValor) || 0;
    const p = Number(convPesoConv) || 70;
    if (convDe === 'mcgkgmin') return `${(v * p * 60 / 1000).toFixed(2)} mg/h`;
    if (convDe === 'mcgmin') return `${(v * 60 / 1000).toFixed(2)} mg/h`;
    if (convDe === 'mlh_macro') return `${(v * 20 / 60).toFixed(1)} gts/min (macro) | ${(v * 60 / 60).toFixed(1)} microgotas/min`;
    if (convDe === 'mlh_micro') return `${(v / 3).toFixed(1)} gts/min (macro) | ${(v).toFixed(1)} microgotas/min`;
    return '';
  };

  // Gotejamento
  const calcGotejamento = () => {
    const dose = Number(gotaDose) || 0;
    const conc = Number(gotaConc) || 0;
    const p = Number(gotaPeso) || 70;
    if (!dose || !conc) return null;
    let mlh = 0;
    if (gotaUnidade === 'mcg_kg_min') mlh = (dose * p * 60) / (conc * 1000);
    else mlh = dose * 60 / conc; // mg/min → mL/h
    const macro = (mlh * 20) / 60;
    const micro = (mlh * 60) / 60;
    return { mlh: mlh.toFixed(2), macro: macro.toFixed(1), micro: micro.toFixed(1) };
  };

  // Protocolos de Sedação
  const PROTOCOLOS_CALC = [
    {
      id: 'ketodex',
      nome: 'KETODEX',
      contexto: 'Procedimento',
      cor: 'purple',
      descricao: 'Ketamina + Dexmedetomidina — sedação procedural com preservação de via aérea',
      drogas: [
        { nome: 'Ketamina', bolus: { dose: 0.5, unidade: 'mg/kg', descricao: 'Bolus de indução' }, infusao: { min: 0.1, max: 0.3, unidade: 'mg/kg/h', descricao: 'Manutenção' }, concPadrao: 50 },
        { nome: 'Dexmedetomidina', bolus: { dose: 1, unidade: 'mcg/kg', descricao: 'Bolus em 10 min (opcional)' }, infusao: { min: 0.2, max: 0.7, unidade: 'mcg/kg/h', descricao: 'Manutenção' }, concPadrao: 4 },
      ]
    },
    {
      id: 'tiva',
      nome: 'TIVA',
      contexto: 'Centro Cirúrgico',
      cor: 'amber',
      descricao: 'Anestesia Total IV — Propofol + Remifentanil + Rocurônio',
      drogas: [
        { nome: 'Propofol', bolus: { dose: 2, unidade: 'mg/kg', descricao: 'Indução' }, infusao: { min: 25, max: 75, unidade: 'mcg/kg/min', descricao: 'Manutenção' }, concPadrao: 10 },
        { nome: 'Remifentanil', bolus: null, infusao: { min: 0.05, max: 0.5, unidade: 'mcg/kg/min', descricao: 'Manutenção' }, concPadrao: 0.05 },
        { nome: 'Rocurônio', bolus: { dose: 0.6, unidade: 'mg/kg', descricao: 'Bloqueio neuromuscular' }, infusao: null, concPadrao: 10 },
      ]
    },
    {
      id: 'rsi',
      nome: 'RSI',
      contexto: 'Emergência',
      cor: 'rose',
      descricao: 'Sequência Rápida de Intubação',
      drogas: [
        { nome: 'Ketamina', bolus: { dose: 1.5, unidade: 'mg/kg', descricao: 'Indução ISR' }, infusao: null, concPadrao: 50 },
        { nome: 'Succinilcolina', bolus: { dose: 1.5, unidade: 'mg/kg', descricao: 'Bloqueio rápido' }, infusao: null, concPadrao: 20 },
      ]
    },
    {
      id: 'sedacao-consciente',
      nome: 'Sedação Consciente',
      contexto: 'Procedimento',
      cor: 'emerald',
      descricao: 'Mantém reflexos — Midazolam + Fentanil',
      drogas: [
        { nome: 'Midazolam', bolus: { dose: 0.05, unidade: 'mg/kg', descricao: 'Titulado IV lento' }, infusao: null, concPadrao: 5 },
        { nome: 'Fentanil', bolus: { dose: 1.5, unidade: 'mcg/kg', descricao: 'Analgesia' }, infusao: null, concPadrao: 0.05 },
      ]
    },
    {
      id: 'uti-sedacao',
      nome: 'Sedação UTI',
      contexto: 'UTI',
      cor: 'indigo',
      descricao: 'RASS -2 a 0 — Propofol + Fentanil (± Dexmedetomidina)',
      drogas: [
        { nome: 'Propofol', bolus: null, infusao: { min: 10, max: 50, unidade: 'mcg/kg/min', descricao: 'RASS alvo -2 a 0' }, concPadrao: 10 },
        { nome: 'Fentanil', bolus: null, infusao: { min: 0.5, max: 1.5, unidade: 'mcg/kg/h', descricao: 'Analgesia' }, concPadrao: 0.05 },
        { nome: 'Dexmedetomidina', bolus: null, infusao: { min: 0.2, max: 0.7, unidade: 'mcg/kg/h', descricao: 'Adjuvante (opcional)' }, concPadrao: 4 },
      ]
    },
    {
      id: 'hemo-instavel',
      nome: 'Instab. Hemodinâmica',
      contexto: 'Emergência',
      cor: 'orange',
      descricao: 'Paciente instável — Etomidato + Fentanil + Rocurônio',
      drogas: [
        { nome: 'Etomidato', bolus: { dose: 0.3, unidade: 'mg/kg', descricao: 'Indução (menor depressão CV)' }, infusao: null, concPadrao: 2 },
        { nome: 'Fentanil', bolus: { dose: 1, unidade: 'mcg/kg', descricao: 'Analgesia cuidadosa' }, infusao: null, concPadrao: 0.05 },
        { nome: 'Rocurônio', bolus: { dose: 1.2, unidade: 'mg/kg', descricao: 'RSI dose' }, infusao: null, concPadrao: 10 },
      ]
    },
  ];

  const calcDoseProtocolo = (droga: typeof PROTOCOLOS_CALC[0]['drogas'][0], pesoKg: number) => {
    const results: { label: string; valor: string; mL: string }[] = [];
    if (droga.bolus) {
      const doseTotal = droga.bolus.dose * pesoKg;
      const mL = doseTotal / (droga.bolus.unidade.includes('mcg') ? droga.concPadrao * 1000 : droga.concPadrao);
      results.push({
        label: `Bolus — ${droga.bolus.descricao}`,
        valor: `${doseTotal.toFixed(1)} ${droga.bolus.unidade.includes('mcg') ? 'mcg' : 'mg'}`,
        mL: `${mL.toFixed(1)} mL`
      });
    }
    if (droga.infusao) {
      const minMg = droga.infusao.unidade.includes('mcg/kg/min')
        ? droga.infusao.min * pesoKg * 60 / 1000
        : droga.infusao.unidade.includes('mcg/kg/h')
        ? droga.infusao.min * pesoKg / 1000
        : droga.infusao.min * pesoKg;
      const maxMg = droga.infusao.unidade.includes('mcg/kg/min')
        ? droga.infusao.max * pesoKg * 60 / 1000
        : droga.infusao.unidade.includes('mcg/kg/h')
        ? droga.infusao.max * pesoKg / 1000
        : droga.infusao.max * pesoKg;
      const minMlh = minMg / droga.concPadrao;
      const maxMlh = maxMg / droga.concPadrao;
      results.push({
        label: `Infusão — ${droga.infusao.descricao}`,
        valor: `${droga.infusao.min}–${droga.infusao.max} ${droga.infusao.unidade}`,
        mL: `${minMlh.toFixed(1)}–${maxMlh.toFixed(1)} mL/h`
      });
    }
    return results;
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Gasometria cross-module banner */}
      {gasometriaSnapshot && !gasoBannerDismissed && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex-1">
            <p className="text-xs text-amber-300 font-medium">
              <span className="font-bold">Gaso disponível</span> — pH {gasometriaSnapshot.pH} | PaCO2 {gasometriaSnapshot.PaCO2} mmHg | Lactato {gasometriaSnapshot.Lactato} mmol/L
              <span className="text-amber-500/70 ml-2">({new Date(gasometriaSnapshot.capturedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})</span>
            </p>
          </div>
          <button onClick={() => setGasoBannerDismissed(true)} className="text-amber-500/50 hover:text-amber-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/20 rounded-2xl">
          <Calculator className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t('calculators.title')}</h1>
          <p className="text-slate-400 text-sm">Fórmulas e índices clínicos</p>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-blue-400">Dados do Paciente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Input
            label={t('calculators.height')}
            type="number"
            value={altura}
            onChange={handleNumberChange(setAltura)}
          />
          <Input
            label={t('calculators.weight')}
            type="number"
            value={peso}
            onChange={handleNumberChange(setPeso)}
          />
          <Input
            label="Idade (anos)"
            type="number"
            value={idade}
            onChange={handleNumberChange(setIdade)}
          />
          <Input
            label={t('calculators.creatinine')}
            type="number"
            step="0.1"
            value={creatinina}
            onChange={handleNumberChange(setCreatinina)}
          />
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-sm font-medium text-slate-300">{t('calculators.gender')}</label>
            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
              <button
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${sexo === 'M' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setSexo('M')}
              >
                {t('calculators.male')}
              </button>
              <button
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${sexo === 'F' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setSexo('F')}
              >
                {t('calculators.female')}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t('calculators.ibw')}</p>
            <p className="text-3xl font-bold text-white">{ibw.toFixed(1)} <span className="text-lg text-slate-500 font-normal">kg</span></p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t('calculators.abw')}</p>
            <p className="text-3xl font-bold text-white">{abw.toFixed(1)} <span className="text-lg text-slate-500 font-normal">kg</span></p>
            <p className="text-xs text-slate-500 mt-2">Usado em obesos (IMC &gt; 30)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t('calculators.vt')}</p>
            <p className="text-3xl font-bold text-blue-400">{vc.toFixed(0)} <span className="text-lg text-slate-500 font-normal">mL</span></p>
            <p className="text-xs text-slate-500 mt-2">Ventilação protetora (6 mL/kg IBW)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t('calculators.bmi')}</p>
            <p className={`text-3xl font-bold ${imc > 30 ? 'text-red-400' : imc > 25 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {imc.toFixed(1)} <span className="text-lg text-slate-500 font-normal">kg/m²</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t('calculators.bsa')}</p>
            <p className="text-3xl font-bold text-white">{bsa.toFixed(2)} <span className="text-lg text-slate-500 font-normal">m²</span></p>
            <p className="text-xs text-slate-500 mt-2">Fórmula de Dubois</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t('calculators.crcl')}</p>
            <p className={`text-3xl font-bold ${crcl < 60 ? 'text-red-400' : 'text-emerald-400'}`}>
              {crcl.toFixed(1)} <span className="text-lg text-slate-500 font-normal">mL/min</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">Cockcroft-Gault</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Módulos Avançados ── */}
      <div className="mt-8">
        {/* Tab Navigation */}
        <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl mb-6">
          {[
            { id: 'conversao', icon: ArrowLeftRight, label: 'Conversão de Unidades' },
            { id: 'gotejamento', icon: Droplets, label: 'Gotejamento' },
            { id: 'protocolos', icon: FlaskConical, label: 'Protocolos de Sedação' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveModule(tab.id as 'conversao' | 'gotejamento' | 'protocolos')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeModule === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Conversão de Unidades */}
        {activeModule === 'conversao' && (
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Conversão de Unidades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Converter de</label>
                  <select
                    value={convDe}
                    onChange={e => setConvDe(e.target.value as 'mcgkgmin' | 'mcgmin' | 'mlh_macro' | 'mlh_micro')}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="mcgkgmin">mcg/kg/min → mg/h</option>
                    <option value="mcgmin">mcg/min → mg/h</option>
                    <option value="mlh_macro">mL/h → gotas/min + microgotas/min</option>
                    <option value="mlh_micro">mL/h → gotas/min (macro 20gts/mL)</option>
                  </select>
                </div>
                <Input
                  label="Valor"
                  type="number"
                  step="0.1"
                  value={convValor}
                  onChange={e => setConvValor(e.target.value === '' ? '' : Number(e.target.value))}
                />
                {convDe === 'mcgkgmin' && (
                  <Input
                    label="Peso (kg)"
                    type="number"
                    value={convPesoConv}
                    onChange={e => setConvPesoConv(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                )}
              </div>
              {convValor !== '' && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">Resultado</p>
                  <p className="text-2xl font-bold text-white">{calcConversao()}</p>
                  {convDe === 'mlh_macro' && (
                    <p className="text-xs text-slate-400 mt-2">Equipo macrogotas = 20 gts/mL | Microgotas = 60 gts/mL</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gotejamento */}
        {activeModule === 'gotejamento' && (
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Calculadora de Gotejamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-500">Para uso sem bomba de seringa. Calcula velocidade de infusão em gotas.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Unidade da dose</label>
                  <select
                    value={gotaUnidade}
                    onChange={e => setGotaUnidade(e.target.value as 'mg_min' | 'mcg_kg_min')}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="mcg_kg_min">mcg/kg/min</option>
                    <option value="mg_min">mg/min</option>
                  </select>
                </div>
                <Input
                  label="Dose prescrita"
                  type="number"
                  step="0.01"
                  placeholder={gotaUnidade === 'mcg_kg_min' ? 'Ex: 5' : 'Ex: 0.5'}
                  value={gotaDose}
                  onChange={e => setGotaDose(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <Input
                  label="Concentração (mg/mL)"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 1"
                  value={gotaConc}
                  onChange={e => setGotaConc(e.target.value === '' ? '' : Number(e.target.value))}
                />
                {gotaUnidade === 'mcg_kg_min' && (
                  <Input
                    label="Peso (kg)"
                    type="number"
                    value={gotaPeso}
                    onChange={e => setGotaPeso(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                )}
              </div>
              {calcGotejamento() && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">mL/h</p>
                    <p className="text-2xl font-bold text-white">{calcGotejamento()!.mlh}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Macrogotas/min</p>
                    <p className="text-2xl font-bold text-blue-400">{calcGotejamento()!.macro}</p>
                    <p className="text-xs text-slate-500 mt-1">20 gts/mL</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Microgotas/min</p>
                    <p className="text-2xl font-bold text-emerald-400">{calcGotejamento()!.micro}</p>
                    <p className="text-xs text-slate-500 mt-1">60 gts/mL</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Protocolos de Sedação */}
        {activeModule === 'protocolos' && (
          <div className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" />
                  Protocolos de Sedação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  label="Peso do paciente (kg)"
                  type="number"
                  value={protPeso}
                  onChange={e => setProtPeso(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </CardContent>
            </Card>

            {/* Protocol selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROTOCOLOS_CALC.map(prot => {
                const colorMap: Record<string, string> = {
                  purple: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
                  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
                  rose: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
                  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
                  indigo: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
                  orange: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
                };
                const inactiveColor = 'border-slate-800 bg-slate-800/30 text-slate-400';
                const isActive = protSelecionado === prot.id;
                return (
                  <button
                    key={prot.id}
                    onClick={() => setProtSelecionado(prot.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${isActive ? colorMap[prot.cor] : inactiveColor} hover:border-slate-600`}
                  >
                    <p className="font-bold text-sm">{prot.nome}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{prot.contexto}</p>
                  </button>
                );
              })}
            </div>

            {/* Selected protocol details */}
            {(() => {
              const prot = PROTOCOLOS_CALC.find(p => p.id === protSelecionado);
              if (!prot) return null;
              const pesoKg = Number(protPeso) || 70;
              const colorMap: Record<string, string> = {
                purple: 'border-purple-500/20 bg-purple-950/20',
                amber: 'border-amber-500/20 bg-amber-950/20',
                rose: 'border-rose-500/20 bg-rose-950/20',
                emerald: 'border-emerald-500/20 bg-emerald-950/20',
                indigo: 'border-indigo-500/20 bg-indigo-950/20',
                orange: 'border-orange-500/20 bg-orange-950/20',
              };
              const headerColorMap: Record<string, string> = {
                purple: 'text-purple-400',
                amber: 'text-amber-400',
                rose: 'text-rose-400',
                emerald: 'text-emerald-400',
                indigo: 'text-indigo-400',
                orange: 'text-orange-400',
              };
              return (
                <Card className={`${colorMap[prot.cor]}`}>
                  <CardHeader>
                    <div>
                      <CardTitle className={`${headerColorMap[prot.cor]}`}>{prot.nome}</CardTitle>
                      <p className="text-xs text-slate-400 mt-1">{prot.descricao}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Doses calculadas para {pesoKg} kg</p>
                    {prot.drogas.map(droga => {
                      const calculos = calcDoseProtocolo(droga, pesoKg);
                      return (
                        <div key={droga.nome} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                          <p className="font-bold text-white text-sm mb-2">{droga.nome}</p>
                          {calculos.map((c, i) => (
                            <div key={i} className="flex items-center justify-between py-1 border-b border-slate-800/30 last:border-0">
                              <span className="text-xs text-slate-400">{c.label}</span>
                              <div className="text-right">
                                <span className="text-xs font-mono text-slate-300">{c.valor}</span>
                                <span className="text-xs font-mono text-blue-400 ml-2">({c.mL})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
