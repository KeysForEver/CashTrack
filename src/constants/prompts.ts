export const PROMPT_CONTA_CORRENTE = `**Tarefa:**
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

export const PROMPT_CARTAO_CREDITO = `**Tarefa:**
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
