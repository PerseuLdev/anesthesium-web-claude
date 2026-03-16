export type SeveridadeInteracao = 'critica' | 'moderada' | 'info';

export interface InteracaoLocal {
  drogas: string[];  // todos os nomes precisam estar na prescrição
  severidade: SeveridadeInteracao;
  titulo: string;
  mensagem: string;
}

export const INTERACOES_LOCAIS: InteracaoLocal[] = [
  // ── CRÍTICAS ──────────────────────────────────────────────────
  {
    drogas: ['Succinilcolina', 'Rocurônio'],
    severidade: 'critica',
    titulo: 'BNM despolarizante + adespolarizante',
    mensagem: 'Combinação contraindicada: Succinilcolina e Rocurônio competem no receptor nicotínico. O Rocurônio antagoniza o bloqueio despolarizante, tornando o bloqueio imprevisível. Use apenas um dos dois.',
  },
  {
    drogas: ['Succinilcolina', 'Vecurônio'],
    severidade: 'critica',
    titulo: 'BNM despolarizante + adespolarizante',
    mensagem: 'Combinação contraindicada: Succinilcolina e Vecurônio competem no receptor nicotínico com resultado imprevisível. Use apenas um dos dois.',
  },
  {
    drogas: ['Succinilcolina', 'Atracúrio'],
    severidade: 'critica',
    titulo: 'BNM despolarizante + adespolarizante',
    mensagem: 'Combinação contraindicada: Succinilcolina e Atracúrio competem no receptor nicotínico. Bloqueio resultante é imprevisível.',
  },
  {
    drogas: ['Succinilcolina', 'Cisatracúrio'],
    severidade: 'critica',
    titulo: 'BNM despolarizante + adespolarizante',
    mensagem: 'Combinação contraindicada: Succinilcolina e Cisatracúrio não devem ser administrados concomitantemente.',
  },
  {
    drogas: ['Sugammadex', 'Succinilcolina'],
    severidade: 'critica',
    titulo: 'Sugammadex não reverte Succinilcolina',
    mensagem: 'Sugammadex encapsula exclusivamente Rocurônio e Vecurônio. NÃO reverte Succinilcolina. Se administrado logo após Sugammadex, a Succinilcolina pode ter duração prolongada e imprevisível.',
  },
  {
    drogas: ['Neostigmine', 'Succinilcolina'],
    severidade: 'critica',
    titulo: 'Neostigmina potencializa Succinilcolina',
    mensagem: 'Neostigmina inibe a pseudocolinesterase, prolongando e intensificando o bloqueio da Succinilcolina. Evitar associação — pode causar apneia prolongada.',
  },
  {
    drogas: ['Naloxona', 'Fentanil'],
    severidade: 'critica',
    titulo: 'Reversão abrupta — crise simpática',
    mensagem: 'Naloxona em alta dose pode precipitar síndrome de retirada aguda de opioides: hipertensão severa, taquicardia, arritmias e edema pulmonar. Titular em pequenas doses (0,04 mg IV) e monitorar ECG.',
  },
  {
    drogas: ['Naloxona', 'Morfina'],
    severidade: 'critica',
    titulo: 'Reversão abrupta de opioide',
    mensagem: 'Reversão brusca de Morfina com Naloxona pode causar hipertensão, taquicardia e dor aguda. Titular cuidadosamente.',
  },
  {
    drogas: ['Flumazenil', 'Midazolam'],
    severidade: 'moderada',
    titulo: 'Reversão de benzodiazepínico',
    mensagem: 'Flumazenil tem meia-vida mais curta que o Midazolam (duração ~1 h). Risco de ressedação após efeito do flumazenil. Monitorar por pelo menos 2 horas. Evitar em pacientes epilépticos.',
  },
  // ── MODERADAS ────────────────────────────────────────────────
  {
    drogas: ['Norepinefrina', 'Vasopressina'],
    severidade: 'moderada',
    titulo: 'Vasopressores aditivos',
    mensagem: 'Combinação sinérgica para choque vasoplégico. Monitorar ischemia de extremidades, hipertensão severa e redução de débito cardíaco. Titular com MAP alvo 65–75 mmHg.',
  },
  {
    drogas: ['Norepinefrina', 'Epinefrina'],
    severidade: 'moderada',
    titulo: 'Vasopressores aditivos — taquicardia',
    mensagem: 'Efeitos alfa e beta aditivos. Risco de taquicardia, arritmias e hipertensão severa. Monitorar FC e ritmo continuamente.',
  },
  {
    drogas: ['Dexmedetomidina', 'Clonidina'],
    severidade: 'moderada',
    titulo: 'Agonistas alfa-2 aditivos',
    mensagem: 'Hipotensão e bradicardia aditivas. Ambas aumentam tônus vagal e reduzem liberação de noradrenalina. Monitorar PA e FC rigorosamente.',
  },
  {
    drogas: ['Bupivacaína', 'Ropivacaína'],
    severidade: 'moderada',
    titulo: 'Anestésicos locais — dose cumulativa',
    mensagem: 'Doses tóxicas são cumulativas. Risco de toxicidade sistêmica (LAST): arritmias e convulsões. Calcular dose total combinada respeitando o limite mais restritivo (Bupivacaína 2 mg/kg).',
  },
  {
    drogas: ['Bupivacaína', 'Lidocaína'],
    severidade: 'moderada',
    titulo: 'Anestésicos locais — toxicidade cumulativa',
    mensagem: 'Dose tóxica total é aditiva. Ter Intralipid 20% disponível para tratamento de LAST. Monitorar sinais precoces: gosto metálico, zumbido, parestesias periorais.',
  },
  // ── INFORMATIVAS ─────────────────────────────────────────────
  {
    drogas: ['Propofol', 'Fentanil'],
    severidade: 'info',
    titulo: 'Indução balanceada — sinergismo esperado',
    mensagem: 'Combinação clássica de TIVA. Sinergismo farmacodinâmico: Fentanil reduz em ~50% a dose de Propofol necessária. Monitorar depressão respiratória e hipotensão na indução.',
  },
  {
    drogas: ['Midazolam', 'Fentanil'],
    severidade: 'info',
    titulo: 'Sedação consciente — sinergismo',
    mensagem: 'Associação frequente para sedação procedural. Ambos são depressores do SNC — efeito sedativo é sinérgico e pode causar apneia. Ter equipamento de suporte ventilatório disponível.',
  },
  {
    drogas: ['Ketamina', 'Propofol'],
    severidade: 'info',
    titulo: 'Ketofol — combinação prática',
    mensagem: 'Ketamina mitiga hipotensão e apneia do Propofol; Propofol atenua emergência dissociativa e hipertensão da Ketamina. Relação típica 1:4 a 1:10 (Ketamina:Propofol).',
  },
  {
    drogas: ['Sugammadex', 'Rocurônio'],
    severidade: 'info',
    titulo: 'Reversão de BNM adespolarizante',
    mensagem: 'Sugammadex encapsula Rocurônio com alta afinidade — reversão confiável em 3 min. Dose baseada em TOF: bloqueio profundo (0 respostas): 16 mg/kg; moderado (2 respostas): 4 mg/kg; superficial: 2 mg/kg.',
  },
  {
    drogas: ['Dexmedetomidina', 'Propofol'],
    severidade: 'info',
    titulo: 'Sedação multimodal — efeito poupador',
    mensagem: 'Dexmedetomidina tem efeito poupador de Propofol (reduz dose em ~30–50%). Associação favorável em UTI: maior conforto, menos depressão respiratória que Propofol isolado.',
  },
];

/** Retorna interações ativas dado um conjunto de nomes de drogas na prescrição. */
export function detectarInteracoes(nomesDrogas: string[]): InteracaoLocal[] {
  const nomesLower = nomesDrogas.map(n => n.toLowerCase());
  return INTERACOES_LOCAIS.filter(interacao =>
    interacao.drogas.every(d => nomesLower.includes(d.toLowerCase()))
  ).sort((a, b) => {
    const order = { critica: 0, moderada: 1, info: 2 };
    return order[a.severidade] - order[b.severidade];
  });
}
