import { collection, doc, getDoc, setDoc, getDocs, updateDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';

const USERS_COLLECTION = 'users';

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, USERS_COLLECTION, uid);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
    return null;
  }
};

export const createUserProfile = async (uid: string, email: string, displayName: string, role: 'ADMIN' | 'STAFF' | 'RESIGNED' | 'PENDING' = 'PENDING'): Promise<UserProfile> => {
  const newUser: UserProfile = {
    uid,
    email,
    displayName,
    role,
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), newUser);
    return newUser;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${USERS_COLLECTION}/${uid}`);
    return newUser;
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs.map(doc => doc.data() as UserProfile);
};

export const updateUserRole = async (uid: string, role: 'ADMIN' | 'STAFF' | 'RESIGNED' | 'PENDING', resignationReason?: string): Promise<void> => {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const dataToUpdate: any = { role };
  if (resignationReason !== undefined) {
    dataToUpdate.resignationReason = resignationReason;
  }
  try {
    await updateDoc(docRef, dataToUpdate);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const docRef = doc(db, USERS_COLLECTION, uid);
  try {
    await updateDoc(docRef, data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
};

export interface UserStats {
  taskCount: number;
  eventCount: number;
}

export const getUserStats = async (uid: string): Promise<UserStats> => {
  try {
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', uid));
    const tasksSnapshot = await getCountFromServer(tasksQuery);
    
    const eventsQuery = query(collection(db, 'events'), where('userId', '==', uid));
    const eventsSnapshot = await getCountFromServer(eventsQuery);

    return {
      taskCount: tasksSnapshot.data().count,
      eventCount: eventsSnapshot.data().count,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return { taskCount: 0, eventCount: 0 };
  }
};
