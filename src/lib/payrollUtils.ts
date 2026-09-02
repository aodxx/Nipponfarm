import { SalaryAdvance } from '../types';

export interface PayrollPeriodConfig {
  totalBaseSalary: number;
  advances: SalaryAdvance[];
  period: 1 | 2; // 1 = 1st-15th, 2 = 16th-end of month
  userId: string;
}

export interface PayrollCalculationResult {
  periodBaseSalary: number;
  periodAdvancesList: SalaryAdvance[];
  totalAdvancesAmount: number;
  netSalary: number;
}

/**
 * Calculates net salary for a given period (twice-a-month pay cycle)
 * Period 1: 1st - 15th
 * Period 2: 16th - end of month
 * Deducts approved advances automatically.
 */
export const calculateNetSalary = ({
  totalBaseSalary,
  advances,
  period,
  userId
}: PayrollPeriodConfig): PayrollCalculationResult => {
  // Staff gets paid twice a month (50% each period)
  const periodBaseSalary = totalBaseSalary / 2;

  // Filter approved advances for the current user and selected period
  const periodAdvancesList = advances.filter((a) => {
    // Note: Assuming 'a.status' might exist. If it doesn't, we just check userId.
    if (a.userId !== userId) return false;
    
    // Check if advance is approved (if status exists in the system)
    if (a.status && a.status !== 'APPROVED') return false;
    
    let day = 1;
    if (a.date && a.date.includes('-')) {
      day = parseInt(a.date.split('-')[2], 10);
    } else {
      day = new Date(a.date).getDate();
    }
    
    if (period === 1) return day <= 15;
    return day > 15;
  });

  // Calculate total amount of advances in this period
  const totalAdvancesAmount = periodAdvancesList.reduce((sum, a) => sum + a.amount, 0);

  // Calculate net salary (prevent negative salary)
  const netSalary = Math.max(0, periodBaseSalary - totalAdvancesAmount);

  return {
    periodBaseSalary,
    periodAdvancesList,
    totalAdvancesAmount,
    netSalary
  };
};
