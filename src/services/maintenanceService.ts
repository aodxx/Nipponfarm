import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';

export interface MaintenanceRequest {
  id?: string;
  userId: string;
  title: string;
  description: string;
  location: string;
  locationDetails?: string;
  category: string;
  requiredParts?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  videoUrl?: string | null; // optional Cloudflare R2 video link
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reportedBy: string;
  createdAt: number;
  resolvedAt?: number;
}

const COLLECTION_NAME = 'maintenance_requests';

export const createMaintenanceRequest = async (request: Omit<MaintenanceRequest, 'id'> & { id?: string }) => {
  try {
    if (request.id) {
      const docRef = doc(db, COLLECTION_NAME, request.id);
      const { id, ...data } = request;
      await setDoc(docRef, {
        ...data,
        createdAt: Date.now()
      });
      return { id, ...data };
    } else {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...request,
        createdAt: Date.now()
      });
      return { id: docRef.id, ...request };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
};

export const updateMaintenanceStatus = async (id: string, status: MaintenanceRequest['status']) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = { status };
    if (status === 'RESOLVED') {
      updateData.resolvedAt = Date.now();
    }
    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${id}`);
  }
};

export const deleteMaintenanceRequest = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
};
