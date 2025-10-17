"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SessionKeyContextType {
  preferSessionKey: boolean;
  setPreferSessionKey: (prefer: boolean) => void;
}

const defaultContextValue: SessionKeyContextType = {
  preferSessionKey: true,
  setPreferSessionKey: () => {},
};

const SessionKeyContext =
  createContext<SessionKeyContextType>(defaultContextValue);

export function SessionKeyProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [preferSessionKey, setPreferSessionKeyState] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferSessionKey");
      if (saved !== null) {
        setPreferSessionKeyState(JSON.parse(saved));
      }
      setMounted(true);
    }
  }, []);

  // Save preference to localStorage when it changes
  const setPreferSessionKey = (prefer: boolean) => {
    setPreferSessionKeyState(prefer);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferSessionKey", JSON.stringify(prefer));
    }
  };

  // Always provide the context, even during SSR
  const contextValue = { preferSessionKey, setPreferSessionKey };

  return (
    <SessionKeyContext.Provider value={contextValue}>
      {children}
    </SessionKeyContext.Provider>
  );
}

export function useSessionKeyPreference() {
  const context = useContext(SessionKeyContext);
  // Since we now have a default context value, this should always be defined
  return context;
}
