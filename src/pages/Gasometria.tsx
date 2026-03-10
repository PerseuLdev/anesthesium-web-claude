import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, FileText, Save, Droplet, AlertTriangle, Copy, Check, Camera, Loader2, Sparkles } from 'lucide-react';
import Markdown from 'react-markdown';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { interpretarGasometria, GasometriaInput, GasometriaOutput } from '../lib/clinical/gasometria';
import { useHistoryStore } from '../lib/storage/historyStore';
import { useDraftStore } from '../lib/storage/draftStore';
import { useSessionStore } from '../lib/storage/sessionStore';
import { extractGasometriaFromImage } from '../lib/services/ocrService';
import { generateClinicalPlan } from '../lib/services/clinicalAiService';
import { CameraScanner } from '../components/CameraScanner';
import { AiDisclaimer } from '../components/AiDisclaimer';

const schema = z.object({
  tipo: z.enum(['arterial', 'venosa']).default('arterial'),
  unidadePressao: z.enum(['mmHg', 'kPa']).default('mmHg'),
  pH: z.number({ message: "Insira um número (Ref: 7.35-7.45)" }),
  PaCO2: z.number({ message: "Insira um número (Ref: 35-45)" }),
  HCO3: z.number({ message: "Insira um número (Ref: 22-26)" }),
  PaO2: z.number({ message: "Insira um número (Ref: 80-100)" }).optional(),
  BE: z.number({ message: "Insira um número (Ref: -2 a +2)" }),
  FiO2: z.number({ message: "Insira um número (Ref: 21-100)" }).optional(),
  Na: z.number({ message: "Insira um número (Ref: 135-145)" }),
  Cl: z.number({ message: "Insira um número (Ref: 98-106)" }),
  Albumina: z.number({ message: "Insira um número (Ref: 3.5-5.0)" }),
  Lactato: z.number({ message: "Insira um número (Ref: < 2.0)" }),
  Idade: z.number({ message: "Insira um número" }).optional(),
}).superRefine((data, ctx) => {
  if (data.tipo === 'arterial') {
    if (data.PaO2 === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Obrigatório para gasometria arterial",
        path: ['PaO2']
      });
    }
    if (data.FiO2 === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Obrigatório para gasometria arterial",
        path: ['FiO2']
      });
    }
  }
});

export function Gasometria() {
  const { t } = useTranslation();
  const gasometriaInput = useDraftStore(state => state.gasometriaInput);
  const gasometriaResultado = useDraftStore(state => state.gasometriaResultado);
  const draftAiSuggestion = useDraftStore(state => state.aiSuggestion);
  const setGasometriaDraft = useDraftStore(state => state.setGasometriaDraft);
  
  const [resultado, setResultado] = useState<GasometriaOutput | null>(gasometriaResultado);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(draftAiSuggestion);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentAvaliacaoId, setCurrentAvaliacaoId] = useState<string | null>(null);
  const addAvaliacao = useHistoryStore(state => state.addAvaliacao);
  const updateAvaliacao = useHistoryStore(state => state.updateAvaliacao);
  const setGasometriaSnapshot = useSessionStore(s => s.setGasometriaSnapshot);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<GasometriaInput>({
    resolver: zodResolver(schema),
    defaultValues: gasometriaInput as any,
  });

  const formValues = watch();
  const draftRef = useRef({ formValues, resultado, aiSuggestion });

  const getWarnings = (values: Partial<GasometriaInput>) => {
    const w: Record<string, string> = {};
    if (values.pH !== undefined && !isNaN(values.pH) && (values.pH < 6.8 || values.pH > 7.8)) w.pH = "Valor crítico (Ref: 7.35-7.45)";
    if (values.PaCO2 !== undefined && !isNaN(values.PaCO2) && (values.PaCO2 < 15 || values.PaCO2 > 130)) w.PaCO2 = "Valor crítico (Ref: 35-45)";
    if (values.HCO3 !== undefined && !isNaN(values.HCO3) && (values.HCO3 < 5 || values.HCO3 > 50)) w.HCO3 = "Valor crítico (Ref: 22-26)";
    if (values.PaO2 !== undefined && !isNaN(values.PaO2) && (values.PaO2 < 30 || values.PaO2 > 400)) w.PaO2 = "Valor crítico (Ref: 80-100)";
    if (values.BE !== undefined && !isNaN(values.BE) && (values.BE < -25 || values.BE > 25)) w.BE = "Valor crítico (Ref: -2 a +2)";
    if (values.FiO2 !== undefined && !isNaN(values.FiO2) && (values.FiO2 < 21 || values.FiO2 > 100)) w.FiO2 = "Valor crítico (Ref: 21-100)";
    if (values.Na !== undefined && !isNaN(values.Na) && (values.Na < 110 || values.Na > 170)) w.Na = "Valor crítico (Ref: 135-145)";
    if (values.Cl !== undefined && !isNaN(values.Cl) && (values.Cl < 80 || values.Cl > 130)) w.Cl = "Valor crítico (Ref: 98-106)";
    if (values.Albumina !== undefined && !isNaN(values.Albumina) && (values.Albumina < 1.5 || values.Albumina > 5.5)) w.Albumina = "Valor crítico (Ref: 3.5-5.0)";
    if (values.Lactato !== undefined && !isNaN(values.Lactato) && (values.Lactato < 0 || values.Lactato > 25)) w.Lactato = "Valor crítico (Ref: < 2.0)";
    if (values.Idade !== undefined && !isNaN(values.Idade) && (values.Idade < 0 || values.Idade > 120)) w.Idade = "Idade inválida";
    return w;
  };

  const warnings = getWarnings(formValues);

  // Keep ref updated with latest values without triggering re-renders
  useEffect(() => {
    draftRef.current = { formValues, resultado, aiSuggestion };
  }, [formValues, resultado, aiSuggestion]);

  // Save draft only when component unmounts
  useEffect(() => {
    return () => {
      setGasometriaDraft(draftRef.current.formValues as Partial<GasometriaInput>, draftRef.current.resultado, draftRef.current.aiSuggestion);
    };
  }, [setGasometriaDraft]);

  const onSubmit = (data: any) => {
    const calcData = { ...data, FiO2: data.FiO2 ? data.FiO2 / 100 : 0.21 };
    const res = interpretarGasometria(calcData);
    setResultado(res);
    setAiSuggestion(null); // Reset AI suggestion on new calculation
    setCopied(false);

    // Propagar campos sobrepostos para o módulo Hemodinâmica
    const kpa = data.unidadePressao === 'kPa';
    setGasometriaSnapshot({
      pH:       data.pH,
      PaCO2:    kpa ? data.PaCO2 * 7.50062 : data.PaCO2,
      HCO3:     data.HCO3,
      PaO2:     data.PaO2 != null ? (kpa ? data.PaO2 * 7.50062 : data.PaO2) : undefined,
      Lactato:  data.Lactato,
      Na:       data.Na,
      Cl:       data.Cl,
      Albumina: data.Albumina,
      capturedAt: new Date().toISOString(),
    });

    // Auto-save
    const id = addAvaliacao({
      pacienteId: `PAC-${Math.floor(Math.random() * 10000)}`,
      tipo: 'Gasometria',
      dados: res.inputOriginal,
      resultado: res,
    });
    setCurrentAvaliacaoId(id);
  };

  const handleGenerateAiPlan = async () => {
    if (!resultado) return;
    setIsGeneratingAi(true);
    try {
      const plan = await generateClinicalPlan(resultado);
      setAiSuggestion(plan);
      if (currentAvaliacaoId) {
        updateAvaliacao(currentAvaliacaoId, { aiSuggestion: plan });
      }
    } catch (error) {
      alert("Erro ao gerar conduta. Verifique sua conexão ou tente novamente.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopy = () => {
    if (resultado) {
      let text = `Gasometria Arterial:
pH: ${resultado.inputOriginal.pH}
PaCO2: ${resultado.inputOriginal.PaCO2}
HCO3: ${resultado.inputOriginal.HCO3}
PaO2: ${resultado.inputOriginal.PaO2}
Lactato: ${resultado.inputOriginal.Lactato}

Interpretação:
${resultado.disturbioPrimario} (${resultado.severidade})
${resultado.compensacao ? `Compensação: ${resultado.compensacao}` : ''}
Ânion Gap: ${resultado.anionGap.toFixed(1)} (Corrigido: ${resultado.anionGapCorrigido.toFixed(1)})
${resultado.deltaDelta ? `Delta-Delta: ${resultado.deltaDelta.toFixed(2)} - ${resultado.deltaDeltaInterpretacao}` : ''}
Oxigenação: ${resultado.sdra} (P/F: ${Math.round(resultado.pfRatio)})
${resultado.causasProvaveis ? `\nCausas Prováveis: ${resultado.causasProvaveis}` : ''}
`;
      if (aiSuggestion) {
        text += `\n\nConduta Sugerida (IA):\n${aiSuggestion}`;
      }
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleScanClick = () => {
    setIsCameraOpen(true);
  };

  const handleImageCapture = async (base64: string, mimeType: string) => {
    setIsCameraOpen(false);
    setIsScanning(true);
    try {
      const extractedData = await extractGasometriaFromImage(base64, mimeType);
      
      if (extractedData) {
        Object.entries(extractedData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            setValue(key as keyof GasometriaInput, value as number, { shouldValidate: true });
          }
        });
      }
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Erro ao processar a imagem. Tente novamente.');
    } finally {
      setIsScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Grave': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'Moderada': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Leve': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const isAbnormal = (val: number, min: number, max: number) => val < min || val > max;

  const tipoGasometria = watch('tipo') || 'arterial';
  const unidadePressao = watch('unidadePressao') || 'mmHg';

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center">
          <Droplet className={`w-6 h-6 ${tipoGasometria === 'arterial' ? 'text-rose-400' : 'text-indigo-400'}`} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white uppercase">
            Gasometria {tipoGasometria === 'arterial' ? 'Arterial' : 'Venosa'}
          </h1>
          <p className="text-zinc-500 text-sm font-mono mt-1">ADVANCED ABG INTERPRETATION ENGINE</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <form id="gaso-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Tabs Arterial / Venosa */}
            <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setValue('tipo', 'arterial')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest rounded-lg transition-all ${
                  tipoGasometria === 'arterial' 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                Arterial
              </button>
              <button
                type="button"
                onClick={() => setValue('tipo', 'venosa')}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest rounded-lg transition-all ${
                  tipoGasometria === 'venosa' 
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                Venosa
              </button>
            </div>

            <Card>
              <CardHeader className="border-b border-white/5 pb-4 mb-4 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-zinc-300 text-sm uppercase tracking-widest">
                  <Activity className={`w-4 h-4 ${tipoGasometria === 'arterial' ? 'text-rose-500' : 'text-indigo-500'}`} />
                  Biomarkers Input
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleScanClick}
                    disabled={isScanning}
                    className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    {isScanning ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 mr-2" />
                    )}
                    {isScanning ? 'Scanning...' : 'Scan ABG'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                <Input label={t('gasometry.ph')} type="number" step="0.01" placeholder={tipoGasometria === 'arterial' ? "7.35 - 7.45" : "7.31 - 7.41"} {...register('pH', { valueAsNumber: true })} error={errors.pH?.message || warnings.pH} />
                <Input 
                  label={t('gasometry.paco2')} 
                  type="number" 
                  step="0.1" 
                  placeholder={unidadePressao === 'mmHg' ? "35 - 45" : "4.7 - 6.0"} 
                  {...register('PaCO2', { valueAsNumber: true })} 
                  error={errors.PaCO2?.message || warnings.PaCO2}
                  suffix={
                    <div className="flex items-center bg-black/60 rounded p-0.5 border border-white/10">
                      <button type="button" onClick={() => setValue('unidadePressao', 'mmHg')} className={`px-1.5 py-0.5 text-[9px] font-mono rounded-sm transition-all ${unidadePressao === 'mmHg' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>mmHg</button>
                      <button type="button" onClick={() => setValue('unidadePressao', 'kPa')} className={`px-1.5 py-0.5 text-[9px] font-mono rounded-sm transition-all ${unidadePressao === 'kPa' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>kPa</button>
                    </div>
                  }
                />
                <Input label={t('gasometry.hco3')} type="number" step="0.1" placeholder="22 - 26" {...register('HCO3', { valueAsNumber: true })} error={errors.HCO3?.message || warnings.HCO3} />
                
                {tipoGasometria === 'arterial' && (
                  <>
                    <Input 
                      label={t('gasometry.pao2')} 
                      type="number" 
                      step="0.1" 
                      placeholder={unidadePressao === 'mmHg' ? "80 - 100" : "10.6 - 13.3"} 
                      {...register('PaO2', { valueAsNumber: true })} 
                      error={errors.PaO2?.message || warnings.PaO2}
                      suffix={
                        <div className="flex items-center bg-black/60 rounded p-0.5 border border-white/10">
                          <button type="button" onClick={() => setValue('unidadePressao', 'mmHg')} className={`px-1.5 py-0.5 text-[9px] font-mono rounded-sm transition-all ${unidadePressao === 'mmHg' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>mmHg</button>
                          <button type="button" onClick={() => setValue('unidadePressao', 'kPa')} className={`px-1.5 py-0.5 text-[9px] font-mono rounded-sm transition-all ${unidadePressao === 'kPa' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>kPa</button>
                        </div>
                      }
                    />
                    <Input label={t('gasometry.fio2')} type="number" step="1" placeholder="21 - 100" {...register('FiO2', { valueAsNumber: true })} error={errors.FiO2?.message || warnings.FiO2} />
                  </>
                )}
                
                <Input label={t('gasometry.be')} type="number" step="0.1" placeholder="-2 a +2" {...register('BE', { valueAsNumber: true })} error={errors.BE?.message || warnings.BE} />
                <Input label={t('gasometry.lactate')} type="number" step="0.1" placeholder="< 2.0" {...register('Lactato', { valueAsNumber: true })} error={errors.Lactato?.message || warnings.Lactato} />
                <Input label={t('gasometry.na')} type="number" step="1" placeholder="135 - 145" {...register('Na', { valueAsNumber: true })} error={errors.Na?.message || warnings.Na} />
                <Input label={t('gasometry.cl')} type="number" step="1" placeholder="98 - 106" {...register('Cl', { valueAsNumber: true })} error={errors.Cl?.message || warnings.Cl} />
                <Input label={t('gasometry.albumin')} type="number" step="0.1" placeholder="3.5 - 5.0" {...register('Albumina', { valueAsNumber: true })} error={errors.Albumina?.message || warnings.Albumina} />
                <Input label={t('gasometry.age')} type="number" step="1" placeholder="Ex: 45" {...register('Idade', { valueAsNumber: true })} error={errors.Idade?.message || warnings.Idade} />
              </CardContent>
            </Card>

            <Button type="submit" form="gaso-form" className={`w-full h-16 text-lg tracking-widest uppercase text-white shadow-[0_0_30px_rgba(244,63,94,0.2)] ${tipoGasometria === 'arterial' ? 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 'bg-indigo-500 hover:bg-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]'}`}>
              {t('common.calculate')}
            </Button>
            
            <p className="text-center text-xs text-zinc-500 mt-4">
              Aviso Legal: O Perseu é uma ferramenta de suporte à decisão clínica e não substitui o julgamento médico.
            </p>
          </form>
        </div>

        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {resultado ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                className="h-full"
              >
                <Card className={`h-full relative overflow-hidden ${tipoGasometria === 'arterial' ? 'border-rose-500/20 bg-rose-950/10' : 'border-indigo-500/20 bg-indigo-950/10'}`}>
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${tipoGasometria === 'arterial' ? 'from-rose-500 to-orange-500' : 'from-indigo-500 to-cyan-500'}`} />
                  <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <CardTitle className={`flex items-center gap-2 text-sm uppercase tracking-widest ${tipoGasometria === 'arterial' ? 'text-rose-400' : 'text-indigo-400'}`}>
                      <FileText className="w-4 h-4" />
                      Analysis Output
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={handleCopy} className="w-8 h-8 text-zinc-400 hover:text-white" title="Copiar Relatório">
                        {copied ? <Check className={`w-4 h-4 ${tipoGasometria === 'arterial' ? 'text-rose-400' : 'text-indigo-400'}`} /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Input Summary Chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className={`px-2 py-1 rounded-md text-xs font-mono border ${isAbnormal(resultado.inputOriginal.pH, 7.35, 7.45) ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
                        pH: {resultado.inputOriginal.pH} <span className="text-zinc-500 ml-1">[7.35-7.45]</span>
                      </div>
                      <div className={`px-2 py-1 rounded-md text-xs font-mono border ${isAbnormal(resultado.inputOriginal.PaCO2, 35, 45) ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
                        pCO2: {resultado.inputOriginal.PaCO2} <span className="text-zinc-500 ml-1">[35-45]</span>
                      </div>
                      <div className={`px-2 py-1 rounded-md text-xs font-mono border ${isAbnormal(resultado.inputOriginal.HCO3, 22, 26) ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
                        HCO3: {resultado.inputOriginal.HCO3} <span className="text-zinc-500 ml-1">[22-26]</span>
                      </div>
                    </div>

                    {/* Alerts */}
                    {resultado.inputOriginal.Lactato > 2.0 && (
                      <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300 leading-relaxed font-medium">Hiperlactatemia ({resultado.inputOriginal.Lactato} mmol/L). Avaliar perfusão tecidual.</p>
                      </div>
                    )}

                    {/* Main pH Display */}
                    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border relative overflow-hidden ${
                      resultado.inputOriginal.pH <= 7.10 ? 'bg-rose-500/10 border-rose-500/30' :
                      resultado.inputOriginal.pH >= 7.60 ? 'bg-cyan-500/10 border-cyan-500/30' :
                      'bg-black/40 border-white/5'
                    }`}>
                      {resultado.inputOriginal.pH <= 7.10 || resultado.inputOriginal.pH >= 7.60 ? (
                        <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none" />
                      ) : null}
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">pH {resultado.inputOriginal.tipo === 'arterial' ? 'Arterial' : 'Venoso'}</p>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-7xl font-black tracking-tighter ${
                          resultado.inputOriginal.pH < 7.35 ? 'text-rose-500' : 
                          resultado.inputOriginal.pH > 7.45 ? 'text-cyan-500' : 'text-emerald-500'
                        }`}>
                          {resultado.inputOriginal.pH.toFixed(2)}
                        </span>
                        {resultado.inputOriginal.pH <= 7.10 && (
                          <span className="text-rose-500 font-bold text-sm tracking-widest uppercase animate-pulse mt-1">Acidose Grave</span>
                        )}
                        {resultado.inputOriginal.pH >= 7.60 && (
                          <span className="text-cyan-500 font-bold text-sm tracking-widest uppercase animate-pulse mt-1">Alcalose Grave</span>
                        )}
                      </div>
                      
                      {/* Color Bar */}
                      <div className="w-full max-w-[240px] h-2 bg-zinc-800 rounded-full mt-6 flex overflow-hidden relative">
                        <div className="h-full bg-rose-500" style={{ width: '33%' }} />
                        <div className="h-full bg-emerald-500" style={{ width: '34%' }} />
                        <div className="h-full bg-cyan-500" style={{ width: '33%' }} />
                        {/* Indicator */}
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white]" 
                          style={{ 
                            left: `${Math.max(0, Math.min(100, ((resultado.inputOriginal.pH - 6.8) / (7.8 - 6.8)) * 100))}%`,
                            transform: 'translateX(-50%)' 
                          }} 
                        />
                      </div>
                      <div className="w-full max-w-[240px] flex justify-between text-[9px] text-zinc-500 mt-2 font-mono uppercase tracking-wider">
                        <span>Acidose</span>
                        <span>Normal</span>
                        <span>Alcalose</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{t('gasometry.primary_disorder')}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityColor(resultado.severidade)} ${resultado.severidade === 'Grave' ? 'animate-pulse' : ''}`}>
                          {resultado.severidade}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-white tracking-tight">{resultado.disturbioPrimario}</p>
                      {resultado.compensacao && (
                        <p className={`text-sm font-mono mt-1 ${tipoGasometria === 'arterial' ? 'text-rose-400' : 'text-indigo-400'}`}>{resultado.compensacao}</p>
                      )}
                      {resultado.phArterialEstimado && (
                        <p className="text-xs text-indigo-300 mt-2 bg-indigo-500/10 inline-block px-2 py-1 rounded border border-indigo-500/20">
                          pH Arterial Estimado: <span className="font-bold">{resultado.phArterialEstimado.toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {resultado.inputOriginal.tipo === 'arterial' && (
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Oxigenação</p>
                          <p className="text-lg font-bold text-white tracking-tight">{resultado.sdra}</p>
                          <p className="text-xs font-mono text-zinc-400 mt-2">P/F: <span className={tipoGasometria === 'arterial' ? 'text-rose-400' : 'text-indigo-400'}>{Math.round(resultado.pfRatio)}</span></p>
                        </div>
                      )}
                      
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Ânion Gap</p>
                        <p className="text-lg font-bold text-white tracking-tight">{resultado.anionGap.toFixed(1)} <span className="text-xs text-zinc-500 font-mono">mEq/L</span></p>
                        <p className="text-xs font-mono text-zinc-400 mt-2">Corr: <span className={tipoGasometria === 'arterial' ? 'text-rose-400' : 'text-indigo-400'}>{resultado.anionGapCorrigido.toFixed(1)}</span></p>
                      </div>

                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Base Excess (BE)</p>
                        <p className="text-lg font-bold text-white tracking-tight">{resultado.inputOriginal.BE > 0 ? '+' : ''}{resultado.inputOriginal.BE}</p>
                        <p className="text-xs text-zinc-400 mt-2 leading-tight">{resultado.beInterpretacao}</p>
                      </div>
                    </div>

                    {resultado.deltaDelta !== undefined && (
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Delta-Delta</p>
                        <p className="text-xl font-mono text-white">{resultado.deltaDelta.toFixed(2)} <span className="text-xs text-zinc-500 font-sans ml-1">(Normal: 1.0 - 2.0)</span></p>
                        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{resultado.deltaDeltaInterpretacao}</p>
                      </div>
                    )}

                    {resultado.causasProvaveis && (
                      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                        <p className="text-[10px] text-cyan-400 uppercase tracking-widest mb-1 font-bold">Causas Prováveis</p>
                        <p className="text-zinc-300 text-sm leading-relaxed">{resultado.causasProvaveis}</p>
                      </div>
                    )}

                    <div className={`p-5 rounded-2xl border ${tipoGasometria === 'arterial' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                      <p className={`text-[10px] uppercase tracking-widest mb-2 font-bold ${tipoGasometria === 'arterial' ? 'text-rose-400' : 'text-indigo-400'}`}>Interpretação Clínica</p>
                      <p className="text-zinc-200 leading-relaxed text-sm">{resultado.interpretacao}</p>
                      {resultado.sugestaoConduta && (
                        <div className={`mt-3 pt-3 border-t ${tipoGasometria === 'arterial' ? 'border-rose-500/20' : 'border-indigo-500/20'}`}>
                          <p className={`text-xs font-medium ${tipoGasometria === 'arterial' ? 'text-rose-300' : 'text-indigo-300'}`}>Conduta Sugerida: {resultado.sugestaoConduta}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="bg-white/5 hover:bg-white/10 text-xs border border-white/10" 
                        onClick={() => {
                          const peso = prompt('Qual o peso do paciente (kg)?', '70');
                          if (peso && !isNaN(Number(peso))) {
                            const deficit = 0.3 * Number(peso) * Math.abs(resultado.inputOriginal.BE);
                            alert(`Déficit de HCO3: ${deficit.toFixed(1)} mEq\n\nReposição sugerida (Metade do déficit):\n${(deficit / 2).toFixed(1)} mL de Bicarbonato de Sódio 8,4%`);
                          }
                        }}
                      >
                        Reposição de Bicarbonato
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="bg-white/5 hover:bg-white/10 text-xs border border-white/10" 
                        onClick={() => {
                          const pco2Alvo = prompt('Qual a PaCO2 alvo desejada (mmHg)?', '40');
                          const frAtual = prompt('Qual a Frequência Respiratória atual?', '16');
                          if (pco2Alvo && frAtual && !isNaN(Number(pco2Alvo)) && !isNaN(Number(frAtual))) {
                            const pco2Atual = resultado.inputOriginal.unidadePressao === 'kPa' ? resultado.inputOriginal.PaCO2 * 7.50062 : resultado.inputOriginal.PaCO2;
                            const novaFr = (Number(frAtual) * pco2Atual) / Number(pco2Alvo);
                            alert(`Para atingir PaCO2 de ${pco2Alvo} mmHg:\n\nAjustar Frequência Respiratória para: ${Math.round(novaFr)} irpm`);
                          }
                        }}
                      >
                        Ajuste de Ventilação
                      </Button>
                    </div>

                    {/* AI Suggestion Section */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                      {!aiSuggestion && !isGeneratingAi ? (
                        <Button 
                          onClick={handleGenerateAiPlan} 
                          className="w-full bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar Conduta com IA
                        </Button>
                      ) : isGeneratingAi ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mb-3" />
                          <p className="text-sm text-indigo-300 animate-pulse">Analisando parâmetros clínicos...</p>
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
                              Plano Terapêutico Sugerido
                            </p>
                            <Button variant="ghost" size="sm" onClick={handleGenerateAiPlan} className="h-6 text-[10px] text-indigo-400 hover:text-indigo-300 px-2">
                              Regerar
                            </Button>
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500 prose-strong:text-indigo-300">
                            <Markdown>{aiSuggestion}</Markdown>
                          </div>
                          <AiDisclaimer />
                        </motion.div>
                      )}
                    </div>

                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center p-8"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full border border-dashed border-zinc-700 flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 font-medium">Awaiting Data Input</p>
                  <p className="text-zinc-600 text-sm mt-2 max-w-[250px] mx-auto">Enter the ABG parameters to generate a comprehensive clinical analysis.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <CameraScanner 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleImageCapture} 
      />
    </div>
  );
}
