import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildAuditEvent, type AuditEventInput, type AuditEventV2 } from '../lib/audit';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';

export const AUDIT_COLLECTION = 'audit_events';

export const appendAuditEvent = async (input: AuditEventInput): Promise<string> => {
  const event: AuditEventV2 = buildAuditEvent(input);
  try {
    const ref = await addDoc(collection(db, AUDIT_COLLECTION), event);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, AUDIT_COLLECTION);
    throw error;
  }
};
