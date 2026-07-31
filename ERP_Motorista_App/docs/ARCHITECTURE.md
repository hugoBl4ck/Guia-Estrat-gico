# Arquitetura de Software & Design de Sistema (ERP Driver Finance)

Este documento especifica a arquitetura técnica, stack tecnológica, fluxo de dados, modelo offline-first e padrões de segurança do **ERP Driver Finance** (GiroCerto ERP).

---

## 1. Visão Geral da Arquitetura

O ERP Driver Finance adota uma arquitetura **Offline-First PWA (Single Page Application)**, garantindo que o motorista consiga registrar corridas, turnos, despesas e abastecimentos mesmo quando estiver em locais de baixa ou nenhuma conectividade (garagens, túneis, rodovias).

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CAMADA DE INTERFACE (CLIENTE)                         │
│                                                                                 │
│   ┌───────────────────────────┐         ┌───────────────────────────────────┐   │
│   │    React 18 + TypeScript  │         │    Modo Direção (Dashboard HUD)  │   │
│   │    - Tailwind CSS OLED    │         │    - Assistente de Voz (WebSpeech)│   │
│   │    - Recharts + Confetti  │         │    - Leitor QRCode NFe / Cupom    │   │
│   └─────────────┬─────────────┘         └─────────────────┬─────────────────┘   │
│                 │                                         │                     │
│                 └───────────────────┬─────────────────────┘                     │
│                                     │                                           │
│                         ┌───────────▼───────────┐                               │
│                         │  financeReducer.ts    │  (Máquina de Estados)         │
│                         └───────────┬───────────┘                               │
│                                     │                                           │
│                         ┌───────────▼───────────┐                               │
│                         │   IndexedDB Local     │  ◄── (Escrita Imediata)       │
│                         └───────────┬───────────┘                               │
└─────────────────────────────────────┼───────────────────────────────────────────┘
                                      │  HTTPS (Supabase JS Client / REST / RLS)
┌─────────────────────────────────────▼───────────────────────────────────────────┐
│                           CAMADA CLOUD & PERSISTÊNCIA                           │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                   DataRepository + Sync Queue Engine                    │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│         ┌──────────────────────────────┴──────────────────────────────┐         │
│         ▼                                                             ▼         │
│  ┌──────────────┐                                             ┌──────────────┐  │
│  │ Supabase Auth│                                             │ Supabase DB  │  │
│  │ (Auth / RLS) │                                             │ (PostgreSQL) │  │
│  └──────────────┘                                             └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack Real do Aplicativo

### Frontend (Web & PWA)
- **Framework**: Vite 5 + React 18 com TypeScript 5.2+.
- **Gerenciamento de Estado**: React `useReducer` com arquitetura imutável de Reducer ([financeReducer.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/financeReducer.ts)).
- **Persistência Local Offline-First**: Armazenamento nativo em IndexedDB com migração legada de LocalStorage ([indexedDB.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/indexedDB.ts), [db.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/db.ts) e [repository.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/repository.ts)).
- **Service Worker PWA**: Registrador e Service Worker em [public/sw.js](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/public/sw.js) e [manifest.json](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/public/manifest.json) com política Network-First e cache estático.
- **UI Components & Estilo**: Tailwind CSS com tema OLED de alto contraste, Lucide Icons, Recharts e Canvas Confetti.

### Nuvem & Banco de Dados (Cloud Sync)
- **Banco de Dados Cloud**: Supabase (PostgreSQL relacional) com schema em [DATABASE_SCHEMA.sql](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/DATABASE_SCHEMA.sql).
- **Autenticação & Segurança**: Supabase Auth com políticas RLS (*Row Level Security*) validadas por testes automatizados em [supabaseSecurity.test.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/supabaseSecurity.test.ts).

---

## 3. Estratégia Offline-First & Sincronização em Fila

1. **Escrita Local Imediata (< 5ms)**: Toda ação executada pelo usuário (adicionar corrida, registrar despesa, alternar turno) atualiza a máquina de estados `financeReducer` e persiste imediatamente no IndexedDB.
2. **Fila de Sincronização (`SyncQueueJob`)**:
   - As alterações pendentes são organizadas em uma fila persistente (`SYNC_QUEUE_KEY`).
   - O repositório `DataRepository.flushSyncQueue()` tenta descarregar os jobs pendentes enviando snapshots sincronizados ao Supabase.
   - Erros de sincronização são registrados via `syncErrorService` e apresentados no painel.
3. **Identificadores Únicos**:
   - Registros de corridas e despesas utilizam UUIDs gerados no cliente para garantir idempotência e evitar duplicação na nuvem.

---

## 4. Segurança & Proteção de Dados (LGPD / RLS)

- **Criptografia em Trânsito**: HTTPS com SSL/TLS ativo em ambiente de produção (Vercel Edge Network).
- **Isolamento de Dados (RLS)**: Regras de segurança no PostgreSQL garantem que cada motorista acesse estritamente suas próprias corridas, despesas e configurações veiculares.
- **Exportação & Portabilidade**: Funcionalidade de exportação completa do livro caixa e extratos em formato CSV / Excel.
