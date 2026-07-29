# Engenharia Financeira ERP & Modelo de Cálculo (Driver Finance)

Este documento estabelece as especificações matemáticas, algoritmos e modelos contábeis utilizados pelo **ERP Driver Finance** para calcular com precisão o **Custo por KM (CPK)**, **Lucro Real Líquido**, **Depreciação Veicular**, **Sistema de Buckets de Reserva** e **Demonstrativo de Resultado do Exercício (DRE Operacional)**.

---

## 1. Classificação Contábil dos Custos do Motorista

Diferente da contabilidade tradicional, o motorista parceiro possui custos mistos (fixos diários/mensais e variáveis por distância percorrida).

```
                            ┌────────────────────────────────────────┐
                            │    CUSTOS TOTAIS DO MOTORISTA (CT)     │
                            └───────────────────┬────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
    ┌───────────────────────────┐                                 ┌───────────────────────────┐
    │     CUSTOS FIXOS (CF)     │                                 │   CUSTOS VARIÁVEIS (CV)   │
    │  (Independem do KM rodado)│                                 │ (Proporcionais ao KM)     │
    └────────────┬──────────────┘                                 └────────────┬──────────────┘
                 │                                                             │
 ┌───────────────┼───────────────┐                             ┌───────────────┼───────────────┐
 ▼               ▼               ▼                             ▼               ▼               ▼
Aluguel/        Seguro Auto &   MEI (DAS) &                   Combustível/    Manutenção      Depreciação
Financiamento   Licenciamento   Plano de Saúde                Energia         Preventiva      Veicular/KM
```

---

## 2. Fórmulas Matemáticas Core

### 2.1 Custo por Quilômetro Rodado (CPK Total)

O Custo por KM é a métrica fundamental do ERP. Todo KM rodado (seja com passageiro no carro ou KM "vazio" deslocando até a corrida) custa dinheiro.

$$\text{CPK}_{\text{Total}} = \text{CPK}_{\text{Fixo}} + \text{CPK}_{\text{Variável}}$$

#### A. Custo por KM Fixo ($\text{CPK}_{\text{Fixo}}$)
$$\text{CPK}_{\text{Fixo}} = \frac{\sum \text{Custos Fixos Mensais (Aluguel/Financiamento + Seguro + IPVA + MEI + Lavagem mensal)}}{\text{KM Média Prevista no Mês (ex: 4.500 km)}}$$

#### B. Custo por KM Variável ($\text{CPK}_{\text{Variável}}$)
$$\text{CPK}_{\text{Variável}} = \text{CPK}_{\text{Combustível}} + \text{CPK}_{\text{Manutenção}} + \text{CPK}_{\text{Depreciação}} + \text{CPK}_{\text{Outros (Pedágios/Alimentação)}}$$

1. **CPK Combustível**:
   $$\text{CPK}_{\text{Combustível}} = \frac{\text{Preço por Litro (R\$)}}{\text{Autonomia Real do Veículo (km/L na cidade com ar)}}$$
   *Exemplo*: Gasolina a R\$ 5,80/L e consumo de 11,6 km/L $\rightarrow \text{CPK}_{\text{Combustível}} = \text{R\$ } 0,50 / \text{km}$.

2. **CPK Manutenção Preventiva**:
   $$\text{CPK}_{\text{Manutenção}} = \sum_{i=1}^{n} \frac{\text{Custo do Componente } i}{\text{Vida Útil em KM do Componente } i}$$
   *Tabela de Referência Padrão*:
   - Troca de Óleo + Filtros (R\$ 280 / 10.000 km) = R\$ 0,028 / km
   - Jogo de Pneus (R\$ 1.600 / 50.000 km) = R\$ 0,032 / km
   - Pastilhas e Discos de Freio (R\$ 500 / 30.000 km) = R\$ 0,016 / km
   - Suspensão & Buchas (R\$ 1.800 / 60.000 km) = R\$ 0,030 / km
   - Correia Dentada / Velas (R\$ 600 / 40.000 km) = R\$ 0,015 / km
   *Total $\text{CPK}_{\text{Manutenção}}$ Estimado*: **R\$ 0,121 / km**.

3. **CPK Depreciação Veicular** (Para Veículo Próprio):
   $$\text{CPK}_{\text{Depreciação}} = \frac{\text{Valor FIPE Atual} - \text{Valor Residual Estimado após 100.000 km}}{\text{100.000 km}}$$
   *Exemplo*: Carro FIPE R\$ 60.000, com perda estimada de R\$ 18.000 a cada 100.000 km rodados em aplicativo $\rightarrow \text{CPK}_{\text{Depreciação}} = \text{R\$ } 0,18 / \text{km}$.
   *(Nota: Se o veículo for alugado, a depreciação é zero, pois já está embutida no valor da locação semanal/mensal).*

---

### 2.2 Algoritmo de Lucro Real Líquido por Corrida e por Turno

Quando o motorista recebe R\$ 25,00 por uma corrida de 10 km (bruto), a maioria acha que "ganhou 25 reais". O ERP calcula o valor real:

$$\text{Lucro Líquido Real} = \text{Receita Bruta} - (\text{KM Percorrido Total} \times \text{CPK}_{\text{Total}})$$

*Exemplo Prático*:
- **Corrida de 10 km**: Receita de R\$ 25,00.
- **Deslocamento até o passageiro**: 2 km (Total percorrido = 12 km).
- **CPK Total calculado**: R\$ 0,85 / km (Fixo R\$ 0,20 + Combustível R\$ 0,45 + Manutenção R\$ 0,12 + Depreciação R\$ 0,08).
- **Custo Operacional da Corrida**: $12 \text{ km} \times \text{R\$ } 0,85 = \text{R\$ } 10,20$.
- **Lucro Real da Corrida**: $\text{R\$ } 25,00 - \text{R\$ } 10,20 = \mathbf{\text{R\$ } 14,80}$ (Lucro Real de 59,2% da receita bruta).

---

### 2.3 Ponto de Equilíbrio Diário (Break-Even Dynamics)

O ERP calcula no início de cada dia o valor bruto necessário para cobrir os custos fixos diários antes de começar a lucrar:

$$\text{Custo Fixo Diário} = \frac{\text{Custos Fixos Mensais}}{\text{Dias Trabalhados no Mês (ex: 24 dias)}}$$

$$\text{Metas de Faturamento Diário (Break-Even)} = \frac{\text{Custo Fixo Diário}}{1 - \left(\frac{\text{CPK}_{\text{Variável}}}{\text{Receita Média por KM Rodado}}\right)}$$

O aplicativo exibe uma barra de progresso no dashboard:
- 🔴 **0% a 99%**: "Pagando Custos Operacionais e Fixos do Dia".
- 🟢 **100%+**: "Ponto de Equilíbrio Atingido! Agora você está gerando Lucro Puro".

---

## 3. Sistema de Retenção de Caixas Virtuais (Buckets)

Ao encerrar um turno ou dia de trabalho e registrar um faturamento bruto de **R\$ 300,00** (após rodar 200 km), o ERP realiza o fatiamento automático do dinheiro:

```
ENTRADA BRUTA: R$ 300,00 (200 km rodados)
│
├── 🟡 Bucket Manutenção Preventiva (200 km x R$ 0,12)    ──► R$ 24,00  (Guardar para peças/pneus)
├── 🔵 Bucket Depreciação (200 km x R$ 0,18)               ──► R$ 36,00  (Guardar para troca de carro)
├── 🔴 Bucket Impostos MEI (Proporcional diário)           ──► R$  3,00  (Guardar para o DAS)
├── ⛽ Combustível Usado no Dia (Reabastecimento real)     ──► R$ 90,00  (Reposicionado na bomba)
└── 🟢 LUCRO LÍQUIDO DISPONÍVEL PARA VOCÊ                ──► R$ 147,00 (Dinheiro livre do motorista)
```

---

## 4. Matriz de Decisão de Combustível (Calculadora Flex, GNV e EV)

O ERP avalia a razão de paridade e eficiência energética real do veículo:

### Regra de Ouro Flex:
$$\text{Razão Flex} = \frac{\text{Preço Etanol (R\$)}}{\text{Preço Gasolina (R\$)}}$$

- Se $\text{Razão Flex} < \frac{\text{Consumo Etanol (km/L)}}{\text{Consumo Gasolina (km/L)}}$ (geralmente ~0,70): **ETANOL é mais vantajoso**.
- Caso contrário: **GASOLINA é mais vantajosa**.

### Paridade GNV vs Liquid Fuel:
$$\text{Custo por KM GNV} = \frac{\text{Preço por } m^3 \text{ de GNV}}{\text{Rendimento em km por } m^3}$$
O ERP compara $\text{CPK}_{\text{GNV}}$ diretamente com $\text{CPK}_{\text{Etanol}}$ e $\text{CPK}_{\text{Gasolina}}$, emitindo um alerta visual no mapa de postos da cidade.

---

## 5. Módulo Fiscal MEI Motorista e IRPF

Motoristas de aplicativo enquadrados como **MEI (Motorista App - Cnae 4930-2/02 ou 5229-0/99)** possuem regras específicas de isenção no Imposto de Renda Pessoa Física (IRPF):

- **Isenção Presumida MEI (Transporte de Passageiros)**: 60% da receita bruta é isenta de IRPF.
- **Rendimento Tributável**: 40% da receita bruta menos as despesas comprovadas do veículo.

O ERP gera relatórios de exportação pré-formatados com todas as notas fiscais de manutenção e combustível anexadas, permitindo zerar ou minimizar o imposto de renda devido na declaração anual.
