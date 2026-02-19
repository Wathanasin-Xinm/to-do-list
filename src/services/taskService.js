import { db } from "./firebase";
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
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const TASKS_COLLECTION = "tasks";

export const subscribeToTasks = (user, callback) => {
  if (!user) return () => {};

  const q = query(
    collection(db, TASKS_COLLECTION),
    where("ownerId", "==", user.uid),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort client-side: tasks with an order field first (asc), then by createdAt
    tasks.sort((a, b) => {
      const aHasOrder = a.order !== undefined && a.order !== null;
      const bHasOrder = b.order !== undefined && b.order !== null;
      if (aHasOrder && bHasOrder) return a.order - b.order;
      if (aHasOrder) return -1;
      if (bHasOrder) return 1;
      return 0; // both without order: keep createdAt desc from Firestore
    });
    callback(tasks);
  });
};

export const subscribeToAllTasks = (callback) => {
  const q = query(
    collection(db, TASKS_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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

export const addTask = async (taskData, user) => {
  // Assign a high order value so new tasks go last
  const order = Date.now();
  return await addDoc(collection(db, TASKS_COLLECTION), {
    ...taskData,
    ownerId: user.uid,
    ownerEmail: user.email,
    ownerNickname: taskData.ownerNickname || "",
    ownerColor: user.color || "#000000",
    completed: false,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const toggleTaskCompletion = async (taskId, currentStatus) => {
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(taskRef, {
    completed: !currentStatus,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTask = async (taskId) => {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
};

export const updateTask = async (taskId, data) => {
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(taskRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

const CATEGORIES_COLLECTION = "categories";

export const subscribeToCategories = (user, callback) => {
  if (!user) return () => {};
  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    where("ownerId", "==", user.uid),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const addCategory = async (categoryData, user) => {
  return await addDoc(collection(db, CATEGORIES_COLLECTION), {
    ...categoryData,
    ownerId: user.uid,
    createdAt: serverTimestamp(),
  });
};

export const updateCategory = async (categoryId, data) => {
  await updateDoc(doc(db, CATEGORIES_COLLECTION, categoryId), data);
};

export const deleteCategory = async (categoryId) => {
  await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
};

/**
 * Persist the new order for a list of tasks.
 * Only updates the `order` field on each affected document.
 */
export const updateTaskOrder = async (orderedTasks) => {
  const batch = writeBatch(db);
  orderedTasks.forEach((task, index) => {
    const ref = doc(db, TASKS_COLLECTION, task.id);
    batch.update(ref, { order: index });
  });
  await batch.commit();
};
