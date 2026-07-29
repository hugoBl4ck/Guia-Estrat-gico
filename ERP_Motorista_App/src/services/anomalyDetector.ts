import { Earning, Expense } from '../types';

export interface AuditAnomaly {
  id: string;
  type: 'DUPLICATE_EARNING' | 'DUPLICATE_EXPENSE' | 'HIGH_CHARGING_TARIFF' | 'OUTLIER_RIDE';
  severity: 'WARNING' | 'INFO';
  title: string;
  description: string;
}

/**
 * Agente Auditor Interno de Anomalias com Hash Único Anti-Duplicidade
 */
export function runAnomalyAudit(earnings: Earning[], expenses: Expense[]): AuditAnomaly[] {
  const anomalies: AuditAnomaly[] = [];
  const seenEarningHashes = new Set<string>();

  // 1. Detecção de Faturamento Duplicado por Hash Único (${plataforma}_${valor}_${km}_${data})
  earnings.forEach((e) => {
    const dateStr = new Date(e.recordedAt).toISOString().slice(0, 13); // Agrupa por hora/dia
    const hash = `${e.platform}_${e.grossAmount}_${e.rideDistanceKm}_${dateStr}`;

    if (seenEarningHashes.has(hash)) {
      anomalies.push({
        id: `dup-earning-${e.id}`,
        type: 'DUPLICATE_EARNING',
        severity: 'WARNING',
        title: 'Faturamento Duplicado Detectado',
        description: `Identificamos uma corrida duplicada de R$ ${e.grossAmount.toFixed(2)} na ${e.platform} com ${e.rideDistanceKm} km.`
      });
    } else {
      seenEarningHashes.add(hash);
    }
  });

  // 2. Detecção de Despesa de Recarga com Tarifa Atípica (> R$ 2,50/kWh)
  expenses.forEach((exp) => {
    if (exp.category === 'ELECTRIC_CHARGING' && exp.tariffPerKwh && exp.tariffPerKwh > 2.50) {
      anomalies.push({
        id: `tariff-high-${exp.id}`,
        type: 'HIGH_CHARGING_TARIFF',
        severity: 'INFO',
        title: 'Tarifa de Recarga Elevada',
        description: `Recarga com tarifa de R$ ${exp.tariffPerKwh.toFixed(2)}/kWh. Prefira carregar na garagem Coelba (R$ 1,21/kWh) para economizar.`
      });
    }
  });

  return anomalies;
}
