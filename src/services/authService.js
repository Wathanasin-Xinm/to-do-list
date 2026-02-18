import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const registerUser = async (email, password, nickname = '', role = 'user') => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    nickname: nickname || email.split('@')[0],
    role: role,
    color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
    createdAt: new Date().toISOString()
  });

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

export const getUserRole = async (uid) => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().role;
  }
  return 'user';
};
