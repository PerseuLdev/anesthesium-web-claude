import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator } from 'lucide-react';

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

export function Calculadoras() {
  const { t } = useTranslation();
  
  const [altura, setAltura] = useState<number | ''>(170);
  const [peso, setPeso] = useState<number | ''>(70);
  const [idade, setIdade] = useState<number | ''>(40);
  const [sexo, setSexo] = useState<'M' | 'F'>('M');
  const [creatinina, setCreatinina] = useState<number | ''>(1.0);

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

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
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
    </div>
  );
}
