import React, { useState } from 'react';
import { X, LineChart as LineIcon, PieChart as PieIcon, Car, TrendingUp, Sparkles, BarChart3, User } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Vehicle, Earning, Expense, ReserveBucket } from '../types';
import { formatToBrazilianDate } from '../utils/dateUtils';
import { aggregateExpensesByDriver, getDailyEarningsSeries } from '../utils/driverReports';

interface AnalyticsChartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
  buckets?: ReserveBucket[];
}

export const AnalyticsChartsModal: React.FC<AnalyticsChartsModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  earnings,
  expenses,
  buckets = [],
}) => {
  const [activeTab, setActiveTab] = useState<'trend' | 'buckets' | 'expenses' | 'fipe' | 'driver'>('trend');
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');

  if (!isOpen) return null;

  // 1. Dados de Linha com Marcadores (Evolução Diária)
  const trendMap = new Map<string, { date: string; receita: number; despesas: number; lucro: number }>();
  
  (earnings || []).forEach((e) => {
    if (e.isDeleted) return;
    const fullDate = e.recordedAt ? formatToBrazilianDate(e.recordedAt) : 'Hoje';
    const dStr = fullDate.length >= 5 ? fullDate.slice(0, 5) : fullDate; // DD/MM
    const cur = trendMap.get(dStr) || { date: dStr, receita: 0, despesas: 0, lucro: 0 };
    cur.receita += e.grossAmount + e.tipsAmount;
    cur.lucro = cur.receita - cur.despesas;
    trendMap.set(dStr, cur);
  });

  (expenses || []).forEach((exp) => {
    if (exp.isDeleted) return;
    const fullDate = exp.expenseDate ? formatToBrazilianDate(exp.expenseDate) : 'Hoje';
    const dStr = fullDate.length >= 5 ? fullDate.slice(0, 5) : fullDate; // DD/MM
    const cur = trendMap.get(dStr) || { date: dStr, receita: 0, despesas: 0, lucro: 0 };
    cur.despesas += exp.amount;
    cur.lucro = cur.receita - cur.despesas;
    trendMap.set(dStr, cur);
  });

  const lineTrendData = Array.from(trendMap.values()).reverse();

  // 2. Dados de Pizza (Caixas Virtuais)
  const bucketPieData = (buckets || [])
    .filter((b) => b.type !== 'TAX_MEI')
    .map((b) => ({ name: b.name, value: b.currentBalance, color: b.color }))
    .filter((d) => d.value > 0);

  // 3. Dados de Pizza (Despesas por Categoria)
  const fuelVal = (expenses || []).filter(e => !e.isDeleted && ['ELECTRIC_CHARGING', 'FUEL'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const maintVal = (expenses || []).filter(e => !e.isDeleted && ['MAINTENANCE', 'OIL_CHANGE', 'BRAKES', 'WORKSHOP_MAINTENANCE', 'SPARK_PLUGS_BELT'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const insVal = (expenses || []).filter(e => !e.isDeleted && ['INSURANCE', 'WASH', 'PARKING', 'TOLL'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
  const otherVal = (expenses || []).filter(e => !e.isDeleted && ['DOCUMENTS', 'IPVA_LICENSING', 'FINANCING', 'OTHER'].includes(e.category)).reduce((s, e) => s + e.amount, 0);

  const expensePieData = [
    { name: 'CC-01 Rodagem (Combustível/EV)', value: fuelVal, color: '#3B82F6' },
    { name: 'CC-02 Manutenção & Pneus', value: maintVal, color: '#F59E0B' },
    { name: 'CC-03 Proteção & Seguro', value: insVal, color: '#A855F7' },
    { name: 'CC-04 Documentos & Outros', value: otherVal, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  // 4. Dados de Linha com Marcadores (Depreciação FIPE)
  const fipe = vehicle.fipeValue || 119990;
  const residual = vehicle.estimatedResidualValue || 85000;
  const fipeCurvePoints = [0, 10000, 25000, 50000, 75000, 100000].map((pKm) => {
    const loss = Math.min(fipe - residual, pKm * 0.15);
    return {
      kmLabel: `${(pKm / 1000).toFixed(0)}k km`,
      valorVeiculo: Math.max(residual, fipe - loss),
    };
  });

  // 5. Relatorio por Motorista: grafico de ganhos diarios (estilo Uber) + gasto com recarga/combustivel
  const distinctDriverNames = Array.from(
    new Set((earnings || []).map((e) => e.driverName).filter((n): n is string => Boolean(n)))
  );
  const dailyEarningsBarData = getDailyEarningsSeries(earnings, selectedDriver === 'ALL' ? undefined : selectedDriver);
  const driverExpenseSummary = aggregateExpensesByDriver(expenses).find(
    (d) => selectedDriver !== 'ALL' && d.driverName === selectedDriver
  );
  const driverEarnings = (earnings || []).filter((e) => !e.isDeleted && (selectedDriver === 'ALL' || e.driverName === selectedDriver));
  const driverTotalRevenue = driverEarnings.reduce((s, e) => s + e.grossAmount + e.tipsAmount, 0);
  const driverTotalTrips = driverEarnings.reduce((s, e) => s + (e.totalTrips || 1), 0);
  const driverTotalKm = driverEarnings.reduce((s, e) => s + (e.rideDistanceKm || 0), 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Painel de Análise Visual & Gráficos
            </h2>
            <p className="text-xs text-slate-400">Gráficos de tendência, caixas e composição de custos</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('trend')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'trend'
                ? 'bg-emerald-500 text-black shadow-lg font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LineIcon className="w-4 h-4" />
            📈 Evolução Diária
          </button>

          <button
            onClick={() => setActiveTab('buckets')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'buckets'
                ? 'bg-pma-acid text-black shadow-lg font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <PieIcon className="w-4 h-4" />
            🍕 Caixas Virtuais
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'expenses'
                ? 'bg-blue-400 text-black shadow-lg font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <PieIcon className="w-4 h-4" />
            📊 Custos por Centro
          </button>

          <button
            onClick={() => setActiveTab('fipe')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'fipe'
                ? 'bg-purple-400 text-black shadow-lg font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Car className="w-4 h-4" />
            🚗 Depreciação FIPE
          </button>

          <button
            onClick={() => setActiveTab('driver')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'driver'
                ? 'bg-cyan-400 text-black shadow-lg font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <User className="w-4 h-4" />
            👤 Por Motorista
          </button>
        </div>

        {/* Modal Body / Active Chart View */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: EVOLUÇÃO DIÁRIA (LINECHART COM DOTS) */}
          {activeTab === 'trend' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Receita Bruta vs Despesas vs Lucro</span>
                <span className="text-[10px] text-emerald-400 font-mono">Linha de tendência temporal</span>
              </div>

              {lineTrendData.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">Sem dados de lançamentos no período selecionado.</div>
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `R$${val}`} />
                      <RechartsTooltip
                        formatter={(val: number) => [`R$ ${val.toFixed(2)}`, '']}
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                      />
                      <Legend
                        wrapperStyle={{ color: '#F8FAFC', paddingTop: '10px' }}
                        formatter={(val) => (
                          <span style={{ color: '#F8FAFC' }} className="text-xs font-extrabold ml-1.5">
                            {val === 'receita' ? 'Receita Bruta' : val === 'despesas' ? 'Despesas' : 'Lucro Líquido'}
                          </span>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="receita"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#10B981', stroke: '#0F172A', strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: '#34D399', stroke: '#FFF', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="despesas"
                        stroke="#EF4444"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#EF4444', stroke: '#0F172A', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="lucro"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 4, fill: '#3B82F6', stroke: '#0F172A', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAIXAS VIRTUAIS (PIECHART) */}
          {activeTab === 'buckets' && (
            <div className="space-y-3">
              {(() => {
                const totalBucketsSum = bucketPieData.reduce((s, d) => s + d.value, 0);
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Distribuição do Saldo nos Caixas</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Total: R$ {totalBucketsSum.toFixed(2)}</span>
                    </div>

                    {bucketPieData.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">Nenhum saldo acumulado nos caixas até o momento.</div>
                    ) : (
                      <div className="h-72 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={bucketPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
                            >
                              {bucketPieData.map((entry, index) => (
                                <Cell key={`cell-b-${index}`} fill={entry.color} stroke="#0F172A" strokeWidth={2} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              formatter={(val: number) => [`R$ ${val.toFixed(2)} (${totalBucketsSum > 0 ? ((val / totalBucketsSum) * 100).toFixed(1) : 0}%)`, 'Saldo Retido']}
                              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                            />
                            <Legend
                              wrapperStyle={{ color: '#F8FAFC', paddingTop: '10px' }}
                              formatter={(value, entry: any) => {
                                const val = entry?.payload?.value || 0;
                                const pct = totalBucketsSum > 0 ? ((val / totalBucketsSum) * 100).toFixed(1) : '0';
                                return (
                                  <span style={{ color: '#F8FAFC' }} className="text-xs font-extrabold ml-1.5">
                                    {value} <strong style={{ color: '#34D399' }}>({pct}%)</strong>
                                  </span>
                                );
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 3: CUSTOS POR CENTRO (PIECHART) */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              {(() => {
                const totalExpensesSum = expensePieData.reduce((s, d) => s + d.value, 0);
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Composição das Despesas por Centro de Custo</span>
                      <span className="text-[10px] text-rose-400 font-mono">Total: R$ {totalExpensesSum.toFixed(2)}</span>
                    </div>

                    {expensePieData.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">Nenhuma despesa lançada no período.</div>
                    ) : (
                      <div className="h-72 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expensePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
                            >
                              {expensePieData.map((entry, index) => (
                                <Cell key={`cell-exp-${index}`} fill={entry.color} stroke="#0F172A" strokeWidth={2} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              formatter={(val: number) => [`R$ ${val.toFixed(2)} (${totalExpensesSum > 0 ? ((val / totalExpensesSum) * 100).toFixed(1) : 0}%)`, 'Gasto']}
                              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                            />
                            <Legend
                              wrapperStyle={{ color: '#F8FAFC', paddingTop: '10px' }}
                              formatter={(value, entry: any) => {
                                const val = entry?.payload?.value || 0;
                                const pct = totalExpensesSum > 0 ? ((val / totalExpensesSum) * 100).toFixed(1) : '0';
                                return (
                                  <span style={{ color: '#F8FAFC' }} className="text-xs font-extrabold ml-1.5">
                                    {value} <strong style={{ color: '#F87171' }}>({pct}%)</strong>
                                  </span>
                                );
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 4: DEPRECIAÇÃO FIPE (LINECHART COM DOTS) */}
          {activeTab === 'fipe' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Curva de Desvalorização do Veículo por KM</span>
                <span className="text-[10px] text-purple-400 font-mono">FIPE vs Odômetro</span>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fipeCurvePoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="kmLabel" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                    <RechartsTooltip
                      formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Valor Estimado']}
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                    />
                    <Legend
                      wrapperStyle={{ color: '#F8FAFC', paddingTop: '10px' }}
                      formatter={() => (
                        <span style={{ color: '#C084FC' }} className="text-xs font-extrabold ml-1.5">
                          Valor do Veículo por KM
                        </span>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="valorVeiculo"
                      stroke="#A855F7"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#A855F7', stroke: '#0F172A', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: '#C084FC', stroke: '#FFF', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 5: RELATÓRIO POR MOTORISTA (BARCHART ESTILO UBER + GASTO COM RECARGA) */}
          {activeTab === 'driver' && (
            <div className="space-y-4">
              {distinctDriverNames.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedDriver('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedDriver === 'ALL' ? 'bg-cyan-400 text-black' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Todos
                  </button>
                  {distinctDriverNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setSelectedDriver(name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedDriver === name ? 'bg-cyan-400 text-black' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Faturamento</p>
                  <p className="text-sm font-black text-emerald-400 font-mono">R$ {driverTotalRevenue.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Corridas</p>
                  <p className="text-sm font-black text-white font-mono">{driverTotalTrips}</p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">KM Rodados</p>
                  <p className="text-sm font-black text-white font-mono">{driverTotalKm.toFixed(1)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Ganhos Diários (Bruto + Gorjetas)</span>
                <span className="text-[10px] text-cyan-400 font-mono">Padrão usado por Uber/99 no painel do motorista</span>
              </div>

              {dailyEarningsBarData.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">Sem faturamento lançado no período selecionado.</div>
              ) : (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyEarningsBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `R$${val}`} />
                      <RechartsTooltip
                        formatter={(val: number) => [`R$ ${val.toFixed(2)}`, 'Ganhos do dia']}
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                      />
                      <Bar dataKey="total" fill="#22D3EE" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {selectedDriver !== 'ALL' && (
                <div className="p-3.5 bg-slate-900 border border-rose-800/60 rounded-2xl space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Gasto de {selectedDriver} com Recarga/Combustível</span>
                  <p className="text-lg font-black text-rose-400 font-mono">
                    R$ {((driverExpenseSummary?.chargingTotal || 0) + (driverExpenseSummary?.fuelTotal || 0)).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Manutenção: R$ {(driverExpenseSummary?.maintenanceTotal || 0).toFixed(2)} • Seguro: R$ {(driverExpenseSummary?.insuranceTotal || 0).toFixed(2)} • Outros: R$ {(driverExpenseSummary?.otherTotal || 0).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-white font-bold pt-1 border-t border-slate-800 mt-1">
                    Despesas totais: R$ {(driverExpenseSummary?.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
