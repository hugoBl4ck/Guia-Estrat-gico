# Design System & UX Veicular (Driver ERP)

Especificação do **Design System de Alto Contraste** e ergonomia de uso do **ERP Driver Finance**, desenhado para utilização com segurança no suporte veicular durante a jornada de trabalho.

---

## 1. Princípios de UX Veicular (Ergonomia ao Dirigir)

Ao utilizar um aplicativo no celular preso ao suporte do painel do carro, o motorista enfrenta desafios únicos de interface:
1. **Distância Visual**: O celular fica a ~60 cm de distância dos olhos do motorista.
2. **Luz Solar Direta & Reflexos**: A luz do dia exige alto contraste e tipografia encorpada.
3. **Uso Noturno**: À noite, telas brilhantes causam ofuscamento da visão e fadiga ocular.
4. **Interação com Um Toque (Single-Tap Action)**: Todos os botões do Modo Direção devem possuir área de toque mínima de **56x56 px**, permitindo acionamento rápido sem desviar o olhar do trânsito.

---

## 2. Paleta de Cores (OLED Dark & High-Contrast Mode)

### Modo Noturno / OLED Pure Black (Padrão de Fábrica)
- **Background Principal**: `#000000` (Preto puro OLED - economiza bateria em telas AMOLED e evita reflexo no parabrisa).
- **Surface / Card Background**: `#121318` (Cinza escuro profundo com elevação sutil).
- **Borda de Elementos**: `#262933` (Linha fina de contraste).

### Cores Semânticas de Estado Financeiro
- 🟢 **Lucro Real / Ponto de Equilíbrio Atingido**: `#00E676` (Verde Esmeralda Neon)
- 🟡 **Custo Operacional / Manutenção / Alerta**: `#FFD600` (Amarelo Âmbar de Alta Visibilidade)
- 🔴 **Prejuízo / Meta Abaixo / Despesa Crítica**: `#FF1744` (Vermelho Esclarecido)
- 🔵 **Ganhos Uber**: `#FFFFFF` (Texto branco sob badge preto)
- 🟧 **Ganhos 99**: `#FF6D00` (Laranja vibrante)
- 💜 **InDrive**: `#7C4DFF` (Roxo elétrico)

---

## 3. Tipografia & Escala de Leitura

Usamos a fonte **Inter** ou **Outfit** (Google Fonts) por suas formas limpas e excelente legibilidade em telas móveis pequenas:

- **HUD Primary Value (Faturamento / Meta)**: `36px` Font Weight `800` (ExtraBold)
- **Status Headings (Ponto de Equilíbrio)**: `20px` Font Weight `700` (Bold)
- **Labels de Seção / Filtros**: `14px` Font Weight `600` (SemiBold), caixa alta (UPPERCASE) com `letter-spacing: 0.05em`.
- **Textos de Apoio / Notas**: `12px` Font Weight `400` (Regular), cor `#A0A5B5`.

---

## 4. Componentes Chave da Interface

### 4.1 O HUD Operacional (Modo Direção)

```
┌────────────────────────────────────────────────────────┐
│  🚗 EM TURNO ATIVO (06h 45m)         [ 🟢 ONLINE ]     │
├────────────────────────────────────────────────────────┤
│  LUCRO LÍQUIDO REAL HOJE                               │
│  R$ 184,50                          CPK: R$ 0,79/km    │
├────────────────────────────────────────────────────────┤
│  PONTO DE EQUILÍBRIO DIÁRIO (BREAK-EVEN)               │
│  [██████████████████████████████████░░░░] 82% (R$ 145/175) │
│  "Faltam R$ 30,50 para cobrir os custos fixos do dia"  │
├────────────────────────────────────────────────────────┤
│   ┌─────────────────────┐   ┌──────────────────────┐   │
│   │ 🎤 GRAVAR VOZ       │   │  ➕ NOVO ABASTECER   │   │
│   │ (Toque para falar)  │   │  (R$ 100,00 Gasolina)│   │
│   └─────────────────────┘   └──────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### 4.2 Indicador do Sistema de Caixas/Buckets

Visualização gráfica em barras horizontais empilhadas:
- 🟢 **Disponível**: `52%` (R$ 156,00)
- 🟡 **Reserva de Manutenção**: `18%` (R$ 54,00)
- 🔵 **Fundo de Depreciação**: `25%` (R$ 75,00)
- 🔴 **Reserva MEI**: `5%` (R$ 15,00)

---

## 5. Diretrizes de Acessibilidade (WCAG 2.1 AA)

- **Contraste Mínimo**: Relação de contraste de no mínimo **7:1** entre o texto e o fundo em todos os indicadores principais.
- **Feedback Hápico**: Vibração sutil ao pressionar botões críticos (Iniciar Turno, Gravar Voz, Encerrar Turno).
- **Sem Interações Complexas no Sinal**: Formulários longos são bloqueados enquanto o GPS detectar velocidade $> 5 \text{ km/h}$.
