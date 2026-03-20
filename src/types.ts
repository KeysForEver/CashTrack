export interface Pessoa {
  id: number;
  nome: string;
  cor: string;
}

export interface Categoria {
  id: number;
  nome: string;
}

export interface Despesa {
  id: number;
  data: string;
  valor: number;
  descricao: string;
  origem_id: number;
  destino: string; // "Dividir" ou string(pessoa.id)
  categoria_id: number;
  origem_nome?: string;
  categoria_nome?: string;
}

export interface Salario {
  id: number;
  data: string;
  valor: number;
  descricao: string;
  recebedor_id: number;
  recebedor_nome?: string;
}

export const PALETTES = [
  {
    name: "Sunny Beach Day",
    colors: ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"],
  },
  {
    name: "Refreshing Summer Fun",
    colors: ["#8ECAE6", "#219EBC", "#023047", "#FFB703", "#FB8500"],
  },
];
