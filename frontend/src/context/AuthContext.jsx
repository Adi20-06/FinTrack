// React's Context API = a way to share data across ALL components
// without passing it as props through every level
// Think of it like a school notice board — anyone can read it

import { createContext, useContext, useState, useEffect } from 'react';

// Step 1: Create the context (the notice board)
const AuthContext = createContext();

// Step 2: Create the Provider (the person who manages the notice board)
// Wrap our whole app in this so every component can access auth data
export const AuthProvider = ({ children }) => {

  // State: who is currently logged in?
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);

  // When the app first loads, check if user was already logged in before
  // (their token might be saved in localStorage from a previous session)
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser  = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));  // JSON.parse converts string back to object
    }
  }, []);  // Empty array = run only once, when component first mounts

  // Called after successful login/register
  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    // Save to localStorage so login persists after page refresh
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Called when user clicks logout
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Share these values with every component in the app
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Step 3: Custom hook — makes it easy to USE the context in any component
// Instead of writing "useContext(AuthContext)" every time,
// just write "useAuth()"
export const useAuth = () => useContext(AuthContext);