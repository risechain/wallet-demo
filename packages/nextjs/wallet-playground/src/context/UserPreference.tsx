"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface UserPreferenceContextType {
  isSessionKeyEnabled: boolean;
  setIsSessionKeyEnabled: (prefer: boolean) => void;
  enableSessionKey: (prefer: boolean) => void;
}

const defaultContextValue: UserPreferenceContextType = {
  isSessionKeyEnabled: true,
  setIsSessionKeyEnabled: () => {},
  enableSessionKey: (prefer: boolean) => {},
};

const UserPreferenceContext =
  createContext<UserPreferenceContextType>(defaultContextValue);

export function SessionKeyProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isSessionKeyEnabled, setIsSessionKeyEnabled] = useState(true);

  // Load preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferSessionKey");
      if (saved !== null) {
        setIsSessionKeyEnabled(JSON.parse(saved));
      }
    }
  }, []);

  // Save preference to localStorage when it changes
  const enableSessionKey = (prefer: boolean) => {
    setIsSessionKeyEnabled(prefer);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferSessionKey", JSON.stringify(prefer));
    }
  };

  const value = useMemo(() => {
    return {
      isSessionKeyEnabled,
      setIsSessionKeyEnabled,
      enableSessionKey,
    };
  }, [isSessionKeyEnabled, setIsSessionKeyEnabled, enableSessionKey]);

  return (
    <UserPreferenceContext.Provider value={value}>
      {children}
    </UserPreferenceContext.Provider>
  );
}

export function useUserPreference() {
  const context = useContext(UserPreferenceContext);
  // Since we now have a default context value, this should always be defined
  return context;
}
