export interface MedicacaoPeriop {
  classe: string;
  drogas: string[];
  manejo: 'MANTER' | 'SUSPENDER' | 'AVALIAR';
  manejoTexto: string;
  consideracoes: string;
  evidencia: string;
}

export const MEDICACOES_PERIOP: MedicacaoPeriop[] = [
  // CARDIOVASCULAR
  {
    classe: 'Cardiovascular - Diuréticos',
    drogas: ['Hidroclorotiazida', 'Furosemida', 'Clortalidona', 'Espironolactona'],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender no dia da cirurgia. (Recomendação Condicional)',
    consideracoes:
      'Pode ser mantido em pacientes com Insuficiência Cardíaca (IC) congestiva para evitar descompensação. Em outros, suspender evita hipovolemia e hipocalemia intraoperatórias.',
    evidencia: 'ESC/ESAIC 2022 (Nível IIa, C)',
  },
  {
    classe: 'Cardiovascular - IECA/BRA',
    drogas: ['Lisinopril', 'Enalapril', 'Losartana', 'Valsartana', 'Candesartana'],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender 24h antes da cirurgia. (Recomendação Forte)',
    consideracoes:
      'O bloqueio do SRAA sob anestesia geral causa hipotensão vasoplégica severa. Manter apenas se indicado para IC grave com disfunção ventricular.',
    evidencia: 'ESC/ESAIC 2022; ASA 2023',
  },
  {
    classe: 'Cardiovascular - Betabloqueadores',
    drogas: ['Metoprolol', 'Atenolol', 'Bisoprolol', 'Propranolol', 'Carvedilol'],
    manejo: 'MANTER',
    manejoTexto: 'MANTER sempre. Não iniciar no dia se paciente virgem de tratamento.',
    consideracoes:
      'Risco de taquicardia/hipertensão de rebote e isquemia miocárdica se suspensos abruptamente.',
    evidencia: 'ACC/AHA 2014; ESC/ESAIC 2022 (Nível I, B)',
  },
  {
    classe: 'Cardiovascular - Alfa-2 Agonistas e Alfa-Bloqueadores',
    drogas: ['Clonidina', 'Doxazosina', 'Tansulosina', 'Prazosina'],
    manejo: 'MANTER',
    manejoTexto: 'MANTER.',
    consideracoes:
      'Clonidina: evitar rebote simpático. Tansulosina: alertar oftalmologista em cirurgia de catarata devido ao risco de Síndrome da Íris Flácida Intraoperatória (IFIS).',
    evidencia: 'ASCRS (American Society of Cataract and Refractive Surgery)',
  },
  {
    classe: 'Cardiovascular - Bloqueadores de Canal de Cálcio, Nitratos e Antiarrítmicos',
    drogas: [
      'Anlodipino',
      'Nifedipino',
      'Diltiazem',
      'Verapamil',
      'Isossorbida',
      'Nitroglicerina',
      'Amiodarona',
      'Digoxina',
      'Sotalol',
    ],
    manejo: 'MANTER',
    manejoTexto: 'MANTER.',
    consideracoes: 'Essenciais para controle de frequência, ritmo e isquemia.',
    evidencia: 'ESC/ESAIC 2022',
  },
  {
    classe: 'Cardiovascular - Hipolipemiantes (Estatinas)',
    drogas: ['Atorvastatina', 'Rosuvastatina', 'Sinvastatina'],
    manejo: 'MANTER',
    manejoTexto: 'MANTER.',
    consideracoes:
      'Reduzem risco cardiovascular perioperatório devido a efeitos pleiotrópicos (estabilização de placa e anti-inflamatório).',
    evidencia: 'ESC/ESAIC 2022 (Nível I, A)',
  },
  {
    classe: 'Cardiovascular - Outros Hipolipemiantes',
    drogas: ['Ezetimiba', 'Colestiramina', 'Gemfibrozila', 'Niacina'],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender no dia da cirurgia.',
    consideracoes:
      'Sem benefício perioperatório agudo; podem predispor a miopatia (fibratos).',
    evidencia: 'Consenso de Especialistas',
  },

  // ANTICOAGULANTES E ANTIPLAQUETÁRIOS
  {
    classe: 'Anticoagulantes - Varfarina',
    drogas: ['Varfarina', 'Marevan', 'Coumadin'],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender 5 dias antes.',
    consideracoes:
      'Alvo INR < 1.5. Considerar terapia de ponte (bridging) com HBPM apenas para alto risco (ex: prótese valvar mecânica, CHA2DS2-VASc alto).',
    evidencia: 'CHEST Guidelines 2022 (Recomendação Forte, Evidência Moderada)',
  },
  {
    classe: 'Anticoagulantes - DOACs (Inibidores Diretos Xa e Trombina)',
    drogas: ['Apixabana', 'Rivaroxabana', 'Edoxabana', 'Dabigatrana'],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender 1 a 4 dias antes.',
    consideracoes:
      'Depende da função renal (ClCr) e risco de sangramento cirúrgico. Dabigatrana requer mais tempo se ClCr < 50. Não requerem ponte.',
    evidencia: 'ESAIC/ASRA 2022',
  },
  {
    classe: 'Anticoagulantes - Heparinas (Profilaxia vs Terapêutica)',
    drogas: ['Heparina', 'Enoxaparina', 'Dalteparina', 'Fondaparinux'],
    manejo: 'SUSPENDER',
    manejoTexto:
      'HNF IV: suspender 4-6h antes. HBPM terapêutica: suspender 24h. Fondaparinux: suspender 48h.',
    consideracoes:
      'Atenção máxima para bloqueios neuroaxiais (raquianestesia/peridural) devido ao risco de hematoma espinhal.',
    evidencia: 'ASRA 2018 / ESAIC 2022',
  },
  {
    classe: 'Antiplaquetários - Aspirina (AAS)',
    drogas: ['Aspirina', 'AAS'],
    manejo: 'AVALIAR',
    manejoTexto:
      'MANTER para prevenção secundária (stent coronariano, AVC). SUSPENDER (5-7 dias) em prevenção primária ou cirurgias de alto risco (neurocirurgia, câmara posterior do olho).',
    consideracoes:
      'Avaliar o balanço de risco trombótico vs. sangramento local fechado.',
    evidencia: 'POISE-2 Trial; ACC/AHA 2023',
  },
  {
    classe: 'Antiplaquetários - Inibidores P2Y12',
    drogas: ['Clopidogrel', 'Prasugrel', 'Ticagrelor'],
    manejo: 'SUSPENDER',
    manejoTexto:
      'Suspender antes: Ticagrelor (3-5 dias), Clopidogrel (5-7 dias), Prasugrel (7 dias).',
    consideracoes:
      'Se paciente possui Stent Coronariano recente (< 6-12 meses), a cirurgia eletiva deve ser adiada ou realizar ponte com inibidores IV.',
    evidencia: 'ACC/AHA 2023 (Nível I, C)',
  },
  {
    classe: 'AINEs (Anti-inflamatórios Não Esteroidais)',
    drogas: ['Ibuprofeno', 'Naproxeno', 'Diclofenaco', 'Celecoxibe'],
    manejo: 'AVALIAR',
    manejoTexto:
      'Ibuprofeno: suspender 1 dia antes. Naproxeno/Diclofenaco: suspender 1-3 dias antes.',
    consideracoes:
      'Inibem a agregação plaquetária. Inibidores seletivos de COX-2 (celecoxibe) podem ser mantidos como analgesia multimodal (não afetam plaquetas).',
    evidencia: 'ASA Multimodal Analgesia Guidelines',
  },

  // PULMONAR
  {
    classe: 'Pulmonar - Broncodilatadores e Corticoides Inalatórios',
    drogas: [
      'Albuterol',
      'Salmeterol',
      'Ipratrópio',
      'Tiotrópio',
      'Fluticasona',
      'Budesonida',
      'Montelucaste',
    ],
    manejo: 'MANTER',
    manejoTexto: 'MANTER sempre.',
    consideracoes:
      'Otimização da função pulmonar basal e redução de hiperreatividade das vias aéreas intraoperatória.',
    evidencia: 'GOLD / GINA Guidelines',
  },

  // GASTROINTESTINAL E GENITOURINÁRIO
  {
    classe: 'Gastrointestinal - IBP e Antagonistas H2',
    drogas: ['Omeprazol', 'Pantoprazol', 'Famotidina', 'Ranitidina'],
    manejo: 'MANTER',
    manejoTexto: 'MANTER.',
    consideracoes:
      'Suspender pode causar rebote ácido. Importantes para prevenção de broncoaspiração pneumônica (Síndrome de Mendelson).',
    evidencia: 'ASA Fasting Guidelines',
  },
  {
    classe: 'Gastrointestinal - Inibidores do TNF-alfa / Imunobiológicos',
    drogas: ['Adalimumabe', 'Infliximabe', 'Etnercepte'],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender 1 ciclo de dose antes da cirurgia.',
    consideracoes:
      'Para reduzir risco de infecção de sítio cirúrgico. Reiniciar após cicatrização da ferida (cerca de 14 dias pós-op).',
    evidencia: 'ACR/AAHKS 2022 (American College of Rheumatology)',
  },

  // ENDÓCRINO
  {
    classe: 'Endócrino - Insulinas',
    drogas: ['Glargina', 'Detemir', 'NPH', 'Asparte', 'Lispro'],
    manejo: 'AVALIAR',
    manejoTexto:
      'Longa/Basal: Manter 80%. NPH: 50% na manhã. Curta duração: Suspender no jejum.',
    consideracoes:
      'Evitar hipoglicemia no perioperatório, mantendo níveis alvo entre 140-180 mg/dL.',
    evidencia: 'ADA 2024 (American Diabetes Association)',
  },
  {
    classe: 'Endócrino - Agonistas GLP-1',
    drogas: ['Semaglutida', 'Ozempic', 'Liraglutida', 'Dulaglutida'],
    manejo: 'SUSPENDER',
    manejoTexto:
      'Dose diária: Suspender no dia. Dose semanal: Suspender 1 semana antes.',
    consideracoes:
      'Alto risco de broncoaspiração devido ao esvaziamento gástrico lentificado grave, mesmo em jejum prolongado.',
    evidencia: 'ASA Practice Guidance 2023',
  },
  {
    classe: 'Endócrino - Inibidores de SGLT2',
    drogas: ['Empagliflozina', 'Dapagliflozina', 'Canagliflozina'],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender 3 a 4 dias antes.',
    consideracoes:
      'Risco de cetoacidose diabética euglicêmica (CAD), uma complicação potencialmente fatal precipitada pelo jejum cirúrgico.',
    evidencia: 'FDA 2022 / ASA 2023',
  },
  {
    classe: 'Endócrino - Outros Hipoglicemiantes Orais',
    drogas: ['Metformina', 'Glimepirida', 'Pioglitazona', 'Sitagliptina'],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender no dia da cirurgia.',
    consideracoes:
      'Metformina suspensa para evitar acidose lática. Inibidores de DPP-4 (sitagliptina) são controversamente seguros para manter, mas a rotina é suspender no jejum.',
    evidencia: 'ADA 2024',
  },
  {
    classe: 'Endócrino - Corticosteroides Sistêmicos',
    drogas: ['Prednisona', 'Hidrocortisona', 'Dexametasona'],
    manejo: 'MANTER',
    manejoTexto: 'MANTER. Avaliar dose de estresse.',
    consideracoes:
      'Risco de insuficiência adrenal aguda se uso de >20mg/dia de prednisona por >3 semanas. Utilizar hidrocortisona IV conforme porte cirúrgico.',
    evidencia: 'Corticosteroid Perioperative Guidelines',
  },
  {
    classe: 'Tireoide e Osteoporose',
    drogas: ['Levotiroxina', 'Metimazol', 'Alendronato', 'Ibandronato'],
    manejo: 'AVALIAR',
    manejoTexto: 'Tireoide: MANTER. Bisfosfonatos: Suspender oral no dia.',
    consideracoes:
      'Bisfosfonatos exigem ingestão com muita água e postura ereta; suspender no internamento evita esofagite.',
    evidencia: 'Consenso de Especialistas',
  },

  // REUMATOLÓGICO
  {
    classe: 'Reumatológico - DMARDs e Antigotosos',
    drogas: [
      'Metotrexato',
      'Hidroxicloroquina',
      'Sulfassalazina',
      'Allopurinol',
      'Colchicina',
    ],
    manejo: 'MANTER',
    manejoTexto: 'MANTER.',
    consideracoes:
      'Metotrexato não aumenta risco de infecção cirúrgica na artrite reumatoide (suspender apenas se insuficiência renal grave).',
    evidencia: 'ACR/AAHKS 2022',
  },
  {
    classe: 'Reumatológico - Inibidores JAK e Anti-CD20',
    drogas: ['Tofacitinibe', 'Rituximabe'],
    manejo: 'SUSPENDER',
    manejoTexto:
      'JAK (Tofacitinibe): Suspender 1 semana antes. Rituximabe: Agendar eletivas 6-7 meses após a última dose.',
    consideracoes:
      'Ponderar imunossupressão severa vs. surto da doença de base.',
    evidencia: 'ACR/AAHKS 2022',
  },

  // NEUROLÓGICO E PSIQUIÁTRICO
  {
    classe: 'Neurológico - Parkinson, Convulsões e Dor',
    drogas: ['Levodopa', 'Fenitoína', 'Carbamazepina', 'Gabapentina', 'Pregabalina'],
    manejo: 'MANTER',
    manejoTexto: 'MANTER.',
    consideracoes:
      'Levodopa deve ser mantida para evitar exacerbação grave de rigidez ou síndrome neuroléptica maligna. Selegilina (IMAO-B) requer discussão por interação com opioides (meperidina).',
    evidencia: 'Neuroanesthesia Protocols',
  },
  {
    classe: 'Psiquiátrico - Antidepressivos e Antipsicóticos',
    drogas: ['Fluoxetina', 'Venlafaxina', 'Amitriptilina', 'Quetiapina', 'Lítio'],
    manejo: 'MANTER',
    manejoTexto: 'MANTER.',
    consideracoes:
      'Suspender causa síndrome de descontinuação severa. Cuidado com Lítio (manter volemia, monitorar litemia) devido a interações renais e relaxantes musculares.',
    evidencia: 'Perioperative Psychiatry Consensus',
  },
  {
    classe: 'Psiquiátrico - IMAOs Antigos',
    drogas: ['Tranilcipromina', 'Fenelzina'],
    manejo: 'AVALIAR',
    manejoTexto: 'Considerar suspender 2 semanas antes (desmame).',
    consideracoes:
      'Alto risco de crise hipertensiva com simpatomiméticos indiretos e síndrome serotoninérgica com fentanil/meperidina.',
    evidencia: 'Consenso de Especialistas',
  },
  {
    classe: 'Psiquiátrico - TDAH (Estimulantes)',
    drogas: ['Metilfenidato', 'Lisdexanfetamina', 'Anfetaminas'],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender no dia da cirurgia. (Recomendação Condicional)',
    consideracoes:
      'Evita instabilidade hemodinâmica imprevisível (hipertensão, arritmias) e depleção de catecolaminas.',
    evidencia: 'SAMBA (Society for Ambulatory Anesthesia)',
  },

  // OPIOIDES, HIV E ALTERNATIVOS
  {
    classe: 'Opioides Crônicos',
    drogas: ['Morfina', 'Oxicodona', 'Metadona', 'Fentanil Transdérmico'],
    manejo: 'MANTER',
    manejoTexto: 'MANTER a dosagem basal.',
    consideracoes:
      'Pacientes tolerantes necessitam da dose basal para evitar crise de abstinência e hiperalgesia. A analgesia cirúrgica deve ser adicionada acima desta base.',
    evidencia: 'ASA Multimodal Analgesia',
  },
  {
    classe: 'Anti-retrovirais (HIV)',
    drogas: ['Tenofovir', 'Dolutegravir', 'Darunavir', 'Efavirenz'],
    manejo: 'MANTER',
    manejoTexto: 'MANTER.',
    consideracoes:
      'Evitar rebote viral e resistência. Pode haver interações com metabolismo do citocromo P450 (CYP3A4) prolongando efeitos anestésicos.',
    evidencia: 'Infectious Diseases Society of America (IDSA)',
  },
  {
    classe: 'Fitoterápicos e Suplementos',
    drogas: [
      'Ginkgo Biloba',
      'Ginseng',
      'Alho',
      'Kava',
      'Valeriana',
      'Erva de São João',
    ],
    manejo: 'SUSPENDER',
    manejoTexto: 'Suspender 1 a 2 semanas antes.',
    consideracoes:
      'Risco de sangramento (Ginkgo, Alho, Ginseng), indução de enzimas hepáticas (Erva de S. João) e sedação prolongada (Valeriana, Kava).',
    evidencia: 'ASA Preoperative Practice Advisory',
  },
];
