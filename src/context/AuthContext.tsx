import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  dbUser: { name: string; email: string } | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync user profiles into Firestore
  const syncWithDatabase = async (firebaseUser: User, customName?: string) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(userRef);

      const displayName = customName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Farmer";
      const userEmail = firebaseUser.email || "";

      if (!docSnap.exists()) {
        await setDoc(userRef, {
          id: firebaseUser.uid,
          name: displayName,
          email: userEmail,
          createdAt: serverTimestamp()
        });
        setDbUser({ name: displayName, email: userEmail });
      } else {
        const data = docSnap.data();
        setDbUser({ name: data?.name || displayName, email: data?.email || userEmail });
      }
    } catch (err: any) {
      console.error("Error syncing profile with Firestore:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncWithDatabase(currentUser);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Configure popup provider parameters as recommended in fire auth guidelines
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await syncWithDatabase(result.user);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to authenticate with Google.");
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await syncWithDatabase(result.user);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to log in with email and password.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
        await syncWithDatabase(result.user, name);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to sign up.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setDbUser(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to sign out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      dbUser,
      loading,
      loginWithGoogle,
      loginWithEmail,
      signUpWithEmail,
      logout,
      errorMsg,
      setErrorMsg
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
