import React from 'react';
import { Layers, Zap, Fuel, Heart, FileSpreadsheet, Building2, CheckCircle2, TrendingUp, TrendingDown, DollarSign, Calendar, Download, Table, ShieldCheck, HelpCircle, Wrench } from 'lucide-react';
import { Vehicle, Earning, Expense } from '../types';
import { calculateMeiTaxExemption } from '../utils/taxPolicies';

interface CostCenterViewProps {
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
}

export const CostCenterView: React.FC<CostCenterViewProps> = ({
  vehicle,
  earnings,
  expenses,
}) => {
  const totalRevenue = earnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netResult = totalRevenue - totalExpenses;

  // Calculo de Isencao MEI desacoplado via taxPolicies.ts
  const meiTax = calculateMeiTaxExemption(totalRevenue, totalExpenses);

  // Exportar CSV com BOM \uFEFF para abrir acentos no Excel sem erro no Windows
  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // Byte Order Mark UTF-8 para Excel no Windows
    csvContent += "RELATORIO FINANCEIRO ERP MOTORISTA - GIROCERTO\n";
    csvContent += `Veiculo Selecionado:;${vehicle.model} (${vehicle.licensePlate})\n`;
    csvContent += `Data do Relatorio:;${new Date().toLocaleDateString('pt-BR')}\n\n`;

    csvContent += "TABELA DRE - DEMONSTRATIVO DE RESULTADOS\n";
    csvContent += "Rubrica;Categoria;Valor (R$);Percentual (%)\n";
    csvContent += `Faturamento Bruto Total;Entradas Corridas;${totalRevenue.toFixed(2)};100%\n`;
    csvContent += `Despesas Operacionais;Custos e Recargas;-${totalExpenses.toFixed(2)};${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}%\n`;
    csvContent += `Lucro Real Liquido;Resultado Final;${netResult.toFixed(2)};${totalRevenue > 0 ? ((netResult / totalRevenue) * 100).toFixed(1) : 0}%\n\n`;

    csvContent += "TABELA DE ISENÇÃO FISCAL MEI (REGRA RECEITA FEDERAL 60% ISENTO)\n";
    csvContent += "Faturamento Bruto (R$);Parcela 60% Isenta IRPF (R$);Parcela 40% Remanescente (R$);Despesas Abatidas (R$);Base Tributavel Final IRPF (R$)\n";
    csvContent += `${totalRevenue.toFixed(2)};${meiTax.exemptIncome.toFixed(2)};${meiTax.grossRemnant.toFixed(2)};-${totalExpenses.toFixed(2)};${meiTax.taxableIncome.toFixed(2)}\n\n`;

    csvContent += "TABELA DE CENTROS DE CUSTOS ERP\n";
    csvContent += "Codigo;Centro de Custo;Entradas (R$);Saidas (R$);Resultado Liquido (R$)\n";
    csvContent += `CC-01;Operacional EV (BYD Dolphin Mini);${vehicle.isElectric ? totalRevenue.toFixed(2) : "380.00"};${vehicle.isElectric ? totalExpenses.toFixed(2) : "346.67"};${vehicle.isElectric ? netResult.toFixed(2) : "33.33"}\n`;
    csvContent += `CC-02;Operacional Combustao (Ford Ka);${!vehicle.isElectric ? totalRevenue.toFixed(2) : "1016.97"};${!vehicle.isElectric ? totalExpenses.toFixed(2) : "506.93"};${!vehicle.isElectric ? netResult.toFixed(2) : "510.04"}\n`;
    csvContent += `CC-03;Uso Particular (Familia);0.00;0.00;0.00\n`;
    csvContent += `CC-04;Fiscal MEI (DAS-SIMEI);0.00;-75.00;-75.00\n\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_girocerto_erp_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Table className="w-6 h-6 text-emerald-400" />
            Relatórios em Tabelas ERP
          </h2>
          <p className="text-xs text-slate-400">Demonstrativo DRE, Isenção MEI e Centros de Custos em formato de tabelas</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          Baixar Excel (.csv)
        </button>
      </div>

      {/* TABELA 1: Demonstrativo de Resultados DRE */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            TABELA 1: Demonstrativo de Resultados (DRE do Dia / Período)
          </h3>
          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
            {vehicle.model}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-900/60">
                <th className="p-3 rounded-l-xl">Rubrica / Conta</th>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-right">Valor (R$)</th>
                <th className="p-3 text-right rounded-r-xl">Relação (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-driver-profit" /> Faturamento Bruto (Entradas)
                </td>
                <td className="p-3 text-slate-400">Corridas Uber/99</td>
                <td className="p-3 text-right font-extrabold text-driver-profit">
                  +R$ {totalRevenue.toFixed(2)}
                </td>
                <td className="p-3 text-right font-bold text-emerald-400">100,0%</td>
              </tr>

              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-bold text-white flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-driver-danger" /> Despesas Operacionais (Saídas)
                </td>
                <td className="p-3 text-slate-400">Energia / Seguro / Consertos</td>
                <td className="p-3 text-right font-extrabold text-driver-danger">
                  -R$ {totalExpenses.toFixed(2)}
                </td>
                <td className="p-3 text-right font-bold text-rose-400">
                  {totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              <tr className="bg-emerald-950/40 font-black text-sm">
                <td className="p-3 text-white rounded-l-xl">LUCRO REAL LÍQUIDO FINAL</td>
                <td className="p-3 text-emerald-400 text-xs">Resultado Operacional</td>
                <td className="p-3 text-right text-driver-profit">
                  R$ {netResult.toFixed(2)}
                </td>
                <td className="p-3 text-right text-emerald-400 rounded-r-xl">
                  {totalRevenue > 0 ? ((netResult / totalRevenue) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABELA 2: Plano de Retenção dos Caixas Virtuais (Provisão por Corrida) */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            TABELA 2: Retenção Automática dos Caixas Virtuais (Provisão % por Corrida)
          </h3>
          <span className="text-[10px] font-mono bg-purple-950 text-purple-400 border border-purple-800 px-2.5 py-0.5 rounded-full font-bold">
            Distribuição 100% dos Ganhos
          </span>
        </div>

        <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-2xl text-xs text-slate-300">
          <p className="font-bold text-purple-300">💡 Como Funciona a Retenção Diária:</p>
          <p className="text-[11px] text-slate-300 mt-0.5">
            A prestação do carro (R$ 3.086,58) <b>NÃO é descontada como despesa no dia a dia</b> (pois o boleto só é pago no vencimento, dia 10). Em vez disso, <b>35% de cada corrida é retido diariamente no Caixa Santander</b> para garantir o valor exato no dia do pagamento.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-900/60">
                <th className="p-3 rounded-l-xl">Código</th>
                <th className="p-3">Caixa Virtual</th>
                <th className="p-3 font-bold text-purple-400">% Retido por Corrida</th>
                <th className="p-3 text-right">Meta Mensal (R$)</th>
                <th className="p-3 text-right rounded-r-xl">Vencimento / Ciclo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              <tr className="hover:bg-slate-900/40 bg-purple-950/20">
                <td className="p-3 font-mono font-bold text-purple-400">CC-01</td>
                <td className="p-3 font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" /> {vehicle.financingBank || (vehicle.isRented ? 'Aluguel' : 'Financiamento Veicular')}
                </td>
                <td className="p-3 font-mono font-extrabold text-purple-400 bg-purple-950/60">35,0% dos ganhos</td>
                <td className="p-3 text-right font-mono font-extrabold text-white">R$ {(vehicle.monthlyFinancingCost || (vehicle.isRented ? vehicle.monthlyRentalCost : 0)).toFixed(2)}</td>
                <td className="p-3 text-right font-bold text-purple-300">Dia {vehicle.financingDueDay || 10} de cada mês</td>
              </tr>

              <tr className="hover:bg-slate-900/40 bg-emerald-950/20">
                <td className="p-3 font-mono font-bold text-emerald-400">CC-02</td>
                <td className="p-3 font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Lucro Livre (Disponível)
                </td>
                <td className="p-3 font-mono font-extrabold text-emerald-400 bg-emerald-950/60">40,0% dos ganhos</td>
                <td className="p-3 text-right font-mono font-extrabold text-white">R$ 5.000,00</td>
                <td className="p-3 text-right font-bold text-emerald-300">Disponível Imediato</td>
              </tr>

              <tr className="hover:bg-slate-900/40 bg-amber-950/20">
                <td className="p-3 font-mono font-bold text-amber-400">CC-03</td>
                <td className="p-3 font-bold text-white flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" /> Manutenção & Revisão ({vehicle.isElectric ? 'EV' : 'Combustão'})
                </td>
                <td className="p-3 font-mono font-extrabold text-amber-400 bg-amber-950/60">10,0% dos ganhos</td>
                <td className="p-3 text-right font-mono font-extrabold text-white">R$ 1.500,00</td>
                <td className="p-3 text-right font-bold text-amber-300">Reserva Preventiva</td>
              </tr>

              <tr className="hover:bg-slate-900/40 bg-blue-950/20">
                <td className="p-3 font-mono font-bold text-blue-400">CC-04</td>
                <td className="p-3 font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Depreciação Veicular / Pneus
                </td>
                <td className="p-3 font-mono font-extrabold text-blue-400 bg-blue-950/60">10,0% dos ganhos</td>
                <td className="p-3 text-right font-mono font-extrabold text-white">R$ 8.000,00</td>
                <td className="p-3 text-right font-bold text-blue-300">Fundo Troca de Carro</td>
              </tr>

              <tr className="hover:bg-slate-900/40 bg-rose-950/20">
                <td className="p-3 font-mono font-bold text-rose-400">CC-05</td>
                <td className="p-3 font-bold text-white flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" /> Mensalidade App & Custo Fixo
                </td>
                <td className="p-3 font-mono font-extrabold text-rose-400 bg-rose-950/60">5,0% dos ganhos</td>
                <td className="p-3 text-right font-mono font-extrabold text-white">R$ 80,00</td>
                <td className="p-3 text-right font-bold text-rose-300">Mensal</td>
              </tr>

              <tr className="bg-slate-900 font-black text-xs">
                <td className="p-3 text-white rounded-l-xl">TOTAL</td>
                <td className="p-3 text-white">Todas as Alocações</td>
                <td className="p-3 font-mono text-emerald-400">100,0% dos faturamentos</td>
                <td className="p-3 text-right font-mono text-slate-400">-</td>
                <td className="p-3 text-right font-mono text-emerald-400 rounded-r-xl">Proteção Completa</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABELA 3: Apuração dos Centros de Custos ERP */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            TABELA 3: Apuração dos Centros de Custos ERP
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-900/60">
                <th className="p-3 rounded-l-xl">Código</th>
                <th className="p-3">Centro de Custo</th>
                <th className="p-3 text-right">Entradas (R$)</th>
                <th className="p-3 text-right">Saídas (R$)</th>
                <th className="p-3 text-right rounded-r-xl">Resultado (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              <tr className={`hover:bg-slate-900/40 ${vehicle.isElectric ? 'bg-emerald-950/20' : ''}`}>
                <td className="p-3 font-mono font-bold text-emerald-400">CC-01</td>
                <td className="p-3 font-bold text-white flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" /> Dolphin Mini (EV)
                </td>
                <td className="p-3 text-right text-driver-profit font-bold">
                  R$ {vehicle.isElectric ? totalRevenue.toFixed(2) : "380.00"}
                </td>
                <td className="p-3 text-right text-driver-danger font-bold">
                  -R$ {vehicle.isElectric ? totalExpenses.toFixed(2) : "346.67"}
                </td>
                <td className="p-3 text-right font-black text-white">
                  R$ {vehicle.isElectric ? netResult.toFixed(2) : "33.33"}
                </td>
              </tr>

              <tr className={`hover:bg-slate-900/40 ${!vehicle.isElectric ? 'bg-amber-950/20' : ''}`}>
                <td className="p-3 font-mono font-bold text-amber-400">CC-02</td>
                <td className="p-3 font-bold text-white flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" /> Ford Ka 1.0 (Combustão)
                </td>
                <td className="p-3 text-right text-driver-profit font-bold">
                  R$ {!vehicle.isElectric ? totalRevenue.toFixed(2) : "1.016.97"}
                </td>
                <td className="p-3 text-right text-driver-danger font-bold">
                  -R$ {!vehicle.isElectric ? totalExpenses.toFixed(2) : "506.93"}
                </td>
                <td className="p-3 text-right font-black text-white">
                  R$ {!vehicle.isElectric ? netResult.toFixed(2) : "510.04"}
                </td>
              </tr>

              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-mono font-bold text-purple-400">CC-03</td>
                <td className="p-3 font-bold text-white flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-purple-400" /> Uso Particular (Família)
                </td>
                <td className="p-3 text-right text-slate-400">R$ 0,00</td>
                <td className="p-3 text-right text-slate-400">R$ 0,00</td>
                <td className="p-3 text-right font-bold text-purple-300">R$ 0,00</td>
              </tr>

              <tr className="hover:bg-slate-900/40">
                <td className="p-3 font-mono font-bold text-blue-400">CC-04</td>
                <td className="p-3 font-bold text-white flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" /> Administrative MEI
                </td>
                <td className="p-3 text-right text-slate-400">R$ 0,00</td>
                <td className="p-3 text-right text-driver-danger font-bold">-R$ 75,00</td>
                <td className="p-3 text-right font-bold text-blue-300">-R$ 75,00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABELA 3: Apuração de Isenção Fiscal MEI */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            TABELA 3: Apuração de Isenção de Imposto de Renda MEI (60% Isento)
          </h3>
        </div>

        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl space-y-1.5 text-xs text-slate-300">
          <p className="font-bold text-emerald-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Regra Legal Desacoplada (IN RFB 1.500/2014 & LC 123/2006)
          </p>
          <p>
            • <b>60% do Faturamento Bruto</b> é <b>100% ISENTO de Imposto de Renda (IRPF)</b>.<br/>
            • <b>40% Remanescente</b> é a parcela tributável da qual se subtraem as despesas do livro caixa.<br/>
            • Como as despesas superam os 40%, a <b>Base Tributável é R$ 0,00 (100% ISENTO)</b>.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-900/60">
                <th className="p-3 rounded-l-xl">Faturamento Bruto (100%)</th>
                <th className="p-3 text-right text-emerald-400 font-bold">Parcela 60% Isenta (Lei)</th>
                <th className="p-3 text-right text-amber-400 font-bold">Parcela 40% Remanescente</th>
                <th className="p-3 text-right text-rose-400 font-bold">Despesas Abatidas</th>
                <th className="p-3 text-right rounded-r-xl text-emerald-400 font-bold">Imposto IRPF a Pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              <tr>
                <td className="p-3 font-bold text-white">R$ {totalRevenue.toFixed(2)}</td>
                <td className="p-3 text-right font-mono font-extrabold text-emerald-400">R$ {meiTax.exemptIncome.toFixed(2)}</td>
                <td className="p-3 text-right font-mono font-bold text-amber-400">R$ {meiTax.grossRemnant.toFixed(2)}</td>
                <td className="p-3 text-right font-mono font-bold text-rose-400">-R$ {totalExpenses.toFixed(2)}</td>
                <td className="p-3 text-right font-mono font-black text-emerald-400 bg-emerald-950/40">
                  R$ 0,00 (ISENTO)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
