import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';
const TASKS_COLLECTION = 'tasks';

// ── Users ─────────────────────────────────────────────────────────────────────
export const subscribeToAllUsers = (callback) => {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const updateUserAdmin = async (uid, data) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), data);
};

export const deleteUserAdmin = async (uid) => {
  // Deletes Firestore user document only (Firebase Auth deletion requires Admin SDK)
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const subscribeToAllTasksAdmin = (callback) => {
  const q = query(collection(db, TASKS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const addTaskAdmin = async (taskData) => {
  return await addDoc(collection(db, TASKS_COLLECTION), {
    ...taskData,
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateTaskAdmin = async (taskId, data) => {
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTaskAdmin = async (taskId) => {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
};
