import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import {
  Heart, Droplets, Wind, Bone, Ear, Brain,
  CircleDot, Eye, Sparkles, GitBranch,
  Search, ChevronDown, ChevronUp, ArrowLeft,
  Send, Loader2, Copy, Check, X,
} from 'lucide-react';
import { BANCO_CIRURGIAS, ESPECIALIDADES, GuiaCirurgico, Especialidade } from '../constants/cirurgias';
import { consultarCirurgia } from '../lib/services/clinicalAiService';

// ── Specialty icons ─────────────────────────────────────────
const SPECIALTY_ICONS: Record<Especialidade, React.FC<{ className?: string }>> = {
  'Cirurgia Cardíaca': ({ className }) => <Heart className={className} />,
  'Urologia': ({ className }) => <Droplets className={className} />,
  'Cirurgia Torácica': ({ className }) => <Wind className={className} />,
  'Ortopedia': ({ className }) => <Bone className={className} />,
  'Otorrinolaringologia': ({ className }) => <Ear className={className} />,
  'Neurocirurgia': ({ className }) => <Brain className={className} />,
  'Ginecologia': ({ className }) => <CircleDot className={className} />,
  'Oftalmologia': ({ className }) => <Eye className={className} />,
  'Cirurgia Plástica': ({ className }) => <Sparkles className={className} />,
  'Cirurgia Vascular': ({ className }) => <GitBranch className={className} />,
};

// ── Section item ─────────────────────────────────────────────
interface SectionProps {
  label: string;
  content: string;
  icon: string;
  defaultOpen?: boolean;
}

function Section({ label, content, icon, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <span>{icon}</span>
          {label}
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm text-zinc-300 leading-relaxed">
              {content}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Ficha card ────────────────────────────────────────────────
interface FichaProps {
  cirurgia: GuiaCirurgico;
  onClose: () => void;
}

function FichaCirurgica({ cirurgia, onClose }: FichaProps) {
  const [pergunta, setPergunta] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAsk = async () => {
    if (!pergunta.trim() || loading) return;
    setLoading(true);
    setAiError(null);
    try {
      const resp = await consultarCirurgia(cirurgia, pergunta.trim());
      setAiResponse(resp);
    } catch (e) {
      setAiError('Falha na consulta à IA. Verifique a chave de API.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!aiResponse) return;
    await navigator.clipboard.writeText(aiResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAsk();
  };

  const Icon = SPECIALTY_ICONS[cirurgia.especialidade as Especialidade];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      className="glass-panel rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/8">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
            {Icon && <Icon className="w-4.5 h-4.5 text-white" />}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">
              {cirurgia.especialidade}
            </p>
            <h2 className="text-base font-semibold text-white leading-snug">
              {cirurgia.nome}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sections */}
      <div>
        <Section icon="⏱" label="Tempos Cirúrgicos" content={cirurgia.tempos} defaultOpen />
        <Section icon="🔬" label="Técnica e Fundamentação" content={cirurgia.tecnica} />
        <Section icon="⚠️" label="Desafios e Problemas" content={cirurgia.problemas} />
        <Section icon="💊" label="Manejo e Correção" content={cirurgia.correcoes} />
        <Section icon="🏥" label="Pós-Operatório e Analgesia" content={cirurgia.posOp} />
        <Section icon="📚" label="Referências" content={cirurgia.referencias} />
      </div>

      {/* AI Consul */}
      <div className="px-4 py-4 border-t border-white/5 space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">Perguntar à IA</p>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={pergunta}
            onChange={e => setPergunta(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Como manejar vasoplegia pós-CEC? Qual dose de Protamina?"
            rows={2}
            className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-white/20 transition-colors"
          />
          <button
            onClick={handleAsk}
            disabled={!pergunta.trim() || loading}
            className="absolute right-2 bottom-2 w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600">Ctrl+Enter para enviar</p>

        <AnimatePresence>
          {aiError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2"
            >
              {aiError}
            </motion.p>
          )}
          {aiResponse && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-white/4 border border-white/8 overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Resposta IA</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {copied
                    ? <><Check className="w-3 h-3 text-emerald-400" /> Copiado</>
                    : <><Copy className="w-3 h-3" /> Copiar</>}
                </button>
              </div>
              <div className="px-3 py-3 prose prose-sm prose-invert max-w-none text-zinc-300 text-sm leading-relaxed">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Surgery list row ──────────────────────────────────────────
interface SurgeryRowProps {
  cirurgia: GuiaCirurgico;
  selected: boolean;
  onSelect: () => void;
}

function SurgeryRow({ cirurgia, selected, onSelect }: SurgeryRowProps) {
  return (
    <motion.button
      layout
      onClick={onSelect}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-left transition-all ${
        selected
          ? 'bg-white/10 border border-white/15'
          : 'bg-white/3 border border-white/5 hover:bg-white/6 hover:border-white/10'
      }`}
    >
      <span className="text-sm text-zinc-100 leading-snug">{cirurgia.nome}</span>
      <ChevronDown
        className={`w-4 h-4 shrink-0 transition-transform text-zinc-500 ${selected ? 'rotate-180' : ''}`}
      />
    </motion.button>
  );
}

// ── Specialty grid card ───────────────────────────────────────
interface SpecialtyCardProps {
  name: Especialidade;
  count: number;
  active: boolean;
  onSelect: () => void;
}

function SpecialtyCard({ name, count, active, onSelect }: SpecialtyCardProps) {
  const Icon = SPECIALTY_ICONS[name];
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border text-center transition-all ${
        active
          ? 'bg-white text-black border-transparent'
          : 'glass-panel border-white/8 text-zinc-300 hover:border-white/15 hover:bg-white/5'
      }`}
    >
      {Icon && (
        <Icon className={`w-6 h-6 ${active ? 'text-black' : 'text-zinc-300'}`} />
      )}
      <span className={`text-xs font-medium leading-tight ${active ? 'text-black' : 'text-zinc-300'}`}>
        {name}
      </span>
      <span className={`text-[10px] ${active ? 'text-zinc-700' : 'text-zinc-600'}`}>
        {count} cirurgia{count !== 1 ? 's' : ''}
      </span>
    </motion.button>
  );
}

// ── Main page ─────────────────────────────────────────────────
export function Cirurgias() {
  const [search, setSearch] = useState('');
  const [selectedEsp, setSelectedEsp] = useState<Especialidade | null>(null);
  const [selectedCirurgia, setSelectedCirurgia] = useState<GuiaCirurgico | null>(null);
  const fichaRef = useRef<HTMLDivElement>(null);

  // Count per specialty
  const countByEsp = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of BANCO_CIRURGIAS) {
      map[c.especialidade] = (map[c.especialidade] ?? 0) + 1;
    }
    return map;
  }, []);

  // Filtered surgeries
  const filteredCirurgias = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q && !selectedEsp) return [];
    return BANCO_CIRURGIAS.filter(c => {
      const matchEsp = !selectedEsp || c.especialidade === selectedEsp;
      if (!q) return matchEsp;
      const haystack = [c.nome, c.especialidade, c.problemas, c.correcoes, c.tecnica]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q) && matchEsp;
    });
  }, [search, selectedEsp]);

  // Search across all specialties
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return BANCO_CIRURGIAS.filter(c => {
      const haystack = [c.nome, c.especialidade, c.problemas, c.correcoes, c.tecnica]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search]);

  const displayList = search.trim() ? searchResults : filteredCirurgias;

  const handleSelectEsp = (esp: Especialidade) => {
    setSelectedEsp(prev => (prev === esp ? null : esp));
    setSelectedCirurgia(null);
    setSearch('');
  };

  const handleSelectCirurgia = (c: GuiaCirurgico) => {
    setSelectedCirurgia(prev => (prev?.nome === c.nome ? null : c));
  };

  // Scroll to ficha when it opens
  useEffect(() => {
    if (selectedCirurgia && fichaRef.current) {
      setTimeout(() => {
        fichaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedCirurgia]);

  return (
    <div className="px-4 pt-2 pb-8 space-y-6 max-w-2xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Guia Cirúrgico</h1>
        <p className="text-sm text-zinc-500 mt-1">Escolha a especialidade e a cirurgia</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            if (e.target.value.trim()) setSelectedCirurgia(null);
          }}
          placeholder="Buscar cirurgia ou problema... (ex: vasoplegia)"
          className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Specialty grid — hide when searching */}
      <AnimatePresence>
        {!search.trim() && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Especialidade</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ESPECIALIDADES.map(esp => (
                <SpecialtyCard
                  key={esp}
                  name={esp}
                  count={countByEsp[esp] ?? 0}
                  active={selectedEsp === esp}
                  onSelect={() => handleSelectEsp(esp)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surgery list */}
      <AnimatePresence mode="wait">
        {displayList.length > 0 && (
          <motion.div
            key={search + (selectedEsp ?? '')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Back button when specialty is selected */}
            {selectedEsp && !search.trim() && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedEsp(null); setSelectedCirurgia(null); }}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>
                <span className="text-xs text-zinc-600">·</span>
                <span className="text-xs text-zinc-400 font-medium">{selectedEsp}</span>
                <span className="text-xs text-zinc-600">({displayList.length})</span>
              </div>
            )}
            {search.trim() && (
              <p className="text-xs text-zinc-500">
                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "{search}"
              </p>
            )}

            <div className="space-y-2">
              {displayList.map(c => (
                <div key={c.nome}>
                  <SurgeryRow
                    cirurgia={c}
                    selected={selectedCirurgia?.nome === c.nome}
                    onSelect={() => handleSelectCirurgia(c)}
                  />
                  <AnimatePresence>
                    {selectedCirurgia?.nome === c.nome && (
                      <motion.div
                        key="ficha"
                        ref={fichaRef}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 overflow-hidden"
                      >
                        <FichaCirurgica
                          cirurgia={selectedCirurgia}
                          onClose={() => setSelectedCirurgia(null)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {search.trim() && searchResults.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-zinc-600"
        >
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma cirurgia encontrada para "{search}"</p>
        </motion.div>
      )}

      {/* Initial prompt */}
      {!search.trim() && !selectedEsp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-zinc-600"
        >
          <p className="text-sm">Selecione uma especialidade acima</p>
          <p className="text-xs mt-1">ou use a busca para encontrar qualquer cirurgia</p>
        </motion.div>
      )}
    </div>
  );
}
