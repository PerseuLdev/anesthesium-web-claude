import React, { useState, useRef, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { usePatientStore, createNewPatient, type Patient } from '../lib/storage/patientStore';
import { useHistoryStore } from '../lib/storage/historyStore';
import { useSessionStore } from '../lib/storage/sessionStore';
import { gerarResumoAlta } from '../lib/services/clinicalAiService';

export function NovoPatiente() {
  const navigate = useNavigate();
  const { currentPatient, archiveCurrentPatient, setCurrentPatient, updateArchivedPatient } = usePatientStore();
  const avaliacoes = useHistoryStore((s) => s.avaliacoes);
  const setPacienteContext = useSessionStore((s) => s.setPacienteContext);

  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F' | ''>('');
  const [alergias, setAlergias] = useState<string[]>([]);
  const [alergiaInput, setAlergiaInput] = useState('');
  const [fichaPreAnestesica, setFichaPreAnestesica] = useState('');
  const [cirurgiaPlaneada, setCirurgiaPlaneada] = useState('');
  const [nomeError, setNomeError] = useState(false);
  const [saving, setSaving] = useState(false);

  const alergiaInputRef = useRef<HTMLInputElement>(null);

  const addAlergia = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !alergias.includes(trimmed)) {
      setAlergias((prev) => [...prev, trimmed]);
    }
    setAlergiaInput('');
  };

  const handleAlergiaKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addAlergia(alergiaInput);
    } else if (e.key === 'Backspace' && alergiaInput === '' && alergias.length > 0) {
      setAlergias((prev) => prev.slice(0, -1));
    }
  };

  const removeAlergia = (a: string) => {
    setAlergias((prev) => prev.filter((x) => x !== a));
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      setNomeError(true);
      return;
    }
    setNomeError(false);
    setSaving(true);

    try {
      // Archive current patient (sync) — capture before archiving
      let archivedId: string | null = null;
      let linkedAvaliacoes: typeof avaliacoes = [];

      if (currentPatient) {
        archivedId = currentPatient.id;
        linkedAvaliacoes = avaliacoes.filter((a) =>
          currentPatient.avaliacaoIds.includes(a.id)
        );
        archiveCurrentPatient();
      }

      // Create and set the new patient
      const newPatient = createNewPatient({
        nome: nome.trim(),
        idade: idade ? Number(idade) : undefined,
        peso: peso ? Number(peso) : undefined,
        altura: altura ? Number(altura) : undefined,
        sexo: sexo || undefined,
        alergias: alergias.length > 0 ? alergias : undefined,
        fichaPreAnestesica: fichaPreAnestesica.trim() || undefined,
        cirurgiaPlaneada: cirurgiaPlaneada.trim() || undefined,
      });

      setCurrentPatient(newPatient);

      // Sync patient demographics to session store (for drugs/surgery modules)
      setPacienteContext({
        peso: newPatient.peso,
        altura: newPatient.altura,
        idade: newPatient.idade,
        sexo: newPatient.sexo,
        alergias: newPatient.alergias,
        capturedAt: new Date().toISOString(),
      });

      // Fire-and-forget AI summary for the archived patient
      if (archivedId && linkedAvaliacoes.length > 0 && currentPatient) {
        const patientSnapshot = { ...currentPatient, archivedAt: new Date().toISOString() } as Patient;
        gerarResumoAlta(patientSnapshot, linkedAvaliacoes)
          .then((summary) => updateArchivedPatient(archivedId!, { aiSummary: summary }))
          .catch(() => {/* silent fail */});
      }

      navigate('/paciente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/paciente')}
          className="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-500/20 rounded-xl">
            <UserPlus className="w-4 h-4 text-violet-400" />
          </div>
          <h1 className="text-lg font-bold text-white">Novo Paciente</h1>
        </div>
      </div>

      {/* Warning: current patient will be archived */}
      {currentPatient && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/8"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Paciente atual será arquivado</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                <span className="text-white">{currentPatient.nome}</span> e todas as suas avaliações serão movidos para o Histórico com um resumo gerado por IA.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
            Nome <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => { setNome(e.target.value); setNomeError(false); }}
            placeholder="Nome do paciente"
            className={`w-full px-3 py-2.5 rounded-xl bg-zinc-900/80 border text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 transition-colors ${
              nomeError
                ? 'border-rose-500/60 focus:ring-rose-500/40'
                : 'border-white/10 focus:ring-violet-500/40 focus:border-violet-500/40'
            }`}
          />
          {nomeError && (
            <p className="text-xs text-rose-400 mt-1">Nome é obrigatório</p>
          )}
        </div>

        {/* Idade + Sexo row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Idade</label>
            <input
              type="number"
              value={idade}
              onChange={(e) => setIdade(e.target.value)}
              placeholder="anos"
              min="0"
              max="150"
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Sexo</label>
            <div className="flex gap-2">
              {(['M', 'F'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSexo(sexo === s ? '' : s)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    sexo === s
                      ? 'bg-violet-500/25 border-violet-500/50 text-violet-300'
                      : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  {s === 'M' ? 'Masc.' : 'Fem.'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Peso + Altura row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Peso (kg)</label>
            <input
              type="number"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="kg"
              min="0"
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Altura (cm) <span className="text-zinc-600 normal-case tracking-normal">opcional</span></label>
            <input
              type="number"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              placeholder="cm"
              min="0"
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Alergias tag input */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Alergias</label>
          <div
            onClick={() => alergiaInputRef.current?.focus()}
            className="min-h-[42px] w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-white/10 focus-within:ring-1 focus-within:ring-violet-500/40 focus-within:border-violet-500/40 transition-colors flex flex-wrap gap-1.5 items-center cursor-text"
          >
            {alergias.map((a) => (
              <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {a}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeAlergia(a); }}
                  className="hover:text-rose-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              ref={alergiaInputRef}
              type="text"
              value={alergiaInput}
              onChange={(e) => setAlergiaInput(e.target.value)}
              onKeyDown={handleAlergiaKeyDown}
              onBlur={() => { if (alergiaInput.trim()) addAlergia(alergiaInput); }}
              placeholder={alergias.length === 0 ? 'Digite e pressione Enter ou vírgula' : ''}
              className="flex-1 min-w-[100px] bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
            />
          </div>
        </div>

        {/* Ficha pré-anestésica */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
            Ficha pré-anestésica <span className="text-zinc-600 normal-case tracking-normal">notas clínicas</span>
          </label>
          <textarea
            value={fichaPreAnestesica}
            onChange={(e) => setFichaPreAnestesica(e.target.value)}
            placeholder="Comorbidades, histórico, medicações em uso, observações relevantes..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Cirurgia planejada */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
            Cirurgia/Procedimento <span className="text-zinc-600 normal-case tracking-normal">opcional</span>
          </label>
          <input
            type="text"
            value={cirurgiaPlaneada}
            onChange={(e) => setCirurgiaPlaneada(e.target.value)}
            placeholder="Ex: Colecistectomia videolaparoscópica"
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors active:scale-[0.98]"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            {currentPatient ? 'Arquivar atual e criar novo' : 'Criar paciente'}
          </>
        )}
      </button>
    </div>
  );
}
