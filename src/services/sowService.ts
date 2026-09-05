import { collection, addDoc, onSnapshot, query, doc, getDocs, writeBatch, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Sow, SowEvent, Task, EventType } from '../types';
import { OperationType, handleFirestoreError } from '../lib/firestore-error';
import { generateTasksForBreed, generateTasksForPregnant, generateTasksForFarrow, generateTasksForRecovery, generateTasksForImmediateBreed, calculateNextSowState } from '../lib/cycleEngine';
import { applySwineAiSafetyGate } from '../lib/swineAiSafety';

const SOWS_COLLECTION = 'sows';
const EVENTS_COLLECTION = 'events';
const TASKS_COLLECTION = 'tasks';

const getCurrentUserId = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  return userId;
};

export const addSow = async (sowData: Omit<Sow, 'id' | 'status' | 'parity' | 'createdAt' | 'updatedAt' | 'userId'>, recordedBy?: string) => {
  const now = Date.now();
  const userId = getCurrentUserId();
  const newSow: Omit<Sow, 'id'> = {
    ...sowData,
    type: sowData.type || 'SOW',
    userId,
    status: 'IDLE',
    parity: 0,
    recordedBy: recordedBy || 'Unknown',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = await addDoc(collection(db, SOWS_COLLECTION), newSow);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SOWS_COLLECTION);
  }
};

export const subscribeToSows = (callback: (sows: Sow[]) => void, errorCallback?: (error: any) => void) => {
  const q = query(collection(db, SOWS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const sows = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Sow))
      .filter(sow => sow.status !== 'CULLED');
    sows.sort((a, b) => b.createdAt - a.createdAt);
    callback(sows);
  }, (error) => {
    if (errorCallback) errorCallback(error);
    handleFirestoreError(error, OperationType.GET, SOWS_COLLECTION);
  });
};

export const subscribeToSow = (sowId: string, callback: (sow: Sow | null) => void, errorCallback?: (error: any) => void) => {
  return onSnapshot(doc(db, SOWS_COLLECTION, sowId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Sow);
    } else {
      callback(null);
    }
  }, (error) => {
    if (errorCallback) errorCallback(error);
    handleFirestoreError(error, OperationType.GET, SOWS_COLLECTION);
  });
};

export const subscribeToSowEvents = (sowId: string, callback: (events: SowEvent[]) => void, errorCallback?: (error: any) => void) => {
  const q = query(collection(db, EVENTS_COLLECTION), where('sowId', '==', sowId));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SowEvent));
    events.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.createdAt - a.createdAt;
    });
    callback(events);
  }, (error) => {
    if (errorCallback) errorCallback(error);
    handleFirestoreError(error, OperationType.GET, EVENTS_COLLECTION);
  });
};

export const subscribeToSowTasks = (sowId: string, callback: (tasks: Task[]) => void, errorCallback?: (error: any) => void) => {
  const q = query(collection(db, TASKS_COLLECTION), where('sowId', '==', sowId));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    callback(tasks);
  }, (error) => {
    if (errorCallback) errorCallback(error);
    handleFirestoreError(error, OperationType.GET, TASKS_COLLECTION);
  });
};

export const subscribeToAllPendingTasks = (callback: (tasks: Task[]) => void, errorCallback?: (error: any) => void) => {
  const q = query(collection(db, TASKS_COLLECTION), where('status', '==', 'PENDING'));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    callback(tasks);
  }, (error) => {
    if (errorCallback) errorCallback(error);
    handleFirestoreError(error, OperationType.GET, TASKS_COLLECTION);
  });
};

export const getActiveBoars = async (): Promise<Sow[]> => {
  const q = query(collection(db, SOWS_COLLECTION), where('type', '==', 'BOAR'));
  const snapshot = await getDocs(q);
  const boars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sow));
  return boars.filter(b => b.status !== 'CULLED');
};

export const getHistoricalBreedData = async () => {
  const q = query(collection(db, EVENTS_COLLECTION), where('type', '==', 'BREED'));
  const snapshot = await getDocs(q);
  const boars = new Set<string>();
  const semens = new Set<string>();
  snapshot.docs.forEach(doc => {
    const data = doc.data().details;
    if (data?.boarId) boars.add(data.boarId);
    if (data?.semenId) semens.add(data.semenId);
  });
  return { boars: Array.from(boars), semens: Array.from(semens) };
};

export const updateSowPen = async (sowId: string, penId: string | null) => {
  const sowRef = doc(db, SOWS_COLLECTION, sowId);
  try {
    await batchUpdateSowPen(sowRef, penId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SOWS_COLLECTION}/${sowId}`);
  }
};

async function batchUpdateSowPen(sowRef: any, penId: string | null) {
  const batch = writeBatch(db);
  batch.update(sowRef, { penId, updatedAt: Date.now() });
  await batch.commit();
}

export const recordEvent = async (sow: Sow, eventType: EventType, date: string, details: any, relatedTaskId?: string, recordedBy?: string, videoUrl?: string | null, draftDocId?: string) => {
  const batch = writeBatch(db);
  const now = Date.now();
  const userId = getCurrentUserId();

  try {
    if (eventType === 'CULL') {
      if (!sow.id) throw new Error('Cannot remove sow without document ID');

      const removalDetails = {
        ...details,
        removalType: details?.removalType || 'CULL',
        removalReason: details?.removalReason || details?.reason || null,
        previousStatus: sow.status,
        parityAtRemoval: sow.parity,
      };

      const removalEventRef = doc(collection(db, EVENTS_COLLECTION));
      batch.set(removalEventRef, {
        userId,
        sowId: sow.id,
        type: 'CULL',
        date,
        parity: sow.parity,
        details: removalDetails,
        videoUrl: videoUrl || null,
        recordedBy: recordedBy || 'Unknown',
        createdAt: now,
      });

      const tasksQ = query(collection(db, TASKS_COLLECTION), where('sowId', '==', sow.id));
      const tasksSnap = await getDocs(tasksQ);
      tasksSnap.docs.forEach(tDoc => {
        const task = tDoc.data();
        if (task.status === 'PENDING') {
          batch.update(tDoc.ref, {
            status: 'CANCELLED',
            cancelledAt: now,
            cancellationReason: 'SOW_REMOVED',
          });
        }
      });

      const sowRef = doc(db, SOWS_COLLECTION, sow.id);
      batch.update(sowRef, {
        status: 'CULLED',
        penId: null,
        removedAt: now,
        removedDate: date,
        removedBy: userId,
        removalType: removalDetails.removalType,
        removalReason: removalDetails.removalReason,
        updatedAt: now,
      });

      await batch.commit();
      return;
    }

    const safetyDecision = applySwineAiSafetyGate(eventType, details);
    const safeDetails = safetyDecision.details;
    const lifecycleActionable = safetyDecision.lifecycleActionable;

    const eventRef = draftDocId ? doc(db, EVENTS_COLLECTION, draftDocId) : doc(collection(db, EVENTS_COLLECTION));
    batch.set(eventRef, {
      userId,
      sowId: sow.id,
      type: eventType,
      date,
      parity: sow.parity,
      details: safeDetails,
      videoUrl: videoUrl || null,
      recordedBy: recordedBy || 'Unknown',
      createdAt: now,
    });

    let engineEventType: any = eventType;
    if (lifecycleActionable && eventType === 'ULTRASOUND') {
      if (safeDetails.result === 'POSITIVE') engineEventType = 'ULTRASOUND_POS';
      else if (safeDetails.result === 'NEGATIVE') engineEventType = 'ULTRASOUND_NEG';
      else if (safeDetails.result === 'ABORTION') engineEventType = 'ABORTION';
    }

    const sowRef = doc(db, SOWS_COLLECTION, sow.id!);
    if (lifecycleActionable) {
      const { status: newStatus, parity: newParity } = calculateNextSowState(sow.status, sow.parity, engineEventType);
      batch.update(sowRef, { status: newStatus, parity: newParity, updatedAt: now });
    } else {
      batch.update(sowRef, { updatedAt: now });
    }

    let taskTypeToComplete = '';
    if (lifecycleActionable && relatedTaskId) {
      const taskRef = doc(db, TASKS_COLLECTION, relatedTaskId);
      batch.update(taskRef, { status: 'COMPLETED' });
    } else if (lifecycleActionable) {
      if (eventType === 'BREED') taskTypeToComplete = 'BREED';
      if (eventType === 'ULTRASOUND') taskTypeToComplete = 'ULTRASOUND';
      if (eventType === 'FARROW') taskTypeToComplete = 'FARROW';
      if (eventType === 'WEAN') taskTypeToComplete = 'WEAN';

      if (taskTypeToComplete) {
        const pendingTasksQ = query(collection(db, TASKS_COLLECTION), where('sowId', '==', sow.id));
        const pendingTasksSnap = await getDocs(pendingTasksQ);
        pendingTasksSnap.docs.forEach(tDoc => {
          const data = tDoc.data();
          if (data.status === 'PENDING' && data.type === taskTypeToComplete) {
            batch.update(tDoc.ref, { status: 'COMPLETED' });
          }
        });
      }
    }

    if (lifecycleActionable && (eventType === 'HEAT_RETURN' || (eventType === 'ULTRASOUND' && safeDetails.result !== 'POSITIVE'))) {
      const allPendingQ = query(collection(db, TASKS_COLLECTION), where('sowId', '==', sow.id));
      const allPendingSnap = await getDocs(allPendingQ);
      allPendingSnap.docs.forEach(tDoc => {
        const data = tDoc.data();
        if (data.status === 'PENDING' && tDoc.id !== relatedTaskId && data.type !== taskTypeToComplete) {
          batch.update(tDoc.ref, { status: 'CANCELLED' });
        }
      });
    }

    let newTasks: Omit<Task, 'id'>[] = [];
    if (lifecycleActionable && eventType === 'BREED') {
      newTasks = generateTasksForBreed(date, sow.id!, sow.sowId, userId);
    } else if (lifecycleActionable && eventType === 'ULTRASOUND' && safeDetails.result === 'POSITIVE') {
      const draftTasksQ = query(collection(db, TASKS_COLLECTION), where('sowId', '==', sow.id));
      const draftTasksSnap = await getDocs(draftTasksQ);
      draftTasksSnap.docs.forEach(tDoc => {
        const tData = tDoc.data();
        if (tData.isDraft && (tData.type === 'MOVE_TO_FARROW' || tData.type === 'FARROW')) {
          batch.delete(tDoc.ref);
        }
      });

      const breedQ = query(collection(db, EVENTS_COLLECTION), where('sowId', '==', sow.id));
      const breedSnap = await getDocs(breedQ);
      const breedEvents = breedSnap.docs
        .map(doc => doc.data() as SowEvent)
        .filter(ev => ev.type === 'BREED')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const breedDate = breedEvents.length > 0 ? breedEvents[0].date : date;
      newTasks = generateTasksForPregnant(breedDate, sow.id!, sow.sowId, userId);
    } else if (lifecycleActionable && eventType === 'FARROW') {
      newTasks = generateTasksForFarrow(date, sow.id!, sow.sowId, userId);
    } else if (lifecycleActionable && (eventType === 'WEAN' || (eventType === 'ULTRASOUND' && safeDetails.result === 'ABORTION'))) {
      newTasks = generateTasksForRecovery(date, sow.id!, sow.sowId, userId);
    } else if (lifecycleActionable && (eventType === 'HEAT_RETURN' || (eventType === 'ULTRASOUND' && safeDetails.result === 'NEGATIVE'))) {
      newTasks = generateTasksForImmediateBreed(date, sow.id!, sow.sowId, userId);
    }

    newTasks.forEach(task => {
      const newTaskRef = doc(collection(db, TASKS_COLLECTION));
      batch.set(newTaskRef, { ...task });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch_record_event');
  }
};
