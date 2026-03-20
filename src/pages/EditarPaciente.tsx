import React, { useState, useRef, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPen, X } from 'lucide-react';
import { motion } from 'motion/react';
import { usePatientStore } from '../lib/storage/patientStore';
import { useSessionStore } from '../lib/storage/sessionStore';

export function EditarPaciente() {
  const navigate = useNavigate();
  const { currentPatient, updateCurrentPatient } = usePatientStore();
  const setPacienteContext = useSessionStore((s) => s.setPacienteContext);

  // Pre-fill from currentPatient
  const [nome, setNome] = useState(currentPatient?.nome ?? '');
  const [idade, setIdade] = useState(currentPatient?.idade?.toString() ?? '');
  const [peso, setPeso] = useState(currentPatient?.peso?.toString() ?? '');
  const [altura, setAltura] = useState(currentPatient?.altura?.toString() ?? '');
  const [sexo, setSexo] = useState<'M' | 'F' | ''>(currentPatient?.sexo ?? '');
  const [alergias, setAlergias] = useState<string[]>(currentPatient?.alergias ?? []);
  const [alergiaInput, setAlergiaInput] = useState('');
  const [medicamentos, setMedicamentos] = useState<string[]>(currentPatient?.medicamentosEmUso ?? []);
  const [medicamentoInput, setMedicamentoInput] = useState('');
  const [fichaPreAnestesica, setFichaPreAnestesica] = useState(currentPatient?.fichaPreAnestesica ?? '');
  const [cirurgiaPlaneada, setCirurgiaPlaneada] = useState(currentPatient?.cirurgiaPlaneada ?? '');
  const [nomeError, setNomeError] = useState(false);

  const alergiaInputRef = useRef<HTMLInputElement>(null);
  const medicamentoInputRef = useRef<HTMLInputElement>(null);

  if (!currentPatient) {
    return (
      <div className="p-6 text-center text-zinc-500">
        <p>Nenhum paciente ativo para editar.</p>
        <button onClick={() => navigate('/paciente')} className="mt-3 text-sm text-violet-400 hover:text-violet-300">
          Voltar
        </button>
      </div>
    );
  }

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

  const removeAlergia = (a: string) => setAlergias((prev) => prev.filter((x) => x !== a));

  const addMedicamento = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !medicamentos.includes(trimmed)) {
      setMedicamentos((prev) => [...prev, trimmed]);
    }
    setMedicamentoInput('');
  };

  const handleMedicamentoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addMedicamento(medicamentoInput);
    } else if (e.key === 'Backspace' && medicamentoInput === '' && medicamentos.length > 0) {
      setMedicamentos((prev) => prev.slice(0, -1));
    }
  };

  const removeMedicamento = (m: string) => setMedicamentos((prev) => prev.filter((x) => x !== m));

  const handleSave = () => {
    if (!nome.trim()) {
      setNomeError(true);
      return;
    }
    setNomeError(false);

    const updates = {
      nome: nome.trim(),
      idade: idade ? Number(idade) : undefined,
      peso: peso ? Number(peso) : undefined,
      altura: altura ? Number(altura) : undefined,
      sexo: sexo || undefined,
      alergias: alergias.length > 0 ? alergias : undefined,
      medicamentosEmUso: medicamentos.length > 0 ? medicamentos : undefined,
      fichaPreAnestesica: fichaPreAnestesica.trim() || undefined,
      cirurgiaPlaneada: cirurgiaPlaneada.trim() || undefined,
    };

    updateCurrentPatient(updates);

    // Sync demographics to session store
    setPacienteContext({
      peso: updates.peso,
      altura: updates.altura,
      idade: updates.idade,
      sexo: updates.sexo,
      alergias: updates.alergias,
      capturedAt: new Date().toISOString(),
    });

    navigate('/paciente');
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
            <UserPen className="w-4 h-4 text-violet-400" />
          </div>
          <h1 className="text-lg font-bold text-white">Editar Paciente</h1>
        </div>
      </div>

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
          {nomeError && <p className="text-xs text-rose-400 mt-1">Nome é obrigatório</p>}
        </div>

        {/* Idade + Sexo */}
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

        {/* Peso + Altura */}
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
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Altura (cm) <span className="text-zinc-600 normal-case tracking-normal">opcional</span>
            </label>
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
                <button type="button" onClick={(e) => { e.stopPropagation(); removeAlergia(a); }} className="hover:text-rose-100 transition-colors">
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

        {/* Medicamentos em uso */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Medicamentos em uso</label>
          <div
            onClick={() => medicamentoInputRef.current?.focus()}
            className="min-h-[42px] w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-white/10 focus-within:ring-1 focus-within:ring-violet-500/40 focus-within:border-violet-500/40 transition-colors flex flex-wrap gap-1.5 items-center cursor-text"
          >
            {medicamentos.map((m) => (
              <span key={m} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                {m}
                <button type="button" onClick={(e) => { e.stopPropagation(); removeMedicamento(m); }} className="hover:text-amber-100 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              ref={medicamentoInputRef}
              type="text"
              value={medicamentoInput}
              onChange={(e) => setMedicamentoInput(e.target.value)}
              onKeyDown={handleMedicamentoKeyDown}
              onBlur={() => { if (medicamentoInput.trim()) addMedicamento(medicamentoInput); }}
              placeholder={medicamentos.length === 0 ? 'Ex: Metformina, Losartana... (Enter ou vírgula)' : ''}
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
            placeholder="Comorbidades, histórico, observações relevantes..."
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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors active:scale-[0.98]"
      >
        <UserPen className="w-4 h-4" />
        Salvar alterações
      </button>
    </div>
  );
}
