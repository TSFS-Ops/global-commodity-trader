import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Leaf, Loader2 } from "lucide-react";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration form schema extends the insertUserSchema
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "seller",
      company: "",
      location: "",
    },
  });

  function onLoginSubmit(data: LoginFormValues) {
    loginMutation.mutate(data);
  }

  function onRegisterSubmit(data: RegisterFormValues) {
    // Remove confirmPassword as it's not in the API schema
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  }

  useEffect(() => {
    if (user) {
      // Route to appropriate onboarding based on role
      switch (user.role) {
        case 'seller':
          navigate("/onboarding/seller");
          break;
        case 'broker':
          navigate("/onboarding/broker");
          break;
        case 'buyer':
        case 'admin':
        default:
          navigate("/dashboard");
          break;
      }
    }
  }, [user, navigate]);

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#f9fbe7] p-4">
      {/* Auth form */}
      <div className="w-full max-w-2xl">
        <Card className="w-full glass-card border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Leaf className="h-6 w-6 text-[#173c1e] mr-2" />
              <span className="text-2xl font-bold text-[#173c1e]">IZENZO</span>
            </div>
            <CardTitle className="text-center text-xl font-bold text-[#173c1e]">
              Welcome to the Trading Platform
            </CardTitle>
            <CardDescription className="text-center text-[#173c1e]/70">
              Enter your details to {activeTab === "login" ? "sign in" : "create an account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="pb-2">
              <TabsList className="grid grid-cols-2 mb-6 bg-[#f9fbe7]/50">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-[#a8c566] data-[state=active]:text-[#173c1e] data-[state=active]:shadow-none rounded-md"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="data-[state=active]:bg-[#a8c566] data-[state=active]:text-[#173c1e] data-[state=active]:shadow-none rounded-md"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 px-10 py-6">
                    <div className="mx-auto max-w-md">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#173c1e]">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="johndoe" 
                                className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel className="text-[#173c1e]">Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-[#173c1e] text-white hover:bg-[#173c1e]/90 mt-10" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Sign In
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 px-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#173c1e]">Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="John Doe" 
                                className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#173c1e]">Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="johndoe" 
                                className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#173c1e]">Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="john@example.com" 
                                className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#173c1e]">Account Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]">
                                  <SelectValue placeholder="Select account type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="seller">Seller</SelectItem>
                                <SelectItem value="buyer">Buyer</SelectItem>
                                <SelectItem value="broker">Broker</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#173c1e]">Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#173c1e]">Confirm Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="company"
                        render={({ field: { value, onChange, ...rest } }) => (
                          <FormItem>
                            <FormLabel className="text-[#173c1e]">Company (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your company name" 
                                className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]" 
                                value={value || ''}
                                onChange={onChange}
                                {...rest} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="location"
                        render={({ field: { value, onChange, ...rest } }) => (
                          <FormItem>
                            <FormLabel className="text-[#173c1e]">Location (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your location" 
                                className="border-[#173c1e]/20 focus-visible:ring-[#a8c566]" 
                                value={value || ''}
                                onChange={onChange}
                                {...rest} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#173c1e] text-white hover:bg-[#173c1e]/90 mt-6" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Account
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center text-[#173c1e]/70">
              By continuing, you agree to our 
              <a href="#" className="text-[#173c1e] hover:text-[#a8c566] font-medium"> Terms of Service</a> and 
              <a href="#" className="text-[#173c1e] hover:text-[#a8c566] font-medium"> Privacy Policy</a>.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}