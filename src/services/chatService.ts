import { collection, query, where, orderBy, onSnapshot, getDocs, setDoc, doc, addDoc, updateDoc, increment, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatRoom, ChatMessage, UserProfile } from '../types';
import { OperationType, handleFirestoreError } from '../lib/firestore-error';

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
};

export const getOrCreateChatRoom = async (user1: UserProfile, user2: UserProfile): Promise<string> => {
  // Sort IDs to ensure consistency (room ID is always the same for the pair)
  const sortedIds = [user1.uid, user2.uid].sort();
  const roomId = `${sortedIds[0]}_${sortedIds[1]}`;
  
  const roomRef = doc(db, 'chat_rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) {
    const newRoom: ChatRoom = {
      id: roomId,
      participants: [user1.uid, user2.uid],
      participantNames: {
        [user1.uid]: user1.displayName || 'Unknown',
        [user2.uid]: user2.displayName || 'Unknown'
      },
      unreadCount: {
        [user1.uid]: 0,
        [user2.uid]: 0
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await setDoc(roomRef, newRoom);
  } else {
    // Ensure participant names are up to date
    await updateDoc(roomRef, {
      [`participantNames.${user1.uid}`]: user1.displayName || 'Unknown',
      [`participantNames.${user2.uid}`]: user2.displayName || 'Unknown',
    });
  }
  
  return roomId;
};

export const createGroupChat = async (name: string, members: UserProfile[], creator: UserProfile): Promise<string> => {
  const roomRef = doc(collection(db, 'chat_rooms'));
  const allMembers = [creator, ...members];
  const participants = allMembers.map(u => u.uid);
  
  const participantNames: Record<string, string> = {};
  const unreadCount: Record<string, number> = {};
  
  allMembers.forEach(u => {
    participantNames[u.uid] = u.displayName || 'Unknown';
    unreadCount[u.uid] = 0;
  });

  const newRoom: ChatRoom = {
    id: roomRef.id,
    isGroup: true,
    name,
    participants,
    participantNames,
    unreadCount,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await setDoc(roomRef, newRoom);
  return roomRef.id;
};



export const subscribeToChatRooms = (userId: string, callback: (rooms: ChatRoom[]) => void) => {
  const q = query(
    collection(db, 'chat_rooms'),
    where('participants', 'array-contains', userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const rooms: ChatRoom[] = [];
    snapshot.forEach(doc => rooms.push({ id: doc.id, ...doc.data() } as ChatRoom));
    // Sort client-side to prevent Firebase composite index requirement
    rooms.sort((a, b) => b.updatedAt - a.updatedAt);
    callback(rooms);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'chat_rooms');
  });
};

export const subscribeToMessages = (roomId: string, callback: (messages: ChatMessage[]) => void) => {
  const q = query(
    collection(db, 'chat_messages'),
    where('roomId', '==', roomId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const msgs: ChatMessage[] = [];
    snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as ChatMessage));
    // Sort client-side to prevent composite index requirement
    msgs.sort((a, b) => a.createdAt - b.createdAt);
    callback(msgs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'chat_messages');
  });
};

export const sendMessage = async (roomId: string, sender: UserProfile, content: string, otherUserIds: string[]) => {
  const msg: ChatMessage = {
    roomId,
    senderId: sender.uid,
    senderName: sender.displayName || 'Unknown',
    content,
    read: false,
    createdAt: Date.now()
  };
  
  // Add message
  await addDoc(collection(db, 'chat_messages'), msg);
  
  // Prepare room updates
  const roomUpdates: any = {
    lastMessage: content,
    lastMessageTime: msg.createdAt,
    lastMessageSenderId: sender.uid,
    updatedAt: msg.createdAt
  };

  // Increment unread for all other users
  otherUserIds.forEach(id => {
    if (id !== sender.uid) {
      roomUpdates[`unreadCount.${id}`] = increment(1);
    }
  });

  const roomRef = doc(db, 'chat_rooms', roomId);
  await updateDoc(roomRef, roomUpdates);
};

export const markMessagesAsRead = async (roomId: string, userId: string) => {
  const roomRef = doc(db, 'chat_rooms', roomId);
  await updateDoc(roomRef, {
    [`unreadCount.${userId}`]: 0
  });

  const q = query(
    collection(db, 'chat_messages'),
    where('roomId', '==', roomId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  let count = 0;
  snap.forEach(d => {
    if (d.data().senderId !== userId) {
        batch.update(d.ref, { read: true });
        count++;
    }
  });
  if (count > 0) {
    await batch.commit();
  }
};
