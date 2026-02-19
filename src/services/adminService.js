import { db } from "./firebase";
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
  writeBatch,
} from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const USERS_COLLECTION = "users";
const TASKS_COLLECTION = "tasks";

// ── Users ─────────────────────────────────────────────────────────────────────

export const subscribeToAllUsers = (callback) => {
  const q = query(
    collection(db, USERS_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const users = snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }));
    users.sort((a, b) => {
      const aHasOrder = a.order !== undefined && a.order !== null;
      const bHasOrder = b.order !== undefined && b.order !== null;
      if (aHasOrder && bHasOrder) return a.order - b.order;
      if (aHasOrder) return -1;
      if (bHasOrder) return 1;
      return 0;
    });
    callback(users);
  });
};

export const updateUserAdmin = async (uid, data) => {
  const { password, ...firestoreData } = data;
  await updateDoc(doc(db, USERS_COLLECTION, uid), firestoreData);
};

export const addUserAdmin = async ({ email, password, nickname, role }) => {
  const auth = getAuth();
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;
  await setDoc(doc(db, USERS_COLLECTION, uid), {
    uid,
    email,
    nickname: nickname || email.split("@")[0],
    role: role || "user",
    color:
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0"),
    createdAt: new Date().toISOString(),
    order: Date.now(),
  });
  return uid;
};

export const deleteUserAdmin = async (uid) => {
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
};

/**
 * Persist new user order (admin user reordering).
 */
export const updateUserOrder = async (orderedUsers) => {
  const batch = writeBatch(db);
  orderedUsers.forEach((u, index) => {
    const ref = doc(db, USERS_COLLECTION, u.uid);
    batch.update(ref, { order: index });
  });
  await batch.commit();
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const subscribeToAllTasksAdmin = (callback) => {
  const q = query(
    collection(db, TASKS_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    tasks.sort((a, b) => {
      const aHasOrder = a.order !== undefined && a.order !== null;
      const bHasOrder = b.order !== undefined && b.order !== null;
      if (aHasOrder && bHasOrder) return a.order - b.order;
      if (aHasOrder) return -1;
      if (bHasOrder) return 1;
      return 0;
    });
    callback(tasks);
  });
};

export const addTaskAdmin = async (taskData) => {
  return await addDoc(collection(db, TASKS_COLLECTION), {
    ...taskData,
    completed: false,
    order: Date.now(),
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

const CATEGORIES_COLLECTION = "categories";

export const subscribeToAllCategories = (callback) => {
  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

/**
 * Persist new task order for admin reordering.
 */
export const updateTaskOrderAdmin = async (orderedTasks) => {
  const batch = writeBatch(db);
  orderedTasks.forEach((task, index) => {
    const ref = doc(db, TASKS_COLLECTION, task.id);
    batch.update(ref, { order: index });
  });
  await batch.commit();
};
