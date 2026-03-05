import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill, Search, AlertCircle, Check, Plus, X, Activity, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

import { DRUGS, Droga } from '../constants/drogas';
import { calcularDroga, CalculoDrogaOutput } from '../lib/clinical/drogas';
import { checkDrugInteractions } from '../lib/services/clinicalAiService';
import { useHistoryStore } from '../lib/storage/historyStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

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

export function Drogas() {
  const { t } = useTranslation();
  
  // Input states
  const [inputPeso, setInputPeso] = useState<number | ''>(70);
  const [inputIdade, setInputIdade] = useState<number | ''>(30);
  const [inputTipo, setInputTipo] = useState<'Adulto' | 'Pediátrico'>('Adulto');
  
  // Confirmed states for calculation
  const [peso, setPeso] = useState<number>(70);
  const [idade, setIdade] = useState<number>(30);
  const [tipo, setTipo] = useState<'Adulto' | 'Pediátrico'>('Adulto');
  
  const [busca, setBusca] = useState('');

  // Prescription states
  const [prescricao, setPrescricao] = useState<Droga[]>([]);
  const [interacoes, setInteracoes] = useState<string | null>(null);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  
  // History state
  const [currentAvaliacaoId, setCurrentAvaliacaoId] = useState<string | null>(null);
  const addAvaliacao = useHistoryStore(state => state.addAvaliacao);
  const updateAvaliacao = useHistoryStore(state => state.updateAvaliacao);

  const drogasFiltradas = useMemo(() => {
    return DRUGS.filter(d => 
      d.nome.toLowerCase().includes(busca.toLowerCase()) || 
      d.classe.toLowerCase().includes(busca.toLowerCase())
    );
  }, [busca]);

  const handleConfirm = () => {
    const newPeso = Number(inputPeso) || 0;
    const newIdade = Number(inputIdade) || 0;
    setPeso(newPeso);
    setIdade(newIdade);
    setTipo(inputTipo);
    
    // Auto-save
    const id = addAvaliacao({
      pacienteId: `PAC-${Math.floor(Math.random() * 10000)}`,
      tipo: 'Drogas',
      dados: { peso: newPeso, idade: newIdade, tipo: inputTipo },
      resultado: { prescricao, interacoes },
    });
    setCurrentAvaliacaoId(id);
  };

  const handleNumberChange = (setter: React.Dispatch<React.SetStateAction<number | ''>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setter(val === '' ? '' : Number(val));
  };

  const togglePrescricao = (droga: Droga) => {
    setPrescricao(prev => {
      const exists = prev.find(d => d.nome === droga.nome);
      const newPrescricao = exists ? prev.filter(d => d.nome !== droga.nome) : [...prev, droga];
      
      // Update history if it exists
      if (currentAvaliacaoId) {
        updateAvaliacao(currentAvaliacaoId, { 
          resultado: { prescricao: newPrescricao, interacoes: null } 
        });
      }
      return newPrescricao;
    });
    // Reset interactions when prescription changes
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
    } catch (error) {
      alert("Erro ao verificar interações. Tente novamente.");
    } finally {
      setIsCheckingInteractions(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center">
          <Pill className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white uppercase">{t('drugs.title')}</h1>
          <p className="text-zinc-500 text-sm font-mono mt-1">PHARMACOLOGY & DOSING ENGINE</p>
        </div>
      </div>

      <Card className="bg-black/40 border-white/5">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <Input 
            label={t('drugs.weight')} 
            type="number" 
            value={inputPeso} 
            onChange={handleNumberChange(setInputPeso)} 
          />
          <Input 
            label={t('drugs.age')} 
            type="number" 
            value={inputIdade} 
            onChange={handleNumberChange(setInputIdade)} 
          />
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
          <Button 
            onClick={handleConfirm}
            className="h-12 w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          >
            <Check className="w-4 h-4 mr-2" />
            Atualizar Doses
          </Button>
        </CardContent>
      </Card>

      {/* Prescrição e Interações */}
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
              <CardHeader className="pb-4 border-b border-white/5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-indigo-400 text-sm uppercase tracking-widest">
                    <Activity className="w-4 h-4" />
                    Prescrição Atual
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-1">{prescricao.length} medicamento(s) selecionado(s)</p>
                </div>
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
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
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

                {interacoes && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-5 rounded-2xl bg-black/40 border border-indigo-500/20"
                  >
                    <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-4">
                      <Sparkles className="w-3 h-3" />
                      Análise de Interações (IA)
                    </p>
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-500 prose-strong:text-indigo-300">
                      <Markdown>{interacoes}</Markdown>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
        <input 
          type="text" 
          placeholder="Search drug or class..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full h-14 pl-12 pr-4 rounded-2xl border border-white/5 bg-black/40 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/5 transition-all shadow-inner"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                <Card className={`h-full flex flex-col transition-colors ${isSelected ? 'border-indigo-500/50 bg-indigo-950/10' : 'hover:border-cyan-500/30 bg-zinc-900/20'}`}>
                  <CardHeader className="pb-4 border-b border-white/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-white tracking-tight">{droga.nome}</CardTitle>
                        <span className={`inline-block px-2 py-0.5 mt-2 text-[10px] uppercase tracking-widest font-bold border rounded-md ${classColor}`}>
                          {droga.classe}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => togglePrescricao(droga)}
                          className={`w-8 h-8 rounded-full ${isSelected ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                        >
                          {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                        <div className="text-right mt-1">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Ampoule</p>
                          <p className="text-sm font-mono text-zinc-300">{droga.concentracaoPadrao} mg/mL</p>
                          <p className="text-[10px] font-mono text-zinc-500">{droga.volumeAmpola} mL</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1 flex flex-col gap-4">
                    {calculo.doseBolusMin !== undefined && (
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">{t('drugs.bolus')}</p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xl font-mono text-white">
                              {calculo.doseBolusMin.toFixed(1)} {calculo.doseBolusMin !== calculo.doseBolusMax ? `- ${calculo.doseBolusMax?.toFixed(1)}` : ''} <span className="text-xs text-zinc-500 font-sans">{calculo.unidadeBolus}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-mono text-cyan-400">
                              {calculo.volumeBolusMin?.toFixed(1)} {calculo.volumeBolusMin !== calculo.volumeBolusMax ? `- ${calculo.volumeBolusMax?.toFixed(1)}` : ''} <span className="text-xs font-sans text-cyan-500/50">mL</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {calculo.doseInfusaoMin !== undefined && (
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">{t('drugs.infusion')}</p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xl font-mono text-white">
                              {calculo.doseInfusaoMin.toFixed(1)} {calculo.doseInfusaoMin !== calculo.doseInfusaoMax ? `- ${calculo.doseInfusaoMax?.toFixed(1)}` : ''} <span className="text-xs text-zinc-500 font-sans">{calculo.unidadeInfusao}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-mono text-purple-400">
                              {calculo.taxaInfusaoMin?.toFixed(1)} {calculo.taxaInfusaoMin !== calculo.taxaInfusaoMax ? `- ${calculo.taxaInfusaoMax?.toFixed(1)}` : ''} <span className="text-xs font-sans text-purple-500/50">mL/h</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {calculo.alerta && (
                      <div className="mt-auto flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        <p className="text-xs text-rose-300 leading-relaxed font-medium">{calculo.alerta}</p>
                      </div>
                    )}
                    
                    {droga.observacoes && !calculo.alerta && (
                      <div className="mt-auto pt-2">
                        <p className="text-xs text-zinc-500 italic leading-relaxed">{droga.observacoes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
