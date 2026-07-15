import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// ---------- Types ----------
type User = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserName: (newName: string) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
};

// ---------- Context ----------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------- Provider ----------
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // ---------- Validate user role ----------
  const validateUserAndSetRole = async (firebaseUser: FirebaseUser) => {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as { name?: string; role?: string };

      if (userData.role === 'ADMIN') {
        setUser({
          id: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName || 'Utilisateur',
          email: firebaseUser.email || '',
          role: 'ADMIN',
        });
        localStorage.setItem('roadwise_session', 'active');
      } else {
        toast({
          title: 'Accès refusé',
          description:
            "Vous n'avez pas les permissions requises pour accéder à ce tableau de bord.",
          variant: 'destructive',
        });
        throw new Error('Rôle non autorisé');
      }
    } else {
      toast({
        title: 'Compte non configuré',
        description:
          "Votre compte n'est pas configuré dans le système. Contactez un administrateur.",
        variant: 'destructive',
      });
      throw new Error('Utilisateur non trouvé dans Firestore');
    }
  };

  // ---------- Update user name ----------
  const updateUserName = async (newName: string) => {
    if (!user) throw new Error('Utilisateur non connecté');

    const userDocRef = doc(db, 'users', user.id);
    await updateDoc(userDocRef, { name: newName });

    // Update local user state
    setUser((prev) =>
      prev ? { ...prev, name: newName } : prev
    );
  };

  // ---------- Auth state listener ----------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
          await validateUserAndSetRole(firebaseUser);
        } catch {
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Cross-tab logout sync
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'roadwise_session' && event.newValue === null) {
        signOut(auth);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [toast]);

  // ---------- Login ----------
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await validateUserAndSetRole(userCredential.user);

      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur RoadWise Manager!',
      });
    } catch (error: any) {
      console.error('Erreur de connexion:', error);

      let errorMessage = 'Email ou mot de passe incorrect';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives de connexion. Veuillez réessayer plus tard.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Ce compte a été désactivé. Contactez un administrateur.';
      } else if (
        error.message === 'Rôle non autorisé' ||
        error.message === 'Utilisateur non trouvé dans Firestore'
      ) {
        errorMessage = '';
      }

      if (errorMessage) {
        toast({
          title: 'Échec de la connexion',
          description: errorMessage,
          variant: 'destructive',
        });
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Logout ----------
  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('roadwise_session');
      toast({
        title: 'Déconnexion',
        description: 'Vous avez été déconnecté avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la déconnexion',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUserName,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ---------- Hook ----------
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
};
