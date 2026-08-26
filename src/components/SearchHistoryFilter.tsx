import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, History, X, Trash2, Tag, Flame, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SearchHistoryItem {
  term: string;
  count: number;
  lastUsed: number;
}

interface SearchHistoryFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  resultCount: number;
  totalCount: number;
  storageKey?: string;
  suggestedCategories?: string[];
  placeholder?: string;
}

const DEFAULT_STORAGE_KEY = 'financas_person_search_history';

export const SearchHistoryFilter: React.FC<SearchHistoryFilterProps> = ({
  searchTerm,
  onSearchChange,
  resultCount,
  totalCount,
  storageKey = DEFAULT_STORAGE_KEY,
  suggestedCategories = [],
  placeholder = 'Pesquisar movimentações por descrição, valor, categoria, destino...',
}) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore localStorage error
    }
    return [];
  });

  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with localStorage when history changes
  const saveHistoryToStorage = (newHistory: SearchHistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    } catch {
      // Ignore
    }
  };

  const addTermToHistory = (rawTerm: string) => {
    const term = rawTerm.trim();
    if (!term || term.length < 2) return;

    const normalizedNew = term.toLowerCase();
    const existingIndex = history.findIndex(
      item => item.term.toLowerCase() === normalizedNew
    );

    let updated: SearchHistoryItem[];
    if (existingIndex >= 0) {
      const existing = history[existingIndex];
      updated = [
        {
          term: existing.term, // Keep original casing
          count: existing.count + 1,
          lastUsed: Date.now(),
        },
        ...history.filter((_, idx) => idx !== existingIndex),
      ];
    } else {
      updated = [
        {
          term,
          count: 1,
          lastUsed: Date.now(),
        },
        ...history,
      ];
    }

    // Keep top 20 items
    saveHistoryToStorage(updated.slice(0, 20));
  };

  // Debounced auto-save term to history after user stops typing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchTerm.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        addTermToHistory(searchTerm);
      }, 1500);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTerm = (term: string) => {
    onSearchChange(term);
    addTermToHistory(term);
    setIsFocused(false);
  };

  const handleDeleteItem = (termToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(
      item => item.term.toLowerCase() !== termToDelete.toLowerCase()
    );
    saveHistoryToStorage(updated);
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveHistoryToStorage([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchTerm.trim()) {
        addTermToHistory(searchTerm);
      }
      setIsFocused(false);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  // Recent terms (sorted by last used, top 8)
  const recentTerms = useMemo(() => {
    return [...history]
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 8);
  }, [history]);

  // Frequent terms (sorted by count >= 2, top 6)
  const frequentTerms = useMemo(() => {
    return [...history]
      .filter(item => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [history]);

  // Filtered dropdown suggestions when typing
  const matchingHistory = useMemo(() => {
    if (!searchTerm.trim()) return recentTerms;
    const norm = searchTerm.toLowerCase();
    return history.filter(item => item.term.toLowerCase().includes(norm)).slice(0, 6);
  }, [history, searchTerm, recentTerms]);

  const quickFilterTags = useMemo(() => {
    const builtIn = ['Dividir', 'Entrada', 'Saída'];
    const cats = suggestedCategories.filter(c => !builtIn.includes(c)).slice(0, 5);
    return [...builtIn, ...cats];
  }, [suggestedCategories]);

  return (
    <div ref={containerRef} className="relative w-full space-y-2.5">
      {/* Search Input Box */}
      <div className="relative group">
        <Search
          className={cn(
            'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200',
            isFocused ? 'text-indigo-600' : 'text-gray-400'
          )}
          size={18}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-10 pr-24 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        />

        {/* Right side controls: Clear button and result pill */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/70 transition-all active:scale-95"
              title="Limpar pesquisa"
            >
              <X size={15} />
            </button>
          )}

          {searchTerm && (
            <span
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all whitespace-nowrap',
                resultCount > 0
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-rose-100 text-rose-700'
              )}
            >
              {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
        </div>
      </div>

      {/* Quick Search Chips Bar (Always visible below input when terms exist) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {recentTerms.length > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mr-1">
            <History size={13} className="text-indigo-500" />
            <span>Recentes:</span>
          </div>
        )}

        {recentTerms.slice(0, 5).map((item) => {
          const isActive = searchTerm.trim().toLowerCase() === item.term.toLowerCase();
          return (
            <div
              key={item.term}
              onClick={() => handleSelectTerm(item.term)}
              className={cn(
                'group/chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none active:scale-95',
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-indigo-50/70 hover:border-indigo-300 hover:text-indigo-700 shadow-xs'
              )}
              title={`Pesquisar por "${item.term}" (usado ${item.count}x)`}
            >
              <span>{item.term}</span>
              <button
                type="button"
                onClick={(e) => handleDeleteItem(item.term, e)}
                className={cn(
                  'p-0.5 rounded-md transition-colors opacity-60 hover:opacity-100',
                  isActive
                    ? 'hover:bg-indigo-700 text-white'
                    : 'hover:bg-gray-200 text-gray-400 hover:text-rose-600'
                )}
                title="Remover do histórico"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}

        {recentTerms.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="text-[11px] text-gray-400 hover:text-rose-600 hover:underline px-1.5 py-0.5 transition-colors flex items-center gap-1 ml-auto"
            title="Limpar todo o histórico de pesquisa"
          >
            <Trash2 size={11} />
            <span>Limpar histórico</span>
          </button>
        )}
      </div>

      {/* Suggested Quick Filter Pills (Categories & Types) */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">
          <Tag size={12} className="text-gray-400" />
          <span>Filtros rápidos:</span>
        </div>
        {quickFilterTags.map((tag) => {
          const isActive = searchTerm.trim().toLowerCase() === tag.toLowerCase();
          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleSelectTerm(isActive ? '' : tag)}
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all active:scale-95',
                isActive
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'bg-gray-100/80 border-transparent text-gray-600 hover:bg-gray-200/80 hover:text-gray-800'
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Interactive Dropdown for Extended History & Suggestions (Shows when search is focused) */}
      {isFocused && (
        <div className="absolute left-0 right-0 top-12 z-30 rounded-xl border border-gray-200 bg-white p-3 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Matching / Recent Searches */}
          {matchingHistory.length > 0 ? (
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <History size={14} className="text-indigo-500" />
                  <span>{searchTerm ? 'Termos no Histórico' : 'Pesquisas Recentes'}</span>
                </div>
                {!searchTerm && history.length > 0 && (
                  <button
                    type="button"
                    onMouseDown={(e) => handleClearHistory(e)}
                    className="text-[11px] text-gray-400 hover:text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 size={11} />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {matchingHistory.map((item) => (
                  <div
                    key={item.term}
                    onMouseDown={() => handleSelectTerm(item.term)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-indigo-50/80 text-xs text-gray-700 hover:text-indigo-900 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <History size={12} className="text-gray-400 group-hover:text-indigo-500 shrink-0" />
                      <span className="truncate font-medium">{item.term}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.count > 1 && (
                        <span className="text-[10px] bg-gray-100 group-hover:bg-indigo-100 text-gray-500 group-hover:text-indigo-600 px-1.5 py-0.2 rounded-full">
                          {item.count}x
                        </span>
                      )}
                      <button
                        type="button"
                        onMouseDown={(e) => handleDeleteItem(item.term, e)}
                        className="p-1 text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                        title="Remover"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-gray-400">
              Digite para pesquisar movimentações ou pressione Enter para salvar a busca.
            </div>
          )}

          {/* Frequent Terms if available and not currently searching specific text */}
          {!searchTerm && frequentTerms.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 pb-1.5 mb-1.5 border-b border-gray-100">
                <Flame size={14} />
                <span>Mais Pesquisados</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {frequentTerms.map((item) => (
                  <button
                    key={item.term}
                    type="button"
                    onMouseDown={() => handleSelectTerm(item.term)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium border border-amber-200 transition-all"
                  >
                    <span>{item.term}</span>
                    <span className="text-[10px] bg-amber-200/60 text-amber-900 px-1 py-0.2 rounded-full">
                      {item.count}x
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick tips */}
          <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Sparkles size={11} className="text-indigo-400" />
              Dica: Pesquise por descrição, categoria, destino, valor ou mês
            </span>
            <span>{totalCount} movimentações totais</span>
          </div>
        </div>
      )}
    </div>
  );
};
