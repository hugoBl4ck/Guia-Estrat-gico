# 📊 Plano de Estudos: Power BI para Gestão Operacional

## 1. Introdução aos Conceitos Fundamentais

O Power BI não é apenas uma ferramenta de gráficos, é uma plataforma completa de inteligência de negócios. Para aprender com qualidade, você deve entender seus quatro pilares fundamentais, que formam a "Jornada do Dado":

- **Extração e Limpeza (Power Query):** É o motor do BI. É aqui que você conecta suas planilhas de frota, extrações do ERP (SAP, sistemas integrados, etc.) e bancos de dados. Você usa o Power Query para "limpar" o dado (remover erros, padronizar nomes, excluir colunas vazias) antes de analisá-lo.
- **Modelagem de Dados:** É o esqueleto. Após limpar, você precisa relacionar suas informações. Exemplo: ligar a "Tabela de Locações" com a "Tabela de Veículos" usando a placa do carro num formato conhecido como _Star Schema_.
- **Cálculos Inteligentes (DAX):** O cérebro. DAX (Data Analysis Expressions) é a linguagem de fórmulas do Power BI (como se fosse um Excel avançado). Serve para criar inteligência: cruzar custos de manutenção, calcular taxa de ociosidade, tempo médio de reparo, etc.
- **Visualização (Data Viz):** A "vitrine". A construção dos dashboards interativos. Na operação, um bom visual responde perguntas rapidamente (estamos dentro da meta de disponibilidade da frota?).

---

## 2. Foco para a Área de Gestão Operacional

Dentro da gestão de operações, você deve focar em eficiência, disponibilidade e controle logístico. Centre seus estudos nestes tópicos:

1.  **Indicadores de Desempenho (KPIs):** Aprenda a calcular e visualizar:
    - **Volume:** Quantidade de locações ativas / renovações.
    - **Eficiência:** Taxa de utilização da frota (% de carros alugados vs. parados), Turnaround Time (tempo entre devolução e nova disponibilidade).
    - **Gargalos:** Índice de manutenção (preventiva vs corretiva), controle de sinistros e avarias.
2.  **Inteligência de Tempo (Time Intelligence no DAX):** Entenda como comparar a perfomance de locações e faturamento por períodos passados (ex: YoY, MoM).
3.  **Dashboards Operacionais:**
    - _Marcadores / Velocímetros (Gauges):_ Excelente para bater o olho e ver o atingimento de metas.
    - _Gráficos de Cascata:_ Para demonstrar onde está o vazamento de caixa (ex: lucro bruto -> avarias -> descontos comerciais -> lucro líquido).
    - _Matrizes (Drill-down):_ Para ir do número consolidado macro da empresa até o desempenho de uma única filial ou modelo de carro.

---

## 3. Trilhas de Ensino e Tutoriais no YouTube

Para otimizar seu aprendizado prático:

1.  **Hashtag Treinamentos (Iniciantes):** Ótimo para a primeira familiarização e construção de projetos do zero.
    - [Curso Básico de Power BI - Aula 1](https://www.youtube.com/watch?v=R9KkXfQ12-w)
    - Busque pela playlist "Intensivão de Power BI" deles no Youtube.
2.  **Planilheiros (Avançado em Dados):** Essencial para entender lógica DAX avançada e modelagem relacional perfeita.
    - [Canal Planilheiros Brasil](https://www.youtube.com/@PlanilheirosBrasil)
3.  **Karine Lago (Regras de Negócio e Visual):** Referência em criar dashboards bonitos, corporativos e diretos para diretores.
    - [Canal Karine Lago](https://www.youtube.com/@KarineLago)

---

## 4. Calendário de Estudos (Sprint de 4 Semanas)

Dedique de **4 a 6 horas por semana**.

### 🗓️ Semana 1: Extração e Tratamento (Power Query)

- **Ação:** Instale o Power BI Desktop. Exporte uma base de dados real da sua empresa (ex: histórico de manutenções ou relatório de locações do mês) em Excel ou CSV. Use o Power Query para limpar os dados, promover cabeçalhos e corrigir tipos de dados (datas, textos e números).
- **Meta:** Ter suas tabelas importadas limpas, sem linhas em branco ou informações corrompidas.

### 🗓️ Semana 2: O Esqueleto (Modelagem e Calendário)

- **Ação:** Estude sobre Tabelas Fato (acontecimentos diários, como viagens e sinistros) e Tabelas Dimensão (cadastros, como clientes, carros e filiais). Crie os relacionamentos (conexões) entre elas.
- **Extremo Foco:** Aprenda a criar e relacionar a _Tabela dCalendário_, que é o fuso-horário do seu modelo de dados inteiro.
- **Meta:** Modelo _Star Schema_ conectado e funcional.

### 🗓️ Semana 3: O Cérebro da Operação (Linguagem DAX)

- **Ação:** Crie suas primeiras Medidas (fórmulas). Aprenda `COUNTROWS`, `SUM` e `DIVIDE`. Em seguida, domine a fórmula `CALCULATE` – a função mais importante do DAX para criar filtros virtuais (ex: Calcular o total de carros, mas apenas aqueles com status "Em Manutenção").
- **Meta:** Desenvolver os 5 principais KPIs operacionais do seu setor em formato numérico certificado.

### 🗓️ Semana 4: A Vitrine (Visualização)

- **Ação:** Estude a "Regra do Z" (leitura de cima para baixo, da esquerda para a direita). Coloque cartões de totalizadores no topo. No meio, coloque as tendências do tempo. Na parte inferior, deixe tabelas para filtros detalhados. Use formatação condicional (Verde para dentro da meta, Vermelho para problema).
- **Meta:** Entregar um painel de indicadores interativo, onde um clique em uma filial ou modelo de carro filtra todos os outros gráficos automaticamente.
