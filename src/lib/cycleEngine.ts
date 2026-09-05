import { addDays, format, parseISO } from 'date-fns';
import { TaskType, Task, SowStatus } from '../types';

export const CYCLE_DAYS = {
  HEAT_CHECK: 21,
  ULTRASOUND: 28,
  MOVE_TO_FARROW: 107,
  FARROW: 114,
  WEAN: 24,
  RECOVERY: 7,
};

export function generateTasksForBreed(breedDateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  const breedDate = parseISO(breedDateStr);
  const now = Date.now();
  return [
    { sowId, sowDisplayId, userId, type: 'HEAT_CHECK', dueDate: format(addDays(breedDate, CYCLE_DAYS.HEAT_CHECK), 'yyyy-MM-dd'), status: 'PENDING', createdAt: now },
    { sowId, sowDisplayId, userId, type: 'ULTRASOUND', dueDate: format(addDays(breedDate, CYCLE_DAYS.ULTRASOUND), 'yyyy-MM-dd'), status: 'PENDING', createdAt: now },
    { sowId, sowDisplayId, userId, type: 'MOVE_TO_FARROW', dueDate: format(addDays(breedDate, CYCLE_DAYS.MOVE_TO_FARROW), 'yyyy-MM-dd'), status: 'PENDING', isDraft: true, createdAt: now },
    { sowId, sowDisplayId, userId, type: 'FARROW', dueDate: format(addDays(breedDate, CYCLE_DAYS.FARROW), 'yyyy-MM-dd'), status: 'PENDING', isDraft: true, createdAt: now },
  ];
}

export function generateTasksForPregnant(breedDateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  const breedDate = parseISO(breedDateStr);
  const now = Date.now();
  return [
    { sowId, sowDisplayId, userId, type: 'MOVE_TO_FARROW', dueDate: format(addDays(breedDate, CYCLE_DAYS.MOVE_TO_FARROW), 'yyyy-MM-dd'), status: 'PENDING', createdAt: now },
    { sowId, sowDisplayId, userId, type: 'FARROW', dueDate: format(addDays(breedDate, CYCLE_DAYS.FARROW), 'yyyy-MM-dd'), status: 'PENDING', createdAt: now },
  ];
}

export function generateTasksForFarrow(farrowDateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  const farrowDate = parseISO(farrowDateStr);
  return [{ sowId, sowDisplayId, userId, type: 'WEAN', dueDate: format(addDays(farrowDate, CYCLE_DAYS.WEAN), 'yyyy-MM-dd'), status: 'PENDING', createdAt: Date.now() }];
}

export function generateTasksForRecovery(recoveryDateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  const recoveryDate = parseISO(recoveryDateStr);
  return [{ sowId, sowDisplayId, userId, type: 'BREED', dueDate: format(addDays(recoveryDate, CYCLE_DAYS.RECOVERY), 'yyyy-MM-dd'), status: 'PENDING', createdAt: Date.now() }];
}

export function generateTasksForImmediateBreed(dateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  return [{ sowId, sowDisplayId, userId, type: 'BREED', dueDate: dateStr, status: 'PENDING', createdAt: Date.now() }];
}

export function calculateNextSowState(
  currentStatus: SowStatus,
  currentParity: number,
  eventType: 'BREED' | 'ULTRASOUND_POS' | 'ULTRASOUND_NEG' | 'ABORTION' | 'FARROW' | 'WEAN' | 'HEAT_RETURN' | 'CULL'
): { status: SowStatus, parity: number } {
  let newStatus = currentStatus;
  let newParity = currentParity;

  switch (eventType) {
    case 'BREED':
      newStatus = 'MATED';
      break;
    case 'ULTRASOUND_POS':
      newStatus = 'PREGNANT';
      break;
    case 'ULTRASOUND_NEG':
    case 'HEAT_RETURN':
      newStatus = 'IDLE';
      break;
    case 'ABORTION':
      newStatus = 'RECOVERY';
      break;
    case 'FARROW':
      newStatus = 'LACTATING';
      newParity = currentParity + 1;
      break;
    case 'WEAN':
      newStatus = 'RECOVERY';
      break;
    case 'CULL':
      newStatus = 'CULLED';
      break;
  }

  return { status: newStatus, parity: newParity };
}
