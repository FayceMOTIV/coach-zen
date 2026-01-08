import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { 
  getAuth, 
  signInWithRedirect,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC2L5aTJph7PH1NFICagEiPxJUv8EJGdRQ",
  authDomain: "coach-zen.firebaseapp.com",
  projectId: "coach-zen",
  storageBucket: "coach-zen.firebasestorage.app",
  messagingSenderId: "11447267838",
  appId: "1:11447267838:web:7474c717cc7932c3a910af"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Set persistence
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Detect Safari or mobile (both need redirect)
const needsRedirect = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  console.log('[Auth] Browser check - Safari:', isSafari, 'Mobile:', isMobile);
  return isSafari || isMobile;
};

export const signInWithGoogle = async () => {
  try {
    if (needsRedirect()) {
      console.log('[Auth] Using redirect for Safari/mobile...');
      await signInWithRedirect(auth, googleProvider);
      return { success: true, redirect: true };
    } else {
      console.log('[Auth] Using popup for Chrome/Firefox...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[Auth] Popup success, user:', result.user?.email);
      return { success: true, user: result.user };
    }
  } catch (error) {
    console.error('[Auth] Google sign in error:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const checkRedirectResult = async () => {
  console.log('[Auth] checkRedirectResult called...');
  try {
    const result = await getRedirectResult(auth);
    console.log('[Auth] Redirect result:', result ? 'has user' : 'null');
    if (result && result.user) {
      return { success: true, user: result.user };
    }
    return { success: false };
  } catch (error) {
    console.error('[Auth] Redirect result error:', error);
    return { success: false, error: error.message };
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('[Auth] Email sign in error:', error);
    let msg = error.message;
    if (error.code === 'auth/invalid-credential') msg = 'Email ou mot de passe incorrect';
    if (error.code === 'auth/user-not-found') msg = 'Aucun compte avec cet email';
    if (error.code === 'auth/wrong-password') msg = 'Mot de passe incorrect';
    return { success: false, error: msg };
  }
};

export const signUpWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('[Auth] Sign up error:', error);
    let msg = error.message;
    if (error.code === 'auth/email-already-in-use') msg = 'Cet email est déjà utilisé';
    if (error.code === 'auth/weak-password') msg = 'Mot de passe trop faible (min 6 caractères)';
    if (error.code === 'auth/invalid-email') msg = 'Email invalide';
    return { success: false, error: msg };
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    let msg = error.message;
    if (error.code === 'auth/user-not-found') msg = 'Aucun compte avec cet email';
    return { success: false, error: msg };
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const onAuthChange = (callback) => {
  console.log('[Auth] Setting up onAuthStateChanged listener...');
  return onAuthStateChanged(auth, (user) => {
    console.log('[Auth] onAuthStateChanged fired, user:', user?.email || 'null');
    callback(user);
  });
};

export const saveToFirebase = async (userId, key, data) => {
  if (!userId) return;
  try {
    await setDoc(doc(db, "users", userId, "data", key), { value: data, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('Firebase save error:', e);
  }
};

export const loadFromFirebase = async (userId, key, defaultValue) => {
  if (!userId) return defaultValue;
  try {
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

export { db, auth };
