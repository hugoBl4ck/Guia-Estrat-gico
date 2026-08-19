# 📱 GiroCerto Copilot Android - Especificação Técnica e Projeto Completo

> **Documento de Arquitetura e Engenharia de Software Nativa**  
> **Sistema**: GiroCerto Copilot (Assistente de Decisão de Corridas em Tempo Real)  
> **Plataforma**: Android Nativo (Kotlin + Clean Architecture + AccessibilityService + WindowManager Overlay + Room + WorkManager)  
> **Compatibilidade**: Android 8.0 (API 26) ao Android 14+ (API 34/35)  
> **Integração**: GiroCerto ERP & Supabase Cloud  

---

## 1. Visão Geral do Produto

O **GiroCerto Copilot** é um aplicativo Android nativo de alto desempenho que opera em segundo plano sobreposto aos aplicativos de motorista parceiro (**Uber Driver**, **99 Motorista** e **InDrive**).

Quando uma oferta toca na tela:
1. **Lê de forma assíncrona os nós de texto** da oferta (`text`, `contentDescription` e `SpannableString`) em thread secundária (`Dispatchers.Default`) em < 2ms, sem travar a interface do Android;
2. **Calcula instantaneamente os indicadores financeiros com precisão do ERP**:
   - **R$/km Total** (incluindo o deslocamento de busca);
   - **R$/Hora Bruto Estimado**;
   - **Custo Operacional Real da Corrida** baseado no CPK do veículo ativo no GiroCerto ERP (ex: **BYD Dolphin Mini Elétrico R$ 0,38/km** ou **Ford Ka Flex R$ 0,85/km**);
   - **Lucro Líquido Real (R$)** e **Lucro Líquido por Hora (R$/h)**;
3. **Exibe um Card Flutuante (Overlay HUD)** veicular de altíssimo contraste e legibilidade com o **Semáforo de Decisão**:
   - 🟢 **ACEITAR (Excelente Rentabilidade)**: Dispara vibração tátil suave de duplo pulso.
   - 🟡 **AVALIAR (Rentabilidade Média / Região)**: Dispara vibração tátil padrão.
   - 🔴 **RECUSAR (Prejuízo Operacional)**: Dispara vibração tátil de alerta.
4. **Armazena no histórico local (Room)** e sincroniza em lote com o **Supabase** via **WorkManager** com `BackoffPolicy.EXPONENTIAL`.

---

## 2. Arquitetura do Sistema Android (Clean Architecture)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             📱 SISTEMA OPERACIONAL ANDROID                             │
├─────────────────────────────────────┬──────────────────────────────────────────────────┤
│  🚖 App Uber / 99 / InDrive          │   🛡️ GiroCerto Copilot Core (Background)         │
│                                     │                                                  │
│  [Card da Chamada Toca]             │   ┌──────────────────────────────────────────┐   │
│  • R$ 28,50                         │   │ 1. RideAccessibilityService              │   │
│  • 2,1 km (5 min) busca             ├──►│    • Thread: Dispatchers.Default         │   │
│  • 7,8 km (18 min) viagem           │   │    • Varredura recursiva de nós          │   │
│                                     │   └────────────────────┬─────────────────────┘   │
│                                     │                        │                         │
│                                     │                        ▼                         │
│                                     │   ┌──────────────────────────────────────────┐   │
│                                     │   │ 2. OfferParserFactory & Parsers          │   │
│                                     │   │    • Uber / 99 / InDrive Parsers         │   │
│                                     │   │    • Sanitização de limites (0.1..300km) │   │
│                                     │   └────────────────────┬─────────────────────┘   │
│                                     │                        │                         │
│                                     │                        ▼                         │
│                                     │   ┌──────────────────────────────────────────┐   │
│                                     │   │ 3. AnalyzeRideOfferUseCase (Domain)      │   │
│                                     │   │    • Aplica CPK do Veículo Ativo         │   │
│                                     │   │    • Invariante: Lucro = Bruto - Custo   │   │
│                                     │   │    • Determina Semáforo de Decisão       │   │
│                                     │   └───────────────┬──────────────────────────┘   │
│                                     │                   │                              │
│                                     │                   ├──────────────────────────┐   │
│                                     │                   ▼                          ▼   │
│                                     │   ┌──────────────────────────┐ ┌───────────────┐ │
│  ┌───────────────────────────────┐  │   │ 4. OfferEventBus (Flow)  │ │ 5. Room DB &  │ │
│  │ 🪟 CARD FLUTUANTE HUD         │◄─┼───┤    • Emissão Reativa     │ │    WorkManager│ │
│  │ 🟢 R$ 2,88/km • R$ 74/h       │  │   └───────────┬──────────────┘ └───────┬───────┘ │
│  │ Lucro Real: R$ 24,74          │  │               │                        │         │
│  └───────────────────────────────┘  │               ▼                        ▼         │
│                                     │   ┌──────────────────────────┐ ┌───────────────┐ │
│                                     │   │ 6. FloatingHudManager    │ │ 7. Supabase   │ │
│                                     │   │    • Overlay seguro      │ │    Cloud REST │ │
│                                     │   │    • Auto-dismiss (14s)  │ │    (Sync ERP) │ │
│                                     │   │    • Feedback háptico    │ └───────────────┘ │
│                                     │   └──────────────────────────┘                   │
└─────────────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 3. Estrutura Completa de Diretórios (`android-copilot/`)

O projeto Android nativo completo está estruturado e implementado na pasta `android-copilot/` na raiz do repositório.
