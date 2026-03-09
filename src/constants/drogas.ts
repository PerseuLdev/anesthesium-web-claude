export interface ProtocoloSedacao {
  id: string;
  nome: string;
  contexto: 'Centro Cirúrgico' | 'UTI' | 'Procedimento' | 'Emergência';
  descricao: string;
  drogas: string[];
  cor: 'amber' | 'cyan' | 'rose' | 'emerald' | 'indigo' | 'purple' | 'orange';
}

export const PROTOCOLOS_SEDACAO: ProtocoloSedacao[] = [
  {
    id: 'tiva',
    nome: 'TIVA',
    contexto: 'Centro Cirúrgico',
    descricao: 'Anestesia Total IV — Propofol + Remifentanil + BNM',
    drogas: ['Propofol', 'Remifentanil', 'Rocurônio'],
    cor: 'amber',
  },
  {
    id: 'inducao-balanceada',
    nome: 'Indução Balanceada',
    contexto: 'Centro Cirúrgico',
    descricao: 'Técnica padrão — Propofol + Fentanil + Rocurônio',
    drogas: ['Propofol', 'Fentanil', 'Rocurônio'],
    cor: 'cyan',
  },
  {
    id: 'rsi',
    nome: 'RSI',
    contexto: 'Emergência',
    descricao: 'Sequência Rápida de Intubação — Ketamina + Succinilcolina',
    drogas: ['Ketamina', 'Succinilcolina'],
    cor: 'rose',
  },
  {
    id: 'hemo-instavel',
    nome: 'Instab. Hemodinâmica',
    contexto: 'Emergência',
    descricao: 'Paciente instável — Etomidato + Fentanil + Rocurônio',
    drogas: ['Etomidato', 'Fentanil', 'Rocurônio'],
    cor: 'orange',
  },
  {
    id: 'sedacao-consciente',
    nome: 'Sedação Consciente',
    contexto: 'Procedimento',
    descricao: 'Mantém reflexos e cooperação — Midazolam + Fentanil',
    drogas: ['Midazolam', 'Fentanil'],
    cor: 'emerald',
  },
  {
    id: 'uti-leve',
    nome: 'Sedação UTI',
    contexto: 'UTI',
    descricao: 'RASS -2 a 0 — Propofol + Fentanil',
    drogas: ['Propofol', 'Fentanil'],
    cor: 'indigo',
  },
  {
    id: 'uti-profunda',
    nome: 'Sedação Profunda',
    contexto: 'UTI',
    descricao: 'RASS -3 a -5 — Propofol + Fentanil + Dexmedetomidina',
    drogas: ['Propofol', 'Fentanil', 'Dexmedetomidina'],
    cor: 'purple',
  },
];

export interface Droga {
  nome: string;
  classe: string;
  doseBolus?: { min: number; max: number; unidade: 'mg/kg' | 'mcg/kg' | 'mg' | 'mcg' };
  doseInfusao?: { min: number; max: number; unidade: 'mcg/kg/min' | 'mg/kg/h' | 'mcg/kg/h' | 'U/min' };
  concentracaoPadrao: number; // mg/mL da ampola padrão
  volumeAmpola: number; // mL
  observacoes?: string;
}

export const DRUGS: Droga[] = [
  // HIPNÓTICOS
  {
    nome: 'Propofol',
    classe: 'Hipnótico',
    doseBolus: { min: 1.5, max: 2.5, unidade: 'mg/kg' },
    doseInfusao: { min: 25, max: 75, unidade: 'mcg/kg/min' },
    concentracaoPadrao: 10,
    volumeAmpola: 20,
  },
  {
    nome: 'Etomidato',
    classe: 'Hipnótico',
    doseBolus: { min: 0.2, max: 0.3, unidade: 'mg/kg' },
    concentracaoPadrao: 2,
    volumeAmpola: 10,
  },
  {
    nome: 'Ketamina',
    classe: 'Hipnótico',
    doseBolus: { min: 1, max: 2, unidade: 'mg/kg' },
    doseInfusao: { min: 0.1, max: 0.5, unidade: 'mg/kg/h' },
    concentracaoPadrao: 50,
    volumeAmpola: 10,
    observacoes: 'Dose IM: 4-6 mg/kg',
  },
  {
    nome: 'Midazolam',
    classe: 'Hipnótico',
    doseBolus: { min: 0.02, max: 0.1, unidade: 'mg/kg' },
    concentracaoPadrao: 5,
    volumeAmpola: 3,
  },
  {
    nome: 'Tiopental',
    classe: 'Hipnótico',
    doseBolus: { min: 3, max: 5, unidade: 'mg/kg' },
    concentracaoPadrao: 25,
    volumeAmpola: 20,
  },
  {
    nome: 'Dexmedetomidina',
    classe: 'Hipnótico',
    doseBolus: { min: 0.5, max: 1, unidade: 'mcg/kg' },
    doseInfusao: { min: 0.2, max: 1.5, unidade: 'mcg/kg/h' },
    concentracaoPadrao: 0.1, // 100 mcg/mL
    volumeAmpola: 2,
    observacoes: 'Bolus em 10 min. Diluição padrão: 4mcg/mL',
  },

  // BLOQUEADORES NEUROMUSCULARES
  {
    nome: 'Rocurônio',
    classe: 'Bloqueador Neuromuscular',
    doseBolus: { min: 0.6, max: 1.2, unidade: 'mg/kg' },
    concentracaoPadrao: 10,
    volumeAmpola: 5,
    observacoes: '1.2 mg/kg para RSI',
  },
  {
    nome: 'Vecurônio',
    classe: 'Bloqueador Neuromuscular',
    doseBolus: { min: 0.1, max: 0.1, unidade: 'mg/kg' },
    concentracaoPadrao: 4,
    volumeAmpola: 1, // diluído
    observacoes: 'Diluído',
  },
  {
    nome: 'Atracúrio',
    classe: 'Bloqueador Neuromuscular',
    doseBolus: { min: 0.5, max: 0.5, unidade: 'mg/kg' },
    doseInfusao: { min: 5, max: 9, unidade: 'mcg/kg/min' },
    concentracaoPadrao: 10,
    volumeAmpola: 2.5,
  },
  {
    nome: 'Cisatracúrio',
    classe: 'Bloqueador Neuromuscular',
    doseBolus: { min: 0.15, max: 0.15, unidade: 'mg/kg' },
    doseInfusao: { min: 1, max: 3, unidade: 'mcg/kg/min' },
    concentracaoPadrao: 2,
    volumeAmpola: 5,
  },
  {
    nome: 'Succinilcolina',
    classe: 'Bloqueador Neuromuscular',
    doseBolus: { min: 1, max: 1.5, unidade: 'mg/kg' },
    concentracaoPadrao: 20,
    volumeAmpola: 5, // pó liofilizado diluído
  },

  // REVERSORES
  {
    nome: 'Sugammadex',
    classe: 'Reversor',
    doseBolus: { min: 2, max: 16, unidade: 'mg/kg' },
    concentracaoPadrao: 100, // 200mg/2mL ou 500mg/5mL
    volumeAmpola: 2,
    observacoes: '2mg/kg moderada, 16mg/kg emergência',
  },
  {
    nome: 'Neostigmine',
    classe: 'Reversor',
    doseBolus: { min: 0.04, max: 0.07, unidade: 'mg/kg' },
    concentracaoPadrao: 0.5,
    volumeAmpola: 1,
    observacoes: 'Máx 5mg',
  },
  {
    nome: 'Flumazenil',
    classe: 'Reversor',
    doseBolus: { min: 0.2, max: 1, unidade: 'mg' },
    concentracaoPadrao: 0.1,
    volumeAmpola: 5,
    observacoes: 'Reversão de Benzodiazepínicos',
  },
  {
    nome: 'Naloxona',
    classe: 'Reversor',
    doseBolus: { min: 0.04, max: 0.4, unidade: 'mg' },
    concentracaoPadrao: 0.4,
    volumeAmpola: 1,
    observacoes: 'Reversão de Opioides',
  },

  // OPIOIDES
  {
    nome: 'Fentanil',
    classe: 'Opioide',
    doseBolus: { min: 1, max: 3, unidade: 'mcg/kg' },
    doseInfusao: { min: 0.5, max: 2, unidade: 'mcg/kg/h' },
    concentracaoPadrao: 0.05,
    volumeAmpola: 10,
  },
  {
    nome: 'Sufentanil',
    classe: 'Opioide',
    doseBolus: { min: 0.1, max: 0.3, unidade: 'mcg/kg' },
    doseInfusao: { min: 0.01, max: 0.05, unidade: 'mcg/kg/min' },
    concentracaoPadrao: 0.05,
    volumeAmpola: 5,
  },
  {
    nome: 'Remifentanil',
    classe: 'Opioide',
    doseInfusao: { min: 0.05, max: 0.5, unidade: 'mcg/kg/min' },
    concentracaoPadrao: 0.05, // diluído 50 mcg/mL
    volumeAmpola: 40,
    observacoes: 'Diluição padrão: 50 mcg/mL',
  },
  {
    nome: 'Morfina',
    classe: 'Opioide',
    doseBolus: { min: 0.05, max: 0.1, unidade: 'mg/kg' },
    concentracaoPadrao: 10,
    volumeAmpola: 1,
  },
  {
    nome: 'Alfentanil',
    classe: 'Opioide',
    doseBolus: { min: 10, max: 20, unidade: 'mcg/kg' },
    doseInfusao: { min: 0.5, max: 1, unidade: 'mcg/kg/min' },
    concentracaoPadrao: 0.5,
    volumeAmpola: 5,
  },

  // VASOPRESSORES E INOTRÓPICOS
  {
    nome: 'Norepinefrina',
    classe: 'Vasopressor',
    doseInfusao: { min: 0.01, max: 3, unidade: 'mcg/kg/min' },
    concentracaoPadrao: 0.08, // 4mg/50mL
    volumeAmpola: 50,
    observacoes: 'Diluição padrão: 4mg/50mL',
  },
  {
    nome: 'Epinefrina',
    classe: 'Vasopressor',
    doseBolus: { min: 1, max: 1, unidade: 'mg' },
    doseInfusao: { min: 0.01, max: 1, unidade: 'mcg/kg/min' },
    concentracaoPadrao: 1,
    volumeAmpola: 1,
    observacoes: 'Bolus de 1mg em parada',
  },
  {
    nome: 'Vasopressina',
    classe: 'Vasopressor',
    doseInfusao: { min: 0.01, max: 0.04, unidade: 'U/min' },
    concentracaoPadrao: 20,
    volumeAmpola: 1,
    observacoes: 'Dose fixa, independente do peso',
  },
  {
    nome: 'Efedrina',
    classe: 'Vasopressor',
    doseBolus: { min: 5, max: 10, unidade: 'mg' },
    concentracaoPadrao: 5, // Diluído
    volumeAmpola: 10,
    observacoes: 'Diluir 1 ampola (50mg) para 10mL (5mg/mL)',
  },
  {
    nome: 'Metaraminol',
    classe: 'Vasopressor',
    doseBolus: { min: 0.5, max: 2, unidade: 'mg' },
    concentracaoPadrao: 1, // Diluído
    volumeAmpola: 10,
    observacoes: 'Diluir 1 ampola (10mg) para 10mL (1mg/mL)',
  },
  {
    nome: 'Dobutamina',
    classe: 'Inotrópico',
    doseInfusao: { min: 2, max: 20, unidade: 'mcg/kg/min' },
    concentracaoPadrao: 12.5, // 250mg/20mL
    volumeAmpola: 20,
    observacoes: 'Diluição comum: 250mg/250mL (1mg/mL)',
  },

  // ANESTÉSICOS LOCAIS
  {
    nome: 'Bupivacaína',
    classe: 'Anestésico Local',
    doseBolus: { min: 2.5, max: 3, unidade: 'mg/kg' },
    concentracaoPadrao: 5, // 0.5%
    volumeAmpola: 20,
    observacoes: 'Máx 2.5mg/kg (s/ vaso) / 3mg/kg (c/ vaso)',
  },
  {
    nome: 'Ropivacaína',
    classe: 'Anestésico Local',
    doseBolus: { min: 3, max: 3, unidade: 'mg/kg' },
    concentracaoPadrao: 7.5, // 0.75%
    volumeAmpola: 20,
    observacoes: 'Máx 3mg/kg',
  },
  {
    nome: 'Lidocaína',
    classe: 'Anestésico Local',
    doseBolus: { min: 4.5, max: 7, unidade: 'mg/kg' },
    concentracaoPadrao: 20, // 2%
    volumeAmpola: 20,
    observacoes: 'Máx 4.5mg/kg (s/ vaso) / 7mg/kg (c/ vaso)',
  },

  // ANTICOLINÉRGICOS E CARDIOVASCULARES
  {
    nome: 'Atropina',
    classe: 'Anticolinérgico',
    doseBolus: { min: 0.5, max: 1, unidade: 'mg' },
    concentracaoPadrao: 0.25,
    volumeAmpola: 1,
    observacoes: 'Bradicardia. Máx 3mg',
  },
  {
    nome: 'Amiodarona',
    classe: 'Antiarrítmico',
    doseBolus: { min: 150, max: 300, unidade: 'mg' },
    doseInfusao: { min: 1, max: 1, unidade: 'mg/kg/h' },
    concentracaoPadrao: 50,
    volumeAmpola: 3,
    observacoes: '300mg em PCR. 150mg em 10min p/ arritmias',
  },
  {
    nome: 'Clonidina',
    classe: 'Alfa-2 Agonista',
    doseBolus: { min: 1, max: 2, unidade: 'mcg/kg' },
    concentracaoPadrao: 0.15, // 150 mcg/mL
    volumeAmpola: 1,
  }
];
