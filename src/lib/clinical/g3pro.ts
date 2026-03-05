// ============================================================
// G3-Pro Clinical Decision System — TypeScript Port
// Módulos: 1. Hemodinâmica | 2. Ácido-Base | 3. Eletrolítico
// Baseado no sistema G3-Pro (Python) + calculadoras expandidas
// ============================================================

export interface G3ProInput {
  // Antropometria
  peso: number;
  altura: number;
  idade: number;
  sexo: 'M' | 'F';
  // Vitais e Pressões
  fc: number;
  pas: number;
  pad: number;
  pvc: number;
  papm: number;
  pcp: number;
  pp_max: number;
  pp_min: number;
  // Oximetria e Gases (Arterial + Venoso)
  hb: number;
  sao2: number;   // %
  svo2: number;   // %
  pao2: number;
  pvo2: number;
  paco2: number;
  pvco2: number;
  ph: number;
  hco3: number;
  lactato: number;
  // Eletrólitos e Bioquímica
  na: number;
  cl: number;
  k: number;
  ca: number;
  mg: number;
  fosfato: number;
  alb: number;
  glicose: number;
  ureia: number;
  osm_medida: number;
}

export interface HemoResult {
  // Antropometria derivada
  sc: number;
  vo2: number;
  // Conteúdo e transporte de O2
  cao2: number;
  cvo2: number;
  dav_o2: number;
  ero2: number;
  // Fluxo e desempenho (Fick)
  dc: number;
  ic: number;
  vs: number;
  is_index: number;
  do2i: number;
  // Pressões e resistências
  pam: number;
  irvs: number;
  irvp: number;
  // Trabalho e contratilidade
  lvswi: number;
  rvswi: number;
  cpo: number;
  // Perfusão e funcional
  deltapp: number;
  gap_co2: number;
  ratio: number;
  // Alertas e classificação
  alertas: string[];
  choque?: 'cardiogenico' | 'obstrutivo' | 'hipovolemico' | 'distributivo' | 'misto';
}

export interface AcidBaseResult {
  // Boston
  ag: number;
  ag_corr: number;
  pco2_esp: number;
  delta_gap: number;
  // Stewart
  side: number;
  atot: number;
  sig: number;
  // Diagnóstico
  diag_primario: string;
  diag_secundario: string;
}

export interface EletrolyteResult {
  na_corr: number;
  ca_corr: number;
  k_real: number;
  osm_calc: number;
  gap_osm: number;
  prod_ca_p: number;
  alertas: string[];
}

export interface G3ProResult {
  hemo: HemoResult;
  acido_base: AcidBaseResult;
  eletrolitos: EletrolyteResult;
}

// ============================================================
// MÓDULO 1 — HEMODINÂMICA (Princípio de Fick + Derivados)
// ============================================================
export function calcularHemodinamica(d: G3ProInput): HemoResult {
  // 1. Superfície corporal e VO2 estimado
  const sc = Math.sqrt((d.peso * d.altura) / 3600);
  const vo2 = sc * (157.3 - 0.6 * d.idade + (d.sexo === 'M' ? 10 : 0));

  // 2. Conteúdo de O2 (arterial e venoso)
  const cao2 = d.hb * 1.34 * (d.sao2 / 100) + d.pao2 * 0.003;
  const cvo2 = d.hb * 1.34 * (d.svo2 / 100) + d.pvo2 * 0.003;
  const dav_o2 = cao2 - cvo2;
  const ero2 = dav_o2 > 0 && cao2 > 0 ? (dav_o2 / cao2) * 100 : 0;

  // 3. Débito cardíaco pelo Princípio de Fick
  const dc = dav_o2 > 0 ? vo2 / (10 * dav_o2) : 0;
  const ic = sc > 0 ? dc / sc : 0;
  const vs = d.fc > 0 ? (dc * 1000) / d.fc : 0;
  const is_index = sc > 0 ? vs / sc : 0;
  const do2i = cao2 * ic * 10;

  // 4. Pressão arterial média e resistências vasculares
  const pam = (d.pas + 2 * d.pad) / 3;
  const irvs = ic > 0 ? ((pam - d.pvc) / ic) * 80 : 0;
  const irvp = ic > 0 ? ((d.papm - d.pcp) / ic) * 80 : 0;

  // 5. Trabalho ventricular e poder cardíaco
  const lvswi = (pam - d.pvc) * is_index * 0.0136;
  const rvswi = (d.papm - d.pvc) * is_index * 0.0136;
  const cpo = pam > 0 && dc > 0 ? (pam * dc) / 451 : 0;

  // 6. DeltaPP (fluido-responsividade), Gap V-A CO2, Ratio
  const pp_medio = (d.pp_max + d.pp_min) / 2;
  const deltapp = pp_medio > 0 ? ((d.pp_max - d.pp_min) / pp_medio) * 100 : 0;
  const gap_co2 = d.pvco2 - d.paco2;
  const ratio = dav_o2 > 0 ? gap_co2 / dav_o2 : 0;

  // 7. Motor de alertas e classificação de choque
  const alertas: string[] = [];
  let choque: HemoResult['choque'] | undefined;

  if (ic < 2.5) {
    if (d.pcp > 15 && irvs > 1800) {
      alertas.push('🚨 CARDIOGÊNICO: Baixo débito com congestão (PCP alta) e vasoconstrição (RVS alta).');
      choque = 'cardiogenico';
    } else if (d.pvc > 12 && d.pcp <= 15) {
      alertas.push('🚨 OBSTRUTIVO/VD: Baixo débito com PVC elevada e PCP normal. Avaliar TEP ou disfunção de VD.');
      choque = 'obstrutivo';
    } else if (d.pcp <= 12 && d.pvc <= 8) {
      alertas.push('🚨 HIPOVOLÊMICO: Baixo débito com pressões de enchimento baixas e RVS alta.');
      choque = 'hipovolemico';
    } else {
      alertas.push('⚠️ BAIXO DÉBITO MISTO: IC < 2.5 com padrão não conclusivo. Revisar qualidade dos dados.');
      choque = 'misto';
    }
  } else if (ic > 4.0 && irvs < 1500) {
    alertas.push('🚨 DISTRIBUTIVO: Vasoplegia com débito aumentado (Sepse/SIRS?). IRVS baixo.');
    choque = 'distributivo';
  }

  if (deltapp > 13) {
    alertas.push('💧 FLUIDO-RESPONSIVO: DeltaPP > 13%. Alta probabilidade de resposta a volume (VM com VC ≥ 8 mL/kg).');
  } else if (deltapp <= 10 && ic < 2.5) {
    alertas.push('🛑 PROVÁVEL INOTRÓPICO: DeltaPP baixo com IC reduzido. Considere inodilatadores (Dobutamina/Milrinona).');
  }

  if (ratio > 1.4) {
    alertas.push('🔬 ANAEROBIOSE CELULAR: Ratio ΔCO2/C(a-v)O2 > 1.4. Sofrimento celular mesmo sem hiperlactatemia inicial.');
  }

  if (d.lactato > 4.0) {
    alertas.push(`🩸 HIPERLACTATEMIA GRAVE: Lactato ${d.lactato} mmol/L. Hipoperfusão crítica ou falência metabólica.`);
  } else if (d.lactato > 2.0) {
    alertas.push(`⚠️ HIPERLACTATEMIA: Lactato ${d.lactato} mmol/L. Investigar perfusão tecidual e clearance hepático.`);
  }

  if (ero2 > 35) {
    alertas.push(`⚡ ERO2 ELEVADA: ${ero2.toFixed(1)}%. Tecidos extraindo O2 acima do limite — risco de débito de O2 crítico.`);
  }

  if (cpo < 0.6 && ic < 2.5) {
    alertas.push('💔 PODER CARDÍACO CRÍTICO (CPO < 0.6W): Associado a mortalidade > 50% em choque cardiogênico.');
  }

  return {
    sc, vo2,
    cao2, cvo2, dav_o2, ero2,
    dc, ic, vs, is_index, do2i,
    pam, irvs, irvp,
    lvswi, rvswi, cpo,
    deltapp, gap_co2, ratio,
    alertas, choque,
  };
}

// ============================================================
// MÓDULO 2 — ÁCIDO-BASE (Abordagem Boston + Stewart)
// ============================================================
export function calcularAcidoBase(d: G3ProInput): AcidBaseResult {
  // Boston
  const ag = d.na - (d.cl + d.hco3);
  const ag_corr = ag + 2.5 * (4 - d.alb);
  const pco2_esp = 1.5 * d.hco3 + 8; // Winters
  const delta_gap = (24 - d.hco3) !== 0 ? (ag - 12) / (24 - d.hco3) : 0;

  // Stewart
  const side = d.na + d.k + d.ca + d.mg - d.cl - d.lactato;
  const atot = d.alb * (0.123 * d.ph - 0.631) + d.fosfato * (0.309 * d.ph - 0.469);
  const sig = side - d.hco3 - atot;

  // Distúrbio primário
  let diag_primario = '';
  if (d.ph < 7.35) {
    if (d.paco2 > 45 && d.hco3 < 22) {
      diag_primario = 'Acidose Mista (Respiratória + Metabólica)';
    } else if (d.paco2 > 45) {
      diag_primario = 'Acidose Respiratória';
    } else if (d.hco3 < 22) {
      diag_primario = 'Acidose Metabólica';
    } else {
      diag_primario = 'Acidemia (Verificar eletrólitos)';
    }
  } else if (d.ph > 7.45) {
    if (d.paco2 < 35 && d.hco3 > 26) {
      diag_primario = 'Alcalose Mista (Respiratória + Metabólica)';
    } else if (d.paco2 < 35) {
      diag_primario = 'Alcalose Respiratória';
    } else if (d.hco3 > 26) {
      diag_primario = 'Alcalose Metabólica';
    } else {
      diag_primario = 'Alcalemia (Verificar eletrólitos)';
    }
  } else {
    if (d.paco2 > 45 && d.hco3 > 26) {
      diag_primario = 'Distúrbio Misto Compensado (Acidose Resp. + Alcalose Metab.)';
    } else if (d.paco2 < 35 && d.hco3 < 22) {
      diag_primario = 'Distúrbio Misto Compensado (Alcalose Resp. + Acidose Metab.)';
    } else {
      diag_primario = 'Gasometria Normal / pH Fisiológico';
    }
  }

  // Compensação e distúrbio secundário
  let diag_secundario = '';
  if (diag_primario.includes('Acidose Metabólica') || d.hco3 < 22) {
    if (d.paco2 > pco2_esp + 2) {
      diag_secundario = '⚠️ Acidose Respiratória Associada — pCO2 acima do esperado por Winters. Possível fadiga ventilatória.';
    } else if (d.paco2 < pco2_esp - 2) {
      diag_secundario = 'Alcalose Respiratória Associada — hiperventilação excessiva.';
    } else {
      diag_secundario = 'Compensação respiratória adequada (Fórmula de Winters).';
    }
  }

  if (delta_gap > 1.6) {
    const extra = '⚠️ Alcalose Metabólica Oculta (Delta Gap > 1.6).';
    diag_secundario = diag_secundario ? `${diag_secundario} | ${extra}` : extra;
  } else if (delta_gap < 1.0 && ag_corr > 12) {
    const extra = 'Acidose Mista com AG: AG elevado + componente hiperclorêmico (Delta Gap < 1.0).';
    diag_secundario = diag_secundario ? `${diag_secundario} | ${extra}` : extra;
  }

  return { ag, ag_corr, pco2_esp, delta_gap, side, atot, sig, diag_primario, diag_secundario };
}

// ============================================================
// MÓDULO 3 — ELETROLÍTICO E METABÓLICO
// ============================================================
export function calcularEletrolitos(d: G3ProInput): EletrolyteResult {
  const na_corr = d.na + 0.016 * (d.glicose - 100);
  const ca_corr = d.ca + 0.8 * (4 - d.alb);
  const k_real = d.k - (d.ph - 7.4) * 0.6;
  const osm_calc = 2 * d.na + d.glicose / 18 + d.ureia / 6;
  const gap_osm = d.osm_medida - osm_calc;
  const prod_ca_p = ca_corr * d.fosfato;

  const alertas: string[] = [];

  if (na_corr > 150) {
    alertas.push('🧂 HIPERNATREMIA GRAVE: Déficit importante de água livre. Repor com cautela (máx 10 mEq/L/dia).');
  } else if (na_corr > 145) {
    alertas.push('🧂 HIPERNATREMIA: Calcular déficit de água livre e repor gradualmente.');
  } else if (na_corr < 125) {
    alertas.push('💧 HIPONATREMIA GRAVE: Risco de herniação cerebral. Correção emergencial (máx 8-10 mEq/L/dia).');
  } else if (na_corr < 135) {
    alertas.push('💧 HIPONATREMIA: Avaliar volemia, SIADH, e velocidade segura de correção.');
  }

  if (k_real > 6.0 || d.k > 6.0) {
    alertas.push('⚡ HIPERCALEMIA GRAVE: Risco arrítmico iminente. ECG urgente + Gluconato de Cálcio + Insulina/Glicose.');
  } else if (k_real > 5.1 || d.k > 5.5) {
    alertas.push('⚡ HIPERCALEMIA: Solicitar ECG. Revisar causa (ARF, hemólise, IECA, Espironolactona).');
  } else if (k_real < 3.0) {
    alertas.push(`📉 HIPOCALEMIA GRAVE: K⁺ real ${k_real.toFixed(1)} mEq/L. Mg atual: ${d.mg} — repor Mg antes do K⁺.`);
  } else if (k_real < 3.5) {
    alertas.push(`📉 HIPOCALEMIA: K⁺ real ${k_real.toFixed(1)} mEq/L. Repor K⁺ (verificar Mg sérico antes).`);
  }

  if (prod_ca_p > 70) {
    alertas.push('🦴 CALCIFILAXIA: Produto Ca × P > 70. Risco alto de precipitação tecidual e vascular.');
  } else if (prod_ca_p > 55) {
    alertas.push('🦴 PRODUTO Ca × P ELEVADO: > 55. Monitorar calcificações e função vascular.');
  }

  if (gap_osm > 20) {
    alertas.push('☠️ GAP OSMOLAR MUITO ALTO: > 20 mOsm/kg. Forte suspeita de intoxicação (etanol, metanol, etilenoglicol, propilenoglicol).');
  } else if (gap_osm > 10) {
    alertas.push('⚠️ GAP OSMOLAR ELEVADO: > 10 mOsm/kg. Investigar substâncias osmoticamente ativas não medidas.');
  }

  if (d.mg < 1.5) {
    alertas.push(`🔋 HIPOMAGNESEMIA: Mg ${d.mg} mg/dL. Pode causar hipocalemia e hipocalcemia refratárias.`);
  }

  return { na_corr, ca_corr, k_real, osm_calc, gap_osm, prod_ca_p, alertas };
}

// ============================================================
// FUNÇÃO MASTER
// ============================================================
export function calcularG3Pro(d: G3ProInput): G3ProResult {
  return {
    hemo: calcularHemodinamica(d),
    acido_base: calcularAcidoBase(d),
    eletrolitos: calcularEletrolitos(d),
  };
}

// Valores de referência para coloração
export const G3PRO_REFS = {
  ic:       { min: 2.5,  max: 4.0   },
  irvs:     { min: 1700, max: 2400  },
  irvp:     { min: 0,    max: 250   },
  vs:       { min: 60,   max: 100   },
  is_index: { min: 33,   max: 50    },
  do2i:     { min: 520,  max: 720   },
  ero2:     { min: 22,   max: 30    },
  deltapp:  { min: 0,    max: 13    },
  gap_co2:  { min: 2,    max: 6     },
  ratio:    { min: 0,    max: 1.4   },
  cpo:      { min: 0.6,  max: 2.5   },
  lvswi:    { min: 44,   max: 64    },
  rvswi:    { min: 4,    max: 8     },
  ag_corr:  { min: 8,    max: 12    },
  sig:      { min: -2,   max: 2     },
  na_corr:  { min: 135,  max: 145   },
  k_real:   { min: 3.5,  max: 5.1   },
  ca_corr:  { min: 8.5,  max: 10.5  },
  osm_calc: { min: 275,  max: 295   },
  gap_osm:  { min: 0,    max: 10    },
  prod_ca_p:{ min: 0,    max: 55    },
};
