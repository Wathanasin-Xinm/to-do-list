import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

// ── Validation helpers ────────────────────────────────────────────────────────

/** Returns true if the nickname contains "admin" in any form (case-insensitive) */
export const isAdminUsername = (nickname) => /admin/i.test(nickname);

/** Returns true if the local part of the email starts with "admin" (case-insensitive) */
export const isAdminEmail = (email) => {
  const local = email.split("@")[0];
  return /^admin/i.test(local);
};

// ── Auth actions ──────────────────────────────────────────────────────────────

export const registerUser = async (
  email,
  password,
  nickname = "",
  role = "user",
) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    nickname: nickname || email.split("@")[0],
    role: role,
    color:
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0"),
    createdAt: new Date().toISOString(),
    order: Date.now(),
  });

  // Send email verification (non-blocking)
  await sendEmailVerification(user);

  return user;
};

export const loginUser = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  return signOut(auth);
};

export const resetPassword = (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const resendVerificationEmail = () => {
  const user = auth.currentUser;
  if (user) return sendEmailVerification(user);
  return Promise.reject(new Error("No user logged in"));
};

export const getUserRole = async (uid) => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().role;
  }
  return "user";
};

// ── Profile update (requires re-authentication) ───────────────────────────────

export const updateUserProfile = async (
  uid,
  { nickname, newPassword, currentPassword },
) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  // Re-authenticate when changing password
  if (newPassword) {
    if (!currentPassword) throw new Error("กรุณากรอกรหัสผ่านปัจจุบัน");
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword,
    );
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }

  // Update Firestore nickname
  if (nickname !== undefined) {
    await updateDoc(doc(db, "users", uid), { nickname });
  }
};
