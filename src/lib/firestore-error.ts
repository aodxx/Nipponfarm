import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  // Keep details in console for debugging
  console.error('Firestore Error Detail:', JSON.stringify(errInfo, null, 2));

  // Determine user-friendly message
  let userFriendlyMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล';
  
  if (errMessage.includes('permission-denied')) {
    userFriendlyMessage = `คุณไม่มีสิทธิ์เข้าถึงข้อมูลในส่วนนี้ (Permission Denied: ${operationType})`;
  } else if (errMessage.includes('unavailable')) {
    userFriendlyMessage = 'ระบบฐานข้อมูลไม่พร้อมใช้งานชั่วคราว โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  } else if (errMessage.includes('not-found')) {
    userFriendlyMessage = 'ไม่พบข้อมูลที่ต้องการ';
  } else if (errMessage.includes('offline')) {
    userFriendlyMessage = 'คุณกำลังใช้งานในโหมดออฟไลน์ ข้อมูลบางส่วนอาจไม่เป็นปัจจุบัน';
  } else {
    userFriendlyMessage = `Database Error (${operationType}): ${errMessage}`;
  }

  throw new Error(userFriendlyMessage);
}
