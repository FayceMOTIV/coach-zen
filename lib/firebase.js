import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC2L5aTJph7PH1NFICagEiPxJUv8EJGdRQ",
  authDomain: "coach-zen.firebaseapp.com",
  projectId: "coach-zen",
  storageBucket: "coach-zen.firebasestorage.app",
  messagingSenderId: "11447267838",
  appId: "1:11447267838:web:7474c717cc7932c3a910af"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const getUserId = () => {
  if (typeof window === 'undefined') return null;
  let userId = localStorage.getItem('cz_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('cz_user_id', userId);
  }
  return userId;
};

export const saveToFirebase = async (key, data) => {
  try {
    const userId = getUserId();
    if (!userId) return;
    await setDoc(doc(db, "users", userId, "data", key), { value: data, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('Firebase save error:', e);
  }
};

export const loadFromFirebase = async (key, defaultValue) => {
  try {
    const userId = getUserId();
    if (!userId) return defaultValue;
    const docSnap = await getDoc(doc(db, "users", userId, "data", key));
    if (docSnap.exists()) {
      return docSnap.data().value;
    }
    return defaultValue;
  } catch (e) {
    console.error('Firebase load error:', e);
    return defaultValue;
  }
};

export { db, getUserId };
