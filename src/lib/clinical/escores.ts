export interface ApfelInput {
  sexoFeminino: boolean;
  naoFumante: boolean;
  usoOpioides: boolean;
  historicoNVPO: boolean;
}

export function calcularApfel(input: ApfelInput) {
  let score = 0;
  if (input.sexoFeminino) score++;
  if (input.naoFumante) score++;
  if (input.usoOpioides) score++;
  if (input.historicoNVPO) score++;

  const probabilidades = [10, 21, 39, 61, 79];
  const probabilidade = probabilidades[score];

  let recomendacao = '';
  if (score === 0 || score === 1) recomendacao = 'Baixo risco. Profilaxia opcional.';
  else if (score === 2) recomendacao = 'Risco moderado. Considerar 1-2 antieméticos profiláticos.';
  else recomendacao = 'Alto risco. Recomendado 2-3 antieméticos profiláticos de classes diferentes.';

  return { score, probabilidade, recomendacao };
}

export interface StopBangInput {
  ronco: boolean;
  cansaco: boolean;
  apneiaObservada: boolean;
  pressaoAlta: boolean;
  imcMaior35: boolean;
  idadeMaior50: boolean;
  circunferenciaPescoco: boolean; // >40cm
  sexoMasculino: boolean;
}

export function calcularStopBang(input: StopBangInput) {
  let score = 0;
  if (input.ronco) score++;
  if (input.cansaco) score++;
  if (input.apneiaObservada) score++;
  if (input.pressaoAlta) score++;
  if (input.imcMaior35) score++;
  if (input.idadeMaior50) score++;
  if (input.circunferenciaPescoco) score++;
  if (input.sexoMasculino) score++;

  let risco = '';
  if (score <= 2) risco = 'Baixo Risco para SAOS';
  else if (score <= 4) risco = 'Risco Intermediário para SAOS';
  else risco = 'Alto Risco para SAOS';

  return { score, risco };
}

export interface GoldmanInput {
  cirurgiaAltoRisco: boolean;
  historiaDoencaIsquemica: boolean;
  historiaInsuficienciaCardiaca: boolean;
  historiaDoencaCerebrovascular: boolean;
  diabetesInsulinoDependente: boolean;
  creatininaMaior2: boolean;
}

export function calcularGoldman(input: GoldmanInput) {
  let score = 0;
  if (input.cirurgiaAltoRisco) score++;
  if (input.historiaDoencaIsquemica) score++;
  if (input.historiaInsuficienciaCardiaca) score++;
  if (input.historiaDoencaCerebrovascular) score++;
  if (input.diabetesInsulinoDependente) score++;
  if (input.creatininaMaior2) score++;

  const riscos = [0.4, 0.9, 6.6, 11.0, 11.0, 11.0, 11.0]; // Simplificado para MACE
  const riscoMACE = riscos[score];

  let recomendacao = '';
  if (score === 0) recomendacao = 'Baixo risco cardíaco. Proceder com cirurgia.';
  else if (score === 1) recomendacao = 'Risco intermediário. Avaliar capacidade funcional.';
  else recomendacao = 'Alto risco cardíaco. Considerar avaliação cardiológica adicional.';

  return { score, riscoMACE, recomendacao };
}
