# WithLove4Janis

**WithLove4Janis** é uma aplicação full-stack moderna para gestão de finanças compartilhadas. Ideal para casais, repúblicas ou grupos de amigos que precisam dividir despesas de forma justa e transparente, baseada na proporção de renda de cada participante.

## Propósito

O objetivo do WithLove4Janis é simplificar o controle financeiro coletivo. Em vez de apenas dividir tudo por igual, o sistema permite calcular divisões proporcionais aos salários, garantindo que cada pessoa contribua de acordo com sua capacidade financeira, além de oferecer ferramentas de importação, visualização e auditoria de dados.

## Recursos (Features)

- **Gerenciar Pessoas:** Adicione participantes e seus respectivos salários.
- **Gerenciar Categoria:** Personalize suas categorias de gastos (Ex: Aluguel, Mercado, Lazer).
- **Controle de Despesas e Entradas:** Registre gastos individuais ou compartilhados e acompanhe os rendimentos.
- **Resumo Detalhado:** Tela de resumo por pessoa com histórico completo, incluindo colunas para **Data de Compra** e **Data de Pagamento**.
- **Edição Rápida:** Altere valores e categorias diretamente na tabela de resumo para correções instantâneas.
- **Importação Inteligente:** Importe faturas de cartão de crédito ou extratos bancários (CSV) com revisão manual de categorias e destinos.
- **Dashboard Visual:** Gráficos interativos (Recharts) para visualizar gastos por categoria e por pessoa (Barras e Pizza).
- **Log de Auditoria:** Histórico completo de todas as transações e alterações com busca avançada.
- **Exportação para Excel:** Gere relatórios em formato `.xlsx` para análise externa.
- **Backup e Restauração:** Proteja seus dados com funções de backup e restauração via arquivo ZIP.
- **Interface Moderna:** Design responsivo construído com Tailwind CSS e animações suaves com Framer Motion.

## Requisitos

Antes de começar, você precisará ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (Versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

## Como Rodar o Projeto

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/WallaceSousa88/with-love-4-janis.git
   cd with-love-4-janis
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   O aplicativo estará disponível em `http://localhost:3000`.

4. **Build para produção:**
   ```bash
   npm run build
   ```

## Como Usar

1. **Cadastre as Pessoas:** Comece adicionando os membros do grupo em "Gerenciar Pessoas".
2. **Adicione Categorias:** Personalize suas categorias em "Gerenciar Categoria".
3. **Registre Gastos:** Adicione despesas manualmente em "Adicionar Despesa" ou use a ferramenta de **Importação CSV**.
4. **Revise a Importação:** Ao importar um CSV, você pode definir para cada item se ele deve ser "Dividido" entre todos ou atribuído a uma pessoa específica.
5. **Analise os Resultados:** Use o Dashboard e a tela de Resumo para ver o equilíbrio de gastos e quem precisa pagar/receber de quem.

## Tecnologias Utilizadas

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide React, Framer Motion.
- **Gráficos:** Recharts.
- **Backend:** Node.js, Express, SQLite (better-sqlite3).
- **Ferramentas:** Vite, tsx, ExcelJS.