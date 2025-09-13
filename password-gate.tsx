import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Leaf } from "lucide-react";

interface PasswordGateProps {
  onPasswordCorrect: () => void;
}

export default function PasswordGate({ onPasswordCorrect }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/verify-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      if (response.ok) {
        onPasswordCorrect();
      } else {
        setError("Incorrect password. Please try again.");
      }
    } catch (error) {
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="glass-card border-emerald-200/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Private Access
              </CardTitle>
              <CardDescription className="text-neutral-600 mt-2">
                This is a private preview. Please enter the access password to continue.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-700 font-medium">
                  Access Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-10 glass-input"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="glass-card border-red-200/20">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium py-2 transition-all duration-300"
                disabled={isLoading || !password.trim()}
              >
                {isLoading ? "Verifying..." : "Access Platform"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-neutral-500">
              <p>Private Preview Access</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}