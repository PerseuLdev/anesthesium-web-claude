import { Droga } from '../../constants/drogas';

export interface CalculoDrogaInput {
  peso: number;
  idade: number;
  tipo: 'Adulto' | 'Pediátrico';
  droga: Droga;
}

export interface CalculoDrogaOutput {
  doseBolusMin?: number;
  doseBolusMax?: number;
  unidadeBolus?: string;
  volumeBolusMin?: number;
  volumeBolusMax?: number;
  
  doseInfusaoMin?: number;
  doseInfusaoMax?: number;
  unidadeInfusao?: string;
  taxaInfusaoMin?: number; // mL/h
  taxaInfusaoMax?: number; // mL/h
  
  alerta?: string;
}

export function calcularDroga(input: CalculoDrogaInput): CalculoDrogaOutput {
  const { peso, droga } = input;
  const output: CalculoDrogaOutput = {};

  // Bolus
  if (droga.doseBolus) {
    let multiplicador = 1;
    if (droga.doseBolus.unidade === 'mg/kg' || droga.doseBolus.unidade === 'mcg/kg') {
      multiplicador = peso;
    }

    output.doseBolusMin = droga.doseBolus.min * multiplicador;
    output.doseBolusMax = droga.doseBolus.max * multiplicador;
    output.unidadeBolus = droga.doseBolus.unidade.replace('/kg', '');

    // Converter mcg para mg para calcular volume se a ampola for em mg/mL
    let fatorConversao = 1;
    if (droga.doseBolus.unidade.includes('mcg') && droga.concentracaoPadrao < 100) {
      // Se a dose é mcg e a concentração é pequena (ex: Fentanil 0.05 mg/mL = 50 mcg/mL)
      // Vamos converter a concentração para mcg/mL
      fatorConversao = 1000;
    }

    const concentracao = droga.concentracaoPadrao * fatorConversao;
    output.volumeBolusMin = output.doseBolusMin / concentracao;
    output.volumeBolusMax = output.doseBolusMax / concentracao;
  }

  // Infusão
  if (droga.doseInfusao) {
    let multiplicador = 1;
    if (droga.doseInfusao.unidade.includes('/kg')) {
      multiplicador = peso;
    }

    output.doseInfusaoMin = droga.doseInfusao.min * multiplicador;
    output.doseInfusaoMax = droga.doseInfusao.max * multiplicador;
    output.unidadeInfusao = droga.doseInfusao.unidade.replace('/kg', '');

    // Calcular mL/h
    // Se a unidade for mcg/min, converter para mcg/h (* 60)
    let fatorTempo = 1;
    if (droga.doseInfusao.unidade.includes('/min')) {
      fatorTempo = 60;
    }

    let fatorConversao = 1;
    if (droga.doseInfusao.unidade.includes('mcg') && droga.concentracaoPadrao < 100) {
      fatorConversao = 1000; // mg para mcg
    }

    const concentracao = droga.concentracaoPadrao * fatorConversao;
    
    output.taxaInfusaoMin = (output.doseInfusaoMin * fatorTempo) / concentracao;
    output.taxaInfusaoMax = (output.doseInfusaoMax * fatorTempo) / concentracao;
  }

  // Alertas de dose máxima (Anestésicos Locais)
  if (droga.classe === 'Anestésico Local') {
    output.alerta = `Dose máxima: ${droga.observacoes}`;
  }

  return output;
}
