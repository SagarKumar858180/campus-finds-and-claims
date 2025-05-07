
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { createUser, findUserByEmail } from "@/services/mongoService";

// Types
interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Default values
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: () => Promise.resolve({} as User),
  register: () => Promise.resolve({} as User),
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("campus_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch (e) {
        console.error("Error parsing stored user:", e);
        localStorage.removeItem("campus_user");
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<User> => {
    const user = await findUserByEmail(email);

    if (!user || user.password !== password) {
      throw new Error("Invalid email or password");
    }

    const { password: _, ...userWithoutPassword } = user;
    setCurrentUser(userWithoutPassword);
    localStorage.setItem("campus_user", JSON.stringify(userWithoutPassword));
    
    toast({
      title: "Login successful",
      description: `Welcome back, ${userWithoutPassword.name}!`,
    });
    
    return userWithoutPassword;
  };

  // Register function
  const register = async (email: string, password: string, name: string): Promise<User> => {
    // Check if user already exists
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw new Error("Email already in use");
    }

    // Create new user in MongoDB
    const newUser = await createUser(email, password, name);
    
    setCurrentUser(newUser);
    localStorage.setItem("campus_user", JSON.stringify(newUser));
    
    toast({
      title: "Registration successful",
      description: `Welcome, ${name}!`,
    });
    
    return newUser;
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("campus_user");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    isAuthenticated: !!currentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);
