// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  getDocs, 
  query, 
  where,
  deleteDoc,
  updateDoc,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  limit,
  writeBatch
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLB0kI9w-p_SfEfJNJG-phP5yI0ZAMpBU",
  authDomain: "studio-6728555947-246c6.firebaseapp.com",
  projectId: "studio-6728555947-246c6",
  storageBucket: "studio-6728555947-246c6.firebasestorage.app",
  messagingSenderId: "579125641047",
  appId: "1:579125641047:web:629317a0edb38cc7950812"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Export Firebase services and functions
export { 
  app,
  auth, 
  db, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  getDocs, 
  query, 
  where,
  deleteDoc,
  updateDoc,
  onSnapshot,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  limit,
  writeBatch
};

// Type definitions for better TypeScript support
export type { User, DocumentData, QuerySnapshot };

// Helper functions for common operations
export const firebaseHelper = {
  // Auth helpers
  getCurrentUser: (): User | null => {
    return auth.currentUser;
  },

  // Firestore helpers
  getUserDocument: async (userId: string) => {
    const userDoc = doc(db, "users", userId);
    return await getDoc(userDoc);
  },

  createUserDocument: async (userId: string, userData: any) => {
    const userDoc = doc(db, "users", userId);
    return await setDoc(userDoc, {
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  updateUserDocument: async (userId: string, updates: any) => {
    const userDoc = doc(db, "users", userId);
    return await updateDoc(userDoc, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  // Collection operations
  getCollection: async (collectionName: string) => {
    const collectionRef = collection(db, collectionName);
    return await getDocs(collectionRef);
  },

  addToCollection: async (collectionName: string, data: any) => {
    const collectionRef = collection(db, collectionName);
    return await addDoc(collectionRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  // Query helpers
  queryCollection: async (collectionName: string, field: string, operator: any, value: any) => {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, where(field, operator, value));
    return await getDocs(q);
  },

  // Real-time listeners
  listenToDocument: (documentPath: string, callback: (doc: DocumentData | null) => void) => {
    const documentRef = doc(db, documentPath);
    return onSnapshot(documentRef, (docSnapshot) => {
      callback(docSnapshot.exists() ? docSnapshot.data() : null);
    });
  },

  listenToCollection: (collectionName: string, callback: (snapshot: QuerySnapshot) => void) => {
    const collectionRef = collection(db, collectionName);
    return onSnapshot(collectionRef, callback);
  }
};

// Authentication state management
export const authHelper = {
  // Sign up new user
  signUp: async (email: string, password: string, userData?: any) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore if additional data is provided
      if (userData) {
        await firebaseHelper.createUserDocument(user.uid, userData);
      }
      
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Sign in existing user
  signIn: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Sign out user
  signOutUser: async () => {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Listen to auth state changes
  onAuthChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};

// Default export for the entire Firebase configuration
export default {
  app,
  auth,
  db,
  firebaseHelper,
  authHelper
};