# Gemini Context — ERP_Motorista_App

## Projeto

Este workspace contém o ERP Driver Finance, uma aplicação web/PWA voltada para motoristas de aplicativo que precisam controlar finanças, custos operacionais, despesas, turnos, combustível e indicadores de lucro real.

O produto é orientado a três pilares principais:
- gestão financeira operacional;
- métricas de lucro real por hora e por km;
- uso offline-first em cenários móveis e de baixa conectividade.

## Objetivo do produto

O sistema ajuda o motorista a transformar a atividade em uma operação gerenciável, com foco em:
- cálculo de CPK (custo por km);
- reservas para manutenção, depreciação e impostos;
- controle de turnos e receitas;
- acompanhamento financeiro em tempo real;
- suporte a uso em trânsito com interface simplificada.

## Stack principal

- React 18
- TypeScript
- Vite 5
- Tailwind CSS
- Lucide React
- Recharts
- Supabase (auth + banco + segurança)
- Vercel Analytics / Speed Insights
- Vitest para testes

## Arquitetura geral

A aplicação segue uma abordagem de frontend reativo com domínio financeiro bem definido e camada de persistência local para operação offline.

### Estrutura conceitual
- frontend React + TypeScript + Tailwind para interface;
- camada de serviços para regras de negócio, persistência e integração;
- banco local/offline para escrita imediata;
- sincronização com Supabase quando houver conexão.

### Padrões importantes
- Offline-first: ações devem funcionar mesmo sem rede;
- persistência local antes da sincronização;
- regras financeiras devem ser preservadas com precisão;
- foco em experiência mobile e uso em movimento.

## Estrutura do projeto

- src/App.tsx: ponto principal da aplicação
- src/components/: componentes reutilizáveis da interface
- src/services/: regras de negócio, persistência, integração e sincronização
- src/types/: tipos TypeScript do domínio
- src/utils/: utilidades auxiliares
- public/: assets estáticos, service worker, manifest
- data/: dados de exemplo ou referência
- database/: artefatos relacionados ao banco
- docs/: documentação complementar

## Arquivos-chave

- README.md: visão geral do produto e proposta de valor
- ARCHITECTURE.md: arquitetura técnica e estratégia offline-first
- API_SPECIFICATION.md: contrato e endpoints esperados da API
- DATABASE_SCHEMA.sql: modelo de dados relacional
- FINANCIAL_MODEL_ERP.md: regras financeiras e fórmulas do ERP
- UX_UI_DESIGN_SYSTEM.md: diretrizes visuais e de interação

## Regras de desenvolvimento

### 1. Preservar a lógica financeira
Sempre tenha cuidado ao alterar:
- cálculos de lucro;
- buckets/caixas virtuais;
- CPK;
- despesas, combustível e manutenção;
- turnos e resumo operacional.

Essas regras são centrais para o produto e devem ser mantidas com precisão.

### 2. Manter compatibilidade com o modelo offline-first
Antes de implementar mudanças, considere:
- se a ação precisa funcionar sem conexão;
- se a escrita local deve ser preservada;
- se a sincronização futura pode depender do novo fluxo.

### 3. Preferir padrões já existentes
O projeto já possui módulos de serviço e abstrações de repositório. Ao adicionar features, tente seguir o padrão já usado em:
- src/services/repository.ts
- src/services/db.ts
- src/services/financeReducer.ts
- src/services/supabaseClient.ts

### 4. Cuidar da experiência mobile
A aplicação é voltada a uso em trânsito e em contexto operacional. O design deve priorizar:
- simplicidade;
- contraste alto;
- pouca fricção para registro rápido;
- clareza visual de métricas financeiras.

## Comandos úteis

- npm install
- npm run dev
- npm run build
- npm run test

## Convenções de código

- usar TypeScript sempre que possível;
- manter nomes claros e expressivos;
- separar regra de negócio de UI;
- preferir componentes pequenos e reutilizáveis;
- manter lógica financeira centralizada em services;
- adicionar ou atualizar testes quando alterar comportamento importante.

## Pontos sensíveis para mudanças

Evite regressões em:
- persistência local;
- sincronização com Supabase;
- cálculos financeiros baseados em moeda e métricas operacionais;
- experiência PWA/offline;
- estrutura de dados de turnos, despesas e receitas.

## Estilo de resposta esperável para mudanças

Ao trabalhar neste projeto, priorize:
1. entendimento do contexto financeiro e operacional;
2. preservação das regras de negócio;
3. implementação simples e segura;
4. documentação ou comentários quando a lógica for complexa.
