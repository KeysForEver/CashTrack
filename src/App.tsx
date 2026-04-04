import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Filter, Users, DollarSign, CreditCard, Tag, TrendingUp, ChevronDown, ChevronUp, ClipboardCheck, Trash2, Download, Upload, RotateCcw, Layers, Loader2, PieChart as PieChartIcon, BarChart as BarChartIcon, Check, X, Search, Pencil, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Sector, Legend
} from 'recharts';
import { 
  format, parseISO, getMonth, getYear, startOfMonth, endOfMonth, eachDayOfInterval,
  differenceInDays, eachMonthOfInterval, eachYearOfInterval, isSameMonth, isSameYear,
  startOfDay, endOfDay, isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Pessoa, Categoria, Despesa, Salario, PALETTES } from './types';
import { copyToClipboard as copyToClipboardUtil } from './utils/clipboard';
import { Modal } from './components/Modal';
import { ErrorModal } from './components/ErrorModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ExportModal, ExportOptions } from './components/ExportModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <text 
        x={cx} 
        y={cy} 
        textAnchor="middle" 
        dominantBaseline="central"
      >
        <tspan x={cx} dy="-1.2em" fontSize={12} fill="#6b7280" fontWeight="500">{payload.name}</tspan>
        <tspan x={cx} dy="1.2em" fontSize={18} fill="#111827" fontWeight="700">{formatCurrency(value)}</tspan>
        <tspan x={cx} dy="1.2em" fontSize={12} fill="#6b7280" fontWeight="500">{(percent * 100).toFixed(0)}%</tspan>
      </text>
    </g>
  );
};

const SidebarButton = ({ onClick, icon, label, color, hoverBg }: any) => (
  <button 
    type="button"
    onClick={onClick} 
    className={cn(
      "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all active:scale-[0.98] hover:shadow-sm hover:scale-[1.01]",
      color,
      hoverBg
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default function App() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const sortedCategorias = useMemo(() => {
    return [...categorias].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [categorias]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [salarios, setSalarios] = useState<Salario[]>([]);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<number>(-1);
  const [filterYear, setFilterYear] = useState<number>(-1);

  const [isPessoaModalOpen, setIsPessoaModalOpen] = useState(false);
  const [isDespesaModalOpen, setIsDespesaModalOpen] = useState(false);
  const [isSalarioModalOpen, setIsSalarioModalOpen] = useState(false);
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<{ id: number; nome: string } | null>(null);
  const [isDeleteCategoriaModalOpen, setIsDeleteCategoriaModalOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<any>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [activePieIndex, setActivePieIndex] = useState(0);
  const [activeChart, setActiveChart] = useState<'bar' | 'pie'>('bar');
  const [chartPersonFilter, setChartPersonFilter] = useState<number | -1>(-1);

  const [isPersonDetailModalOpen, setIsPersonDetailModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isDeletePessoaModalOpen, setIsDeletePessoaModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Pessoa | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [importSource, setImportSource] = useState<'extrato' | 'cartao'>('extrato');
  const [globalPaymentDate, setGlobalPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [editingRecord, setEditingRecord] = useState<{ id: string; type: 'Entrada' | 'Saída'; value: string } | null>(null);
  const [editingRecordCategory, setEditingRecordCategory] = useState<{ id: string; categoryId: number } | null>(null);
  const [personSearchTerm, setPersonSearchTerm] = useState('');

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const PROMPT_CONTA_CORRENTE = `**Tarefa:**
Extraia do PDF anexado todas as movimentações da conta corrente (entradas e saídas) e gere um arquivo CSV com as colunas:
\`Data;Descrição;Categoria;Valor;Tipo\`

**Regras de inclusão/exclusão:**
- **Inclua** todas as movimentações reais (entradas/créditos e saídas/débitos).
- **Inclua** rendimentos de aplicações automáticas (ex.: "Rend Pago Aplic Aut Mais").
- **Inclua** estornos, IOF, encargos e tarifas.
- **Ignore** linhas de saldo anterior, saldo final, totais agregados.
- **Ignore** lançamentos internos de aplicação/resgate automático:
  - "Apl Aplic Aut Mais"
  - "Res Aplic Aut Mais"
  - "SALDO APLIC AUT MAIS"

**Formatação:**
- O campo **Valor** deve estar em formato decimal **sem separador de milhar**.
  - Exemplo correto: \`1250,00\`
  - Exemplo incorreto: \`1.250,00\`
- Use **vírgula** para separar decimais (ex.: \`57,02\`).
- Use **ponto e vírgula (;)** como separador de colunas.
- Ordene todas as linhas em ordem crescente pela **Data**.
- A coluna **Tipo** deve indicar \`ENTRADA\` ou \`SAÍDA\`.

**Regras de categorização (coluna "Categoria"):**
- "IOF", "JUROS LIMITE DA CONTA", "Seguro LIS" → **Taxa Banco**
- "PRE-PAGO" → **Pré Pago CLARO/VIVO**
- "Skymidi" → **Entrada Wallace**
- "Cemig", "CONSORCIO" → **Conta Luz**
- "ITAU MULTIPL" → **Cartão de Crédito**
- "Liberio" → **Aluguel**
- "Janis" → **Acerto Janis**
- "UBER" → **Transporte**
- "IFOOD", "IFD" → **Alimentação**
- "SuperNosso", "MOMENTO SUPE" → **Alimentação**
- "Food to Save" → **Alimentação**
- "Amazon" → **Amazon**
- "Blizzard", "Battle.net" → **Lazer**
- "Rend", "Rendimento" → **Rendimentos**
- Caso contrário → **Outros**

**Regras de data:**
- O ano do extrato é definido pelo cabeçalho do PDF.
- Movimentações com mês igual ao do extrato → usar ano do extrato.
- Movimentações com mês anterior → usar ano anterior.

**Validação final:**
- Compare a soma das entradas e saídas com os totais informados no PDF.
- Se bater → informe **"Validação OK"**.
- Se houver diferença → informe **"Validação FALHOU"** e mostre a diferença.

### Exemplo de saída esperada:

\`\`\`
05/01/2026;IOF;Taxa Banco;17,56;Saída
05/01/2026;Int PRE-PAGOXXXXX 1990;Pré Pago CLARO/VIVO;25,00;Saída
05/01/2026;PIX TRANSF SKYMIDI05/01;Entrada Wallace;62,50;Entrada
06/01/2026;ELCSS-MOMENTO SUP-06/01;Alimentação;171,71;Saída
07/01/2026;PIX TRANSF SKYMIDI07/01;Entrada Wallace;1250,00;Entrada
08/01/2026;Fatura Paga ITAU MULTIPL;Cartão de Crédito;915,40;Saída
08/01/2026;Rend Pago Aplic Aut Mais;Rendimentos;0,01;Entrada
09/01/2026;PIX TRANSF SKYMIDI09/01;Entrada Wallace;950,00;Entrada
12/01/2026;PIX QRS CEMIG DISTR12/01;Conta Luz;81,58;Saída
21/01/2026;PIX TRANSF LIBERIO21/01;Aluguel;1343,00;Saída
27/01/2026;PIX TRANSF Janis L27/01;Acerto Janis;115,80;Saída
28/01/2026;Battle.net Blizzard;Lazer;229,03;Saída
\`\`\``;

  const PROMPT_CARTAO_CREDITO = `**Tarefa:**
Extraia do PDF anexado todos os lançamentos de compras e saques do cartão de crédito.

**Formato da saída:**
CSV com colunas:
\`Data;Descrição;Categoria;Valor;Saída\`

**Regras de extração:**
- Inclua todos os lançamentos válidos: compras, saques, internacionais, encargos e IOF.
- Não descarte estornos: registre-os com valor negativo.
- Ignore apenas linhas de totais por cartão e resumos.
- O campo **Valor** deve estar em formato decimal com vírgula (ex: \`57,02\`).
- Use ponto e vírgula (\`;\`) como separador de colunas.
- Ordene os lançamentos em ordem crescente pela **Data**.
- A última coluna **Saída** deve sempre conter o texto fixo \`Saída\`.

**Regras de categorização (coluna "Categoria"):**
- Contém "UBER" → Transporte
- Contém "IFOOD" ou "IFD" → Alimentação
- Contém "SuperNosso" ou "MOMENTO SUPE" → Alimentação
- Contém "Food to Save" → Alimentação
- Contém "Amazon" → Amazon
- Contém "Blizzard" ou "Battle.net" → Lazer
- Contém "IOF" ou "Encargos" → Taxa Banco
- Caso contrário → Outros

**Regras de data:**
- O ano da fatura é definido pelo cabeçalho do PDF.
- Lançamentos with mês igual ao da fatura → ano da fatura.
- Lançamentos with mês anterior ao da fatura → ano anterior.

**Validação final:**
- Compare a soma dos valores extraídos com o campo "Total dos lançamentos atuais" do PDF.
- Se a soma coincidir → informe \`Validação OK\`.
- Se houver diferença → informe \`Validação FALHOU\` e mostre a diferença.

### Exemplo de saída esperada:
\`\`\`
20/11/2025;SuperNosso *EmCas02/02 ALIMENTAÇÃO .CONTAGEM;Alimentação;42,45;Saída
06/12/2025;IFD*LN COMERCIO DE ALIM ALIMENTAÇÃO .BELO HORIZONT;Alimentação;36,89;Saída
06/12/2025;AMAZON BR EDUCAÇÃO .SAO PAULO;Amazon;23,51;Saída
07/12/2025;UBER *TRIP HELP.UBER.CO VEÍCULOS .SAO PAULO;Transporte;30,82;Saída
25/12/2025;EBN *Battle Net INTERNACIONAL .SAO PAULO;Internacional;174,90;Saída
28/12/2025;Battle.net Blizzard INTERNACIONAL .SAO PAULO;Internacional;229,03;Saída
28/12/2025;IOF INTERNACIONAL .SAO PAULO;Taxa Banco;8,00;Saída
02/01/2026;Food to Save .BELO HORIZONT;Alimentação;19,90;Saída
\`\`\``;

  const copyToClipboard = async (text: string, message: string) => {
    const success = await copyToClipboardUtil(text);
    if (success) {
      setToast(message);
      setTimeout(() => setToast(null), 3000);
    } else {
      setError('Não foi possível copiar o texto automaticamente. Por favor, tente selecionar e copiar manualmente.');
    }
  };

  // Form states
  const [newPessoa, setNewPessoa] = useState({ nome: '', cor: '' });
  const [newDespesa, setNewDespesa] = useState({ 
    data_compra: format(new Date(), 'yyyy-MM-dd'), 
    data_pagamento: format(new Date(), 'yyyy-MM-dd'), 
    valor: '', 
    descricao: '', 
    origem_id: '', 
    destino: 'Dividir', 
    categoria_id: '' 
  });
  const [newSalario, setNewSalario] = useState({ 
    data_pagamento: format(new Date(), 'yyyy-MM-dd'), 
    valor: '', 
    descricao: '', 
    recebedor_id: '' 
  });
  const [newCategoria, setNewCategoria] = useState({ nome: '' });
  const [importPessoaId, setImportPessoaId] = useState('');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logSort, setLogSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [reviewSearchTerm, setReviewSearchTerm] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setLoadingMessage('Carregando dados...');
    try {
      const t = Date.now();
      const [p, c, d, s] = await Promise.all([
        fetch(`/api/pessoas?t=${t}`).then(res => res.json()),
        fetch(`/api/categorias?t=${t}`).then(res => res.json()),
        fetch(`/api/despesas?t=${t}`).then(res => res.json()),
        fetch(`/api/salarios?t=${t}`).then(res => res.json()),
      ]);
      setPessoas(p);
      setCategorias(c);
      setDespesas(d);
      setSalarios(s);
      const logs = await fetch(`/api/logs?t=${t}`).then(res => res.json());
      setAuditLogs(logs);
    } catch (err) {
      console.error('Erro no fetchData:', err);
      setError('Erro ao carregar dados do servidor. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      setError(`Erro inesperado: ${event.message}`);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      setError(`Erro de rede ou servidor: ${event.reason}`);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    fetchData();

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateCategory = async (id: string, newCategoryId: number) => {
    setIsLoading(true);
    try {
      const despesaId = id.split('-')[1];
      const res = await fetch(`/api/despesas/${despesaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria_id: newCategoryId })
      });
      if (!res.ok) throw new Error('Erro ao atualizar categoria');
      
      setToast('Categoria atualizada com sucesso!');
      setEditingRecordCategory(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar categoria');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateValue = async () => {
    if (!editingRecord) return;
    
    const valorNum = parseFloat(editingRecord.value);
    if (isNaN(valorNum)) {
      setError('Por favor, insira um valor numérico válido.');
      return;
    }

    setIsLoading(true);
    try {
      const id = editingRecord.id.split('-')[1];
      const endpoint = editingRecord.type === 'Saída' ? `/api/despesas/${id}` : `/api/salarios/${id}`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: valorNum })
      });
      if (!res.ok) throw new Error('Erro ao atualizar valor');
      
      setToast('Valor atualizado com sucesso!');
      setEditingRecord(null);
      await fetchData();
    } catch (err) {
      setError('Erro ao atualizar valor. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string, type: 'Entrada' | 'Saída') => {
    if (!window.confirm('Tem certeza que deseja excluir este registro permanentemente?')) return;
    
    setIsLoading(true);
    try {
      const recordId = id.split('-')[1];
      const endpoint = type === 'Saída' ? `/api/despesas/${recordId}` : `/api/salarios/${recordId}`;
      const res = await fetch(endpoint, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Erro ao excluir registro');
      
      setToast('Registro excluído com sucesso!');
      await fetchData();
    } catch (err) {
      setError('Erro ao excluir registro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    despesas.forEach(d => {
      const date = parseISO(d.data_pagamento);
      if (!isNaN(date.getTime())) years.add(getYear(date));
    });
    salarios.forEach(s => {
      const date = parseISO(s.data_pagamento);
      if (!isNaN(date.getTime())) years.add(getYear(date));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [despesas, salarios]);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    const items = [
      ...despesas.map(d => ({ data: d.data_pagamento })),
      ...salarios.map(s => ({ data: s.data_pagamento }))
    ];
    items.forEach(item => {
      const date = parseISO(item.data);
      if (!isNaN(date.getTime())) {
        if (filterYear === -1 || getYear(date) === filterYear) {
          months.add(getMonth(date));
        }
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [despesas, salarios, filterYear]);

  const filteredDespesas = useMemo(() => {
    return despesas.filter(d => {
      const date = parseISO(d.data_pagamento);
      if (isNaN(date.getTime())) return true; // Keep invalid dates to show them
      const dateStr = d.data_pagamento;
      const m = getMonth(date);
      const y = getYear(date);

      const matchStart = !startDate || dateStr >= startDate;
      const matchEnd = !endDate || dateStr <= endDate;
      const matchMonth = filterMonth === -1 || m === filterMonth;
      const matchYear = filterYear === -1 || y === filterYear;

      return matchStart && matchEnd && matchMonth && matchYear;
    });
  }, [despesas, startDate, endDate, filterMonth, filterYear]);

  const filteredSalarios = useMemo(() => {
    return salarios.filter(s => {
      const date = parseISO(s.data_pagamento);
      if (isNaN(date.getTime())) return true;
      const dateStr = s.data_pagamento;
      const m = getMonth(date);
      const y = getYear(date);

      const matchStart = !startDate || dateStr >= startDate;
      const matchEnd = !endDate || dateStr <= endDate;
      const matchMonth = filterMonth === -1 || m === filterMonth;
      const matchYear = filterYear === -1 || y === filterYear;

      return matchStart && matchEnd && matchMonth && matchYear;
    });
  }, [salarios, startDate, endDate, filterMonth, filterYear]);

  const hasRecords = filteredDespesas.length > 0 || filteredSalarios.length > 0;

  const balances = useMemo(() => {
    if (pessoas.length === 0) return [];

    // Calculate net balance for each person
    // Balance = (What I paid for others) - (What others paid for me)
    const netBalancesMap = pessoas.reduce((acc, p) => {
      acc[p.id] = 0;
      return acc;
    }, {} as Record<number, number>);

    filteredDespesas.forEach(d => {
      if (d.destino === 'Dividir') {
        const share = d.valor / pessoas.length;
        pessoas.forEach(p => {
          if (p.id === d.origem_id) {
            netBalancesMap[p.id] += (d.valor - share);
          } else {
            netBalancesMap[p.id] -= share;
          }
        });
      } else {
        const destId = parseInt(d.destino);
        if (!isNaN(destId)) {
          // Origem paid for Destino
          if (netBalancesMap[d.origem_id] !== undefined) {
            netBalancesMap[d.origem_id] += d.valor;
          }
          if (netBalancesMap[destId] !== undefined) {
            netBalancesMap[destId] -= d.valor;
          }
        }
      }
    });

    const netBalances = pessoas.map(p => ({
      id: p.id,
      nome: p.nome,
      balance: netBalancesMap[p.id]
    }));

    // Calculate adjustments
    const debtors = netBalances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = netBalances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

    const adjustments: string[] = [];
    const tempDebtors = debtors.map(d => ({ ...d, balance: Math.abs(d.balance) }));
    const tempCreditors = creditors.map(c => ({ ...c }));

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < tempDebtors.length && cIdx < tempCreditors.length) {
      const debtor = tempDebtors[dIdx];
      const creditor = tempCreditors[cIdx];
      const amount = Math.min(debtor.balance, creditor.balance);

      if (amount > 0.01) {
        adjustments.push(`${debtor.nome} paga ${formatCurrency(amount)} para ${creditor.nome}`);
      }

      debtor.balance -= amount;
      creditor.balance -= amount;

      if (debtor.balance < 0.01) dIdx++;
      if (creditor.balance < 0.01) cIdx++;
    }

    return adjustments;
  }, [pessoas, filteredDespesas]);

  const personStats = useMemo(() => {
    return pessoas.map(p => {
      const totalSpent = filteredDespesas
        .filter(d => d.origem_id === p.id)
        .reduce((sum, d) => sum + d.valor, 0);
      
      const totalSalary = filteredSalarios
        .filter(s => s.recebedor_id === p.id)
        .reduce((sum, s) => sum + s.valor, 0);

      return { ...p, totalSpent, totalSalary };
    });
  }, [pessoas, filteredDespesas, filteredSalarios]);

  const selectedPersonDetails = useMemo(() => {
    if (selectedPersonId === null) return null;
    const person = pessoas.find(p => p.id === selectedPersonId);
    if (!person) return null;

    const pDespesas = filteredDespesas.filter(d => d.origem_id === selectedPersonId);
    const pSalarios = filteredSalarios.filter(s => s.recebedor_id === selectedPersonId);

    let movements = [
      ...pDespesas.map(d => {
        const dateObj = parseISO(d.data_pagamento);
        const isValidDate = !isNaN(dateObj.getTime());
        return { 
          ...d, 
          id: `despesa-${d.id}`,
          tipo: 'Saída', 
          displayData: d.data_pagamento,
          data_compra: d.data_compra || d.data_pagamento,
          formattedDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : d.data_pagamento,
          formattedCompraDate: d.data_compra ? format(parseISO(d.data_compra), 'dd/MM/yyyy') : (isValidDate ? format(dateObj, 'dd/MM/yyyy') : d.data_pagamento),
          monthName: isValidDate ? format(dateObj, 'MMMM', { locale: ptBR }) : '',
          monthNameShort: isValidDate ? format(dateObj, 'MMM', { locale: ptBR }) : ''
        };
      }),
      ...pSalarios.map(s => {
        const dateObj = parseISO(s.data_pagamento);
        const isValidDate = !isNaN(dateObj.getTime());
        return { 
          ...s, 
          id: `salario-${s.id}`,
          tipo: 'Entrada', 
          displayData: s.data_pagamento,
          data_compra: s.data_pagamento,
          formattedDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : s.data_pagamento,
          formattedCompraDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : s.data_pagamento,
          monthName: isValidDate ? format(dateObj, 'MMMM', { locale: ptBR }) : '',
          monthNameShort: isValidDate ? format(dateObj, 'MMM', { locale: ptBR }) : ''
        };
      })
    ].sort((a, b) => b.displayData.localeCompare(a.displayData));

    if (personSearchTerm) {
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const term = normalize(personSearchTerm).trim();
      const numericTerm = term.replace(',', '.');

      movements = movements.filter(m => {
        const valorStr = m.valor.toString();
        const valorFixed = m.valor.toFixed(2);
        const valorFormatted = formatCurrency(m.valor).toLowerCase();

        // Resolve destino name for filtering
        let destinoName = '-';
        if (m.tipo === 'Saída') {
          if (m.destino === 'Dividir' || m.destino === 'Dividido') {
            destinoName = 'Dividir';
          } else {
            const p = pessoas.find(p => p.id === Number(m.destino));
            destinoName = p ? p.nome : (m.destino || '-');
          }
        }

        return normalize(m.descricao).includes(term) ||
          (m.categoria_nome && normalize(m.categoria_nome).includes(term)) ||
          normalize(destinoName).includes(term) ||
          valorStr.includes(term) ||
          valorStr.includes(numericTerm) ||
          valorFixed.includes(term) ||
          valorFixed.includes(numericTerm) ||
          valorFixed.replace('.', ',').includes(term) ||
          valorFormatted.includes(term) ||
          m.formattedDate.includes(term) ||
          (m.data_compra && m.data_compra.includes(term)) ||
          (m.formattedCompraDate && m.formattedCompraDate.includes(term)) ||
          normalize(m.tipo).includes(term) ||
          normalize(m.monthName).includes(term) ||
          normalize(m.monthNameShort).includes(term);
      });
    }

    const totalSpent = pDespesas.reduce((sum, d) => sum + d.valor, 0);
    const exclusiveSpent = pDespesas.filter(d => d.destino !== 'Dividir').reduce((sum, d) => sum + d.valor, 0);
    const sharedSpent = pDespesas.filter(d => d.destino === 'Dividir').reduce((sum, d) => sum + d.valor, 0);
    const totalSalary = pSalarios.reduce((sum, s) => sum + s.valor, 0);

    return {
      person,
      movements,
      totalSpent,
      exclusiveSpent,
      sharedSpent,
      totalSalary,
      net: totalSalary - totalSpent
    };
  }, [selectedPersonId, pessoas, filteredDespesas, filteredSalarios, personSearchTerm]);

  const barChartData = useMemo(() => {
    const chartDespesas = chartPersonFilter === -1 
      ? filteredDespesas 
      : filteredDespesas.filter(d => d.origem_id === chartPersonFilter);
    
    const chartSalarios = chartPersonFilter === -1
      ? filteredSalarios
      : filteredSalarios.filter(s => s.recebedor_id === chartPersonFilter);

    const items = [
      ...chartDespesas.map(d => ({ ...d, data: d.data_pagamento })),
      ...chartSalarios.map(s => ({ ...s, data: s.data_pagamento }))
    ];
    if (items.length === 0) return [];

    // Determine the range
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = parseISO(startDate);
      end = parseISO(endDate);
    } else if (startDate) {
      start = parseISO(startDate);
      const dates = items.map(i => parseISO(i.data)).filter(d => !isNaN(d.getTime()));
      end = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
    } else if (endDate) {
      end = parseISO(endDate);
      const dates = items.map(i => parseISO(i.data)).filter(d => !isNaN(d.getTime()));
      start = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    } else {
      // If no range, find min/max from data
      const dates = items.map(i => parseISO(i.data)).filter(d => !isNaN(d.getTime()));
      if (dates.length === 0) return [];
      start = new Date(Math.min(...dates.map(d => d.getTime())));
      end = new Date(Math.max(...dates.map(d => d.getTime())));
    }

    // Ensure start is before end
    if (start > end) [start, end] = [end, start];

    const diffDays = differenceInDays(end, start);

    if (diffDays <= 62) {
      // Show days
      const days = eachDayOfInterval({ start, end });
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayDespesas = chartDespesas.filter(d => d.data_pagamento === dayStr);
        
        const data: any = { day: format(day, 'dd/MM') };
        pessoas.forEach(p => {
          data[p.nome] = dayDespesas
            .filter(d => d.origem_id === p.id && d.destino !== 'Dividir')
            .reduce((sum, d) => sum + d.valor, 0);
        });
        data['Dividir'] = dayDespesas
          .filter(d => d.destino === 'Dividir')
          .reduce((sum, d) => sum + d.valor, 0);
        
        return data;
      });
    } else if (diffDays <= 365 * 2) {
      // Show months
      const months = eachMonthOfInterval({ start, end });
      return months.map(month => {
        const monthDespesas = chartDespesas.filter(d => isSameMonth(parseISO(d.data_pagamento), month));
        const data: any = { day: format(month, 'MMM/yy', { locale: ptBR }) };
        pessoas.forEach(p => {
          data[p.nome] = monthDespesas
            .filter(d => d.origem_id === p.id && d.destino !== 'Dividir')
            .reduce((sum, d) => sum + d.valor, 0);
        });
        data['Dividir'] = monthDespesas
          .filter(d => d.destino === 'Dividir')
          .reduce((sum, d) => sum + d.valor, 0);
        return data;
      });
    } else {
      // Show years
      const years = eachYearOfInterval({ start, end });
      return years.map(year => {
        const yearDespesas = chartDespesas.filter(d => isSameYear(parseISO(d.data_pagamento), year));
        const data: any = { day: format(year, 'yyyy') };
        pessoas.forEach(p => {
          data[p.nome] = yearDespesas
            .filter(d => d.origem_id === p.id && d.destino !== 'Dividir')
            .reduce((sum, d) => sum + d.valor, 0);
        });
        data['Dividir'] = yearDespesas
          .filter(d => d.destino === 'Dividir')
          .reduce((sum, d) => sum + d.valor, 0);
        return data;
      });
    }
  }, [pessoas, filteredDespesas, filteredSalarios, startDate, endDate, chartPersonFilter]);

  const pieChartData = useMemo(() => {
    const chartDespesas = chartPersonFilter === -1 
      ? filteredDespesas 
      : filteredDespesas.filter(d => d.origem_id === chartPersonFilter);

    const catTotals = categorias.map(c => {
      const total = chartDespesas
        .filter(d => d.categoria_id === c.id)
        .reduce((sum, d) => sum + d.valor, 0);
      return { name: c.nome, value: total };
    }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

    return catTotals;
  }, [categorias, filteredDespesas, chartPersonFilter]);

  const allMovements = useMemo(() => {
    // Pre-index auditLogs for faster lookup of initial values
    const initialLogsMap = new Map();
    auditLogs.forEach(l => {
      if (l.descricao.includes('Lançamento inicial:')) {
        initialLogsMap.set(`${l.tipo}-${l.registro_id}`, l);
      }
    });

    // Helper to check if a date string matches current dashboard filters
    const matchesFilters = (dateStr: string) => {
      const dDate = parseISO(dateStr);
      if (isNaN(dDate.getTime())) return false;
      
      if (startDate && endDate) {
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        return isWithinInterval(dDate, { start, end });
      }
      
      const m = getMonth(dDate) + 1;
      const y = getYear(dDate).toString();
      return m === filterMonth && y === filterYear;
    };

    // 1. Current records from despesas and salarios (using raw despesas/salarios but applying same filtering logic)
    const mDespesas = despesas.filter(d => matchesFilters(d.data_pagamento)).map(d => {
      let destinoLabel = d.destino;
      if (d.destino !== 'Dividir') {
        const p = pessoas.find(p => Number(p.id) === Number(d.destino));
        destinoLabel = p ? p.nome : d.destino;
      }
      const dateObj = parseISO(d.data_pagamento);
      const isValidDate = !isNaN(dateObj.getTime());
      
      // Get initial value from logs if available
      const initialLog = initialLogsMap.get(`Despesa-${d.id}`);
      const initialValor = initialLog ? initialLog.valor_novo : d.valor;
      
      return {
        id: `d-${d.id}`,
        data: d.data_pagamento,
        data_compra: d.data_compra || d.data_pagamento,
        data_pagamento: d.data_pagamento,
        dateObj,
        isValidDate,
        formattedDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : d.data_pagamento,
        formattedCompraDate: d.data_compra ? format(parseISO(d.data_compra), 'dd/MM/yyyy') : (isValidDate ? format(dateObj, 'dd/MM/yyyy') : d.data_pagamento),
        month: isValidDate ? getMonth(dateObj) + 1 : 0,
        monthName: isValidDate ? format(dateObj, 'MMMM', { locale: ptBR }) : '',
        monthNameShort: isValidDate ? format(dateObj, 'MMM', { locale: ptBR }) : '',
        year: isValidDate ? getYear(dateObj).toString() : '',
        descricao: d.descricao || 'Despesa',
        categoria: d.categoria_nome || '-',
        valor: d.valor, 
        originalValor: initialValor,
        tipo: 'Saída',
        pessoa: d.origem_nome || '-',
        destino: destinoLabel,
        dbId: d.id,
        raw: d
      };
    });

    const mSalarios = salarios.filter(s => matchesFilters(s.data_pagamento)).map(s => {
      const dateObj = parseISO(s.data_pagamento);
      const isValidDate = !isNaN(dateObj.getTime());
      
      // Get initial value from logs if available
      const initialLog = initialLogsMap.get(`Entrada-${s.id}`);
      const initialValor = initialLog ? initialLog.valor_novo : s.valor;
      
      return {
        id: `s-${s.id}`,
        data: s.data_pagamento,
        data_compra: s.data_pagamento,
        data_pagamento: s.data_pagamento,
        dateObj,
        isValidDate,
        formattedDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : s.data_pagamento,
        formattedCompraDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : s.data_pagamento,
        month: isValidDate ? getMonth(dateObj) + 1 : 0,
        monthName: isValidDate ? format(dateObj, 'MMMM', { locale: ptBR }) : '',
        monthNameShort: isValidDate ? format(dateObj, 'MMM', { locale: ptBR }) : '',
        year: isValidDate ? getYear(dateObj).toString() : '',
        descricao: s.descricao || 'Entrada',
        categoria: 'Entrada',
        valor: s.valor, 
        originalValor: initialValor,
        tipo: 'Entrada',
        pessoa: '-',
        destino: s.recebedor_nome || '-',
        dbId: s.id,
        raw: s
      };
    });

    // 2. Deleted records from logs
    const currentDespesaIds = new Set(despesas.map(d => Number(d.id)));
    const currentSalarioIds = new Set(salarios.map(s => Number(s.id)));

    const deletedLogs = auditLogs.filter(l => {
      if (!l.descricao.includes('Lançamento inicial:')) return false;
      if (l.tipo === 'Despesa' && currentDespesaIds.has(Number(l.registro_id))) return false;
      if (l.tipo === 'Entrada' && currentSalarioIds.has(Number(l.registro_id))) return false;
      
      const dateStr = l.data_registro || l.timestamp.split('T')[0];
      return matchesFilters(dateStr);
    });

    const mDeleted = deletedLogs.map(l => {
      const dateStr = l.data_registro || l.timestamp.split('T')[0];
      const dateObj = parseISO(dateStr);
      const isValidDate = !isNaN(dateObj.getTime());
      
      let destinoLabel = l.destino || '-';
      if (l.tipo === 'Despesa' && l.destino && l.destino !== 'Dividir') {
        const p = pessoas.find(p => Number(p.id) === Number(l.destino));
        if (p) destinoLabel = p.nome;
      }

      const cleanDesc = l.descricao.split('Lançamento inicial: ')[1] || l.descricao;

      return {
        id: `${l.tipo === 'Despesa' ? 'd' : 's'}-${l.registro_id}`,
        data: dateStr,
        data_compra: dateStr,
        data_pagamento: dateStr,
        dateObj,
        isValidDate,
        formattedDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : dateStr,
        formattedCompraDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : dateStr,
        month: isValidDate ? getMonth(dateObj) + 1 : 0,
        monthName: isValidDate ? format(dateObj, 'MMMM', { locale: ptBR }) : '',
        monthNameShort: isValidDate ? format(dateObj, 'MMM', { locale: ptBR }) : '',
        year: isValidDate ? getYear(dateObj).toString() : '',
        descricao: cleanDesc + ' (Excluído)',
        categoria: l.categoria_nome || (l.tipo === 'Entrada' ? 'Entrada' : '-'),
        valor: l.valor_novo,
        originalValor: l.valor_novo,
        tipo: l.tipo === 'Despesa' ? 'Saída' : 'Entrada',
        pessoa: l.pessoa_nome || '-',
        destino: destinoLabel,
        dbId: l.registro_id,
        raw: l
      };
    });

    // 3. Other activities (Pessoas and Categorias)
    const mOther = auditLogs.filter(l => {
      if (l.tipo !== 'Pessoa' && l.tipo !== 'Categoria') return false;
      const dateStr = l.timestamp.split('T')[0];
      return matchesFilters(dateStr);
    }).map(l => {
      const dateStr = l.timestamp.split('T')[0];
      const dateObj = parseISO(dateStr);
      const isValidDate = !isNaN(dateObj.getTime());

      return {
        id: `${l.tipo === 'Pessoa' ? 'p' : 'c'}-${l.registro_id}`,
        data: dateStr,
        data_compra: dateStr,
        data_pagamento: dateStr,
        dateObj,
        isValidDate,
        formattedDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : dateStr,
        formattedCompraDate: isValidDate ? format(dateObj, 'dd/MM/yyyy') : dateStr,
        month: isValidDate ? getMonth(dateObj) + 1 : 0,
        monthName: isValidDate ? format(dateObj, 'MMMM', { locale: ptBR }) : '',
        monthNameShort: isValidDate ? format(dateObj, 'MMM', { locale: ptBR }) : '',
        year: isValidDate ? getYear(dateObj).toString() : '',
        descricao: l.descricao,
        categoria: l.tipo,
        valor: 0,
        originalValor: 0,
        tipo: 'Atividade',
        pessoa: l.tipo === 'Pessoa' ? l.descricao.replace('Nova Pessoa: ', '') : '-',
        destino: '-',
        dbId: l.registro_id,
        raw: l
      };
    });

    const finalResult = [...mDespesas, ...mSalarios, ...mDeleted, ...mOther].sort((a, b) => {
      const dateComp = b.data.localeCompare(a.data);
      if (dateComp !== 0) return dateComp;
      return Number(b.dbId) - Number(a.dbId);
    });
    
    return finalResult;
  }, [despesas, salarios, auditLogs, pessoas, filterMonth, filterYear, startDate, endDate]);

  const filteredMovements = useMemo(() => {
    let result = [...allMovements];

    // 1. Search Filter
    if (logSearchTerm) {
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const term = normalize(logSearchTerm).trim();
      const numericTerm = term.replace(',', '.');
      
      const monthYearRegex = /^(\d{1,2})\s*[\/\-]\s*(\d{2,4})$/;
      const myMatch = term.match(monthYearRegex);
      
      result = result.filter(m => {
        const prefix = m.id.startsWith('d-') ? 'S' : 
                       m.id.startsWith('s-') ? 'E' : 
                       m.id.startsWith('p-') ? 'P' : 'C';
        const prefixedId = prefix + m.dbId;
        
        if (myMatch && m.isValidDate) {
          const searchMonth = parseInt(myMatch[1]);
          const searchYear = myMatch[2];
          const monthMatches = m.month === searchMonth;
          const yearMatches = searchYear.length === 2 
            ? m.year.endsWith(searchYear) 
            : m.year === searchYear;
          if (monthMatches && yearMatches) return true;
        }

        const valorStr = m.valor.toString();
        const valorFixed = m.valor.toFixed(2);
        const valorFormatted = formatCurrency(m.valor).toLowerCase();

        return (
          normalize(prefixedId).includes(term) ||
          m.dbId.toString().includes(term) ||
          m.data.includes(term) ||
          m.formattedDate.includes(term) ||
          (m.data_compra && m.data_compra.includes(term)) ||
          (m.formattedCompraDate && m.formattedCompraDate.includes(term)) ||
          normalize(m.monthName).includes(term) ||
          normalize(m.monthNameShort).includes(term) ||
          normalize(m.descricao).includes(term) ||
          normalize(m.categoria).includes(term) ||
          valorStr.includes(term) ||
          valorStr.includes(numericTerm) ||
          valorFixed.includes(term) ||
          valorFixed.includes(numericTerm) ||
          valorFixed.replace('.', ',').includes(term) ||
          valorFormatted.includes(term) ||
          normalize(m.tipo).includes(term) ||
          normalize(m.pessoa).includes(term) ||
          normalize(m.destino).includes(term)
        );
      });
    }

    // 2. Sorting
    if (logSort) {
      result.sort((a, b) => {
        const valA = (a as any)[logSort.key];
        const valB = (b as any)[logSort.key];
        
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
        
        return logSort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [allMovements, logSearchTerm, logSort]);

  const filteredAuditLogs = useMemo(() => {
    let result = auditLogs.filter(l => 
      !l.descricao.startsWith('Lançamento inicial:') && 
      !l.descricao.startsWith('Exclusão:') &&
      !l.descricao.startsWith('Nova Pessoa:') &&
      !l.descricao.startsWith('Nova Categoria:')
    );
    
    if (logSearchTerm) {
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const term = normalize(logSearchTerm).trim();
      result = result.filter(l => 
        normalize(l.descricao).includes(term) ||
        l.valor_antigo.toString().includes(term) ||
        l.valor_novo.toString().includes(term)
      );
    }
    
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, logSearchTerm]);

  const LogTableHeader = ({ label, columnKey }: { label: string, columnKey: string }) => {
    const isSorted = logSort?.key === columnKey;
    
    const handleSort = () => {
      setLogSort(prev => {
        if (prev?.key === columnKey) {
          return { key: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key: columnKey, direction: 'asc' };
      });
    };

    return (
      <th 
        className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-200 transition-colors select-none group"
        onClick={handleSort}
      >
        <div className="flex items-center gap-2">
          <span className="truncate">{label}</span>
          <div className="flex flex-col shrink-0">
            {isSorted ? (
              logSort.direction === 'asc' ? (
                <ChevronUp size={14} className="text-indigo-600" />
              ) : (
                <ChevronDown size={14} className="text-indigo-600" />
              )
            ) : (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronUp size={14} className="text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </th>
    );
  };

  const handleAddPessoa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pessoas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPessoa),
      });
      if (!res.ok) throw new Error('Falha ao salvar pessoa');
      setNewPessoa({ nome: '', cor: '' });
      setIsPessoaModalOpen(false);
      fetchData();
    } catch (err) {
      setError('Erro ao adicionar pessoa. Verifique os dados e tente novamente.');
    }
  };

  const handleAddDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const valorNum = parseFloat(newDespesa.valor);
    const origemIdNum = parseInt(newDespesa.origem_id);
    const categoriaIdNum = parseInt(newDespesa.categoria_id);

    if (isNaN(valorNum) || isNaN(origemIdNum) || isNaN(categoriaIdNum)) {
      setError('Por favor, preencha todos os campos obrigatórios com valores válidos.');
      return;
    }

    try {
      const res = await fetch('/api/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newDespesa, 
          valor: valorNum, 
          origem_id: origemIdNum, 
          categoria_id: categoriaIdNum 
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao salvar despesa');
      }
      // Reset all fields
      setNewDespesa({ 
        data_compra: format(new Date(), 'yyyy-MM-dd'), 
        data_pagamento: format(new Date(), 'yyyy-MM-dd'), 
        valor: '', 
        descricao: '', 
        origem_id: '', 
        destino: 'Dividir', 
        categoria_id: '' 
      });
      setIsDespesaModalOpen(false);
      fetchData();
      setToast('Despesa adicionada com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar despesa. Verifique os campos obrigatórios.');
    }
  };

  const handleAddSalario = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const valorNum = parseFloat(newSalario.valor);
    const recebedorIdNum = parseInt(newSalario.recebedor_id);

    if (isNaN(valorNum) || isNaN(recebedorIdNum)) {
      setError('Por favor, preencha todos os campos obrigatórios com valores válidos.');
      return;
    }

    try {
      const res = await fetch('/api/salarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newSalario, 
          valor: valorNum, 
          recebedor_id: recebedorIdNum 
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao salvar entrada');
      }
      // Reset all fields
      setNewSalario({ 
        data_pagamento: format(new Date(), 'yyyy-MM-dd'), 
        valor: '', 
        descricao: '', 
        recebedor_id: '' 
      });
      setIsSalarioModalOpen(false);
      fetchData();
      setToast('Entrada adicionada com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar entrada. Verifique os campos.');
    }
  };

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategoria),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao salvar categoria');
      }
      setNewCategoria({ nome: '' });
      fetchData();
      setToast('Categoria adicionada com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar categoria.');
    }
  };

  const handleUpdateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoria) return;
    try {
      const res = await fetch(`/api/categorias/${editingCategoria.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: editingCategoria.nome }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao atualizar categoria');
      }
      setEditingCategoria(null);
      fetchData();
      setToast('Categoria atualizada com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar categoria.');
    }
  };

  const handleDeleteCategoria = async () => {
    if (!categoriaToDelete) return;
    try {
      const res = await fetch(`/api/categorias/${categoriaToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao excluir categoria');
      }
      setIsDeleteCategoriaModalOpen(false);
      setCategoriaToDelete(null);
      fetchData();
      setToast('Categoria excluída com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir categoria.');
    }
  };

  const handleDeletePessoa = async () => {
    if (!personToDelete) return;
    try {
      const res = await fetch(`/api/pessoas/${personToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao excluir pessoa');
      setIsDeletePessoaModalOpen(false);
      setIsPersonDetailModalOpen(false);
      setPersonToDelete(null);
      setSelectedPersonId(null);
      setToast('Pessoa e todos os seus registros foram excluídos permanentemente!');
      setTimeout(() => setToast(null), 3000);
      fetchData();
    } catch (err) {
      setError('Erro ao excluir pessoa. Tente novamente.');
    }
  };

  const handleResetData = async () => {
    setIsLoading(true);
    setLoadingMessage('Limpando todos os dados...');
    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      if (!response.ok) throw new Error('Erro ao resetar dados');
      
      setToast('Dados limpos com sucesso!');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
      setIsResetConfirmOpen(false);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestoreBackup = async () => {
    if (!pendingRestoreFile) return;
    
    setIsLoading(true);
    setLoadingMessage('Restaurando backup...');
    const formData = new FormData();
    formData.append('backup', pendingRestoreFile);

    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao restaurar backup');
      }

      setIsRestoreConfirmOpen(false);
      setPendingRestoreFile(null);
      setToast('Backup restaurado com sucesso! Recarregando...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      setError(err.message);
      setIsRestoreConfirmOpen(false);
      setPendingRestoreFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getNextAvailableColor = () => {
    const usedColors = pessoas.map(p => p.cor);
    for (const palette of PALETTES) {
      for (const color of palette.colors) {
        if (!usedColors.includes(color)) return color;
      }
    }
    return PALETTES[0].colors[0];
  };

  useEffect(() => {
    if (isPessoaModalOpen && !newPessoa.cor) {
      setNewPessoa(prev => ({ ...prev, cor: getNextAvailableColor() }));
    }
  }, [isPessoaModalOpen]);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importPessoaId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      
      // Try UTF-8 first
      let decoder = new TextDecoder('utf-8');
      let text = decoder.decode(buffer);
      
      // If we see the replacement character or common corruption for "Saída", try ISO-8859-1
      if (text.includes('') || text.includes('\ufffd')) {
        decoder = new TextDecoder('iso-8859-1');
        text = decoder.decode(buffer);
      }

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const startIdx = lines[0].toLowerCase().includes('data') ? 1 : 0;

      const items: any[] = [];
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(';');
        if (parts.length < 5) continue;
        
        const [dataStr, descricao, categoriaNome, valorStr, tipoRaw] = parts;
        if (!dataStr || !valorStr || !tipoRaw) continue;

        const dateParts = dataStr.trim().split('/');
        if (dateParts.length !== 3) continue;
        const [day, month, year] = dateParts;
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        // Robust value parsing for Brazilian format (1.234,56 or 1234,56 or 1234.56)
        let cleanValor = valorStr.trim().replace(/[R$\s]/g, '');
        if (cleanValor.includes(',') && cleanValor.includes('.')) {
          // Likely 1.234,56 -> remove dot, replace comma with dot
          cleanValor = cleanValor.replace(/\./g, '').replace(',', '.');
        } else if (cleanValor.includes(',')) {
          // Likely 123,45 -> replace comma with dot
          cleanValor = cleanValor.replace(',', '.');
        }
        
        const valor = parseFloat(cleanValor);
        if (isNaN(valor)) continue;

        const tipo = tipoRaw.trim().toLowerCase().includes('entrada') ? 'Entrada' : 'Saída';

        items.push({
          id: Math.random().toString(36).substr(2, 9),
          data_compra: formattedDate,
          data_pagamento: importSource === 'extrato' ? formattedDate : globalPaymentDate,
          descricao: descricao.trim(),
          categoria: categoriaNome.trim() || 'Geral',
          valor,
          tipo,
          destino: tipo === 'Entrada' ? importPessoaId : '' 
        });
      }
      setReviewItems(items);
      setIsImportModalOpen(false);
      setIsReviewModalOpen(true);
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    const hasEmptyDestino = reviewItems.some(item => item.tipo === 'Saída' && !item.destino);
    if (hasEmptyDestino) {
      setError('Por favor, selecione o destino para todas as despesas.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Processando importação...');
    try {
      // Local cache for categories to handle new ones in the same batch
      const categoryCache = new Map<string, number>();
      categorias.forEach(c => categoryCache.set(c.nome.toLowerCase(), c.id));

      // Process all items
      for (const item of reviewItems) {
        let categoriaId: number | null = null;
        const catNameLower = item.categoria.toLowerCase();
        
        if (categoryCache.has(catNameLower)) {
          categoriaId = categoryCache.get(catNameLower)!;
        } else {
          const res = await fetch('/api/categorias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: item.categoria }),
          });
          const data = await res.json();
          if (data.id) {
            categoriaId = data.id;
            categoryCache.set(catNameLower, data.id);
          }
        }

        if (item.tipo === 'Entrada') {
          const res = await fetch('/api/salarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data_pagamento: item.data_pagamento,
              valor: item.valor,
              descricao: item.descricao,
              recebedor_id: parseInt(importPessoaId)
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            if (res.status === 400 && data.error?.includes('duplicado')) {
              continue; 
            }
            throw new Error(data.error || 'Erro ao salvar entrada');
          }
        } else {
          if (categoriaId) {
            const res = await fetch('/api/despesas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data_compra: item.data_compra,
                data_pagamento: item.data_pagamento,
                valor: item.valor,
                descricao: item.descricao,
                origem_id: parseInt(importPessoaId),
                destino: item.destino,
                categoria_id: categoriaId,
                ignoreDuplicates: true // Allow identical transactions in the same import
              }),
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || 'Erro ao salvar despesa');
            }
          }
        }
      }
      setIsReviewModalOpen(false);
      setReviewItems([]);
      setImportPessoaId('');
      setToast('Importação concluída com sucesso!');
      setTimeout(() => setToast(null), 3000);
      fetchData();
    } catch (err) {
      console.error('Import error:', err);
      setError('Erro durante a importação. Algumas transações podem não ter sido salvas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async (options: ExportOptions) => {
    if (!selectedPersonDetails) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resumo');

    const columns: any[] = [];
    if (options.columns.includes('date')) columns.push({ header: 'Data Pagamento', key: 'date', width: 15 });
    if (options.columns.includes('date_compra')) columns.push({ header: 'Data Compra', key: 'date_compra', width: 15 });
    if (options.columns.includes('description')) columns.push({ header: 'Descrição', key: 'description', width: 35 });
    if (options.columns.includes('category')) columns.push({ header: 'Categoria', key: 'category', width: 20 });
    if (options.columns.includes('destino')) columns.push({ header: 'Destino', key: 'destino', width: 20 });
    if (options.columns.includes('value')) columns.push({ header: 'Valor', key: 'value', width: 15 });
    if (options.columns.includes('type')) columns.push({ header: 'Tipo', key: 'type', width: 15 });
    worksheet.columns = columns;

    selectedPersonDetails.movements.forEach((m: any) => {
      const row: any = {};
      if (options.columns.includes('date')) row['date'] = m.formattedDate;
      if (options.columns.includes('date_compra')) row['date_compra'] = m.formattedCompraDate;
      if (options.columns.includes('description')) row['description'] = m.descricao;
      if (options.columns.includes('category')) row['category'] = m.categoria_nome || '-';
      if (options.columns.includes('destino')) {
        row['destino'] = m.tipo === 'Saída' ? (
          (m.destino === 'Dividir' || m.destino === 'Dividido') ? 'Dividir' : 
          (pessoas.find(p => p.id === Number(m.destino))?.nome || m.destino || '-')
        ) : '-';
      }
      if (options.columns.includes('value')) row['value'] = m.valor;
      if (options.columns.includes('type')) row['type'] = m.tipo;
      worksheet.addRow(row);
    });

    if (options.format === 'xlsx') {
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${options.filename}.xlsx`);
    } else {
      const buffer = await workbook.csv.writeBuffer();
      saveAs(new Blob([buffer]), `${options.filename}.csv`);
    }
  };

  const handleExportLog = async (options: ExportOptions) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Log_Atividades');

    const columns: any[] = [];
    if (options.columns.includes('date')) columns.push({ header: 'Data Pagamento', key: 'date', width: 15 });
    if (options.columns.includes('date_compra')) columns.push({ header: 'Data Compra', key: 'date_compra', width: 15 });
    if (options.columns.includes('description')) columns.push({ header: 'Descrição', key: 'description', width: 35 });
    if (options.columns.includes('category')) columns.push({ header: 'Categoria', key: 'category', width: 20 });
    if (options.columns.includes('value')) columns.push({ header: 'Valor', key: 'value', width: 15 });
    if (options.columns.includes('type')) columns.push({ header: 'Tipo', key: 'type', width: 15 });
    if (options.columns.includes('person')) columns.push({ header: 'Pessoa', key: 'person', width: 20 });
    if (options.columns.includes('destination')) columns.push({ header: 'Destino', key: 'destination', width: 20 });
    worksheet.columns = columns;

    filteredMovements.forEach((m: any) => {
      const row: any = {};
      if (options.columns.includes('date')) row['date'] = m.formattedDate;
      if (options.columns.includes('date_compra')) row['date_compra'] = m.formattedCompraDate;
      if (options.columns.includes('description')) row['description'] = m.descricao;
      if (options.columns.includes('category')) row['category'] = m.categoria || '-';
      if (options.columns.includes('value')) row['value'] = m.valor;
      if (options.columns.includes('type')) row['type'] = m.tipo;
      if (options.columns.includes('person')) row['person'] = m.pessoa;
      if (options.columns.includes('destination')) row['destination'] = m.destino;
      worksheet.addRow(row);
    });

    if (options.format === 'xlsx') {
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${options.filename}.xlsx`);
    } else {
      const buffer = await workbook.csv.writeBuffer();
      saveAs(new Blob([buffer]), `${options.filename}.csv`);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white shadow-2xl border border-gray-100">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-indigo-600"
              >
                <Loader2 size={48} />
              </motion.div>
              <p className="text-lg font-bold text-gray-800 tracking-tight">{loadingMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 fixed h-full overflow-y-auto z-30 shadow-sm custom-scrollbar">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <DollarSign size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">WithLove4Janis</h1>
          </div>
          
          <nav className="space-y-1">
            <SidebarButton 
              onClick={() => setIsPessoaModalOpen(true)} 
              icon={<Users size={20} />} 
              label="Gerenciar Pessoas" 
              color="text-indigo-600"
              hoverBg="hover:bg-indigo-100"
            />
            <SidebarButton 
              onClick={() => setIsCategoriaModalOpen(true)} 
              icon={<Tag size={20} />} 
              label="Gerenciar Categoria" 
              color="text-amber-600"
              hoverBg="hover:bg-amber-100"
            />
            <SidebarButton 
              onClick={() => setIsSalarioModalOpen(true)} 
              icon={<DollarSign size={20} />} 
              label="Adicionar Entrada" 
              color="text-emerald-600"
              hoverBg="hover:bg-emerald-100"
            />
            <SidebarButton 
              onClick={() => setIsDespesaModalOpen(true)} 
              icon={<CreditCard size={20} />} 
              label="Adicionar Despesa" 
              color="text-rose-600"
              hoverBg="hover:bg-rose-100"
            />
            <SidebarButton 
              onClick={() => setIsImportModalOpen(true)} 
              icon={<Plus size={20} />} 
              label="Importar CSV" 
              color="text-blue-600"
              hoverBg="hover:bg-blue-100"
            />
            
            <div className="pt-6 pb-2">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Prompts Itau</p>
            </div>
            
            <SidebarButton 
              onClick={() => copyToClipboard(PROMPT_CONTA_CORRENTE, 'Prompt Conta Corrente copiado!')} 
              icon={<ClipboardCheck size={20} />} 
              label="Prompt Conta Corrente" 
              color="text-purple-600"
              hoverBg="hover:bg-purple-100"
            />
            <SidebarButton 
              onClick={() => copyToClipboard(PROMPT_CARTAO_CREDITO, 'Prompt Cartão de Crédito copiado!')} 
              icon={<ClipboardCheck size={20} />} 
              label="Prompt Cartao Credito" 
              color="text-pink-600"
              hoverBg="hover:bg-pink-100"
            />
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-6 flex flex-col overflow-hidden">
        <div className="w-[95%] mx-auto flex flex-col h-full">
          <header className="mb-6 relative flex items-center justify-center min-h-[48px] shrink-0">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-2 px-4 shadow-soft border-soft">
              <div className="flex items-center gap-2">
                <Filter className="text-gray-400" size={18} />
                <select 
                  value={filterMonth} 
                  onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                  className="rounded-lg border-none bg-transparent px-2 py-1 outline-none text-sm font-medium text-gray-700 focus:ring-0"
                >
                  <option value={-1}>Todos os Meses</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {format(new Date(2024, m), 'MMMM', { locale: ptBR })}
                    </option>
                  ))}
                </select>
                <div className="w-px h-4 bg-gray-200"></div>
                <select 
                  value={filterYear} 
                  onChange={(e) => setFilterYear(parseInt(e.target.value))}
                  className="rounded-lg border-none bg-transparent px-2 py-1 outline-none text-sm font-medium text-gray-700 focus:ring-0"
                >
                  <option value={-1}>Todos os Anos</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="w-px h-6 bg-gray-200 hidden md:block"></div>

              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border-none bg-gray-50 px-2 py-1 outline-none text-xs font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-400 text-xs">até</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border-none bg-gray-50 px-2 py-1 outline-none text-xs font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500"
                />
                {(startDate || endDate || filterMonth !== -1 || filterYear !== -1) && (
                  <button 
                    onClick={() => { 
                      setStartDate(''); 
                      setEndDate(''); 
                      setFilterMonth(-1);
                      setFilterYear(-1);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                    title="Limpar Filtros"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="absolute right-0 flex items-center gap-2">
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="p-2 rounded-xl bg-white shadow-soft border-soft text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Limpar Todos os Dados"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={handleDownloadBackup}
                className="p-2 rounded-xl bg-white shadow-soft border-soft text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                title="Baixar Backup (.zip)"
              >
                <Download size={20} />
              </button>
              <label className="cursor-pointer p-2 rounded-xl bg-white shadow-soft border-soft text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Restaurar Backup (.zip)">
                <Upload size={20} />
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPendingRestoreFile(file);
                      setIsRestoreConfirmOpen(true);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </header>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column: Balance and Person Cards */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
          <div className="min-h-full flex flex-col gap-4 justify-center">
            {/* Yellow Balance Card */}
            {hasRecords && (
              <div className="w-full rounded-2xl bg-yellow-100 p-4 shadow-soft border-2 border-yellow-200 shrink-0">
                <div className="mb-2 flex items-center gap-2 text-yellow-800">
                  <TrendingUp size={20} />
                  <h2 className="text-lg font-bold">Ajustes de Saldo</h2>
                </div>
                {balances.length > 0 ? (
                  <ul className="space-y-1">
                    {balances.map((adj, i) => (
                      <li key={i} className="text-sm text-yellow-900 font-medium">• {adj}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-yellow-800 italic">Tudo equilibrado! Ninguém deve ninguém.</p>
                )}
              </div>
            )}

            {/* Person Cards Stack */}
            <div className="flex flex-col gap-4">
              {personStats.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => {
                    setSelectedPersonId(p.id);
                    setIsPersonDetailModalOpen(true);
                  }}
                  className="rounded-2xl bg-white p-6 shadow-soft border-soft overflow-hidden relative cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all group shrink-0"
                  style={{ '--hover-bg': `${p.cor}15` } as any}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: `${p.cor}15` }}></div>
                  <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: p.cor }}></div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold" style={{ color: p.cor }}>{p.nome}</h3>
                    <div className="flex items-center gap-2">
                      <ChevronDown size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Total Gasto:</span>
                      <span className="font-bold text-rose-600">{formatCurrency(p.totalSpent)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Entrada Recebida:</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(p.totalSalary)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Charts */}
        {hasRecords && (
          <div className="flex-[2] flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <select
                  value={chartPersonFilter}
                  onChange={(e) => setChartPersonFilter(parseInt(e.target.value))}
                  className="rounded-xl border-soft bg-white px-3 py-1.5 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-soft"
                >
                  <option value={-1}>Todas as Pessoas</option>
                  {pessoas.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-soft border-soft">
                <button
                  onClick={() => setActiveChart('bar')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    activeChart === 'bar' ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  )}
                  title="Gráfico de Barras"
                >
                  <BarChartIcon size={18} />
                </button>
                <button
                  onClick={() => setActiveChart('pie')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    activeChart === 'pie' ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  )}
                  title="Gráfico de Pizza"
                >
                  <PieChartIcon size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <AnimatePresence mode="wait">
                {activeChart === 'bar' ? (
                  <motion.div
                    key="bar"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 rounded-2xl bg-white p-4 shadow-soft border-soft flex flex-col"
                  >
                    <div className="flex-1 w-full min-h-0">
                      {barChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 10, right: 130, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={(val) => formatCurrency(val).replace('R$', '').trim()} tick={{ fontSize: 11 }} />
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), 'Valor']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              cursor={{ fill: '#f3f4f6' }}
                            />
                            <Legend 
                              verticalAlign="middle" 
                              align="right" 
                              layout="vertical" 
                              wrapperStyle={{ 
                                fontSize: '15px', 
                                fontWeight: '600', 
                                paddingLeft: '20px',
                                width: '140px'
                              }} 
                            />
                            {pessoas.map(p => (
                              <Bar key={p.id} dataKey={p.nome} stackId="a" fill={p.cor} radius={[0, 0, 0, 0]} />
                            ))}
                            <Bar dataKey="Dividir" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400 font-medium">
                          Nenhum dado para este filtro
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="pie"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 rounded-2xl bg-white p-0 shadow-soft border-soft flex flex-col"
                  >
                    <div className="flex-1 w-full min-h-0">
                      {pieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                              activeIndex={activePieIndex}
                              activeShape={renderActiveShape}
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius="65%"
                              outerRadius="95%"
                              fill="#8884d8"
                              dataKey="value"
                              onMouseEnter={(_, index) => setActivePieIndex(index)}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PALETTES[0].colors[index % PALETTES[0].colors.length]} stroke="#fff" strokeWidth={2} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400 font-medium">
                          Nenhum dado para este filtro
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={isPessoaModalOpen} onClose={() => setIsPessoaModalOpen(false)} title="Gerenciar Pessoas">
        <form onSubmit={handleAddPessoa} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input 
              type="text" 
              required
              value={newPessoa.nome}
              onChange={e => setNewPessoa(prev => ({ ...prev, nome: e.target.value }))}
              className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cor</label>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {PALETTES.flatMap(p => p.colors).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewPessoa(prev => ({ ...prev, cor: c }))}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                    newPessoa.cor === c ? "border-gray-900 scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 text-white font-bold shadow-soft hover:bg-indigo-700 hover:shadow-lg hover:scale-[1.02] transition-all active:scale-[0.98]">
            Salvar
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isDespesaModalOpen} 
        onClose={() => setIsDespesaModalOpen(false)} 
        title="Adicionar Despesa"
        className="w-[90%] h-[90%] sm:w-[90%] sm:h-[90%]"
      >
        <form onSubmit={handleAddDespesa} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data da Compra</label>
              <input 
                type="date" 
                required
                value={newDespesa.data_compra}
                onChange={e => setNewDespesa(prev => ({ ...prev, data_compra: e.target.value }))}
                className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data do Pagamento</label>
              <input 
                type="date" 
                required
                value={newDespesa.data_pagamento}
                onChange={e => setNewDespesa(prev => ({ ...prev, data_pagamento: e.target.value }))}
                className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              required
              value={newDespesa.valor}
              onChange={e => setNewDespesa(prev => ({ ...prev, valor: e.target.value }))}
              className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <input 
              type="text" 
              value={newDespesa.descricao}
              onChange={e => setNewDespesa(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Ex: Aluguel, Supermercado..."
              className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Origem (Quem pagou)</label>
            <select 
              required
              value={newDespesa.origem_id}
              onChange={e => setNewDespesa(prev => ({ ...prev, origem_id: e.target.value }))}
              className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {pessoas.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Destino</label>
            <select 
              required
              value={newDespesa.destino}
              onChange={e => setNewDespesa(prev => ({ ...prev, destino: e.target.value }))}
              className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Dividir">Dividir entre todos</option>
              {pessoas.map(p => (
                <option key={p.id} value={p.id.toString()}>Somente {p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoria</label>
            <select 
              required
              value={newDespesa.categoria_id}
              onChange={e => setNewDespesa(prev => ({ ...prev, categoria_id: e.target.value }))}
              className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {sortedCategorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full rounded-xl bg-rose-600 py-3 text-white font-bold shadow-soft hover:bg-rose-700 hover:shadow-lg hover:scale-[1.02] transition-all active:scale-[0.98]">
            Salvar
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isSalarioModalOpen} 
        onClose={() => setIsSalarioModalOpen(false)} 
        title="Adicionar Entrada"
        className="w-[90%] h-[90%] sm:w-[90%] sm:h-[90%]"
      >
        <form onSubmit={handleAddSalario} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data do Pagamento</label>
              <input 
                type="date" 
                required
                value={newSalario.data_pagamento}
                onChange={e => setNewSalario(prev => ({ ...prev, data_pagamento: e.target.value }))}
                className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={newSalario.valor}
                onChange={e => setNewSalario(prev => ({ ...prev, valor: e.target.value }))}
                className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <input 
              type="text" 
              value={newSalario.descricao}
              onChange={e => setNewSalario(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Ex: Entrada Mensal, Bônus..."
              className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Recebedor</label>
            <select 
              required
              value={newSalario.recebedor_id}
              onChange={e => setNewSalario(prev => ({ ...prev, recebedor_id: e.target.value }))}
              className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {pessoas.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3 text-white font-bold shadow-soft hover:bg-emerald-700 hover:shadow-lg hover:scale-[1.02] transition-all active:scale-[0.98]">
            Salvar
          </button>
        </form>
      </Modal>

      <Modal isOpen={isCategoriaModalOpen} onClose={() => setIsCategoriaModalOpen(false)} title="Gerenciar Categoria">
        <div className="space-y-6">
          <form onSubmit={editingCategoria ? handleUpdateCategoria : handleAddCategoria} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </label>
              <div className="mt-1 flex gap-2">
                <input 
                  type="text" 
                  required
                  value={editingCategoria ? editingCategoria.nome : newCategoria.nome}
                  onChange={e => editingCategoria 
                    ? setEditingCategoria({ ...editingCategoria, nome: e.target.value })
                    : setNewCategoria({ nome: e.target.value })
                  }
                  placeholder="Ex: Alimentação, Transporte..."
                  className="flex-1 rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  type="submit" 
                  className={cn(
                    "rounded-xl px-6 font-bold text-white transition-all active:scale-95",
                    editingCategoria ? "bg-indigo-600 hover:bg-indigo-700" : "bg-amber-600 hover:bg-amber-700"
                  )}
                >
                  {editingCategoria ? 'Atualizar' : 'Adicionar'}
                </button>
                {editingCategoria && (
                  <button 
                    type="button"
                    onClick={() => setEditingCategoria(null)}
                    className="rounded-xl bg-gray-100 px-4 font-bold text-gray-600 hover:bg-gray-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categorias Existentes</h3>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar rounded-xl border border-gray-100 divide-y divide-gray-50">
              {sortedCategorias.length > 0 ? (
                sortedCategorias.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group">
                    <span className="font-medium text-gray-700">{cat.nome}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => setEditingCategoria({ id: cat.id, nome: cat.nome })}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setCategoriaToDelete(cat);
                          setIsDeleteCategoriaModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 italic">
                  Nenhuma categoria cadastrada.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteCategoriaModalOpen} onClose={() => setIsDeleteCategoriaModalOpen(false)} title="Confirmar Exclusão">
        <div className="space-y-6">
          <div className="flex items-center gap-4 text-rose-600">
            <div className="rounded-full bg-rose-100 p-3">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold">Excluir Categoria?</h3>
              <p className="text-sm text-gray-600">
                Você está prestes a excluir a categoria <strong>{categoriaToDelete?.nome}</strong>.
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Esta ação não poderá ser desfeita. A categoria só poderá ser excluída se não houver despesas vinculadas a ela.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleteCategoriaModalOpen(false)}
              className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-600 hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDeleteCategoria}
              className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white shadow-soft hover:bg-rose-700 transition-all"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        title="Importar CSV"
        className="w-[90%] h-[90%] sm:w-[90%] sm:h-[90%]"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Pessoa de Referência</label>
              <select 
                required
                value={importPessoaId}
                onChange={e => setImportPessoaId(e.target.value)}
                className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione...</option>
                {pessoas.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fonte dos Dados</label>
              <select 
                value={importSource}
                onChange={e => setImportSource(e.target.value as 'extrato' | 'cartao')}
                className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="extrato">Extrato Bancário</option>
                <option value="cartao">Cartão de Crédito</option>
              </select>
            </div>
          </div>
          
          {importSource === 'cartao' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Data de Pagamento (Fatura)</label>
              <input 
                type="date" 
                value={globalPaymentDate}
                onChange={e => setGlobalPaymentDate(e.target.value)}
                className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">Esta data será aplicada a todos os itens da fatura.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Arquivo CSV</label>
            <input 
              type="file" 
              accept=".csv"
              disabled={!importPessoaId}
              onChange={handleImportCSV}
              className="mt-1 w-full rounded-xl border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="mt-2 text-xs text-gray-500">
              Formato: Data;Descrição;Categoria;Valor;Tipo (Entrada ou Saída)<br/>
              Ex: 05/01/2026;IOF;Taxa Banco;17,56;Saída
            </p>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isPersonDetailModalOpen} 
        onClose={() => {
          setIsPersonDetailModalOpen(false);
          setSelectedPersonId(null);
          setPersonSearchTerm('');
        }} 
        title={`Resumo: ${selectedPersonDetails?.person.nome || ''}`}
        className="sm:w-[90%] sm:h-[90%] max-w-none"
      >
        {selectedPersonDetails && (
          <div className="space-y-6">
            <div className="flex justify-end items-center gap-2">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95 shadow-sm"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => {
                  setPersonToDelete(selectedPersonDetails.person);
                  setIsDeletePessoaModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100 transition-all active:scale-95 shadow-sm"
                title="Excluir Pessoa e Registros"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100 flex flex-col">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Entradas</p>
                <p className="text-xl font-bold text-emerald-700 mt-auto">{formatCurrency(selectedPersonDetails.totalSalary)}</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-4 border border-rose-100 flex flex-col">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Saídas (Total)</p>
                <div className="flex items-center mt-auto">
                  <div className="flex-1 text-center">
                    <p className="text-xl font-bold text-rose-700">{formatCurrency(selectedPersonDetails.totalSpent)}</p>
                  </div>
                  <div className="flex flex-col justify-center border-l border-rose-200 pl-3 ml-2 shrink-0 text-right">
                    <div className="mb-1">
                      <p className="text-[9px] font-bold text-rose-400 uppercase leading-none">Próprias</p>
                      <p className="text-[11px] font-bold text-rose-600">{formatCurrency(selectedPersonDetails.exclusiveSpent)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-rose-400 uppercase leading-none">Divididas</p>
                      <p className="text-[11px] font-bold text-rose-600">{formatCurrency(selectedPersonDetails.sharedSpent)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className={cn(
                "rounded-xl p-4 border flex flex-col",
                selectedPersonDetails.net >= 0 ? "bg-blue-50 border-blue-100" : "bg-amber-50 border-amber-100"
              )}>
                <p className={cn(
                  "text-xs font-semibold uppercase tracking-wider mb-1",
                  selectedPersonDetails.net >= 0 ? "text-blue-600" : "text-amber-600"
                )}>Saldo Líquido</p>
                <p className={cn(
                  "text-xl font-bold mt-auto",
                  selectedPersonDetails.net >= 0 ? "text-blue-700" : "text-amber-700"
                )}>{formatCurrency(selectedPersonDetails.net)}</p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar movimentações..."
                value={personSearchTerm}
                onChange={(e) => setPersonSearchTerm(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden flex-1">
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-100 text-gray-600 z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Data Compra</th>
                      <th className="px-4 py-3 font-semibold">Data Pagto</th>
                      <th className="px-4 py-3 font-semibold">Descrição</th>
                      <th className="px-4 py-3 font-semibold">Categoria</th>
                      <th className="px-4 py-3 font-semibold">Destino</th>
                      <th className="px-4 py-3 font-semibold">Valor</th>
                      <th className="px-4 py-3 font-semibold">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {selectedPersonDetails.movements.length > 0 ? (
                      selectedPersonDetails.movements.map((m: any) => (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-4 py-3 whitespace-nowrap text-xs">{m.formattedCompraDate}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-indigo-600">{m.formattedDate}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{m.descricao}</div>
                          </td>
                          <td className="px-4 py-3">
                            {m.tipo === 'Saída' ? (
                              editingRecordCategory?.id === m.id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    autoFocus
                                    value={editingRecordCategory.categoryId}
                                    onChange={e => setEditingRecordCategory({ ...editingRecordCategory, categoryId: parseInt(e.target.value) })}
                                    onBlur={() => handleUpdateCategory(m.id, editingRecordCategory.categoryId)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleUpdateCategory(m.id, editingRecordCategory.categoryId);
                                      if (e.key === 'Escape') setEditingRecordCategory(null);
                                    }}
                                    className="rounded-lg border-gray-200 bg-gray-50 p-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                  >
                                    {sortedCategorias.map(cat => (
                                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group/cat">
                                  <span className="text-xs text-gray-600">{m.categoria_nome || 'Sem Categoria'}</span>
                                  <button
                                    onClick={() => setEditingRecordCategory({ id: m.id, categoryId: m.categoria_id })}
                                    className="p-1 text-gray-400 hover:text-indigo-600 opacity-0 group-hover/cat:opacity-100 transition-opacity"
                                    title="Editar Categoria"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">
                              {m.tipo === 'Saída' ? (
                                (m.destino === 'Dividir' || m.destino === 'Dividido') ? 'Dividir' : 
                                (pessoas.find(p => p.id === Number(m.destino))?.nome || m.destino || '-')
                              ) : '-'}
                            </span>
                          </td>
                          <td className={cn(
                            "px-4 py-3 font-medium whitespace-nowrap",
                            m.tipo === 'Entrada' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {editingRecord?.id === m.id ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  autoFocus
                                  value={editingRecord.value}
                                  onChange={e => setEditingRecord({ ...editingRecord, value: e.target.value })}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleUpdateValue();
                                    if (e.key === 'Escape') setEditingRecord(null);
                                  }}
                                  className="w-24 rounded-lg border-gray-200 bg-gray-50 p-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button onClick={handleUpdateValue} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => setEditingRecord(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {formatCurrency(m.valor)}
                                <button 
                                  onClick={() => setEditingRecord({ id: m.id, type: m.tipo, value: m.valor.toString() })}
                                  className="p-1 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Editar Valor"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRecord(m.id, m.tipo)}
                                  className="p-1 text-gray-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Excluir Registro"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "rounded-full px-2 py-1 text-xs font-medium",
                              m.tipo === 'Entrada' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {m.tipo}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
                          Nenhuma movimentação este mês.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportData}
        defaultFilenamePrefix={`Resumo_${(selectedPersonDetails?.person.nome || '').replace(/\s+/g, '_')}`}
      />

      <Modal 
        isOpen={isReviewModalOpen} 
        onClose={() => setIsReviewModalOpen(false)} 
        title="Revisar Importação"
        className="w-[90%] h-[90%] sm:w-[90%] sm:h-[90%]"
      >
        <div className="flex flex-col h-full space-y-4">
          <div className="sticky top-[-24px] z-20 bg-white/95 backdrop-blur-sm pb-4 pt-2 -mx-6 px-6 border-b border-gray-50 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Revise as transações abaixo e selecione o <strong>Destino</strong> para cada despesa.
              </p>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => {
                    const newItems = reviewItems.map(item => ({
                      ...item,
                      destino: item.tipo === 'Saída' ? 'Dividir' : item.destino
                    }));
                    setReviewItems(newItems);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95"
                  title="Marcar todas as saídas como 'Dividir'"
                >
                  <Layers size={14} />
                  Dividir Todos
                </button>

                {pessoas.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const newItems = reviewItems.map(item => ({
                        ...item,
                        destino: item.tipo === 'Saída' ? p.id.toString() : item.destino
                      }));
                      setReviewItems(newItems);
                    }}
                    style={{ color: p.cor, backgroundColor: `${p.cor}15` }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 hover:opacity-80"
                    title={`Marcar todas as saídas para ${p.nome}`}
                  >
                    <Users size={14} />
                    {p.nome}
                  </button>
                ))}

                <button
                  onClick={() => {
                    const newItems = reviewItems.map(item => ({
                      ...item,
                      destino: item.tipo === 'Saída' ? '' : item.destino
                    }));
                    setReviewItems(newItems);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all active:scale-95"
                  title="Limpar todos os destinos selecionados"
                >
                  <RotateCcw size={14} />
                  Limpar
                </button>
              </div>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Filtrar itens da importação..."
                value={reviewSearchTerm}
                onChange={e => setReviewSearchTerm(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 py-1.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-600">
                <tr>
                  <th className="sticky top-0 px-4 py-3 font-semibold bg-gray-100 z-10">Data Compra</th>
                  <th className="sticky top-0 px-4 py-3 font-semibold bg-gray-100 z-10">Data Pagto</th>
                  <th className="sticky top-0 px-4 py-3 font-semibold bg-gray-100 z-10">Descrição</th>
                  <th className="sticky top-0 px-4 py-3 font-semibold bg-gray-100 z-10">Categoria</th>
                  <th className="sticky top-0 px-4 py-3 font-semibold bg-gray-100 z-10">Valor</th>
                  <th className="sticky top-0 px-4 py-3 font-semibold bg-gray-100 z-10">Tipo</th>
                  <th className="sticky top-0 px-4 py-3 font-semibold bg-gray-100 z-10">Destino</th>
                  <th className="sticky top-0 px-4 py-3 font-semibold bg-gray-100 z-10 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {reviewItems
                  .filter(item => {
                    if (!reviewSearchTerm) return true;
                    const term = reviewSearchTerm.toLowerCase();
                    const dateCompraObj = parseISO(item.data_compra);
                    const datePagtoObj = parseISO(item.data_pagamento);
                    const formattedDateCompra = format(dateCompraObj, 'dd/MM/yyyy');
                    const formattedDatePagto = format(datePagtoObj, 'dd/MM/yyyy');
                    const monthName = format(datePagtoObj, 'MMMM', { locale: ptBR }).toLowerCase();
                    const monthNameShort = format(datePagtoObj, 'MMM', { locale: ptBR }).toLowerCase();
                    
                    let destinoName = '';
                    if (item.tipo === 'Saída') {
                      if (item.destino === 'Dividir') {
                        destinoName = 'Dividir';
                      } else if (item.destino) {
                        const p = pessoas.find(p => p.id === Number(item.destino));
                        destinoName = p ? p.nome : item.destino;
                      }
                    }

                    return (
                      item.descricao.toLowerCase().includes(term) ||
                      item.categoria.toLowerCase().includes(term) ||
                      destinoName.toLowerCase().includes(term) ||
                      item.valor.toString().includes(term) ||
                      item.tipo.toLowerCase().includes(term) ||
                      formattedDateCompra.includes(term) ||
                      formattedDatePagto.includes(term) ||
                      monthName.includes(term) ||
                      monthNameShort.includes(term)
                    );
                  })
                  .map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{format(parseISO(item.data_compra), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-indigo-600">{format(parseISO(item.data_pagamento), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">{item.descricao}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        {item.categoria}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3 font-medium whitespace-nowrap",
                      item.tipo === 'Entrada' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "rounded-full px-2 py-1 text-xs font-medium",
                        item.tipo === 'Entrada' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.tipo === 'Saída' ? (
                        <select
                          value={item.destino}
                          onChange={(e) => {
                            const newItems = [...reviewItems];
                            newItems[idx].destino = e.target.value;
                            setReviewItems(newItems);
                          }}
                          className="w-full rounded-lg border-gray-200 bg-gray-50 p-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Selecionar...</option>
                          <option value="Dividir">Dividir entre todos</option>
                          {pessoas.map(p => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Automático</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const newItems = reviewItems.filter((_, i) => i !== idx);
                          setReviewItems(newItems);
                          if (newItems.length === 0) {
                            setIsReviewModalOpen(false);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Remover linha"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsReviewModalOpen(false)}
              className="rounded-xl px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmImport}
              className="rounded-xl bg-indigo-600 px-8 py-2 text-white font-bold shadow-soft hover:bg-indigo-700 hover:shadow-lg hover:scale-[1.02] transition-all active:scale-[0.98]"
            >
              Confirmar Importação
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeletePessoaModalOpen}
        onClose={() => {
          setIsDeletePessoaModalOpen(false);
          setPersonToDelete(null);
        }}
        onConfirm={handleDeletePessoa}
        title="Excluir Pessoa Permanentemente?"
        message={`ATENÇÃO: Esta ação é irreversível. Ao excluir ${personToDelete?.nome}, TODOS os registros de despesas e entradas associados a esta pessoa serão apagados do sistema para sempre. Deseja prosseguir?`}
        confirmLabel="Sim, Excluir Tudo"
        cancelLabel="Não, Manter Dados"
        type="danger"
      />

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Limpar Todos os Dados?"
        message="Esta ação irá excluir permanentemente todas as pessoas, categorias, despesas e entradas. Esta ação não pode ser desfeita. Deseja continuar?"
        confirmLabel="Sim, Limpar Tudo"
        cancelLabel="Cancelar"
        type="danger"
      />

      <ConfirmModal
        isOpen={isRestoreConfirmOpen}
        onClose={() => {
          setIsRestoreConfirmOpen(false);
          setPendingRestoreFile(null);
        }}
        onConfirm={handleRestoreBackup}
        title="Restaurar Banco de Dados?"
        message="Esta ação irá SUBSTITUIR COMPLETAMENTE todos os dados atuais pelo conteúdo do arquivo de backup. Esta ação não pode ser desfeita."
        confirmLabel="Substituir Tudo"
        cancelLabel="Cancelar"
        type="warning"
      />

      <ErrorModal 
        isOpen={!!error} 
        onClose={() => setError(null)} 
        message={error || ''} 
      />

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-2xl bg-gray-900 px-6 py-3 text-white shadow-2xl flex items-center gap-3">
            <ClipboardCheck className="text-emerald-400" size={20} />
            <span className="font-medium">{toast}</span>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}
