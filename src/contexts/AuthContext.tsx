
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

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

// Mock user data - in a real app, this would come from Firebase
const MOCK_USERS = [
  {
    id: "user1",
    email: "user@example.com",
    password: "password123",
    name: "Demo User",
  },
];

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
    // This would be a Firebase auth call in a real app
    const user = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
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
    // This would be a Firebase auth call in a real app
    const existingUser = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      throw new Error("Email already in use");
    }

    const newUser = {
      id: `user${MOCK_USERS.length + 1}`,
      email,
      password,
      name,
    };

    MOCK_USERS.push(newUser);

    const { password: _, ...userWithoutPassword } = newUser;
    setCurrentUser(userWithoutPassword);
    localStorage.setItem("campus_user", JSON.stringify(userWithoutPassword));
    
    toast({
      title: "Registration successful",
      description: `Welcome, ${name}!`,
    });
    
    return userWithoutPassword;
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
