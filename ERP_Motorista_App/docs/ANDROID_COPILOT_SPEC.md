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

```
android-copilot/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── gradle/
│   ├── libs.versions.toml
│   └── wrapper/
│       └── gradle-wrapper.properties
└── app/
    ├── build.gradle.kts
    ├── proguard-rules.pro
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   ├── java/com/girocerto/copilot/
        │   │   ├── CopilotApplication.kt
        │   │   ├── domain/
        │   │   │   ├── model/
        │   │   │   │   ├── PlatformType.kt
        │   │   │   │   ├── RideOffer.kt
        │   │   │   │   ├── RideAnalysis.kt
        │   │   │   │   ├── DecisionStatus.kt
        │   │   │   │   └── VehicleProfile.kt
        │   │   │   ├── repository/
        │   │   │   │   ├── IOfferParser.kt
        │   │   │   │   ├── IVehicleRepository.kt
        │   │   │   │   └── IRideHistoryRepository.kt
        │   │   │   └── usecase/
        │   │   │       ├── AnalyzeRideOfferUseCase.kt
        │   │   │       └── SyncOffersUseCase.kt
        │   │   ├── data/
        │   │   │   ├── parser/
        │   │   │   │   ├── UberOfferParser.kt
        │   │   │   │   ├── NinetyNineOfferParser.kt
        │   │   │   │   ├── InDriveOfferParser.kt
        │   │   │   │   └── OfferParserFactory.kt
        │   │   │   ├── local/
        │   │   │   │   ├── AppDatabase.kt
        │   │   │   │   ├── dao/RideOfferDao.kt
        │   │   │   │   ├── entity/RideOfferEntity.kt
        │   │   │   │   └── PreferencesManager.kt
        │   │   │   ├── remote/
        │   │   │   │   └── SupabaseRestClient.kt
        │   │   │   ├── repository/
        │   │   │   │   ├── VehicleRepositoryImpl.kt
        │   │   │   │   └── RideHistoryRepositoryImpl.kt
        │   │   │   └── worker/
        │   │   │       └── SyncOffersWorker.kt
        │   │   ├── event/
        │   │   │   └── OfferEventBus.kt
        │   │   ├── service/
        │   │   │   ├── RideAccessibilityService.kt
        │   │   │   └── FloatingOverlayService.kt
        │   │   └── ui/
        │   │       ├── MainActivity.kt
        │   │       └── hud/
        │   │           ├── FloatingHudManager.kt
        │   │           └── HapticFeedbackHelper.kt
        │   └── res/
        │       ├── drawable/
        │       │   ├── bg_hud_card.xml
        │       │   ├── bg_hud_green.xml
        │       │   ├── bg_hud_yellow.xml
        │       │   ├── bg_hud_red.xml
        │       │   └── ic_copilot_logo.xml
        │       ├── layout/
        │       │   ├── activity_main.xml
        │       │   └── view_floating_hud.xml
        │       ├── values/
        │       │   ├── colors.xml
        │       │   ├── strings.xml
        │       │   └── themes.xml
        │       └── xml/
        │           └── accessibility_service_config.xml
        └── test/
            └── java/com/girocerto/copilot/
                ├── domain/
                │   └── AnalyzeRideOfferUseCaseTest.kt
                ├── data/parser/
                │   ├── UberOfferParserTest.kt
                │   ├── NinetyNineOfferParserTest.kt
                │   └── InDriveOfferParserTest.kt
                └── property/
                    └── FinancialInvariantsTest.kt
```

---

## 4. Conformidade com Android 14+ (API 34+)

Para garantir que o serviço em primeiro plano e o overlay não sejam encerrados nem causem rejeição na Google Play:

1. **Declaração de Sub-tipo no Manifest**:
   ```xml
   <service
       android:name=".service.FloatingOverlayService"
       android:enabled="true"
       android:exported="false"
       android:foregroundServiceType="specialUse">
       <property
           android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
           android:value="HUD veicular flutuante com cálculo financeiro em tempo real para tomada de decisão do motorista" />
   </service>
   ```

2. **Permissão Proativa de Sobreposição**:
   Verificação de `Settings.canDrawOverlays(context)` na `MainActivity` antes de iniciar o serviço, com direcionamento direto para a tela de configurações do sistema.

3. **Prevenção de Vazamento de Memória**:
   `FloatingHudManager` trata `IllegalArgumentException` ao desanexar views e executa cleanup estrito nos métodos `onTaskRemoved()` e `onDestroy()` do serviço.

---

## 5. Como Abrir e Compilar no Android Studio

1. Abra o **Android Studio** (versão Iguana, Jellyfish ou superior);
2. Selecione **Open** e navegue até a pasta `android-copilot/`;
3. Aguarde o **Gradle Sync** sincronizar as dependências;
4. Conecte o smartphone Android via USB com a **Depuração USB** ativada;
5. Pressione **Run (Shift + F10)**;
6. No smartphone:
   - Toque em **Ativar** para autorizar a **Sobreposição a outros apps**;
   - Toque em **Configurar** para ligar o **GiroCerto Copilot - Leitor de Ofertas** em Acessibilidade;
   - Toque em **Testar Card Flutuante** para validar a sobreposição instantânea na tela!
