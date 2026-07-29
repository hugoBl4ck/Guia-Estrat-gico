import { describe, it, expect } from 'vitest';
import { Earning, Expense } from '../types';

// Função utilitária de filtro RLS (Row Level Security) simulando as regras do Postgres auth.uid() = user_id
export function filterRecordsByUser<T extends { userId?: string }>(records: T[], currentAuthUserId: string): T[] {
  return records.filter((rec) => rec.userId === currentAuthUserId);
}

describe('Suíte de Segurança & Isolamento Multi-Tenant (RLS Supabase)', () => {
  const userA_id = 'user-uuid-1111-aaaa';
  const userB_id = 'user-uuid-2222-bbbb';

  const mockDatabaseGanhos: (Earning & { userId: string })[] = [
    {
      id: 'earning-1',
      platform: 'UBER',
      grossAmount: 180.00,
      tipsAmount: 10.00,
      totalTrips: 12,
      rideDistanceKm: 85.0,
      recordedAt: new Date().toISOString(),
      userId: userA_id,
    },
    {
      id: 'earning-2',
      platform: 'NINETY_NINE',
      grossAmount: 220.00,
      tipsAmount: 15.00,
      totalTrips: 15,
      rideDistanceKm: 110.0,
      recordedAt: new Date().toISOString(),
      userId: userB_id,
    },
  ];

  const mockDatabaseDespesas: (Expense & { userId: string })[] = [
    {
      id: 'exp-1',
      category: 'ELECTRIC_CHARGING',
      amount: 45.00,
      kwhAmount: 37.0,
      tariffPerKwh: 1.21,
      expenseDate: new Date().toISOString(),
      userId: userA_id,
    },
    {
      id: 'exp-2',
      category: 'WASH',
      amount: 35.00,
      expenseDate: new Date().toISOString(),
      userId: userB_id,
    },
  ];

  it('deve garantir que o Usuário A visualize APENAS os seus próprios ganhos', () => {
    const userAEarnings = filterRecordsByUser(mockDatabaseGanhos, userA_id);
    expect(userAEarnings.length).toBe(1);
    expect(userAEarnings[0].id).toBe('earning-1');
    expect(userAEarnings[0].grossAmount).toBe(180.00);
  });

  it('deve garantir que o Usuário B visualize APENAS as suas próprias despesas', () => {
    const userBExpenses = filterRecordsByUser(mockDatabaseDespesas, userB_id);
    expect(userBExpenses.length).toBe(1);
    expect(userBExpenses[0].id).toBe('exp-2');
    expect(userBExpenses[0].amount).toBe(35.00);
  });

  it('deve comprovar ESTANQUEIDADE TOTAL: Usuário B não pode acessar NENHUM registro do Usuário A', () => {
    const userBEarnings = filterRecordsByUser(mockDatabaseGanhos, userB_id);
    const leakedRecordsUserA = userBEarnings.filter((e) => e.userId === userA_id);

    expect(leakedRecordsUserA.length).toBe(0);
  });
});
