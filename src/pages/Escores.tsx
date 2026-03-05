import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ASA_CLASSES, MALLAMPATI_CLASSES, CORMACK_LEHANE_CLASSES } from '../constants/escores';
import { calcularApfel, calcularStopBang, calcularGoldman } from '../lib/clinical/escores';
import { useHistoryStore } from '../lib/storage/historyStore';

export function Escores() {
  const { t } = useTranslation();
  
  // State for ASA
  const [asa, setAsa] = useState(ASA_CLASSES[0]);
  
  // State for Mallampati
  const [mallampati, setMallampati] = useState(MALLAMPATI_CLASSES[0]);
  
  // State for Cormack
  const [cormack, setCormack] = useState(CORMACK_LEHANE_CLASSES[0]);

  // State for Apfel
  const [apfel, setApfel] = useState({
    sexoFeminino: false,
    naoFumante: false,
    usoOpioides: false,
    historicoNVPO: false,
  });

  // State for STOP-BANG
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

  // State for Goldman
  const [goldman, setGoldman] = useState({
    cirurgiaAltoRisco: false,
    historiaDoencaIsquemica: false,
    historiaInsuficienciaCardiaca: false,
    historiaDoencaCerebrovascular: false,
    diabetesInsulinoDependente: false,
    creatininaMaior2: false,
  });

  const resApfel = calcularApfel(apfel);
  const resStopBang = calcularStopBang(stopBang);
  const resGoldman = calcularGoldman(goldman);

  // Auto-save on unmount if any score is non-zero
  const addAvaliacao = useHistoryStore(state => state.addAvaliacao);
  const stateRef = React.useRef({ asa, mallampati, cormack, resApfel, resStopBang, resGoldman });

  React.useEffect(() => {
    stateRef.current = { asa, mallampati, cormack, resApfel, resStopBang, resGoldman };
  }, [asa, mallampati, cormack, resApfel, resStopBang, resGoldman]);

  React.useEffect(() => {
    return () => {
      const current = stateRef.current;
      if (current.resApfel.probabilidade > 10 || current.resStopBang.score > 0 || current.resGoldman.score > 0 || current.asa.id !== 'I') {
        addAvaliacao({
          pacienteId: `PAC-${Math.floor(Math.random() * 10000)}`,
          tipo: 'Escores',
          dados: { 
            asa: current.asa.id, 
            mallampati: current.mallampati.id, 
            cormack: current.cormack.id 
          },
          resultado: {
            apfel: current.resApfel,
            stopBang: current.resStopBang,
            goldman: current.resGoldman
          }
        });
      }
    };
  }, [addAvaliacao]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/20 rounded-2xl">
          <ClipboardList className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t('scores.title')}</h1>
          <p className="text-slate-400 text-sm">Avaliação pré-operatória integrada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ASA */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-blue-400">ASA Physical Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ASA_CLASSES.map((classe) => (
              <button
                key={classe.id}
                onClick={() => setAsa(classe)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  asa.id === classe.id 
                    ? `border-${classe.cor.split('-')[1]}-500 bg-${classe.cor.split('-')[1]}-500/10` 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${classe.cor}`} />
                  <div>
                    <p className={`font-bold ${asa.id === classe.id ? 'text-white' : 'text-slate-300'}`}>ASA {classe.id}</p>
                    <p className="text-sm text-slate-400">{classe.descricao}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Via Aérea */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-blue-400">Avaliação de Via Aérea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-300 mb-3">Mallampati Modificado</p>
              <div className="grid grid-cols-2 gap-3">
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
                    <p className={`font-bold ${mallampati.id === classe.id ? 'text-blue-400' : 'text-slate-300'}`}>Classe {classe.id}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{classe.descricao}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-300 mb-3">Cormack-Lehane</p>
              <div className="grid grid-cols-2 gap-3">
                {CORMACK_LEHANE_CLASSES.map((classe) => (
                  <button
                    key={classe.id}
                    onClick={() => setCormack(classe)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      cormack.id === classe.id 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-slate-800 hover:border-slate-700 bg-slate-800/30'
                    }`}
                  >
                    <p className={`font-bold ${cormack.id === classe.id ? 'text-blue-400' : 'text-slate-300'}`}>Grau {classe.id}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{classe.descricao}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Apfel */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-blue-400">Índice de Apfel (NVPO)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries({
                sexoFeminino: 'Sexo Feminino',
                naoFumante: 'Não Fumante',
                usoOpioides: 'Uso de Opioides Pós-op',
                historicoNVPO: 'Histórico de NVPO/Cinetose'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-800/30 cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={apfel[key as keyof typeof apfel]}
                    onChange={(e) => setApfel({ ...apfel, [key]: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-900"
                  />
                  <span className="text-sm text-slate-300">{label}</span>
                </label>
              ))}
            </div>
            
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Risco Estimado</p>
                <p className="text-xl font-bold text-white">{resApfel.probabilidade}%</p>
              </div>
              <div className="text-right max-w-[60%]">
                <p className="text-sm text-slate-300">{resApfel.recomendacao}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STOP-BANG */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-blue-400">STOP-BANG (SAOS)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries({
                ronco: 'Ronco alto?',
                cansaco: 'Cansaço/fadiga?',
                apneiaObservada: 'Apneia observada?',
                pressaoAlta: 'Pressão alta?',
                imcMaior35: 'IMC > 35?',
                idadeMaior50: 'Idade > 50?',
                circunferenciaPescoco: 'Pescoço > 40cm?',
                sexoMasculino: 'Sexo masculino?'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-800/30 cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={stopBang[key as keyof typeof stopBang]}
                    onChange={(e) => setStopBang({ ...stopBang, [key]: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-900"
                  />
                  <span className="text-sm text-slate-300">{label}</span>
                </label>
              ))}
            </div>
            
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Classificação</p>
                <p className={`text-lg font-bold ${resStopBang.score >= 5 ? 'text-red-400' : resStopBang.score >= 3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {resStopBang.risco}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Score: {resStopBang.score}/8</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goldman RCRI */}
        <Card className="border-slate-800 bg-slate-900/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-blue-400">Índice de Risco Cardíaco Revisado (RCRI)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries({
                cirurgiaAltoRisco: 'Cirurgia de alto risco',
                historiaDoencaIsquemica: 'História de doença isquêmica',
                historiaInsuficienciaCardiaca: 'História de insuficiência cardíaca',
                historiaDoencaCerebrovascular: 'História de doença cerebrovascular',
                diabetesInsulinoDependente: 'Diabetes insulino-dependente',
                creatininaMaior2: 'Creatinina > 2.0 mg/dL'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-800/30 cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={goldman[key as keyof typeof goldman]}
                    onChange={(e) => setGoldman({ ...goldman, [key]: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-900"
                  />
                  <span className="text-sm text-slate-300">{label}</span>
                </label>
              ))}
            </div>
            
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Risco de Evento Cardíaco Maior (MACE)</p>
                <p className={`text-2xl font-bold ${resGoldman.score >= 2 ? 'text-red-400' : resGoldman.score === 1 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {resGoldman.riscoMACE}%
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-slate-300 font-medium">{resGoldman.recomendacao}</p>
                <p className="text-xs text-slate-500 mt-1">Score: {resGoldman.score}/6</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Integrado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-emerald-500/30 bg-emerald-950/20 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Resumo Pré-operatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Estado Físico</p>
                <p className="text-lg font-bold text-white">ASA {asa.id}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Via Aérea</p>
                <p className="text-lg font-bold text-white">M{mallampati.id} / C{cormack.id}</p>
                {['III', 'IV'].includes(mallampati.id) || ['III', 'IV'].includes(cormack.id) ? (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Via aérea difícil provável</p>
                ) : null}
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Risco NVPO</p>
                <p className="text-lg font-bold text-white">{resApfel.probabilidade}%</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Risco Cardíaco</p>
                <p className="text-lg font-bold text-white">{resGoldman.riscoMACE}% MACE</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
