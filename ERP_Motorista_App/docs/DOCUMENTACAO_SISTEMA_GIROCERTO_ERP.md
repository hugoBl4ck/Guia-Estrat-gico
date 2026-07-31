# 📱 Documentação Técnica Completa: ERP Driver Finance (GiroCerto ERP)
> **Sistema de Gestão Financeira, Contábil e Operacional para Motoristas de Aplicativo (EV & Combustão)**
> **Versão**: 1.0.0 (Production) | **Arquitetura**: Offline-First + Supabase Cloud Sync

---

## 🛠️ 1. Visão Geral do Projeto & Arquitetura

O **ERP Driver Finance** (GiroCerto ERP) é uma aplicação web/PWA (*Progressive Web App*) desenvolvida para motoristas parceiros de aplicativos de mobilidade e entregas (Uber, 99, InDrive, Uber Flash, Lalamove). 

O produto resolve a dor de cabeça da falta de controle financeiro real em operações veiculares, segregando custos operacionais, parcelas de financiamento ou aluguel, seguros, custos de energia/combustível e tributação MEI.

### Pilares Fundamentais:
1. **Gestão Financeira Operacional**: Apuração exata do Custo por Quilômetro (CPK) e retenção automática em caixas virtuais de proteção (*Buckets*).
2. **Lucro Real por Hora e por KM**: Faturamento bruto menos custos operacionais reais e estimados.
3. **Offline-First Nativo**: O aplicativo funciona 100% sem conexão com a internet através de armazenamento local em IndexedDB e sincronização assíncrona em fila quando online.

---

## 💻 2. Stack Tecnológica & Infraestrutura

- **Linguagem**: TypeScript 5.2+ (Tipagem estrita de modelos financeiros e entidades).
- **Framework Frontend**: React 18.2 (Single Page Application - SPA).
- **Build & Dev Tooling**: Vite 5.1.
- **Estilização & UI**: Tailwind CSS 3.4 (Design System Dark OLED vehicular de alto contraste).
- **Ícones**: Lucide React.
- **Gráficos & Visualização**: Recharts.
- **Animações & Efeitos**: Canvas Confetti.
- **Inteligência Artificial & Voz**:
  - Web Speech API nativa (`webkitSpeechRecognition` + `speechSynthesis`).
  - Processador NLP local offline (`localAiService.ts`).
  - Leitor e Parser de Notificações (`notificationParser.ts`).
  - Leitor de QRCode / Chave de NFe de Combustível (`nfeParser.ts`).
- **Persistência de Dados & Offline**:
  - Armazenamento local primário em **IndexedDB** (`indexedDBService.ts` / `db.ts`).
  - Padrão Repository e Fila de Sincronização (`repository.ts` / `syncErrorState.ts`).
  - Sincronização e Autenticação Cloud via **Supabase** (`supabaseClient.ts`).
- **PWA & Offline Worker**:
  - Service Worker Daemon (`public/sw.js`).
  - Web Application Manifest (`public/manifest.json`).
- **Resiliência & Telemetria**:
  - Componente de captura de exceções `ErrorBoundary.tsx`.
  - Agente Auditor Interno `anomalyDetector.ts` (Detecção de lançamentos duplicados e despesas atípicas).
  - Vercel Analytics & Speed Insights (`@vercel/analytics`, `@vercel/speed-insights`).
- **Testes**: Vitest (`financeReducer.test.ts`, `financialCalculators.test.ts`, `supabaseSecurity.test.ts`).

---

## ⚙️ 3. Mapeamento Detalhado dos Módulos e Funções

### A. Módulo Financeiro & Calculadoras (`src/utils/financialCalculators.ts`)

1. **`calculateCPK(vehicle: Vehicle): CpkBreakdown`**:
   - **Lógica**: Computa o Custo Por Quilômetro (CPK) dinâmico do veículo. Segrega custos fixos (Financiamento/Aluguel, Seguro, IPVA) e variáveis (Energia/Combustível, Manutenção e Depreciação).
   - **Para Elétricos (EV)**: Considera a tarifa residencial/pública de energia (R$/kWh) e o consumo (km/kWh). Manutenção preventiva EV fixada em ~R$ 0,045/km.
   - **Para Combustão / Flex**: Considera preço do combustível (Etanol/Gasolina) e consumo urbano (km/L). Manutenção em ~R$ 0,085/km e depreciação em R$ 0,14/km.

2. **`calculateShiftSummary(activeShift, earnings, expenses, vehicle, cpk): ShiftSummary`**:
   - **Lógica**: Consolida os dados do turno ativo ou período, fornecendo Faturamento Bruto, Custos Operacionais Totais, Lucro Líquido Real, R$/KM Bruto, R$/KM Líquido, R$/Hora Bruta, R$/Hora Líquida e Margem de Lucro (%).

---

### B. Agente Auditor Interno (`src/services/anomalyDetector.ts`)

1. **`runAnomalyAudit(earnings: Earning[], expenses: Expense[]): AuditAnomaly[]`**:
   - **Lógica**: Executa auditoria automática em busca de anomalias nos lançamentos:
     - *Duplicidades*: Faturamentos com mesmo valor e plataforma adicionados em intervalo inferior a 1 hora.
     - *Tarifas Atípicas*: Despesas de recargas ou combustíveis com preços abusivos.
     - Exibe alertas de anomalia diretamente no Dashboard HUD.

---

### C. Motor de Voz & IA Offline (`src/services/localAiService.ts`)

1. **`localAiEngine.parseCommandOffline(text: string): LocalAiParseResult | null`**:
   - **Lógica**: Processador de Linguagem Natural (NLP) em português. Utiliza expressões regulares avançadas para extrair valores em Reais (BRL), plataformas (`Uber`, `99Pop`, `InDrive`) ou categorias de despesas (`MAINTENANCE`, `ELECTRIC_CHARGING`, `WASH`, `OIL_CHANGE`), além de quantidade de corridas e quilometragem.

---

### D. Reducer Financeiro Imutável (`src/services/financeReducer.ts`)

1. **`financeReducer(state: FinanceState, action: FinanceAction): FinanceState`**:
   - **Lógica**: Gerenciador de estado central da aplicação com suporte a Desfazer (`UNDO_LAST_ACTION`).
   - Ações suportadas:
     - `ADD_EARNING` / `EDIT_EARNING` / `SOFT_DELETE_EARNING`: Altera ganhos e redistribui percentuais nos caixas virtuais de reserva.
     - `ADD_EXPENSE` / `SOFT_DELETE_EXPENSE`: Registra despesas e realiza abate automático do caixa correspondente (`MAINTENANCE` ou `FREE_CASH`).
     - `START_SHIFT` / `END_SHIFT`: Abre e fecha turnos de trabalho salvando odômetro e horário.
     - `UPDATE_BUCKETS`: Atualiza metas e percentuais de alocação das reservas.

---

### E. Camada de Persistência Offline-First (`src/services/db.ts` & `src/services/repository.ts`)

1. **`dbService.loadInitialDataFromIndexedDB()`**:
   - **Lógica**: Carrega com segurança do IndexedDB todas as coleções de ganhos, despesas, turno ativo, caixas e veículos, realizando migração automática caso existam dados legados no `localStorage`.

2. **`DataRepository` & Fila de Sync Cloud**:
   - **Lógica**: Ao realizar qualquer alteração, o estado é gravado de imediato no armazenamento local IndexedDB. Se o usuário estiver autenticado e online, o repositório insere o trabalho na `SyncQueueJob` e sincroniza com o Supabase através do método `flushSyncQueue()`.

---

### F. Relatório Fiscal MEI & Exportação (`src/components/CostCenterView.tsx` & `TaxOnlyReportView.tsx`)

1. **Cálculo da Isenção Fiscal MEI (60% Isento)**:
   - **Lógica** (Instrução Normativa RFB nº 1.500/2014):
     - `Faturamento Isento (60%) = Receita Bruta Total * 0.60` (Totalmente isento de IRPF).
     - `Parcela Tributável Bruta (40%) = Receita Bruta Total * 0.40`.
     - `Rendimento Tributável Líquido = Max(0, Parcela Tributável Bruta - Despesas Operacionais Comprovadas)`.
     - Como as despesas comprovadas do veículo geralmente superam os 40%, o valor tributável resulta em **R$ 0,00**.

2. **Exportação CSV / Excel**:
   - **Lógica**: Gera relatórios formatados em `.csv` codificados em UTF-8 contendo a DRE Operacional, Centros de Custo (CC-01 Veículo, CC-02 Operacional, CC-03 Impostos, CC-04 Pessoal) e demonstrativo fiscal.

---

## 🚀 4. Guia de Instalação e Execução

### Pré-requisitos
- Node.js 18.x ou superior
- npm ou yarn

### Passos
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento local
npm run dev

# 3. Executar a suíte de testes unitários
npm run test

# 4. Compilar para produção
npm run build
```

---

## 📝 5. Diretrizes de Contribuição & Regras de Código

1. **Manter Tipagem TypeScript Estrita**: Todas as entidades financeiras e de veículos devem estar tipadas em `src/types/index.ts`.
2. **Preservar a Lógica Financeira**: Não alterar as regras de retenção em caixas virtuais ou fórmulas do CPK sem atualizar os testes correspondentes.
3. **Princípio Offline-First**: Qualquer nova funcionalidade de dados deve funcionar perfeitamente sem conexão com a internet.
