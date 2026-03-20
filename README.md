# CashTrack

**CashTrack** é uma aplicação full-stack moderna para gestão de finanças compartilhadas. Ideal para casais, repúblicas ou grupos de amigos que precisam dividir despesas de forma justa e transparente, baseada na proporção de renda de cada participante.

## Propósito

O objetivo do CashTrack é simplificar o controle financeiro coletivo. Em vez de apenas dividir tudo por igual, o sistema permite calcular divisões proporcionais aos salários, garantindo que cada pessoa contribua de acordo com sua capacidade financeira, além de oferecer ferramentas de importação e visualização de dados.

## Recursos (Features)

- **Gestão de Pessoas:** Adicione participantes e seus respectivos salários.
- **Controle de Despesas:** Registre gastos individuais ou compartilhados.
- **Divisão Proporcional:** Cálculo automático de quanto cada um deve pagar baseado na renda total do grupo.
- **Importação de CSV:** Importe faturas de cartão de crédito ou extratos bancários com revisão manual de categorias e destinos.
- **Dashboard Visual:** Gráficos interativos (Recharts) para visualizar gastos por categoria e por pessoa.
- **Log de Atividades:** Histórico completo de todas as transações com busca avançada (incluindo busca por data).
- **Interface Moderna:** Design responsivo e elegante construído com Tailwind CSS e animações suaves com Framer Motion.
- **Persistência de Dados:** Backend robusto utilizando Node.js, Express e SQLite.

## Requisitos

Antes de começar, você precisará ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (Versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

## Como Rodar o Projeto

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/WallaceSousa88/cash-track.git
   cd cash-track
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto (opcional, o sistema usa SQLite local por padrão).

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   O aplicativo estará disponível em `http://localhost:3000`.

5. **Build para produção:**
   ```bash
   npm run build
   npm start
   ```

## Como Usar

1. **Cadastre as Pessoas:** Comece adicionando os membros do grupo e seus salários mensais.
2. **Adicione Categorias:** Personalize suas categorias de gastos (Ex: Aluguel, Mercado, Lazer).
3. **Registre Gastos:** Adicione despesas manualmente ou use a ferramenta de **Importação CSV**.
4. **Revise a Importação:** Ao importar um CSV, você pode definir para cada item se ele deve ser "Dividido" entre todos ou atribuído a uma pessoa específica.
5. **Analise os Resultados:** Use a aba de Dashboard para ver o equilíbrio de gastos e quem precisa pagar/receber de quem.

## Tecnologias Utilizadas

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide React, Framer Motion.
- **Gráficos:** Recharts.
- **Backend:** Node.js, Express, SQLite (better-sqlite3).
- **Ferramentas:** Vite, tsx.

---
Desenvolvido com ❤️ para facilitar sua vida financeira.
