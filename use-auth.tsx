import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser, LoginData } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UserWithoutPassword = Omit<User, "password">;

type AuthContextType = {
  user: UserWithoutPassword | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserWithoutPassword, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserWithoutPassword, Error, InsertUser>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  let query;
  try {
    query = useQuery<UserWithoutPassword | null, Error>({
      queryKey: ["/api/auth/me"],
      queryFn: async ({ queryKey }) => {
        try {
          const res = await fetch(queryKey[0] as string, {
            credentials: "include",
          });
          
          if (res.status === 401) {
            return null;
          }
          
          if (!res.ok) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }
          
          const data = await res.json();
          // New endpoint returns { ok: true, user: {...} }
          return data.ok ? data.user : null;
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error("Failed to fetch user data");
        }
      },
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutes cache
      gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
    });
  } catch (error) {
    console.error('Error initializing auth query:', error);
    // Fallback values if query fails to initialize
    query = {
      data: null,
      error: error as Error,
      isLoading: false
    };
  }
  
  const { data: user, error, isLoading } = query;

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: UserWithoutPassword) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      toast({
        title: "Welcome back!",
        description: `You are now logged in as ${user.username}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: UserWithoutPassword) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      toast({
        title: "Registration successful!",
        description: `Welcome to Izenzo Trading Platform, ${user.fullName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
