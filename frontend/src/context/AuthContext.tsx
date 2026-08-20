import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  isAllowed: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  idToken: null,
  loading: true,
  isAllowed: false,
  isAdmin: false,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          
          const email = currentUser.email?.toLowerCase().trim() || '';
          const admin = email === 'glaforge@gmail.com';
          setIsAdmin(admin);

          // By default, admin is allowed. If backend returns 403, UI will show unauthorized banner.
          setIsAllowed(true);
        } catch (error) {
          console.error('Error fetching Firebase ID token:', error);
          setIdToken(null);
          setIsAllowed(false);
        }
      } else {
        setIdToken(null);
        setIsAllowed(false);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setIdToken(null);
      setIsAllowed(false);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, idToken, loading, isAllowed, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
