# Arquitetura de Software & Design de Sistema (Driver ERP)

Este documento especifica a arquitetura técnica, stack tecnológica, fluxo de dados, modelo offline-first e padrões de segurança do **ERP Driver Finance**.

---

## 1. Visão Geral da Arquitetura

O Driver ERP adota uma arquitetura **Offline-First PWA & Mobile**, garantindo que o motorista consiga registrar corridas, turnos, despesas e abastecimentos mesmo quando estiver em túneis, garagens subterrâneas ou áreas com sinal de celular fraco.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CAMADA DE APRESENTAÇÃO (CLIENTE)                      │
│                                                                                 │
│   ┌───────────────────────────┐         ┌───────────────────────────────────┐   │
│   │   Next.js 14 PWA (Web)    │         │   React Native (Android/iOS)      │   │
│   │   - Tailwind + Radix UI   │         │   - Fast Offline Local Storage    │   │
│   │   - Web Speech API (Voz)  │         │   - Native Voice Recognition      │   │
│   └─────────────┬─────────────┘         └─────────────────┬─────────────────┘   │
│                 │                                         │                     │
│                 └───────────────────┬─────────────────────┘                     │
│                                     │                                           │
│                         ┌───────────▼───────────┐                               │
│                         │  IndexedDB / SQLite   │  ◄── (Sync Engine Offline)    │
│                         └───────────┬───────────┘                               │
└─────────────────────────────────────┼───────────────────────────────────────────┘
                                      │  HTTPS / WSS (REST / WebSockets)
┌─────────────────────────────────────▼───────────────────────────────────────────┐
│                             BACKEND SERVICE LAYER                               │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                     API Gateway / Reverse Proxy (Nginx)                 │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│         ┌──────────────────────────────┼──────────────────────────────┐         │
│         ▼                              ▼                              ▼         │
│  ┌──────────────┐              ┌──────────────┐              ┌──────────────┐   │
│  │ Auth Service │              │ Shift & CPK  │              │ OCR / Vision │   │
│  │ (JWT/OAuth)  │              │ Engine       │              │ Service      │   │
│  └──────┬───────┘              └──────┬───────┘              └──────┬───────┘   │
│         │                             │                             │           │
└─────────┼─────────────────────────────┼─────────────────────────────┼───────────┘
          │                             │                             │
┌─────────▼─────────────────────────────▼─────────────────────────────▼───────────┐
│                             CAMADA DE DADOS & INFRA                             │
│                                                                                 │
│  ┌─────────────────────────────┐               ┌─────────────────────────────┐  │
│  │ PostgreSQL 16 (Relacional)  │               │ Redis (Cache & Rate Limit)  │  │
│  │ - Financial decimal fields  │               │ - Session tokens & Queues   │  │
│  │ - TimescaleDB (Time-series) │               │                             │  │
│  └─────────────────────────────┘               └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack Real do Aplicativo

### Frontend (Web & PWA)
- **Framework**: Vite 5 + React 18 com TypeScript.
- **Gerenciamento de Estado**: React `useReducer` com arquitetura limpa de Reducer ([financeReducer.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/financeReducer.ts)).
- **Persistência Local Offline-First**: LocalStorage com abstração de repositório ([repository.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/repository.ts) e [db.ts](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/src/services/db.ts)).
- **Service Worker PWA**: Daemon customizado em [public/sw.js](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/public/sw.js) com política Network-First e suporte completo a instalação offline via [manifest.json](file:///c:/Users/Hugo/Documents/Guia%20Estrat%C3%A9gico/ERP_Motorista_App/public/manifest.json).
- **UI Components & Estilo**: Tailwind CSS com tema OLED de alto contraste e Lucide Icons.

### Nuvem & Banco de Dados (Cloud Sync)
- **Banco de Dados Cloud**: Supabase (PostgreSQL relacional) com tabelas de faturamento e despesas.
- **Autenticação & Segurança**: Supabase Auth com políticas RLS (*Row Level Security*).

---

## 3. Estratégia Offline-First & Sincronização

1. **Escrita Local Imediata**: Qualquer ação do motorista (abastecer, iniciar turno, registrar corrida em lote) é gravada primeiramente no banco SQLite/IndexedDB local em `< 5ms`.
2. **Fila de Sincronização (Outbox Pattern)**:
   - As alterações locais criam eventos na tabela `sync_queue` com status `pending`.
   - Um worker de background monitora a conexão de rede (`navigator.onLine` ou evento nativo).
   - Quando online, envia os eventos em batch para `/api/v1/sync`.
3. **Resolução de Conflitos**:
   - Estratégia *Last-Write-Wins* baseada em timestamp UTC confiável com campo `updated_at`.
   - Registros de transação financeira usam UUIDs gerados no cliente (V4) para evitar duplicidade de IDs na reconexão.

---

## 4. Pipeline de Leitura de Cupons Fiscais (OCR / AI Scanner)

```
[Foto do Cupom no Celular] ──► [Compressão no App (Client-side)]
                                         │
                                         ▼
                            [POST /api/v1/ocr/receipts]
                                         │
                                         ▼
                          [FastAPI + Tesseract / LLM Vision]
                                         │
                                         ▼
                    [Extração de Dados: Valor Total, Data,
                     Litros, Tipo Combustível, CNPJ Posto]
                                         │
                                         ▼
                    [Retorno JSON preenchido para o App]
```

---

## 5. Padrões de Segurança & Proteção de Dados (LGPD)

- **Criptografia em Trânsito e Repouso**: TLS 1.3 para conexões HTTPS; criptografia AES-256 para campos sensíveis do motorista (CPF, Placa do Veículo, Chave Pix).
- **Autenticação**: OAuth2 + JWT (Access Token com expiração de 15 minutos e Refresh Token rotativo armazenado em `HttpOnly Secure Cookie`).
- **Isolamento Multi-tenant**: Todas as consultas ao banco de dados aplicam obrigatoriamente a cláusula `WHERE driver_id = :authenticated_user_id`.
- **Conformidade LGPD**: Botão de exportação completa de dados em JSON/CSV e opção de "Exclusão Definitiva de Conta" com soft-delete auditado.
