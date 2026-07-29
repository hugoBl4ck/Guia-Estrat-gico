# Arquitetura de Integração Automática (Uber & 99) e Métricas Diárias

Este documento explica a engenharia técnica por trás da **captura automática de corridas da Uber e 99** e o funcionamento dos indicadores de **R$/KM** e **R$/Hora** no **GiroCerto ERP**.

---

## 1. 📲 Como Funciona a Captura Automática de Corridas no Celular?

Por motivos de privacidade e segurança dos sistemas operacionais (Android e iOS), a **Uber e a 99 não disponibilizam APIs públicas de motorista para aplicativos de terceiros**. No entanto, existem **3 métodos consagrados** utilizados para capturar as corridas automaticamente:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MÉTODOS DE CAPTURA AUTOMÁTICA DE CORRIDAS            │
├───────────────────────────────────┬────────────────────────────────────┤
│ Método                            │ Como Funciona no Celular           │
├───────────────────────────────────┼────────────────────────────────────┤
│ 🔔 1. Listener de Notificações    │ O Android emite uma notificação    │
│    Android (NotificationService)  │ quando a Uber/99 envia a oferta.   │
│                                   │ O leitor extrai valor e km da tela.│
├───────────────────────────────────┼────────────────────────────────────┤
│ ✉️ 2. Auto-Sync por E-mail        │ O recibo e o relatório enviado pela│
│    (Webhook de Recibo)            │ Uber/99 ao seu e-mail são lidos     │
│                                   │ e inseridos automaticamente no ERP.│
├───────────────────────────────────┼────────────────────────────────────┤
│ 🎙️ 3. Driver Voice Copilot         │ Comando por voz instantâneo sem    │
│    (Linguagem Natural)            │ tirar as mãos do volante.          │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. 🧮 Indicadores no Dashboard (R$/KM, R$/Hora e Meta Diária)

Para garantir que você atinja a **meta diária de R$ 360,00/dia** (suficiente para quitar a parcela de R$ 3.086,58 do Santander e ter **R$ 4.463,00 de lucro livre por mês**), o GiroCerto ERP calcula em tempo real:

### 1. Valor Médio por Quilômetro Rodado ($\text{R\$ / KM}$)
$$\text{R\$ / KM Bruto} = \frac{\text{Faturamento Bruto Total do Dia (R\$)}}{\text{KM Total Rodado no Dia}}$$

- **Índice Ideal para Vitória da Conquista**: **R$ 2,20 a R$ 2,60 / km** (em corridas curtas de R$ 10,00).

### 2. Valor Médio por Hora Trabalhada ($\text{R\$ / Hora}$)
$$\text{R\$ / Hora Bruto} = \frac{\text{Faturamento Bruto Total do Dia (R\$)}}{\text{Horas Ativas de Rodagem}}$$

- **Índice Ideal para Vitória da Conquista**: **R$ 45,00 a R$ 55,00 / hora** (equivalente a 4 a 5 corridas curtas por hora).

---

## 3. 🎯 Indicador de Ritmo para Bater a Meta do Dia

O ERP compara a sua média atual por hora com o tempo restante de jornada:
- 🟢 **Em Ritmo Ideal**: Se você estiver faturando R$ 45,00/hora em um turno de 8h, você atingirá **R$ 360,00** no prazo!
- ⚡ **Acima da Meta**: Quando houver chuva ou tarifa dinâmica no Centro ou Candeias.
