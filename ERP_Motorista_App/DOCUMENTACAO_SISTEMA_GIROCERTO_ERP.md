# 📱 Documentação Técnica Completa: GiroCerto ERP
> **Sistema de Gestão Financeira, Contábil e Operacional para Motoristas de Aplicativo (EV & Combustão)**
> **Versão**: 1.0.0 (Production) | **Deploy**: [https://erp-motorista-app.vercel.app](https://erp-motorista-app.vercel.app)

---

## 🛠️ 1. Visão Geral do Projeto & Arquitetura

O **GiroCerto ERP** é um aplicativo PWA (*Progressive Web App*) de alta performance projetado para motoristas de aplicativo (Uber, 99Pop, InDrive e Corridas Particulares) operando veículos elétricos (ex: **BYD Dolphin Mini GS 38,8 kWh**) e a combustão (ex: **Ford Ka 1.0 Flex**).

O sistema resolve a dor de cabeça da falta de controle financeiro real, segregando custos operacionais, parcela de financiamento (Santander 48x R$ 3.086,58), seguro auto (Aliro R$ 299,71/mês), tarifas de energia (Coelba R$ 1,21/kWh x Eletropostos R$ 1,69/kWh) e isenção fiscal do MEI (60% Isento de IRPF).

---

## 💻 2. Stack Tecnológica & Linguagens Utilizadas

- **Linguagem Principal**: TypeScript 5.2+ (Tipagem estrita para modelos financeiros e entidades).
- **Framework Frontend**: React 18.2 (Single Page Application - SPA).
- **Ferramenta de Build**: Vite 5.1 (Compilação ultrarrápida em 2,8s).
- **Estilização**: Tailwind CSS 3.4 (Design escuro OLED anti-burn-in com gradientes e glassmorphism).
- **Ícones**: Lucide React.
- **Efeitos de UX**: Canvas Confetti.
- **Inteligência Artificial & Voz**:
  - Web Speech API nativa (`webkitSpeechRecognition` + `speechSynthesis`).
  - Motor de IA NLP Offline (`LocalAiEngine`).
- **Persistência de Dados**:
  - `dbService`: LocalStorage + IndexedDB no navegador.
  - `DataRepository`: Padrão Repository para abstração offline-first.
  - `schema.sql`: Estrutura relacional para banco de dados cloud em PostgreSQL / Supabase.
- **PWA & Offline**:
  - Service Worker Daemon (`public/sw.js`).
  - Web Application Manifest (`public/manifest.json`).
- **Resiliência & Telemetria**:
  - Componente de captura de exceções `ErrorBoundary`.
  - Agente Auditor Interno `runAnomalyAudit` (Detecção de lançamentos duplicados e despesas atípicas).
  - Vercel Real-time Analytics (`@vercel/analytics`).
  - Vercel Speed Insights (`@vercel/speed-insights`).
- **Hospedagem & Infraestrutura**: Vercel Edge Network com SSL/HTTPS ativo.

---

## ⚙️ 3. Mapeamento Detalhado da Lógica e Funções por Módulo

### A. Módulo Financeiro & CPK (`src/utils/financialCalculators.ts`)

1. **`calculateCPK(vehicle: Vehicle): CPKCalculation`**:
   - **Lógica**: Calcula o Custo por Quilômetro do veículo ativo. Para EV, divide a tarifa da Coelba (R$ 1,21/kWh) pela eficiência (7,2 km/kWh) obtendo R$ 0,168/km de energia, soma R$ 0,045/km de manutenção e dilui os custos fixos diários (parcela Santander R$ 3.086,58/mês + seguro Aliro R$ 299,71/mês) pelo KM rodado. Para a combustão, divide o Etanol (R$ 4,65/L) por 9,5 km/L (R$ 0,489/km) e adiciona a troca de óleo 5W20.

2. **`calculateShiftSummary(activeShift, earnings, expenses, vehicle, cpk): ShiftSummary`**:
   - **Lógica**: Consolidação em tempo real do turno. Soma faturamento bruto (corridas + gorjetas), subtrai as despesas operacionais reais cadastradas (recargas, combustível, conserto de pneu), calcula os KM rodados (odômetro final - inicial), as horas ativas e gera os 4 indicadores de desempenho: **R$/KM Bruto**, **R$/KM Líquido**, **R$/Hora Bruta** e **R$/Hora Líquida**.

---

### B. Agente Auditor Interno (`src/services/anomalyDetector.ts`)

1. **`runAnomalyAudit(earnings: Earning[], expenses: Expense[]): AuditAnomaly[]`**:
   - **Lógica**: Varre a lista de faturamentos e despesas procurando duas anomalias operacionais:
     - *Duplicidade*: Dois faturamentos da mesma plataforma e mesmo valor lançados no intervalo de 1 hora.
     - *Tarifa Elevada*: Despesa de recargas com tarifa superior a R$ 2,50/kWh. Retorna alertas exibidos em destaque no topo do Dashboard.

---

### C. Motor de IA Local Offline (`src/services/localAiService.ts`)

1. **`localAiEngine.parseCommandOffline(text: string): LocalAiParseResult | null`**:
   - **Lógica**: Processador de Linguagem Natural (NLP) em português. Utiliza expressões regulares para extrair valores em BRL/R$/reais, identificar a plataforma (Uber, 99Pop, InDrive) ou a categoria da despesa (pneu/furo/borracharia $\rightarrow$ MAINTENANCE, lava-jato $\rightarrow$ WASH, recarga $\rightarrow$ ELECTRIC_CHARGING, óleo $\rightarrow$ OIL_CHANGE), além de extrair distância em KM e número de corridas.

---

### D. Reducer de Estados Finitos (`src/services/financeReducer.ts`)

1. **`financeReducer(state: FinanceState, action: FinanceAction): FinanceState`**:
   - **Lógica**: Máquina de estados finitos imutável. Processa as seguintes ações sem risco de corrida ou mutação indevida:
     - `ADD_EARNING`: Adiciona o ganho e distribui automaticamente nos caixas (65% Lucro Livre, 10% Manutenção, 20% Depreciação, 5% Impostos MEI).
     - `DELETE_EARNING`: Subtrai o faturamento e ajusta proporcionalmente o saldo dos caixas.
     - `ADD_EXPENSE`: Registra a saída e abate automaticamente do caixa de Manutenção (se for pneu/óleo) ou do Lucro Livre.
     - `DELETE_EXPENSE`: Estorna o valor da despesa de volta ao caixa correspondente.
     - `START_SHIFT` / `END_SHIFT`: Abre ou fecha o turno ativo.
     - `RESET_DATA` / `RESTORE_MOCK`: Reseta dados mantendo custos fixos reais ou restaura os exemplos demonstrativos.

---

### E. Repositório Offline-First (`src/services/repository.ts` & `src/services/db.ts`)

1. **`DataRepository.loadData()`**:
   - **Lógica**: Lê do banco de dados local (`IndexedDB`/`LocalStorage`) os ganhos, despesas, turno ativo, caixas e registros de uso particular salvos no dispositivo.

2. **`DataRepository.saveData(state)`**:
   - **Lógica**: Salva o estado atualizado no armazenamento persistente a cada ação executada.

3. **`DataRepository.syncWithCloud()`**:
   - **Lógica**: Interface preparada para sincronização de fundo quando houver conexão com o Supabase/PostgreSQL.

---

### F. Registrador de Service Worker PWA (`src/services/serviceWorkerRegistration.ts`)

1. **`registerServiceWorker()`**:
   - **Lógica**: Verifica se o navegador suporta Service Worker e se a aplicação está rodando sob HTTPS. Registra o arquivo `/sw.js` para garantir o funcionamento offline e cache dos arquivos estáticos.

---

### G. Resiliência & Error Boundary (`src/components/ErrorBoundary.tsx`)

1. **`ErrorBoundary.getDerivedStateFromError(error)` & `componentDidCatch(error, info)`**:
   - **Lógica**: Trata exceções não capturadas no React em produção. Impede a tela branca e exibe um modal de recuperação amigável mantendo os dados salvos intactos.

---

### H. Exportação de Relatórios e Lógica Fiscal (`src/components/CostCenterView.tsx` & `TaxOnlyReportView.tsx`)

1. **`handleExportCSV()`**:
   - **Lógica**: Concatena os dados da DRE, Isenção Fiscal MEI, Centros de Custos CC-01 a CC-04, e o extrato analítico de corridas/despesas em um arquivo `.csv` codificado em UTF-8 com suporte para abertura direta no Microsoft Excel.

2. **Cálculo da Isenção MEI 60%**:
   - **Lógica**:
     - `exemptIncome = totalRevenue * 0.60`: Parcela 100% Isenta de IRPF por lei.
     - `grossRemnant = totalRevenue * 0.40`: Parcela de 40% remanescente.
     - `taxableIncome = Math.max(0, grossRemnant - totalExpenses)`: Subtrai as despesas operacionais reais do livro caixa. Como as despesas superam os 40%, o valor tributável resulta em **R$ 0,00**.

---

### I. Calculadora por % de Bateria (`src/components/ElectricChargingCalculator.tsx`)

1. **Simulação por % de Bateria**:
   - **Lógica**: Para uma bateria de 38,8 kWh (BYD Dolphin Mini), a cada 1% consome 0,388 kWh. Exemplo: 28% de uso = $28 \times 0,388 = \mathbf{10,86 \text{ kWh}}$.
   - Custo Residencial Coelba = $10,86 \times \text{R\$ } 1,21 = \mathbf{\text{R\$ } 13,15}$.
   - Custo Eletroposto Rápido = $10,86 \times \text{R\$ } 1,69 = \mathbf{\text{R\$ } 18,36}$.

---

## 🤖 4. Prompt de Apresentação com Lógica de Funções para Outras IAs (LLMs)

*Você pode copiar e colar o texto abaixo em modelos de IA (como Gemini 1.5 Pro, Claude 3.5 Sonnet ou GPT-4o) para solicitar refatoração ou novas funções:*

```text
Olá! Este é o resumo técnico das funções e da lógica de negócios do aplicativo GiroCerto ERP (React 18, TypeScript 5, Vite, Tailwind CSS).

MAPA DE FUNÇÕES E LÓGICA DO SISTEMA:
1. calculateCPK(vehicle): Computa o Custo por KM segregando veículo elétrico (tarifa Coelba R$ 1,21/kWh ÷ 7,2 km/kWh = R$ 0,168/km) de combustão (Etanol R$ 4,65/L ÷ 9,5 km/L = R$ 0,489/km) e somando os custos fixos diários (Santander R$ 3.086,58 + Seguro Aliro R$ 299,71).
2. calculateShiftSummary(...): Calcula em tempo real o Lucro Real Líquido, Custo Operacional, KM rodado, Horas ativas, e as métricas R$/KM Bruto, R$/KM Líquido, R$/Hora Bruta e R$/Hora Líquida.
3. runAnomalyAudit(earnings, expenses): Agente auditor interno que varre lançamentos para detectar duplicidades (mesmo valor e plataforma em <1h) e recargas com tarifa acima de R$ 2,50/kWh.
4. parseCommandOffline(text): Processador NLP de IA offline em português com expressões regulares estritas para extração de valores em BRL/R$/reais, plataformas (Uber/99/InDrive) e categorias de despesa (pneu, lava-jato, abasteci, recarga).
5. financeReducer(state, action): Reducer determinístico imutável que gerencia a entrada/saída de ganhos e despesas, aplicando a divisão automática de caixas (65% Lucro Livre, 10% Manutenção EV, 20% Depreciação, 5% MEI).
6. DataRepository.loadData() / saveData(): Camada de repositório offline-first com persistência em IndexedDB e LocalStorage.
7. handleExportCSV(): Exporta a DRE, Tabela de Isenção MEI 60%, Centros de Custos CC-01/02/03/04 e o Extrato Analítico para arquivo Excel (.CSV).
8. Regra Tributária MEI 60%: Aplica a Instrução Normativa RFB nº 1.500/2014, calculando 60% do faturamento bruto como isento e subtraindo as despesas reais dos 40% remanescentes, resultando em IRPF R$ 0,00.

Com base nesse mapeamento de funções e regras de negócio, analise o código e sugira 5 otimizações de performance ou arquitetura.
```
