import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task } from '../types';
import { MaintenanceRequest } from './maintenanceService';
import {
  UnifiedWorkItem,
  isActionableWorkItem,
  normalizeBreedingTask,
  normalizeMaintenanceRequest,
  sortUnifiedWorkItems,
} from '../lib/taskEngine';

export const subscribeToUnifiedWorkQueue = (
  callback: (items: UnifiedWorkItem[]) => void,
  errorCallback?: (error: unknown) => void,
) => {
  let breedingItems: UnifiedWorkItem[] = [];
  let maintenanceItems: UnifiedWorkItem[] = [];

  const emit = () => {
    callback(sortUnifiedWorkItems([...breedingItems, ...maintenanceItems].filter(isActionableWorkItem)));
  };

  const unsubscribeBreeding = onSnapshot(
    query(collection(db, 'tasks'), where('status', '==', 'PENDING')),
    (snapshot) => {
      breedingItems = snapshot.docs.map((snapshotDoc) => normalizeBreedingTask({
        id: snapshotDoc.id,
        ...(snapshotDoc.data() as Task),
      }));
      emit();
    },
    (error) => errorCallback?.(error),
  );

  const unsubscribeMaintenance = onSnapshot(
    collection(db, 'maintenance_requests'),
    (snapshot) => {
      maintenanceItems = snapshot.docs.map((snapshotDoc) => normalizeMaintenanceRequest({
        id: snapshotDoc.id,
        ...(snapshotDoc.data() as MaintenanceRequest),
      }));
      emit();
    },
    (error) => errorCallback?.(error),
  );

  return () => {
    unsubscribeBreeding();
    unsubscribeMaintenance();
  };
};
