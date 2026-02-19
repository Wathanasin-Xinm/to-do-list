import { db } from './firebase';
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  addDoc,
  setDoc,
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';

const USERS_COLLECTION = 'users';
const TASKS_COLLECTION = 'tasks';

// ── Users ─────────────────────────────────────────────────────────────────────
export const subscribeToAllUsers = (callback) => {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() })));
  });
};

export const updateUserAdmin = async (uid, data) => {
  const { password, ...firestoreData } = data;
  await updateDoc(doc(db, USERS_COLLECTION, uid), firestoreData);
};

export const addUserAdmin = async ({ email, password, nickname, role }) => {
  const auth = getAuth();
  // Create Firebase Auth user
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;
  // Create Firestore doc
  await setDoc(doc(db, USERS_COLLECTION, uid), {
    uid,
    email,
    nickname: nickname || email.split('@')[0],
    role: role || 'user',
    color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    createdAt: new Date().toISOString(),
  });
  return uid;
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
