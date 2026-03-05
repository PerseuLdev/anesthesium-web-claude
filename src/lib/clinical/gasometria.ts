export interface GasometriaInput {
  tipo?: 'arterial' | 'venosa';
  pH: number;
  PaCO2: number;
  HCO3: number;
  PaO2?: number;
  BE: number;
  FiO2?: number; // 0.21 - 1.0
  Na: number;
  Cl: number;
  Albumina: number; // default 4.0
  Lactato: number;
  Idade?: number;
  unidadePressao?: 'mmHg' | 'kPa';
}

export interface GasometriaOutput {
  disturbioPrimario: string;
  severidade: string;
  compensacao: string;
  anionGap: number;
  anionGapCorrigido: number;
  deltaDelta?: number;
  deltaDeltaInterpretacao?: string;
  pfRatio: number;
  sdra: string;
  gradienteAa: number;
  gradienteAaNormal?: number;
  causasProvaveis?: string;
  interpretacao: string;
  phArterialEstimado?: number;
  beInterpretacao: string;
  sugestaoConduta?: string;
  inputOriginal: GasometriaInput;
}

export function interpretarGasometria(input: GasometriaInput): GasometriaOutput {
  let { tipo, pH, PaCO2, HCO3, PaO2, BE, FiO2, Na, Cl, Albumina, Lactato, Idade, unidadePressao } = input;
  
  // Converter kPa para mmHg se necessário
  if (unidadePressao === 'kPa') {
    PaCO2 = PaCO2 * 7.50062;
    PaO2 = PaO2 * 7.50062;
  }

  let disturbioPrimario = 'Normal';
  let severidade = 'Normal';
  let compensacao = '';
  let interpretacao = '';
  let causasProvaveis = '';
  let sugestaoConduta = '';
  let phArterialEstimado: number | undefined;

  if (tipo === 'venosa') {
    phArterialEstimado = pH + 0.03;
  }

  // 0. SEVERIDADE
  if (pH < 7.10 || pH > 7.65) severidade = 'Grave';
  else if ((pH >= 7.10 && pH <= 7.29) || (pH >= 7.56 && pH <= 7.65)) severidade = 'Moderada';
  else if ((pH >= 7.30 && pH < 7.35) || (pH > 7.45 && pH <= 7.55)) severidade = 'Leve';

  // 1. DISTÚRBIO PRIMÁRIO
  // Para venosa, os valores de referência do pH são ligeiramente menores (7.31-7.41), mas vamos manter a lógica baseada no arterial estimado ou usar os mesmos limiares para simplificar, como é comum na prática rápida.
  const isAcidose = pH < 7.35;
  const isAlcalose = pH > 7.45;
  
  const isRespAcidose = isAcidose && PaCO2 > 45;
  const isRespAlcalose = isAlcalose && PaCO2 < 35;
  const isMetAcidose = isAcidose && HCO3 < 22;
  const isMetAlcalose = isAlcalose && HCO3 > 26;

  if (isRespAcidose && isMetAcidose) {
    disturbioPrimario = 'Acidose Mista';
  } else if (isRespAlcalose && isMetAlcalose) {
    disturbioPrimario = 'Alcalose Mista';
  } else if (isRespAcidose) {
    disturbioPrimario = 'Acidose Respiratória';
  } else if (isRespAlcalose) {
    disturbioPrimario = 'Alcalose Respiratória';
  } else if (isMetAcidose) {
    disturbioPrimario = 'Acidose Metabólica';
  } else if (isMetAlcalose) {
    disturbioPrimario = 'Alcalose Metabólica';
  } else if (isAcidose) {
    disturbioPrimario = 'Acidose (Inconsistente com PaCO2/HCO3)';
  } else if (isAlcalose) {
    disturbioPrimario = 'Alcalose (Inconsistente com PaCO2/HCO3)';
  }

  // 2. COMPENSAÇÃO ESPERADA
  if (disturbioPrimario === 'Acidose Metabólica' || disturbioPrimario === 'Acidose Mista') {
    const pco2Esperado = (1.5 * HCO3) + 8;
    if (PaCO2 >= pco2Esperado - 2 && PaCO2 <= pco2Esperado + 2) {
      compensacao = 'Compensada';
      sugestaoConduta = 'Investigar causa da acidose metabólica (AG).';
    } else if (PaCO2 > pco2Esperado + 2 && PaCO2 <= pco2Esperado + 4) {
      compensacao = 'Compensação respiratória no limite superior — monitorizar';
    } else if (PaCO2 > pco2Esperado + 4) {
      compensacao = 'Distúrbio Misto (Acidose Respiratória associada)';
      sugestaoConduta = 'Checar ventilação minuto/frequência respiratória. Paciente não está conseguindo lavar CO2 suficiente.';
    } else if (PaCO2 < pco2Esperado - 2 && PaCO2 >= pco2Esperado - 4) {
      compensacao = 'Compensação respiratória no limite inferior — monitorizar';
    } else {
      compensacao = 'Distúrbio Misto (Alcalose Respiratória associada)';
      sugestaoConduta = 'Paciente hiperventilando além do esperado. Avaliar dor, ansiedade ou hipoxemia.';
    }
  } else if (disturbioPrimario === 'Alcalose Metabólica' || disturbioPrimario === 'Alcalose Mista') {
    const pco2Esperado = (0.7 * HCO3) + 21;
    if (PaCO2 >= pco2Esperado - 2 && PaCO2 <= pco2Esperado + 2) {
      compensacao = 'Compensada';
    } else if (PaCO2 > pco2Esperado + 2 && PaCO2 <= pco2Esperado + 4) {
      compensacao = 'Compensação respiratória no limite superior — monitorizar';
    } else if (PaCO2 > pco2Esperado + 4) {
      compensacao = 'Distúrbio Misto (Acidose Respiratória associada)';
    } else if (PaCO2 < pco2Esperado - 2 && PaCO2 >= pco2Esperado - 4) {
      compensacao = 'Compensação respiratória no limite inferior — monitorizar';
    } else {
      compensacao = 'Distúrbio Misto (Alcalose Respiratória associada)';
    }
  } else if (disturbioPrimario === 'Acidose Respiratória' || disturbioPrimario === 'Alcalose Respiratória') {
    const deltaPaCO2 = Math.abs(PaCO2 - 40);
    
    if (disturbioPrimario === 'Acidose Respiratória') {
      const hco3Agudo = 24 + (0.1 * deltaPaCO2);
      const hco3Cronico = 24 + (0.35 * deltaPaCO2);
      
      if (Math.abs(HCO3 - hco3Agudo) < Math.abs(HCO3 - hco3Cronico)) {
        compensacao = 'Fase Aguda';
        sugestaoConduta = 'Aumentar ventilação minuto (aumentar Volume Corrente ou Frequência Respiratória).';
      } else {
        compensacao = 'Fase Crônica (Compensada)';
        sugestaoConduta = 'Acidose respiratória crônica compensada (ex: DPOC). Cuidado ao hiperventilar.';
      }
    } else {
      const hco3Agudo = 24 - (0.2 * deltaPaCO2);
      const hco3Cronico = 24 - (0.5 * deltaPaCO2);
      
      if (Math.abs(HCO3 - hco3Agudo) < Math.abs(HCO3 - hco3Cronico)) {
        compensacao = 'Fase Aguda';
        sugestaoConduta = 'Reduzir ventilação minuto. Avaliar dor, ansiedade, febre ou hipoxemia.';
      } else {
        compensacao = 'Fase Crônica (Compensada)';
      }
    }
  }

  // 3. ÂNION GAP
  const anionGap = Na - (Cl + HCO3);
  const anionGapCorrigido = anionGap + 2.5 * (4.0 - Albumina);

  // CAUSAS PROVÁVEIS
  if (disturbioPrimario.includes('Acidose Metabólica') || disturbioPrimario.includes('Acidose Mista')) {
    if (anionGapCorrigido > 12) {
      causasProvaveis = 'Considerar: CAD (Cetoacidose Diabética), Uremia, Acidose Láctica, Intoxicação (Salicilatos, Metanol, Etilenoglicol).';
    } else {
      causasProvaveis = 'Considerar: Perdas TGI (Diarreia), Acidose Tubular Renal, Expansão volêmica com SF 0.9%.';
    }
  }

  // 4. DELTA-DELTA
  let deltaDelta: number | undefined;
  let deltaDeltaInterpretacao: string | undefined;

  if (anionGapCorrigido > 12 && (disturbioPrimario === 'Acidose Metabólica' || disturbioPrimario === 'Acidose Mista')) {
    deltaDelta = (anionGapCorrigido - 12) / (24 - HCO3);
    if (deltaDelta < 1.0) {
      deltaDeltaInterpretacao = 'Acidose Mista (AG + Acidose Metabólica Hiperclorêmica)';
    } else if (deltaDelta >= 1.0 && deltaDelta <= 2.0) {
      deltaDeltaInterpretacao = 'Acidose Metabólica com AG puro';
    } else {
      deltaDeltaInterpretacao = 'Acidose Metabólica com AG + Alcalose Metabólica oculta';
    }
  }

  // 5. OXIGENAÇÃO (Apenas para Arterial)
  let pfRatio = 0;
  let sdra = 'Não aplicável (Venosa)';
  let gradienteAa = 0;
  let gradienteAaNormal: number | undefined;

  if (tipo === 'arterial') {
    pfRatio = PaO2 / FiO2;
    if (pfRatio > 300) sdra = 'Normal';
    else if (pfRatio <= 300 && pfRatio > 200) sdra = 'Lesão Leve (SDRA Leve)';
    else if (pfRatio <= 200 && pfRatio > 100) sdra = 'Moderada (SDRA Moderada)';
    else if (pfRatio <= 100) sdra = 'SDRA Grave (Insuficiência Respiratória)';

    // 6. GRADIENTE A-a
    const PAO2 = (FiO2 * 713) - (PaCO2 / 0.8);
    gradienteAa = PAO2 - PaO2;
    
    if (Idade && Idade > 0) {
      gradienteAaNormal = (Idade / 4) + 4;
    }
  }

  // 7. BASE EXCESS INTERPRETAÇÃO
  let beInterpretacao = 'Normal';
  if (BE < -2) {
    beInterpretacao = 'Déficit de bases sugere causa metabólica (Acidose)';
  } else if (BE > 2) {
    beInterpretacao = 'Excesso de bases sugere causa metabólica (Alcalose)';
  }

  interpretacao = `${disturbioPrimario}${compensacao ? ' - ' + compensacao : ''}. `;
  if (deltaDeltaInterpretacao) interpretacao += `${deltaDeltaInterpretacao}. `;
  
  if (tipo === 'arterial') {
    interpretacao += `Oxigenação: ${sdra} (P/F: ${Math.round(pfRatio)}). `;
    if (gradienteAaNormal !== undefined) {
      if (gradienteAa > gradienteAaNormal + 5) {
        interpretacao += `Gradiente A-a aumentado, sugerindo distúrbio V/Q ou shunt.`;
      } else {
        interpretacao += `Gradiente A-a normal.`;
      }
    }
  }

  return {
    disturbioPrimario,
    severidade,
    compensacao,
    anionGap,
    anionGapCorrigido,
    deltaDelta,
    deltaDeltaInterpretacao,
    pfRatio,
    sdra,
    gradienteAa,
    gradienteAaNormal,
    causasProvaveis,
    interpretacao,
    phArterialEstimado,
    beInterpretacao,
    sugestaoConduta,
    inputOriginal: input
  };
}
