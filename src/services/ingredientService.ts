
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

export interface MasterIngredient {
  id?: string;
  name: string;
  category: string;
  lastPrice?: number;
  lastWeight?: number;
  unit?: string;
  updatedAt: number;
}

export async function saveToMasterData(name: string, category: string, price?: number, weight?: number, unit?: string) {
  if (!auth.currentUser) return;
  
  const q = query(collection(db, 'master_ingredients'), where('name', '==', name));
  const snapshot = await getDocs(q);
  
  const data = {
    name,
    category,
    lastPrice: price || 0,
    lastWeight: weight || 0,
    unit: unit || 'kg',
    updatedAt: Date.now()
  };

  if (!snapshot.empty) {
    // Update existing
    const docId = snapshot.docs[0].id;
    await updateDoc(doc(db, 'master_ingredients', docId), data);
  } else {
    // Add new
    await addDoc(collection(db, 'master_ingredients'), data);
  }
}

export async function getMasterIngredients() {
  const snapshot = await getDocs(collection(db, 'master_ingredients'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterIngredient));
}

export function subscribeMasterIngredients(callback: (ingredients: MasterIngredient[]) => void) {
  return onSnapshot(collection(db, 'master_ingredients'), (snapshot) => {
    const ingredients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterIngredient));
    callback(ingredients);
  });
}
