import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

const TASKS_COLLECTION = 'tasks';

export const subscribeToTasks = (user, callback) => {
  let q;
  if (!user) return () => {};

  // Admin sees all, User sees own
  // Note: We need to fetch the user role first, but for simplicity in real-time listener
  // we might need to handle this at the UI/Context level or use two different queries.
  // For this implementation, we will trust the Security Rules to enforce, but the query 
  // needs to match the rules or it will fail.
  
  // A safer approach for the client is to always query by ownerId unless we KNOW they are admin.
  // We'll let the Component pass the correct constraints.
  
  q = query(
    collection(db, TASKS_COLLECTION),
    where('ownerId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks);
  });
};

export const subscribeToAllTasks = (callback) => {
    const q = query(
        collection(db, TASKS_COLLECTION),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(tasks);
    });
}

export const addTask = async (taskData, user) => {
  return await addDoc(collection(db, TASKS_COLLECTION), {
    ...taskData,
    ownerId: user.uid,
    ownerEmail: user.email,
    ownerNickname: taskData.ownerNickname || '',
    ownerColor: user.color || '#000000',
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const toggleTaskCompletion = async (taskId, currentStatus) => {
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(taskRef, {
    completed: !currentStatus,
    updatedAt: serverTimestamp()
  });
};

export const deleteTask = async (taskId) => {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
};

export const updateTask = async (taskId, data) => {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}
