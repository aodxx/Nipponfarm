import { addDays, format, parseISO } from 'date-fns';
import { TaskType, Task, SowStatus } from '../types';

// จำนวนวันมาตรฐานตามหลักวิชาการจัดการฟาร์มสุกร
export const CYCLE_DAYS = {
  HEAT_CHECK: 21,      // ตรวจกลับสัดหลังผสม
  ULTRASOUND: 28,      // อัลตราซาวด์หลังผสม
  MOVE_TO_FARROW: 107, // ย้ายเข้าเล้าคลอด (นับจากวันผสม)
  FARROW: 114,         // กำหนดคลอด (นับจากวันผสม)
  WEAN: 24,            // กำหนดหย่านม (นับจากวันคลอด)
  RECOVERY: 7,         // ระยะพักฟื้นหลังหย่านม หรือ แท้ง เพื่อรอผสมใหม่
};

/**
 * สร้าง Task ใหม่เมื่อมีการบันทึกกิจกรรม "ผสมพันธุ์"
 */
export function generateTasksForBreed(breedDateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  const breedDate = parseISO(breedDateStr);
  const now = Date.now();
  
  return [
    {
      sowId,
      sowDisplayId,
      userId,
      type: 'HEAT_CHECK',
      dueDate: format(addDays(breedDate, CYCLE_DAYS.HEAT_CHECK), 'yyyy-MM-dd'),
      status: 'PENDING',
      createdAt: now
    },
    {
      sowId,
      sowDisplayId,
      userId,
      type: 'ULTRASOUND',
      dueDate: format(addDays(breedDate, CYCLE_DAYS.ULTRASOUND), 'yyyy-MM-dd'),
      status: 'PENDING',
      createdAt: now
    },
    {
      sowId,
      sowDisplayId,
      userId,
      type: 'MOVE_TO_FARROW',
      dueDate: format(addDays(breedDate, CYCLE_DAYS.MOVE_TO_FARROW), 'yyyy-MM-dd'),
      status: 'PENDING',
      isDraft: true,
      createdAt: now
    },
    {
      sowId,
      sowDisplayId,
      userId,
      type: 'FARROW',
      dueDate: format(addDays(breedDate, CYCLE_DAYS.FARROW), 'yyyy-MM-dd'),
      status: 'PENDING',
      isDraft: true,
      createdAt: now
    }
  ];
}

/**
 * สร้าง Task ใหม่เมื่อมีการบันทึก "ท้อง (Positive)"
 * ต้องใช้วันที่ผสมพันธุ์ (breedDate) เป็นฐานในการคำนวณ
 */
export function generateTasksForPregnant(breedDateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  const breedDate = parseISO(breedDateStr);
  const now = Date.now();
  
  return [
    {
      sowId,
      sowDisplayId,
      userId,
      type: 'MOVE_TO_FARROW',
      dueDate: format(addDays(breedDate, CYCLE_DAYS.MOVE_TO_FARROW), 'yyyy-MM-dd'),
      status: 'PENDING',
      createdAt: now
    },
    {
      sowId,
      sowDisplayId,
      userId,
      type: 'FARROW',
      dueDate: format(addDays(breedDate, CYCLE_DAYS.FARROW), 'yyyy-MM-dd'),
      status: 'PENDING',
      createdAt: now
    }
  ];
}

/**
 * สร้าง Task ใหม่เมื่อมีการบันทึก "คลอด"
 */
export function generateTasksForFarrow(farrowDateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  const farrowDate = parseISO(farrowDateStr);
  
  return [
    {
      sowId,
      sowDisplayId,
      userId,
      type: 'WEAN',
      dueDate: format(addDays(farrowDate, CYCLE_DAYS.WEAN), 'yyyy-MM-dd'),
      status: 'PENDING',
      createdAt: Date.now()
    }
  ];
}

/**
 * สร้าง Task ใหม่เมื่อมีการบันทึก "หย่านม" หรือ "แท้ง"
 */
export function generateTasksForRecovery(recoveryDateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  const recoveryDate = parseISO(recoveryDateStr);
  
  return [
    {
      sowId,
      sowDisplayId,
      userId,
      type: 'BREED',
      dueDate: format(addDays(recoveryDate, CYCLE_DAYS.RECOVERY), 'yyyy-MM-dd'),
      status: 'PENDING',
      createdAt: Date.now()
    }
  ];
}

/**
 * สร้าง Task ให้ผสมพันธุ์ทันที (กรณีกลับสัด หรือ ตรวจไม่ท้อง)
 */
export function generateTasksForImmediateBreed(dateStr: string, sowId: string, sowDisplayId: string, userId: string): Omit<Task, 'id'>[] {
  return [
    {
      sowId,
      sowDisplayId,
      userId,
      type: 'BREED',
      dueDate: dateStr,
      status: 'PENDING',
      createdAt: Date.now()
    }
  ];
}

/**
 * คำนวณสถานะและ Parity ถัดไปของแม่หมู
 */
export function calculateNextSowState(
  currentStatus: SowStatus, 
  currentParity: number, 
  eventType: 'BREED' | 'ULTRASOUND_POS' | 'ULTRASOUND_NEG' | 'ABORTION' | 'FARROW' | 'WEAN' | 'HEAT_RETURN' | 'CULL'
): { status: SowStatus, parity: number } {
  
  let newStatus = currentStatus;
  let newParity = currentParity;

  switch (eventType) {
    case 'BREED':
      newStatus = 'MATED'; // ผสมแล้ว รอตรวจ
      break;
    case 'ULTRASOUND_POS':
      newStatus = 'PREGNANT'; // ท้อง
      break;
    case 'ULTRASOUND_NEG':
    case 'HEAT_RETURN':
      newStatus = 'IDLE'; // ไม่ท้อง หรือ กลับสัด -> กลับมาพร้อมผสมใหม่ทันที (ไม่เพิ่ม Parity)
      break;
    case 'ABORTION':
      newStatus = 'RECOVERY'; // แท้ง -> พักฟื้น 7 วัน (ไม่เพิ่ม Parity)
      break;
    case 'FARROW':
      newStatus = 'LACTATING'; // คลอด -> เลี้ยงลูก
      break;
    case 'WEAN':
      newStatus = 'RECOVERY'; // หย่านม -> พักฟื้น 7 วัน
      newParity = currentParity + 1; // หย่านมสำเร็จ -> เพิ่มรอบการผลิต (Parity) ขึ้น 1 รอบ
      break;
    case 'CULL':
      newStatus = 'CULLED';
      break;
  }

  return { status: newStatus, parity: newParity };
}
