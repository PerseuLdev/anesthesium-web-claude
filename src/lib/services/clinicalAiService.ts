import { GoogleGenAI } from '@google/genai';
import { GasometriaOutput } from '../clinical/gasometria';
import { G3ProInput, G3ProResult } from '../clinical/g3pro';
import { Droga } from '../../constants/drogas';
import { GuiaCirurgico } from '../../constants/cirurgias';
import type { Patient } from '../storage/patientStore';
import type { Avaliacao } from '../storage/historyStore';

let ai: GoogleGenAI | null = null;

/** Converte idade exata em faixa etária de 10 anos para anonimização. */
function anonimizarIdade(idade: number): string {
  const decada = Math.floor(idade / 10) * 10;
  return `${decada}–${decada + 9} anos`;
}

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// ── OpenRouter fallback (OpenAI-compatible) ──────────────────
async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_KEY;
  const model = process.env.EXPO_PUBLIC_OPENROUTER_MODEL || 'z-ai/glm-4.5-air:free';

  if (!apiKey) throw new Error('EXPO_PUBLIC_OPENROUTER_KEY is not set');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://anesthesium.app',
      'X-Title': 'Anesthesium Clinical AI',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Resposta vazia do modelo de fallback.';
}

// ── Wrapper: Gemini → fallback OpenRouter ────────────────────
async function callAI(prompt: string, geminiModel = 'gemini-3.1-flash-lite-preview'): Promise<string> {
  try {
    const aiClient = getAI();
    const response = await aiClient.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: { temperature: 0.2 },
    });
    return response.text || 'Sem resposta do modelo.';
  } catch (geminiError) {
    console.warn('[AI] Gemini falhou, usando OpenRouter como fallback:', geminiError);
    return callOpenRouter(prompt);
  }
}

// ── Gasometria ───────────────────────────────────────────────
export async function generateClinicalPlan(gasometriaData: GasometriaOutput): Promise<string> {
  const prompt = `
Você é um Médico Anestesiologista e Intensivista Sênior.
Analise a seguinte Gasometria Arterial e sua interpretação automatizada, e forneça um plano de conduta terapêutica em cascata (step-by-step), focado no raciocínio clínico de beira de leito (hemodinâmica, ventilação mecânica, perfusão e distúrbios metabólicos).

DADOS DA GASOMETRIA:
- pH: ${gasometriaData.inputOriginal.pH}
- PaCO2: ${gasometriaData.inputOriginal.PaCO2} mmHg
- HCO3: ${gasometriaData.inputOriginal.HCO3} mEq/L
- PaO2: ${gasometriaData.inputOriginal.PaO2} mmHg
- BE: ${gasometriaData.inputOriginal.BE} mEq/L
- FiO2: ${gasometriaData.inputOriginal.FiO2 * 100}%
- Lactato: ${gasometriaData.inputOriginal.Lactato} mmol/L
- Sódio (Na): ${gasometriaData.inputOriginal.Na} mEq/L
- Cloro (Cl): ${gasometriaData.inputOriginal.Cl} mEq/L
- Albumina: ${gasometriaData.inputOriginal.Albumina} g/dL
${gasometriaData.inputOriginal.Idade ? `- Faixa etária: ${anonimizarIdade(gasometriaData.inputOriginal.Idade)}` : ''}

INTERPRETAÇÃO AUTOMATIZADA:
- Distúrbio Primário: ${gasometriaData.disturbioPrimario} (${gasometriaData.severidade})
- Compensação: ${gasometriaData.compensacao || 'N/A'}
- Ânion Gap: ${gasometriaData.anionGap.toFixed(1)} (Corrigido: ${gasometriaData.anionGapCorrigido.toFixed(1)})
- Oxigenação: ${gasometriaData.sdra} (Relação P/F: ${Math.round(gasometriaData.pfRatio)})
${gasometriaData.deltaDeltaInterpretacao ? `- Delta-Delta: ${gasometriaData.deltaDeltaInterpretacao}` : ''}
${gasometriaData.causasProvaveis ? `- Causas Prováveis: ${gasometriaData.causasProvaveis}` : ''}

INSTRUÇÕES DE SAÍDA:
Forneça um plano de ação estruturado em Markdown, contendo as seguintes seções (seja direto, prático e focado em condutas médicas reais, sem introduções genéricas):
1. **Ajustes Ventilatórios:** (Ex: Sugestões de ajuste de Volume Corrente, Frequência Respiratória, PEEP, FiO2 baseados na PaCO2, pH e P/F).
2. **Manejo Hemodinâmico e Perfusão:** (Ex: Avaliação de fluidos, vasopressores, inotrópicos, transfusão baseados no Lactato, BE e pH).
3. **Correção Metabólica e Eletrolítica:** (Ex: Reposição de bicarbonato se pH < 7.1, troca de SF 0.9% por Ringer Lactato se acidose hiperclorêmica, investigação de ânion gap elevado).
4. **Próximos Passos / Exames Adicionais:** (Ex: Solicitar K+, Ca++, Rx de Tórax, ECG, etc).
`;

  try {
    return await callAI(prompt, 'gemini-3.1-flash-lite-preview');
  } catch (error) {
    console.error('Erro ao gerar conduta clínica:', error);
    throw new Error('Falha ao comunicar com a IA para gerar a conduta.');
  }
}

// ── G3-Pro Hemodinâmica ──────────────────────────────────────
export async function gerarInterpretacaoG3Pro(
  input: G3ProInput,
  resultado: G3ProResult
): Promise<string> {
  const { hemo, acido_base, eletrolitos } = resultado;
  const todosAlertas = [...hemo.alertas, ...eletrolitos.alertas];

  // Helper para formatar valores opcionais
  const fmtN = (v: number | null, d = 1) => v !== null ? v.toFixed(d) : 'N/A';

  // Identificar grupos de dados ausentes
  const dadosAusentes: string[] = [];
  if (input.svo2 === null || input.pvo2 === null || input.pvco2 === null) {
    dadosAusentes.push('Gasometria venosa (SvO2/PvO2/PvCO2) — cálculos Fick indisponíveis');
  }
  if (input.papm === null || input.pcp === null) {
    dadosAusentes.push('Pressão pulmonar (PAPm/PCP) — IRVP e RVSWI indisponíveis');
  }
  if (input.pp_max === null || input.pp_min === null) {
    dadosAusentes.push('Variação de pressão de pulso (PP máx/mín) — DeltaPP indisponível');
  }

  const secaoAusentes = dadosAusentes.length > 0
    ? `\nDADOS NÃO DISPONÍVEIS NO MOMENTO DA AVALIAÇÃO:\n${dadosAusentes.map(g => `• ${g}`).join('\n')}\nNão inferir valores ausentes — restringir análise aos dados disponíveis.\n`
    : '';

  const prompt = `Você é um Médico Intensivista Sênior revisando os resultados de uma calculadora hemodinâmica integrada (G3-Pro).

CONTEXTO CRÍTICO — LEIA ANTES DE ANALISAR:
Os parâmetros hemodinâmicos abaixo foram CALCULADOS pelo Princípio de Fick a partir de dados clínicos — não foram medidos diretamente por cateter de artéria pulmonar ou Swan-Ganz. Isso significa que cada etapa de cálculo propaga um erro. O valor final do Índice Cardíaco, IRVS, etc., pode divergir significativamente do real dependendo da acurácia das medidas de SaO2, SvO2 e Hemoglobina.

Sua análise deve:
1. Avaliar a PLAUSIBILIDADE CLÍNICA do conjunto de resultados (não os valores isolados). Ex: IC 0.9 + FC 110 + PAM 75 sem sinais de choque clínico → questionar a acurácia dos inputs.
2. Se o padrão for internamente coerente (IC baixo + lactato alto + ERO2 alta + Gap CO2 alto), reforçar a conclusão.
3. Propor conduta PRIORIZANDO a incerteza dos valores calculados.
4. Para campos marcados como N/A: não tente inferir — reconheça a limitação e indique quais dados completariam a análise.
${secaoAusentes}
═══════════════════════════════════════
DADOS DO PACIENTE
═══════════════════════════════════════
Antropometria: ${input.peso} kg | ${input.altura} cm | Faixa: ${anonimizarIdade(input.idade)} | ${input.sexo === 'M' ? 'Masculino' : 'Feminino'}
SC: ${hemo.sc.toFixed(2)} m² | VO2 estimado: ${hemo.vo2.toFixed(0)} mL/min

SINAIS VITAIS E PRESSÕES:
FC: ${input.fc} bpm | PAS: ${input.pas} / PAD: ${input.pad} mmHg | PAM calc: ${hemo.pam.toFixed(1)} mmHg
PVC: ${input.pvc} mmHg | PAP Média: ${input.papm !== null ? input.papm + ' mmHg' : 'N/A'} | PCP (Wedge): ${input.pcp !== null ? input.pcp + ' mmHg' : 'N/A'}

HEMODINÂMICA CALCULADA (Módulo 1 — Fick):
• Débito Cardíaco: ${fmtN(hemo.dc, 2)} L/min
• Índice Cardíaco (IC): ${fmtN(hemo.ic, 2)} L/min/m² [Ref: 2.5–4.0]
• Volume Sistólico: ${fmtN(hemo.vs, 1)} mL | IS: ${fmtN(hemo.is_index, 1)} mL/m²
• DO2i: ${fmtN(hemo.do2i, 1)} mL/min/m² | ERO2: ${fmtN(hemo.ero2, 1)}% [Ref: 22–30%]
• IRVS: ${fmtN(hemo.irvs, 0)} dyn·s·cm⁻⁵·m² [Ref: 1700–2400]
• IRVP: ${fmtN(hemo.irvp, 0)} dyn·s·cm⁻⁵·m²
• Poder Cardíaco (CPO): ${fmtN(hemo.cpo, 2)} W [Ref: >0.6W]
• LVSWI: ${fmtN(hemo.lvswi, 1)} g·m/m² | RVSWI: ${fmtN(hemo.rvswi, 1)} g·m/m²
• DeltaPP: ${hemo.deltapp !== null ? hemo.deltapp.toFixed(1) + '%' : 'N/A'} [Fluido-responsivo se >13%]
• Gap V-A CO2: ${fmtN(hemo.gap_co2, 1)} mmHg [Ref: 2–6]
• Ratio ΔCO2/C(a-v)O2: ${fmtN(hemo.ratio, 2)} [Anaerobiose se >1.4]
• Lactato: ${input.lactato} mmol/L
${hemo.choque ? `• Padrão identificado pelo sistema: CHOQUE ${hemo.choque.toUpperCase()}` : '• Sem padrão de choque identificado pelo sistema'}

ÁCIDO-BASE — Boston + Stewart (Módulo 2):
• pH: ${input.ph} | pCO2: ${input.paco2} mmHg | HCO3: ${input.hco3} mEq/L
• Distúrbio primário: ${acido_base.diag_primario}
• Compensação/secundário: ${acido_base.diag_secundario || 'Nenhum'}
• AG corrigido: ${acido_base.ag_corr.toFixed(1)} mEq/L | Delta Gap: ${acido_base.delta_gap.toFixed(2)}
• pCO2 esperada (Winters): ${acido_base.pco2_esp.toFixed(1)} mmHg
• SIG (Stewart): ${acido_base.sig.toFixed(1)} [Ref: -2 a +2]

ELETROLÍTICO E METABÓLICO (Módulo 3):
• Na corrigido (glicose): ${eletrolitos.na_corr.toFixed(1)} mEq/L
• K⁺ real (pH-corrigido): ${eletrolitos.k_real.toFixed(1)} mEq/L
• Ca corrigido (albumina): ${eletrolitos.ca_corr.toFixed(1)} mg/dL | Mg: ${input.mg} mg/dL
• Osmol calculada: ${eletrolitos.osm_calc.toFixed(1)} | Gap osmolar: ${eletrolitos.gap_osm.toFixed(1)} mOsm/kg
• Produto Ca × P: ${eletrolitos.prod_ca_p.toFixed(1)} [Ref: <55]

ALERTAS DO SISTEMA:
${todosAlertas.length > 0 ? todosAlertas.map(a => `• ${a}`).join('\n') : '• Nenhum alerta crítico gerado'}

═══════════════════════════════════════
INSTRUÇÕES DE SAÍDA (Markdown, direto, sem introduções genéricas)
═══════════════════════════════════════
## 1. Plausibilidade Clínica
Avalie se o conjunto de resultados é fisiologicamente coerente entre si. Flagge valores que parecem implausíveis para o quadro descrito.

## 2. Padrão Hemodinâmico Integrado
Identifique o padrão predominante integrando IC + IRVS + DeltaPP + Ratio + Lactato + Gap CO2. Se houver choque, classifique e detalhe. Mencione limitações decorrentes de dados ausentes (N/A).

## 3. Impacto Metabólico e Ácido-Base
Relacione o distúrbio ácido-base com o padrão hemodinâmico. O distúrbio é consequência ou causa do quadro?

## 4. Conduta Priorizada (3–5 ações concretas)
Em ordem de urgência, considerando a incerteza dos valores calculados e os dados ausentes.

## 5. O que confirmar ou refutar
Quais dados adicionais ou exames confirmariam os achados calculados (ex: medida direta de DC por termodiluição, ecocardiograma, etc.). Inclua especificamente os dados marcados como N/A que seriam mais relevantes obter.`;

  try {
    return await callAI(prompt);
  } catch (error) {
    console.error('Erro ao gerar interpretação G3-Pro:', error);
    throw new Error('Falha ao comunicar com a IA para gerar a interpretação hemodinâmica.');
  }
}

// ── Consulta Cirúrgica ────────────────────────────────────────
export interface PacienteAIContext {
  peso?: number;
  altura?: number;
  idade?: number;
  sexo?: 'M' | 'F';
  gasometria?: { pH: number; PaCO2: number; Lactato: number; };
}

export async function consultarCirurgia(
  cirurgia: GuiaCirurgico,
  pergunta: string,
  paciente?: PacienteAIContext
): Promise<string> {
  const ctxPaciente = paciente ? `
CONTEXTO DO PACIENTE:
${[
    paciente.peso   != null ? `• Peso: ${paciente.peso} kg` : '',
    paciente.altura != null ? `• Altura: ${paciente.altura} cm` : '',
    paciente.idade  != null ? `• Faixa etária: ${anonimizarIdade(paciente.idade)}` : '',
    paciente.sexo   != null ? `• Sexo: ${paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}` : '',
    paciente.gasometria ? `• Gasometria: pH ${paciente.gasometria.pH} | PaCO2 ${paciente.gasometria.PaCO2} mmHg | Lactato ${paciente.gasometria.Lactato} mmol/L` : '',
  ].filter(Boolean).join('\n')}
` : '';

  const prompt = `Você é um Anestesiologista Sênior especialista em anestesia para ${cirurgia.especialidade}.

CONTEXTO DA CIRURGIA — ${cirurgia.nome.toUpperCase()}:
• Tempos Cirúrgicos: ${cirurgia.tempos}
• Técnica Anestésica: ${cirurgia.tecnica}
• Desafios e Problemas: ${cirurgia.problemas}
• Manejo e Correção: ${cirurgia.correcoes}
• Pós-Operatório e Analgesia: ${cirurgia.posOp}
• Referências: ${cirurgia.referencias}
${ctxPaciente}
PERGUNTA DO MÉDICO:
${pergunta}

INSTRUÇÕES DE SAÍDA:
Responda em Markdown, de forma direta e prática, focado em anestesiologia.${paciente ? ' Quando relevante, adapte doses e condutas ao contexto específico do paciente.' : ''} Inclua doses, metas hemodinâmicas e condutas concretas quando aplicável. Máximo 400 palavras.`;

  try {
    return await callAI(prompt, 'gemini-3.1-flash-lite-preview');
  } catch (error) {
    console.error('Erro ao consultar IA sobre cirurgia:', error);
    throw new Error('Falha ao comunicar com a IA para a consulta cirúrgica.');
  }
}

// ── Sugestão de Protocolo de Sedação ─────────────────────────
export async function sugerirProtocoloSedacao(
  cenario: string,
  paciente?: PacienteAIContext
): Promise<string> {
  const ctxPaciente = paciente ? `
DADOS DO PACIENTE:
${[
    paciente.peso   != null ? `• Peso: ${paciente.peso} kg` : '',
    paciente.altura != null ? `• Altura: ${paciente.altura} cm` : '',
    paciente.idade  != null ? `• Faixa etária: ${anonimizarIdade(paciente.idade)}` : '',
    paciente.sexo   != null ? `• Sexo: ${paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}` : '',
    paciente.gasometria ? `• Gasometria: pH ${paciente.gasometria.pH} | PaCO2 ${paciente.gasometria.PaCO2} mmHg | Lactato ${paciente.gasometria.Lactato} mmol/L` : '',
  ].filter(Boolean).join('\n')}
` : '\nDADOS DO PACIENTE: Não informados. Use referências para adulto padrão (70 kg).';

  const prompt = `Você é um Anestesiologista Sênior especialista em farmacologia anestésica.

CENÁRIO CLÍNICO: ${cenario}
${ctxPaciente}
TAREFA: Sugira um protocolo de sedação/anestesia personalizado para este cenário e paciente.

INSTRUÇÕES DE SAÍDA (Markdown, direto, máximo 350 palavras):

## Protocolo Sugerido
Nome do protocolo e justificativa breve.

## Drogas e Doses
Para cada droga, forneça:
- **Nome:** dose absoluta calculada para o peso (se informado) OU dose/kg
- Velocidade de infusão em mL/h quando aplicável
- Concentração de preparo padrão

## Alertas Específicos
Alertas e cuidados para este paciente/cenário específico.

## Ajustes Necessários
Quaisquer ajustes de dose por idade, hemodinâmica, ou comorbidades inferíveis do contexto.

Seja clínico, preciso e praticamente útil. Inclua apenas drogas relevantes para o cenário.`;

  try {
    return await callAI(prompt, 'gemini-3.1-flash-lite-preview');
  } catch (error) {
    console.error('Erro ao sugerir protocolo de sedação:', error);
    throw new Error('Falha ao comunicar com a IA para sugestão de protocolo.');
  }
}

// ── Interações Medicamentosas ────────────────────────────────
export async function checkDrugInteractions(drugs: Droga[]): Promise<string> {
  if (drugs.length < 2) return 'Adicione pelo menos 2 medicamentos para verificar interações.';

  const drugNames = drugs.map(d => d.nome).join(', ');

  const prompt = `
Você é um Farmacêutico Clínico e Anestesiologista Sênior.
Analise a seguinte lista de medicamentos que estão sendo prescritos juntos para um paciente em ambiente de terapia intensiva ou centro cirúrgico:

MEDICAMENTOS: ${drugNames}

INSTRUÇÕES DE SAÍDA:
Forneça uma análise de interações medicamentosas estruturada em Markdown. Seja direto e clínico.
1. **Interações Críticas (Vermelho):** Interações graves que contraindicam o uso concomitante ou exigem monitoramento intensivo imediato (ex: risco de Torsades de Pointes, depressão respiratória severa, síndrome serotoninérgica).
2. **Interações Moderadas (Amarelo):** Interações que exigem ajuste de dose ou monitoramento (ex: potencialização de efeito hipotensor).
3. **Sinergismo/Antagonismo Esperado:** Efeitos combinados que são intencionais na anestesia (ex: Propofol + Fentanil) ou antagonismos.
4. **Recomendações Práticas:** O que a equipe de enfermagem ou médica deve fazer (ex: "Infundir em vias separadas", "Monitorar ECG contínuo").

Se não houver interações relevantes conhecidas, informe claramente que não há interações maiores documentadas, mas mantenha a recomendação de monitoramento padrão.
`;

  try {
    return await callAI(prompt, 'gemini-3.1-flash-lite-preview');
  } catch (error) {
    console.error('Erro ao verificar interações:', error);
    throw new Error('Falha ao comunicar com a IA para verificar interações.');
  }
}

// ── Sugestão de Prescrição por Cenário ───────────────────────
export async function sugerirPrescricao(
  paciente: { peso?: number; idade?: number; sexo?: 'M' | 'F'; alergias?: string[] },
  cenario: string
): Promise<string> {
  const linhasPaciente = [
    paciente.idade  != null ? `• Faixa etária: ${anonimizarIdade(paciente.idade)}` : '',
    paciente.sexo   != null ? `• Sexo: ${paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}` : '',
    paciente.peso   != null ? `• Peso: ${paciente.peso} kg` : '',
    paciente.alergias && paciente.alergias.length > 0 ? `• Alergias conhecidas: ${paciente.alergias.join(', ')}` : '• Sem alergias registradas',
  ].filter(Boolean).join('\n');

  const prompt = `Você é um Anestesiologista Sênior montando uma prescrição para o seguinte cenário.

CENÁRIO: ${cenario}

DADOS DO PACIENTE:
${linhasPaciente || '• Não informados — use referências para adulto padrão (70 kg).'}

TAREFA: Sugira uma prescrição anestésica/sedação personalizada e prática para este contexto.

INSTRUÇÕES DE SAÍDA (Markdown, direto, máximo 400 palavras, sem introduções genéricas):

## Protocolo Recomendado
Nome e justificativa em 1–2 frases considerando o cenário específico.

## Medicamentos e Doses
Para cada droga:
- **Nome exato:** (ex: Propofol, Fentanil, Rocurônio — use nomes sem abreviações)
- Dose de bolus calculada para o peso e dose/kg se peso não disponível
- Dose de infusão em mL/h quando aplicável
- Concentração padrão de preparo

## Alertas do Protocolo
Cuidados específicos para este cenário (via aérea, hemodinâmica, monitorização, recuperação).

## Sequência de Administração
Ordem e tempo sugeridos para as medicações (ex: pré-medicação → indução → manutenção).

Seja clínico, preciso e praticamente útil para o anestesista na sala. Apenas drogas relevantes para o cenário.`;

  try {
    return await callAI(prompt, 'gemini-3.1-flash-lite-preview');
  } catch (error) {
    console.error('Erro ao sugerir prescrição:', error);
    throw new Error('Falha ao comunicar com a IA para sugestão de prescrição.');
  }
}

// ── Resumo de Alta / Encerramento de Paciente ────────────────
export async function gerarResumoAlta(
  paciente: Patient,
  avaliacoes: Avaliacao[]
): Promise<string> {
  const tiposRealizados = avaliacoes.map((a) => {
    const data = new Date(a.data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    let resumo = '';
    if (a.tipo === 'Gasometria' && a.resultado?.disturbioPrimario) {
      resumo = `${a.resultado.disturbioPrimario} (${a.resultado.severidade ?? ''})`;
    } else if (a.tipo === 'Drogas' && a.resultado?.prescricao?.length) {
      resumo = `${a.resultado.prescricao.length} medicamento(s)`;
    } else if (a.tipo === 'Escores' && a.dados?.asa) {
      resumo = `ASA ${a.dados.asa}`;
    } else if (a.tipo === 'Hemodinamica' && a.resultado?.hemo?.choque) {
      resumo = `Choque ${a.resultado.hemo.choque}`;
    }
    return `• ${a.tipo} — ${data}${resumo ? ` — ${resumo}` : ''}`;
  });

  const linhasPaciente = [
    paciente.nome ? `• Nome: ${paciente.nome}` : '',
    paciente.idade != null ? `• Faixa etária: ${anonimizarIdade(paciente.idade)}` : '',
    paciente.sexo != null ? `• Sexo: ${paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}` : '',
    paciente.peso != null ? `• Peso: ${paciente.peso} kg` : '',
    paciente.cirurgiaPlaneada ? `• Procedimento: ${paciente.cirurgiaPlaneada}` : '',
    paciente.alergias?.length ? `• Alergias: ${paciente.alergias.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `Você é um Anestesiologista Sênior encerrando o atendimento de um paciente e elaborando um resumo clínico para handoff.

DADOS DO PACIENTE:
${linhasPaciente || '• Não informados'}

${paciente.fichaPreAnestesica ? `FICHA PRÉ-ANESTÉSICA:\n${paciente.fichaPreAnestesica}\n` : ''}
AVALIAÇÕES REALIZADAS (${avaliacoes.length} no total):
${tiposRealizados.join('\n') || '• Nenhuma avaliação registrada'}

TAREFA: Gere um resumo de handoff/alta estruturado em Markdown para ser consultado no próximo atendimento.

INSTRUÇÕES DE SAÍDA (máximo 400 palavras, sem introduções genéricas):

## Perfil do Paciente
Síntese biométrica e clínica em 2–3 linhas.

## Avaliações Realizadas
Liste os achados relevantes de cada avaliação com destaques clínicos.

## Alertas Identificados
Pontos de atenção críticos detectados durante o atendimento (via aérea, hemodinâmica, alergias, etc.). Omitir se não houver.

## Recomendações para o Próximo Atendimento
3–5 recomendações práticas baseadas no histórico deste paciente.`;

  return callAI(prompt, 'gemini-3.1-flash-lite-preview');
}

// ── Ficha Pré-Anestésica ─────────────────────────────────────
export interface DadosFichaAnestesica {
  // Biometria
  idade?: number;
  peso?: number;
  altura?: number;
  imc?: number;

  // Sinais Vitais
  paSistolica?: number;
  paDiastolica?: number;
  frequenciaCardiaca?: number;

  // Classificação
  asaClass?: string; // 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'
  emergencia?: boolean;

  // Via Aérea
  mallampatiClass?: string; // 'I' | 'II' | 'III' | 'IV'
  ulbt?: number; // 1-3
  lemonScore?: number; // 0-5
  obeseScore?: number; // 0-5

  // Cardiovascular / Funcional
  rcriScore?: number; // 0-6
  mets?: number;
  ariscatScore?: number; // 0-100

  // Outros scores
  stopBangScore?: number; // 0-8
  apfelScore?: number; // 0-4

  // Histórico Cardiovascular
  hx_hipertensao?: boolean;
  hx_coronariopatia?: boolean;
  hx_valvulopatia?: boolean;
  hx_icc?: boolean;
  hx_arritmia?: boolean;
  hx_cardio_descricao?: string;
  ecg?: string;
  rxTorax?: string;
  ecocardiograma?: string;

  // Histórico Neurológico
  hx_convulsao?: boolean;
  hx_avc?: boolean;
  hx_neuropatia?: boolean;
  hx_hic?: boolean;
  hx_neuro_descricao?: string;

  // Histórico Respiratório
  hx_dpoc?: boolean;
  hx_ivas?: boolean;
  hx_intubacaoDificil?: boolean;
  hx_resp_descricao?: string;

  // Histórico Hematológico
  hx_anemia?: boolean;
  hx_leucose?: boolean;
  hx_coagulopatia?: boolean;
  lab_hb?: number;
  lab_htc?: number;
  lab_plaquetas?: number;
  lab_ap?: number;
  lab_ttpa?: number;
  lab_gb?: number;

  // Infecção
  hx_hiv?: boolean;
  hx_hepatite?: boolean;
  hx_infeccao_descricao?: string;

  // Renal / Metabólico
  hx_insuficienciaRenal?: boolean;
  hx_desidratacao?: boolean;
  hx_alteracaoEletrolitica?: boolean;
  lab_ureia?: number;
  lab_creatinina?: number;
  lab_na?: number;
  lab_k?: number;
  lab_ca?: number;
  lab_mg?: number;

  // Endócrino
  hx_dm1?: boolean;
  hx_dm2?: boolean;
  hx_hipertireoidismo?: boolean;
  hx_hipotireoidismo?: boolean;
  hx_dlp?: boolean;
  lab_glicemia?: number;
  lab_hba1c?: number;
  lab_tsh?: number;
  lab_t4?: number;

  // Osteomuscular
  hx_artrite?: boolean;
  hx_viciosPostura?: boolean;
  hx_disfAtm?: boolean;
  hx_herniaDiscal?: boolean;
  hx_osteo_descricao?: string;

  // Digestivo / Nutricional
  hx_estomaCheio?: boolean;
  hx_desnutricao?: boolean;
  hx_disfHepatica?: boolean;
  hx_obesidade?: boolean;

  // Antecedentes
  alergias?: string;
  habitos?: string;
  complicAnestFamiliar?: string;
  cirurgiasAnteriores?: string;
  quimioterapia?: boolean;
  radioterapia?: boolean;

  // Medicações em uso
  medicacoesEmUso?: string;
}

export async function gerarFichaAnestesica(dados: DadosFichaAnestesica): Promise<string> {
  // ── Biometria e Sinais Vitais ────────────────────────────────
  const biometria: string[] = [];
  if (dados.idade != null) biometria.push(`• Idade: ${dados.idade} anos`);
  if (dados.peso != null && dados.altura != null) biometria.push(`• Peso: ${dados.peso} kg | Altura: ${dados.altura} cm`);
  if (dados.imc != null) biometria.push(`• IMC: ${dados.imc.toFixed(1)} kg/m²`);
  if (dados.asaClass) biometria.push(`• Classificação ASA: ${dados.asaClass}${dados.emergencia ? 'E (emergência)' : ''}`);

  const sinaisVitais: string[] = [];
  if (dados.paSistolica != null && dados.paDiastolica != null) {
    const pam = ((dados.paSistolica + 2 * dados.paDiastolica) / 3).toFixed(0);
    sinaisVitais.push(`• PA: ${dados.paSistolica}/${dados.paDiastolica} mmHg (PAM ~${pam})`);
  }
  if (dados.frequenciaCardiaca != null) sinaisVitais.push(`• FC: ${dados.frequenciaCardiaca} bpm`);

  // ── Histórico Cardiovascular ─────────────────────────────────
  const cardio: string[] = [];
  if (dados.hx_hipertensao) cardio.push('Hipertensão arterial');
  if (dados.hx_coronariopatia) cardio.push('Doença coronariana / insuficiência coronariana');
  if (dados.hx_valvulopatia) cardio.push('Valvulopatia');
  if (dados.hx_icc) cardio.push('Insuficiência cardíaca congestiva (ICC)');
  if (dados.hx_arritmia) cardio.push('Arritmia cardíaca');
  const examesCardio: string[] = [];
  if (dados.ecg) examesCardio.push(`ECG: ${dados.ecg}`);
  if (dados.rxTorax) examesCardio.push(`RX Tórax: ${dados.rxTorax}`);
  if (dados.ecocardiograma) examesCardio.push(`Ecocardiograma: ${dados.ecocardiograma}`);

  // ── Histórico Neurológico ────────────────────────────────────
  const neuro: string[] = [];
  if (dados.hx_convulsao) neuro.push('Síndrome convulsiva');
  if (dados.hx_avc) neuro.push('Doença vascular cerebral / AVC');
  if (dados.hx_neuropatia) neuro.push('Neuropatia periférica');
  if (dados.hx_hic) neuro.push('Hipertensão intracraniana');

  // ── Histórico Respiratório ───────────────────────────────────
  const resp: string[] = [];
  if (dados.hx_dpoc) resp.push('Doença pulmonar obstrutiva/restritiva (DPOC)');
  if (dados.hx_ivas) resp.push('IVAS recente');
  if (dados.hx_intubacaoDificil) resp.push('Histórico de intubação difícil');

  // ── Histórico Hematológico ───────────────────────────────────
  const hemato: string[] = [];
  if (dados.hx_anemia) hemato.push('Anemia');
  if (dados.hx_leucose) hemato.push('Leucose');
  if (dados.hx_coagulopatia) hemato.push('Coagulopatia');
  const labsHemato: string[] = [];
  if (dados.lab_hb != null) labsHemato.push(`Hb ${dados.lab_hb} g/dL`);
  if (dados.lab_htc != null) labsHemato.push(`Htc ${dados.lab_htc}%`);
  if (dados.lab_plaquetas != null) labsHemato.push(`Plq ${dados.lab_plaquetas.toLocaleString('pt-BR')}/mm³`);
  if (dados.lab_ap != null) labsHemato.push(`AP ${dados.lab_ap}%`);
  if (dados.lab_ttpa != null) labsHemato.push(`TTPA ${dados.lab_ttpa}`);
  if (dados.lab_gb != null) labsHemato.push(`GB ${dados.lab_gb}/mm³`);

  // ── Infecção ─────────────────────────────────────────────────
  const infec: string[] = [];
  if (dados.hx_hiv) infec.push('HIV positivo');
  if (dados.hx_hepatite) infec.push('Hepatite');

  // ── Renal / Metabólico ───────────────────────────────────────
  const renal: string[] = [];
  if (dados.hx_insuficienciaRenal) renal.push('Insuficiência renal');
  if (dados.hx_desidratacao) renal.push('Desidratação');
  if (dados.hx_alteracaoEletrolitica) renal.push('Alteração eletrolítica');
  const labsRenal: string[] = [];
  if (dados.lab_ureia != null) labsRenal.push(`Ureia ${dados.lab_ureia}`);
  if (dados.lab_creatinina != null) labsRenal.push(`Creat ${dados.lab_creatinina} mg/dL`);
  if (dados.lab_na != null) labsRenal.push(`Na ${dados.lab_na} mEq/L`);
  if (dados.lab_k != null) labsRenal.push(`K ${dados.lab_k} mEq/L`);
  if (dados.lab_ca != null) labsRenal.push(`Ca ${dados.lab_ca}`);
  if (dados.lab_mg != null) labsRenal.push(`Mg ${dados.lab_mg}`);

  // ── Endócrino ────────────────────────────────────────────────
  const endoc: string[] = [];
  if (dados.hx_dm1) endoc.push('Diabetes Mellitus tipo 1');
  if (dados.hx_dm2) endoc.push('Diabetes Mellitus tipo 2');
  if (dados.hx_hipertireoidismo) endoc.push('Hipertireoidismo');
  if (dados.hx_hipotireoidismo) endoc.push('Hipotireoidismo');
  if (dados.hx_dlp) endoc.push('Dislipidemia (DLP)');
  const labsEndoc: string[] = [];
  if (dados.lab_glicemia != null) labsEndoc.push(`Glicemia ${dados.lab_glicemia} mg/dL`);
  if (dados.lab_hba1c != null) labsEndoc.push(`HbA1c ${dados.lab_hba1c}%`);
  if (dados.lab_tsh != null) labsEndoc.push(`TSH ${dados.lab_tsh}`);
  if (dados.lab_t4 != null) labsEndoc.push(`T4L ${dados.lab_t4}`);

  // ── Osteomuscular ────────────────────────────────────────────
  const osteo: string[] = [];
  if (dados.hx_artrite) osteo.push('Artrite reumatoide');
  if (dados.hx_viciosPostura) osteo.push('Vícios de postura');
  if (dados.hx_disfAtm) osteo.push('Disfunção ATM');
  if (dados.hx_herniaDiscal) osteo.push('Hérnia discal');

  // ── Digestivo ────────────────────────────────────────────────
  const digest: string[] = [];
  if (dados.hx_estomaCheio) digest.push('Risco de estômago cheio / aspiração');
  if (dados.hx_desnutricao) digest.push('Desnutrição');
  if (dados.hx_disfHepatica) digest.push('Disfunção hepática');
  if (dados.hx_obesidade) digest.push('Obesidade');

  // ── Construção do bloco de dados ─────────────────────────────
  const blocos: string[] = [];
  if (biometria.length) blocos.push(`BIOMETRIA E CLASSIFICAÇÃO:\n${biometria.join('\n')}`);
  if (sinaisVitais.length) blocos.push(`SINAIS VITAIS:\n${sinaisVitais.join('\n')}`);

  if (cardio.length || examesCardio.length || dados.hx_cardio_descricao) {
    const c = [`HISTÓRICO CARDIOVASCULAR:`];
    if (cardio.length) c.push(`• Comorbidades: ${cardio.join(', ')}`);
    if (examesCardio.length) c.push(examesCardio.map(e => `• ${e}`).join('\n'));
    if (dados.hx_cardio_descricao) c.push(`• Descrição: ${dados.hx_cardio_descricao}`);
    blocos.push(c.join('\n'));
  }
  if (neuro.length || dados.hx_neuro_descricao) {
    const n = [`HISTÓRICO NEUROLÓGICO:`];
    if (neuro.length) n.push(`• ${neuro.join(', ')}`);
    if (dados.hx_neuro_descricao) n.push(`• ${dados.hx_neuro_descricao}`);
    blocos.push(n.join('\n'));
  }
  if (resp.length || dados.hx_resp_descricao) {
    const r = [`HISTÓRICO RESPIRATÓRIO:`];
    if (resp.length) r.push(`• ${resp.join(', ')}`);
    if (dados.hx_resp_descricao) r.push(`• ${dados.hx_resp_descricao}`);
    blocos.push(r.join('\n'));
  }
  if (hemato.length || labsHemato.length) {
    const h = [`HISTÓRICO HEMATOLÓGICO:`];
    if (hemato.length) h.push(`• ${hemato.join(', ')}`);
    if (labsHemato.length) h.push(`• Labs: ${labsHemato.join(' | ')}`);
    blocos.push(h.join('\n'));
  }
  if (infec.length || dados.hx_infeccao_descricao) {
    blocos.push(`INFECÇÃO:\n• ${[...infec, dados.hx_infeccao_descricao].filter(Boolean).join(', ')}`);
  }
  if (renal.length || labsRenal.length) {
    const rn = [`HISTÓRICO RENAL/METABÓLICO:`];
    if (renal.length) rn.push(`• ${renal.join(', ')}`);
    if (labsRenal.length) rn.push(`• Labs: ${labsRenal.join(' | ')}`);
    blocos.push(rn.join('\n'));
  }
  if (endoc.length || labsEndoc.length) {
    const en = [`HISTÓRICO ENDÓCRINO:`];
    if (endoc.length) en.push(`• ${endoc.join(', ')}`);
    if (labsEndoc.length) en.push(`• Labs: ${labsEndoc.join(' | ')}`);
    blocos.push(en.join('\n'));
  }
  if (osteo.length || dados.hx_osteo_descricao) {
    const os = [`HISTÓRICO OSTEOMUSCULAR:`];
    if (osteo.length) os.push(`• ${osteo.join(', ')}`);
    if (dados.hx_osteo_descricao) os.push(`• ${dados.hx_osteo_descricao}`);
    blocos.push(os.join('\n'));
  }
  if (digest.length) {
    blocos.push(`DIGESTIVO/NUTRICIONAL:\n• ${digest.join(', ')}`);
  }
  if (dados.alergias) blocos.push(`ALERGIAS: ${dados.alergias}`);
  if (dados.habitos) blocos.push(`HÁBITOS/VÍCIOS: ${dados.habitos}`);
  if (dados.cirurgiasAnteriores) blocos.push(`CIRURGIAS ANTERIORES: ${dados.cirurgiasAnteriores}`);
  if (dados.complicAnestFamiliar) blocos.push(`COMPLICAÇÕES ANESTÉSICAS FAMILIARES: ${dados.complicAnestFamiliar}`);
  if (dados.quimioterapia) blocos.push(`QUIMIOTERAPIA: Sim`);
  if (dados.radioterapia) blocos.push(`RADIOTERAPIA: Sim`);
  if (dados.medicacoesEmUso) blocos.push(`MEDICAÇÕES EM USO:\n${dados.medicacoesEmUso}`);

  // ── Scores ───────────────────────────────────────────────────
  const scores: string[] = [];
  if (dados.mallampatiClass) scores.push(`Mallampati: Classe ${dados.mallampatiClass}`);
  if (dados.ulbt != null) scores.push(`ULBT: ${dados.ulbt}/3`);
  if (dados.lemonScore != null) scores.push(`LEMON: ${dados.lemonScore}/5`);
  if (dados.obeseScore != null) scores.push(`OBESE (ventilação difícil): ${dados.obeseScore}/5`);
  if (dados.rcriScore != null) scores.push(`RCRI (Lee): ${dados.rcriScore}/6`);
  if (dados.mets != null) scores.push(`Capacidade Funcional: ${dados.mets} METs`);
  if (dados.ariscatScore != null) scores.push(`ARISCAT: ${dados.ariscatScore}`);
  if (dados.stopBangScore != null) scores.push(`STOP-BANG (SAOS): ${dados.stopBangScore}/8`);
  if (dados.apfelScore != null) scores.push(`Apfel (NVPO): ${dados.apfelScore}/4`);

  const prompt = `Você é um Anestesiologista Sênior realizando avaliação pré-anestésica detalhada.

${blocos.join('\n\n')}

SCORES DE RISCO:
${scores.length ? scores.map(s => `• ${s}`).join('\n') : '• Não informados'}

TAREFA: Gere avaliação pré-anestésica estruturada com foco em considerações clínicas práticas.

INSTRUÇÕES DE SAÍDA (Markdown, máximo 500 palavras, sem introduções genéricas):

## Avaliação por Sistemas
Parágrafo breve por sistema com achado clinicamente relevante. Omitir sistemas sem dados anormais.

## Via Aérea — Estratégia
Decisão clara: rotina / videolaringoscópio 1ª escolha / broncoscopia acordado.
Justificativa objetiva nos scores e histórico fornecidos.

## Risco Anestésico-Cirúrgico
Síntese RCRI + METs + ARISCAT + ASA. Indicação de monitorização invasiva (PAI, PVC) se aplicável.

## Alertas Críticos
Bullets — apenas itens que exigem ação concreta antes/durante cirurgia. Omitir se ausentes.

## Considerações Finais — Recomendações Específicas
Lista de bullets com verbos imperativos, ESPECÍFICOS para ESTE paciente com base nos dados fornecidos:
- Para cada medicação relevante em uso: "Suspender [medicação] [N] dias antes" ou "Manter [medicação] — não suspender"
- Profilaxia TVP: mecânica (meias de compressão) e/ou farmacológica (HBPM) conforme risco
- Estratégia de via aérea com equipamentos
- Manejo glicêmico intraop (se DM presente)
- Protocolo de jejum / restrição hídrica se aplicável
- Posicionamento especial (se obesidade, osteomuscular)
- Monitorização adicional indicada
- Outras medidas específicas derivadas dos dados (ex: ISR se estômago cheio, antibioticoprofilaxia, etc.)

Seja direto, clínico e praticamente útil para um anestesista preparando a indução.`;

  try {
    return await callAI(prompt, 'gemini-3.1-pro-preview');
  } catch (error) {
    console.error('Erro ao gerar ficha pré-anestésica:', error);
    throw new Error('Falha ao comunicar com a IA para gerar a ficha pré-anestésica.');
  }
}
