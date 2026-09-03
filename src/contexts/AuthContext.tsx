import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, signInAnonymously } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { getUserProfile, createUserProfile, updateUserRole } from '../services/userService';
import { useBottomSheet } from './BottomSheetContext';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError?: string | null;
  signInWithGoogle: () => Promise<void>;
  signInDemo: (role?: 'ADMIN' | 'STAFF') => Promise<void>;
  logout: () => Promise<void>;
  googleAccessToken: string | null;
  setGoogleAccessToken: (token: string | null) => void;
  connectGoogleDrive: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const { showAlert } = useBottomSheet();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let authFlowLoadingTimeout: NodeJS.Timeout | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (authFlowLoadingTimeout) {
        clearTimeout(authFlowLoadingTimeout);
      }

      if (currentUser) {
        setLoading(true);
        setAuthError(null);

        // Fail-safe timeout
        authFlowLoadingTimeout = setTimeout(() => {
          setLoading(false);
        }, 5000); 

        const emailLower = currentUser.email?.toLowerCase() || '';
        const isOwnerEmail = emailLower === 'panaod3826@gmail.com' || emailLower === 'pantipa3826@gmail.com';

        // Listen for profile changes in real-time
        // onSnapshot is generally faster and more resilient than getDoc for the primary app state
        unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), async (snapshot) => {
          if (authFlowLoadingTimeout) clearTimeout(authFlowLoadingTimeout);
          
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            if (isOwnerEmail && data.role !== 'ADMIN') {
              try {
                await updateUserRole(currentUser.uid, 'ADMIN');
                data.role = 'ADMIN';
              } catch (e) {
                console.error("Auto upgrade failed", e);
              }
            }
            setUserProfile(data);
            setLoading(false);
          } else {
            // Totally new user or missing profile document
            if (navigator.onLine) {
              const targetRole = isOwnerEmail ? 'ADMIN' : 'PENDING';
              try {
                const newProfile = await createUserProfile(
                  currentUser.uid,
                  currentUser.email || '',
                  currentUser.displayName || 'Unknown',
                  targetRole
                );
                setUserProfile(newProfile);
              } catch (err) {
                console.error("Auto-creation failed:", err);
              }
            } else {
              // Offline and no profile found in cache
              setAuthError('ไม่พบข้อมูลโปรไฟล์ในรูปแบบออฟไลน์');
            }
            // Even if creation fails, we must eventually stop loading
            setLoading(false);
          }
        }, (err) => {
          console.error("Profile sync error:", err);
          setLoading(false);
          if (err.message?.includes('offline')) {
            setAuthError('คุณกำลังใช้งานในโหมดออฟไลน์ ข้อมูลอาจไม่เป็นปัจจุบัน');
          }
        });
      } else {
        setUserProfile(null);
        setLoading(false);
        if (authFlowLoadingTimeout) clearTimeout(authFlowLoadingTimeout);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (authFlowLoadingTimeout) clearTimeout(authFlowLoadingTimeout);
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      
      const isIframe = window.self !== window.top;
      
      if (error.code === 'auth/popup-blocked' || error.message?.includes('popup') || error.code === 'auth/cancelled-popup-request') {
        if (!isIframe) {
          console.log("Popup blocked outside iframe. Falling back to signInWithRedirect...");
          try {
            await signInWithRedirect(auth, provider);
            return;
          } catch (redirectError: any) {
            console.error("signInWithRedirect failed:", redirectError);
          }
        }
      }
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/popup-closed-by-user') {
        showAlert("คุณปิดหน้าต่างล็อกอินก่อนที่จะเสร็จสิ้น กรุณาลองใหม่อีกครั้ง หรือใช้ปุ่ม 'เปิดในแท็บใหม่'");
      } else if (error.code === 'auth/unauthorized-domain') {
        showAlert("โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Console");
      }
      
      // Re-throw so Login.tsx handleLogin can also react
      throw error;
    }
  };

  const connectGoogleDrive = async (): Promise<string | null> => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive');
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      setGoogleAccessToken(token);
      return token;
    } catch (error: any) {
      console.error("Error connecting Google Drive:", error);
      
      const isIframe = window.self !== window.top;
      if (error.code === 'auth/popup-blocked' || error.message?.includes('popup') || error.code === 'auth/cancelled-popup-request') {
        if (!isIframe) {
          console.log("Popup blocked inside / outside iframe. Falling back to signInWithRedirect...");
          try {
            await signInWithRedirect(auth, provider);
            return null;
          } catch (redirectError: any) {
            console.error("signInWithRedirect failed:", redirectError);
          }
        }
      }

      if (error.code === 'auth/popup-closed-by-user') {
        showAlert("คุณปิดหน้าต่างล็อกอินของ Google Drive ก่อนอนุญาตสำเร็จ หากเปิดแอปอยู่ในหน้าต่างฝังตัว กรุณาเปิดแอปในแท็บใหม่แล้วลองอีกครั้ง เพื่อเลี่ยงการบล็อกป๊อปอัปของเบราว์เซอร์");
      }
      throw error;
    }
  };

  const signInDemo = async (role: 'ADMIN' | 'STAFF' = 'ADMIN') => {
    try {
      setLoading(true);
      setAuthError(null);
      
      let currentUser: any = null;
      try {
        // Try Firebase Anonymous Auth first
        const result = await signInAnonymously(auth);
        currentUser = result.user;
      } catch (authErr: any) {
        console.warn("Firebase Anonymous Auth failed, falling back to Local Offline Simulation:", authErr);
        // Create a local mock user object that satisfies firebase User type minimums
        currentUser = {
          uid: `local_demo_uid_${role.toLowerCase()}`,
          email: `demo_${role.toLowerCase()}@niponfarm.com`,
          displayName: `ผู้ทดสอบ (${role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'พนักงาน'})`,
          emailVerified: true,
          isAnonymous: true,
          providerData: []
        };
      }
      
      setUser(currentUser);
      
      const targetEmail = currentUser.email || `demo_${role.toLowerCase()}@niponfarm.com`;
      const targetName = currentUser.displayName || `ผู้ทดสอบ (${role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'พนักงาน'})`;
      
      const mockProfile: UserProfile = {
        uid: currentUser.uid,
        email: targetEmail,
        displayName: targetName,
        role: role,
        createdAt: Date.now()
      };
      
      // Try to save to Firestore if connected, but wrap in try-catch in case of offline/denied access
      try {
        await createUserProfile(currentUser.uid, targetEmail, targetName, role);
      } catch (firestoreErr) {
        console.warn("Could not save demo profile to Firestore (likely offline or blocked). Using local state profile.", firestoreErr);
      }
      
      setUserProfile(mockProfile);
    } catch (error: any) {
      console.error("Demo login error:", error);
      setAuthError(error.message || "ไม่สามารถเข้าสู่ระบบทดสอบได้");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setGoogleAccessToken(null);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      authError, 
      signInWithGoogle, 
      signInDemo,
      logout,
      googleAccessToken,
      setGoogleAccessToken,
      connectGoogleDrive
    }}>
      {children}
    </AuthContext.Provider>
  );
};
