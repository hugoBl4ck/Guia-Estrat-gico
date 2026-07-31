# ERP Driver Finance (GiroCerto ERP) 🚗📊
> **O Primeiro ERP de Alta Precisão Operacional e Financeira para Motoristas de Aplicativo (EV & Combustão)**

---

## 📌 Visão Geral do Produto

O **ERP Driver Finance** (GiroCerto ERP) é uma solução de Gestão de Recursos Empresariais (ERP) sob medida para motoristas parceiros de aplicativos de mobilidade (Uber, 99Pop, InDrive) e entregas (Uber Flash, Lalamove, Rappi). 

Diferente de aplicativos genéricos de finanças pessoais que tratam a renda do motorista como salário fixo, o ERP Driver Finance enxerga o veículo como uma **unidade de negócio móvel**. Seu objetivo é capacitar o motorista a gerenciar a atividade com foco em **Lucro Real por KM e por Hora**, gerenciando custos fixos, variáveis, depreciação veicular e impostos MEI.

---

## 🚀 Proposta de Valor & Diferenciais

| Funcionalidade | App Financeiro Comum (Mobills, Excel) | ERP Driver Finance |
| :--- | :--- | :--- |
| **Métrica Principal** | Entradas - Saídas | **Lucro Real Líquido por KM (CPK) e por Hora Trabalhada** |
| **Depreciação Veicular** | Ignorada | **Calculada dinamicamente por KM rodado ou modalidade (EV x Combustão)** |
| **Proteção de Caixa** | Não possui | **Retenção automática em Caixas Virtuais (Buckets) para Manutenção/MEI** |
| **Ponto de Equilíbrio** | Não calcula | **Break-Even Dynamics Diário (Metas Leve, Moderada e Agressiva)** |
| **Suporte EV / Elétrico** | Inexistente | **Simulador de Recargas (% Bateria / kWh / Coelba vs. Eletropostos)** |
| **Uso em Trânsito** | Inviável (muitos cliques) | **Assistente de Voz Hands-Free e HUD OLED de Alto Contraste** |
| **Resiliência Offline** | Exige conexão contínua | **Offline-First nativo com IndexedDB + Fila de Sync no Supabase** |
| **Impostos MEI / IRPF** | Manual / Estimado | **Cálculo da Regra dos 60% Isentos (Instrução Normativa RFB nº 1.500/2014)** |

---

## 🔑 Funcionalidades Core

### 1. 📈 Dashboard Operacional (HUD & Modos de Visualização)
- **Modo Direção (HUD)**: Visualização em altíssimo contraste projetada para suporte veicular no celular.
- **Ponto de Equilíbrio & Metas Diárias**: Barra de progresso dinâmica baseada em 3 perfis (**Leve**, **Moderada** e **Agressiva**).
- **Indicadores em Tempo Real**: Faturamento Bruto, R$/KM Bruto, R$/KM Líquido, R$/Hora Bruta, R$/Hora Líquida e Margem de Lucro (%).

### 2. 🛞 Gestão de Veículos e Custo por KM (CPK)
- **Custos Fixos**: Parcela de Financiamento/Aluguel, Seguro Auto, IPVA/Licenciamento, DAS-SIMEI e Lavagens.
- **Custos Variáveis**: Combustível (Gasolina, Etanol, GNV, Recarga EV), Óleo, Pneus, Manutenção Preditiva e Depreciação.
- **Suporte Híbrido**: Perfis pré-configurados para veículos elétricos (ex: BYD Dolphin Mini) e a combustão (ex: Ford Ka Flex).

### 3. 🏦 Caixas Virtuais de Proteção Financeira (Buckets)
- Divisão imutável e automática de faturamento bruto nos caixas:
  - 🟢 **Lucro Livre (Disponível)**: Dinheiro liberado para transferência pessoal.
  - 🟡 **Reserva de Manutenção**: Fundo retido por KM para trocas de óleo, pneus e revisões.
  - 🔵 **Reserva de Depreciação**: Valor retido para quitação ou futura troca de veículo.
  - 🔴 **Reserva MEI / Impostos**: Guia mensal tributária acumulada diariamente.

### 4. ⚡ Calculadoras Inteligentes (Flex & Elétrico)
- **Calculadora Flex Fuel**: Comparativo dinâmico do ponto de paridade Etanol x Gasolina baseado no consumo real (km/L).
- **Calculadora Elétrica**: Simulação de custo por % de bateria ou kWh (Coelba residencial vs Eletropostos rápidos).

### 5. 🎙️ Registrador por Voz & Agente Auditor Interno
- **Copiloto por Voz**: Registro por comando de voz (*Hands-Free*) para corridas e abastecimentos sem tirar a atenção do trânsito.
- **Auditor de Anomalias**: Alertas automáticos no dashboard sobre duplicidades de corridas ou tarifas de recarga atípicas.

---

## 🛠️ Stack Tecnológica & Arquitetura

- **Frontend**: React 18, TypeScript 5, Vite 5, Tailwind CSS, Lucide React, Recharts, Canvas Confetti.
- **Estado**: Architecture Reducer imutável ([src/services/financeReducer.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/financeReducer.ts)).
- **Armazenamento Offline-First**: IndexedDB via [indexedDBService.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/indexedDB.ts).
- **Nuvem & Sync**: Supabase PostgreSQL + Auth + RLS + Fila de Sync (`DataRepository`).
- **Testes Unitários**: Vitest (`npm run test`).

---

## 📁 Estrutura de Documentação do Projeto

Toda a documentação técnica oficial está organizada na pasta [`docs/`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/docs):

- 📘 [`docs/DOCUMENTACAO_SISTEMA_GIROCERTO_ERP.md`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/docs/DOCUMENTACAO_SISTEMA_GIROCERTO_ERP.md): Documentação Técnica Completa e Mapeamento de Funções
- 🏗️ [`docs/ARCHITECTURE.md`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/docs/ARCHITECTURE.md): Arquitetura de Software e PWA Offline-First
- 📘 [`docs/FINANCIAL_MODEL_ERP.md`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/docs/FINANCIAL_MODEL_ERP.md): Fórmulas Financeiras e Modelo Contábil de CPK
- 🌐 [`docs/API_SPECIFICATION.md`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/docs/API_SPECIFICATION.md): Especificação da API RESTful e Contratos JSON
- 🎨 [`docs/UX_UI_DESIGN_SYSTEM.md`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/docs/UX_UI_DESIGN_SYSTEM.md): Design System Dark OLED Vehicular UX
- 💡 [`docs/INSIGHTS_E_INOVACAO.md`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/docs/INSIGHTS_E_INOVACAO.md): Assistente de Voz, Gamificação e Manutenção Preditiva
- 🗄️ [`docs/BANCO_DE_DADOS_SUPABASE_GUIA.md`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/docs/BANCO_DE_DADOS_SUPABASE_GUIA.md): Guia de Configuração e RLS do Supabase
- 💵 [`docs/PLANO_DE_EXECUCAO_GRATUITO_E_UPGRADES.md`](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/docs/PLANO_DE_EXECUCAO_GRATUITO_E_UPGRADES.md): Estratégia Custo Zero ($0) e Upgrades Freemium

---

## 💻 Comandos Rápidos

```bash
# Instalar dependências do projeto
npm install

# Iniciar servidor de desenvolvimento local
npm run dev

# Executar a suíte de testes unitários com Vitest
npm run test

# Compilar versão de produção
npm run build
```
