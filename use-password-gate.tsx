import { createContext, ReactNode, useContext, useEffect, useState } from "react";

type PasswordGateContextType = {
  hasAccess: boolean;
  isLoading: boolean;
  grantAccess: () => void;
};

export const PasswordGateContext = createContext<PasswordGateContextType | null>(null);

export function PasswordGateProvider({ children }: { children: ReactNode }) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user already has access when app loads
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await fetch("/api/check-access", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasAccess(data.hasAccess);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const grantAccess = () => {
    setHasAccess(true);
  };

  return (
    <PasswordGateContext.Provider
      value={{
        hasAccess,
        isLoading,
        grantAccess,
      }}
    >
      {children}
    </PasswordGateContext.Provider>
  );
}

export function usePasswordGate() {
  const context = useContext(PasswordGateContext);
  if (!context) {
    throw new Error("usePasswordGate must be used within a PasswordGateProvider");
  }
  return context;
}