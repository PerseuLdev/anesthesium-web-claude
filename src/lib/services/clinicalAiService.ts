import { GoogleGenAI } from '@google/genai';
import { GasometriaOutput } from '../clinical/gasometria';
import { G3ProInput, G3ProResult } from '../clinical/g3pro';
import { Droga } from '../../constants/drogas';

let ai: GoogleGenAI | null = null;

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
async function callAI(prompt: string, geminiModel = 'gemini-3.1-pro-preview'): Promise<string> {
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
${gasometriaData.inputOriginal.Idade ? `- Idade: ${gasometriaData.inputOriginal.Idade} anos` : ''}

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
    return await callAI(prompt, 'gemini-3.1-pro-preview');
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

  const prompt = `Você é um Médico Intensivista Sênior revisando os resultados de uma calculadora hemodinâmica integrada (G3-Pro).

CONTEXTO CRÍTICO — LEIA ANTES DE ANALISAR:
Os parâmetros hemodinâmicos abaixo foram CALCULADOS pelo Princípio de Fick a partir de dados clínicos — não foram medidos diretamente por cateter de artéria pulmonar ou Swan-Ganz. Isso significa que cada etapa de cálculo propaga um erro. O valor final do Índice Cardíaco, IRVS, etc., pode divergir significativamente do real dependendo da acurácia das medidas de SaO2, SvO2 e Hemoglobina.

Sua análise deve:
1. Avaliar a PLAUSIBILIDADE CLÍNICA do conjunto de resultados (não os valores isolados). Ex: IC 0.9 + FC 110 + PAM 75 sem sinais de choque clínico → questionar a acurácia dos inputs.
2. Se o padrão for internamente coerente (IC baixo + lactato alto + ERO2 alta + Gap CO2 alto), reforçar a conclusão.
3. Propor conduta PRIORIZANDO a incerteza dos valores calculados.

═══════════════════════════════════════
DADOS DO PACIENTE
═══════════════════════════════════════
Antropometria: ${input.peso} kg | ${input.altura} cm | ${input.idade} anos | ${input.sexo === 'M' ? 'Masculino' : 'Feminino'}
SC: ${hemo.sc.toFixed(2)} m² | VO2 estimado: ${hemo.vo2.toFixed(0)} mL/min

SINAIS VITAIS E PRESSÕES:
FC: ${input.fc} bpm | PAS: ${input.pas} / PAD: ${input.pad} mmHg | PAM calc: ${hemo.pam.toFixed(1)} mmHg
PVC: ${input.pvc} mmHg | PAP Média: ${input.papm} mmHg | PCP (Wedge): ${input.pcp} mmHg

HEMODINÂMICA CALCULADA (Módulo 1 — Fick):
• Débito Cardíaco: ${hemo.dc.toFixed(2)} L/min
• Índice Cardíaco (IC): ${hemo.ic.toFixed(2)} L/min/m² [Ref: 2.5–4.0]
• Volume Sistólico: ${hemo.vs.toFixed(1)} mL | IS: ${hemo.is_index.toFixed(1)} mL/m²
• DO2i: ${hemo.do2i.toFixed(1)} mL/min/m² | ERO2: ${hemo.ero2.toFixed(1)}% [Ref: 22–30%]
• IRVS: ${hemo.irvs.toFixed(0)} dyn·s·cm⁻⁵·m² [Ref: 1700–2400]
• IRVP: ${hemo.irvp.toFixed(0)} dyn·s·cm⁻⁵·m²
• Poder Cardíaco (CPO): ${hemo.cpo.toFixed(2)} W [Ref: >0.6W]
• LVSWI: ${hemo.lvswi.toFixed(1)} g·m/m² | RVSWI: ${hemo.rvswi.toFixed(1)} g·m/m²
• DeltaPP: ${hemo.deltapp.toFixed(1)}% [Fluido-responsivo se >13%]
• Gap V-A CO2: ${hemo.gap_co2.toFixed(1)} mmHg [Ref: 2–6]
• Ratio ΔCO2/C(a-v)O2: ${hemo.ratio.toFixed(2)} [Anaerobiose se >1.4]
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
Identifique o padrão predominante integrando IC + IRVS + DeltaPP + Ratio + Lactato + Gap CO2. Se houver choque, classifique e detalhe.

## 3. Impacto Metabólico e Ácido-Base
Relacione o distúrbio ácido-base com o padrão hemodinâmico. O distúrbio é consequência ou causa do quadro?

## 4. Conduta Priorizada (3–5 ações concretas)
Em ordem de urgência, considerando a incerteza dos valores calculados.

## 5. O que confirmar ou refutar
Quais dados adicionais ou exames confirmariam os achados calculados (ex: medida direta de DC por termodiluição, ecocardiograma, etc.).`;

  try {
    return await callAI(prompt);
  } catch (error) {
    console.error('Erro ao gerar interpretação G3-Pro:', error);
    throw new Error('Falha ao comunicar com a IA para gerar a interpretação hemodinâmica.');
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
    return await callAI(prompt, 'gemini-3.1-pro-preview');
  } catch (error) {
    console.error('Erro ao verificar interações:', error);
    throw new Error('Falha ao comunicar com a IA para verificar interações.');
  }
}
