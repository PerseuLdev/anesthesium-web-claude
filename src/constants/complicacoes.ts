export interface Complicacao {
  nome: string;
  definicao: string;
  cenario: string;
  prevencao: string;
  solucao: string;
  extra: string;
}

export interface CategoriaComplicacao {
  nome: string;
  cor: 'rose' | 'amber' | 'blue';
  complicacoes: Complicacao[];
}

export const COMPLICACOES: CategoriaComplicacao[] = [
  {
    nome: 'Vias Aéreas e Respiratórias',
    cor: 'rose',
    complicacoes: [
      {
        nome: 'CICO (Cannot Intubate, Cannot Oxygenate)',
        definicao: 'Falha simultânea na intubação traqueal e na ventilação, resultando em hipoxemia rápida.',
        cenario: 'VAD imprevista durante a indução ou após múltiplas tentativas fúteis de laringoscopia.',
        prevencao: 'Avaliação pré-operatória rigorosa. Pré-oxigenação e oxigenação apneica (CNAF/THRIVE) (Evidência 1A).',
        solucao: 'Acionar ajuda. Inserir Máscara Laríngea (LMA). Se falhar, via aérea cirúrgica imediata (bisturi-dedo-tubo). Reversão com Sugamadex 16 mg/kg se rocurônio foi utilizado.',
        extra: 'Diretrizes DAS (2015) limitam tentativas de laringoscopia a no máximo 3 (+1 por colega experiente).',
      },
      {
        nome: 'Laringoespasmo',
        definicao: 'Fechamento glótico reflexo sustentado mediado pelo nervo laríngeo superior.',
        cenario: 'Fase de excitação anestésica, manipulação de via aérea com secreção, comum em pediatria.',
        prevencao: 'Extubar paciente totalmente acordado ou em plano profundo.',
        solucao: 'CPAP a 100% O₂. Manobra de Larson. Se refratário: Succinilcolina (0,1 a 0,5 mg/kg IV) + Propofol.',
        extra: 'Em crianças, bradicardia hipóxica é rápida. Atropina (0,02 mg/kg) deve estar disponível.',
      },
      {
        nome: 'Broncoespasmo Intraoperatório',
        definicao: 'Contração aguda da musculatura lisa brônquica limitando fluxo expiratório (padrão "barbatana de tubarão" na capnografia).',
        cenario: 'Asmáticos/DPOC em plano superficial ou anafilaxia.',
        prevencao: 'Otimização pré-operatória. Profundidade anestésica adequada.',
        solucao: 'Aprofundar com Sevoflurano. Salbutamol (10–20 puffs no tubo). Cetamina 1–2 mg/kg IV ou Sulfato de Magnésio 40–50 mg/kg como resgate.',
        extra: 'Excluir sempre causas mecânicas (tubo seletivo, rolha de secreção) antes de tratar farmacologicamente.',
      },
      {
        nome: 'Aspiração de Conteúdo Gástrico',
        definicao: 'Passagem de conteúdo gástrico para árvore respiratória (Síndrome de Mendelson).',
        cenario: 'Estômago cheio, urgências, gestantes, obesidade.',
        prevencao: 'Jejum adequado (Diretrizes ASA). Indução em Sequência Rápida (ISR).',
        solucao: 'Trendelenburg, lateralizar cabeça, aspirar tubo antes da VPP. Suporte com PEEP alta.',
        extra: 'Não utilizar antibióticos ou corticoides profiláticos de rotina na fase aguda (pneumonite química).',
      },
      {
        nome: 'Trauma de Via Aérea',
        definicao: 'Lesão mecânica desde edema até luxação aritenóidea.',
        cenario: 'Laringoscopia traumática, cuff hiperinsuflado.',
        prevencao: 'Uso de videolaringoscopia precoce. Monitorar pressão do cuff (20–30 cmH₂O).',
        solucao: 'Dexametasona (0,1 a 0,2 mg/kg IV) e epinefrina nebulizada para edema leve.',
        extra: 'Rouquidão permanente requer avaliação otorrino precoce e documentação farta por motivos médico-legais.',
      },
    ],
  },
  {
    nome: 'Cardiovasculares e Transfusionais',
    cor: 'amber',
    complicacoes: [
      {
        nome: 'Isquemia Miocárdica Perioperatória (MINS)',
        definicao: 'Injúria miocárdica pós-cirurgia não cardíaca com elevação de troponina (frequentemente assintomática).',
        cenario: 'Cardiopatas submetidos a cirurgias de grande porte com hipotensão/taquicardia.',
        prevencao: 'Manter PAM dentro de 20% do basal. Dosagem de hs-cTn em pacientes de risco (Diretriz ESAIC, 2023).',
        solucao: 'Otimizar DO₂/VO₂. Controle estrito da dor. Reiniciar betabloqueadores crônicos com cautela.',
        extra: 'Não iniciar betabloqueador profilático no dia da cirurgia (aumento de risco de AVC — Estudo POISE-1).',
      },
      {
        nome: 'Choque Vasoplégico',
        definicao: 'Hipotensão refratária com débito cardíaco normal/alto e RVS baixa.',
        cenario: 'Sepse, uso crônico de iECA/BRA, pós-CEC.',
        prevencao: 'Suspensão de iECA/BRA 24h antes em casos de alto risco (Recomendação Condicional).',
        solucao: '1ª linha: Noradrenalina (0,05–0,5 mcg/kg/min). 2ª linha: Vasopressina (0,01–0,04 U/min). Resgate: Azul de metileno 1–2 mg/kg.',
        extra: 'Avaliar fluidorresponsividade (VPP) para evitar balanço hídrico positivo excessivo.',
      },
      {
        nome: 'TRALI (Lesão Pulmonar Aguda Associada à Transfusão)',
        definicao: 'Edema pulmonar não cardiogênico até 6h pós-transfusão, mediado por anticorpos.',
        cenario: 'Transfusão de Plasma (PFC) ou plaquetas.',
        prevencao: 'Patient Blood Management (PBM) e gatilhos restritivos (Hb < 7 g/dL).',
        solucao: 'Parar transfusão. Ventilação protetora (6 mL/kg, PEEP otimizada). Não usar diuréticos de rotina.',
        extra: 'Diferenciar da TACO via Ecocardiograma ou BNP (pressões de enchimento são normais na TRALI).',
      },
      {
        nome: 'TACO (Sobrecarga Circulatória Associada à Transfusão)',
        definicao: 'Edema pulmonar cardiogênico por incapacidade de acomodar volume transfundido.',
        cenario: 'Extremos de idade, insuficiência cardíaca ou renal prévia.',
        prevencao: 'Infusão lenta (1 mL/kg/h) em cardiopatas. Diurético profilático se indicado.',
        solucao: 'Parar transfusão, O₂, Furosemida 20–40 mg IV, VNI se necessário.',
        extra: 'Principal causa de mortalidade relacionada a transfusões nos relatórios de hemovigilância.',
      },
      {
        nome: 'Coagulopatia por Hemorragia Maciça',
        definicao: 'Falência hemostática por consumo, diluição, hipotermia e acidose.',
        cenario: 'Trauma grave, cirurgia hepática/obstétrica complexa.',
        prevencao: 'Aquecimento ativo, evitar hiper-hidratação cristaloide.',
        solucao: 'Protocolo 1:1:1 (CH:PFC:Plaquetas). Ácido Tranexâmico 1g IV em 10 min. Guiar por ROTEM/TEG.',
        extra: 'Manter fibrinogênio > 1,5–2,0 g/L (uso de crioprecipitado ou concentrado de fibrinogênio).',
      },
    ],
  },
  {
    nome: 'Regional, Obstetrícia e Farmacologia',
    cor: 'blue',
    complicacoes: [
      {
        nome: 'LAST (Toxicidade por Anestésico Local)',
        definicao: 'Efeitos adversos no SNC (convulsão) e SCV (assistolia) por excesso de AL no plasma.',
        cenario: 'Injeção intravascular inadvertida em bloqueios periféricos.',
        prevencao: 'Uso de USG, aspiração frequente, doses baseadas no peso magro.',
        solucao: 'Emulsão Lipídica 20% (1,5 mL/kg em 1 min, seguido de 0,25 mL/kg/min). Evitar propofol/vasopressina.',
        extra: 'Doses de adrenalina para ressuscitação devem ser ≤ 1 mcg/kg para evitar arritmias intratáveis.',
      },
      {
        nome: 'Hematoma do Neuroeixo',
        definicao: 'Sangramento epidural/subaracnoideo comprimindo estruturas neurais.',
        cenario: 'Punção ou retirada de cateter em vigência de anticoagulação.',
        prevencao: 'Respeitar janelas (ex: Rivaroxabana = 72h — ASRA 2022).',
        solucao: 'RNM de emergência se bloqueio motor prolongado. Descompressão cirúrgica em até 6h.',
        extra: 'Avaliação neurológica contínua é mandatória no pós-operatório de cateteres peridurais.',
      },
      {
        nome: 'Cefaleia Pós-Punção Dural (CPPD)',
        definicao: 'Cefaleia postural debilitante até 5 dias pós punção acidental.',
        cenario: 'Gestantes, agulhas de grosso calibre (Tuohy).',
        prevencao: 'Agulhas ponta de lápis (25G–27G) para raquianestesia.',
        solucao: 'Repouso/hidratação/analgesia. Se refratária > 24–48h: Blood Patch Peridural (15–20 mL sangue autólogo).',
        extra: 'Repouso profilático imediato não previne a incidência da CPPD.',
      },
      {
        nome: 'Hemorragia Pós-Parto (HPP)',
        definicao: 'Perda > 500 mL (vaginal) ou > 1000 mL (cesárea).',
        cenario: 'Atonia uterina (causa principal).',
        prevencao: 'Ocitocina profilática no terceiro estágio.',
        solucao: 'Ocitocina (1–3 UI lenta). Ácido Tranexâmico 1g IV precoce (Estudo WOMAN). Metilergometrina (0,2 mg IM — evitar na DHEG).',
        extra: 'Não administrar ocitocina em push rápido devido a colapso vasoplégico paradoxal.',
      },
      {
        nome: 'Anafilaxia Perioperatória',
        definicao: 'Hipersensibilidade grave mediada por IgE com colapso CV/Respiratório.',
        cenario: 'Após indução (causas comuns: antibióticos e bloqueadores neuromusculares).',
        prevencao: 'História clínica rigorosa de alergias.',
        solucao: 'Adrenalina IV titulada (10 a 50 mcg por bolus). Fluidos rápidos (20 mL/kg).',
        extra: 'Não usar ampola inteira (1 mg) de adrenalina em pacientes com pulso. Dosar triptase 1–2h após evento.',
      },
    ],
  },
];
