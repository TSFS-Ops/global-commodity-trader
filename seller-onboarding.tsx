import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Building2, FileText, Package, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: "Get Started",
    description: "Create your first listing",
    icon: Package,
    completed: false,
  },
];

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState(ONBOARDING_STEPS);

  // Check if user has an organization
  const { data: organizationData } = useQuery({
    queryKey: ['/api/seller/organization'],
    enabled: !!user && user.role === 'seller',
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Check if user has uploaded required documents
  const { data: documentsData } = useQuery({
    queryKey: ['/api/documents'],
    enabled: !!user && user.role === 'seller',
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Redirect if not a seller, or redirect sellers to create listing
  useEffect(() => {
    if (user && user.role !== 'seller') {
      navigate('/dashboard');
    } else if (user && user.role === 'seller') {
      // Redirect sellers directly to create listing - no separate onboarding needed
      navigate('/listings/create');
    }
  }, [user, navigate]);

  // Auto-advance steps based on completed actions
  useEffect(() => {
    if (organizationData && (organizationData as any)?.id) {
      // User has an organization, mark step 1 as complete and advance to step 2
      setSteps(prev => prev.map(step => 
        step.id === 1 ? { ...step, completed: true } : step
      ));
      if (currentStep === 1) {
        setCurrentStep(2);
      }
    }
  }, [organizationData, currentStep]);

  // Check for uploaded documents and mark step 2 as complete
  useEffect(() => {
    if (documentsData && Array.isArray(documentsData)) {
      const hasLicense = documentsData.some((doc: any) => 
        doc.documentType === 'license' || doc.documentType === 'business_license'
      );
      const hasCOA = documentsData.some((doc: any) => 
        doc.documentType === 'coa' || doc.documentType === 'certificate_of_analysis'
      );
      
      if (hasLicense && hasCOA) {
        // User has uploaded required documents, mark step 2 as complete
        setSteps(prev => prev.map(step => 
          step.id === 2 ? { ...step, completed: true } : step
        ));
        if (currentStep === 2) {
          setCurrentStep(3);
        }
      }
    }
  }, [documentsData, currentStep]);

  const handleStepComplete = (stepId: number) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
    
    if (stepId < ONBOARDING_STEPS.length) {
      setCurrentStep(stepId + 1);
    } else {
      // All steps completed, redirect to dashboard
      navigate('/dashboard');
    }
  };

  const handleSkipOnboarding = () => {
    navigate('/dashboard');
  };

  const currentStepData = steps.find(step => step.id === currentStep);
  const completedStepsCount = steps.filter(step => step.completed).length;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f9fbe7] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#173c1e] mb-2">
            Welcome to Izenzo, {user.fullName}!
          </h1>
          <p className="text-[#173c1e]/70">
            Let's get your seller account set up in just a few steps
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${step.completed 
                    ? 'bg-[#a8c566] border-[#a8c566] text-white' 
                    : step.id === currentStep 
                      ? 'border-[#a8c566] text-[#a8c566]' 
                      : 'border-gray-300 text-gray-400'
                  }
                `}>
                  {step.completed ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    w-16 h-0.5 mx-2 
                    ${step.completed ? 'bg-[#a8c566]' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div key={step.id} className="text-center" style={{ minWidth: '120px' }}>
                <p className="text-xs text-[#173c1e]/70 font-medium">{step.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Current step content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-[#173c1e]">
              {currentStepData && (
                <>
                  <currentStepData.icon className="w-6 h-6 mr-2" />
                  {currentStepData.title}
                </>
              )}
            </CardTitle>
            <CardDescription>
              {currentStepData?.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-[#173c1e]/70">
                  Create your organization profile to start selling on Izenzo. This will be your business identity on the platform.
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => navigate('/organizations/create')}
                    className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Create Organization
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Force refetch organization data and advance step
                      setSteps(prev => prev.map(step => 
                        step.id === 1 ? { ...step, completed: true } : step
                      ));
                      setCurrentStep(2);
                    }}
                    className="border-[#173c1e]/20"
                  >
                    I already have an organization
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-[#173c1e]/70">
                  We'll streamline this! Document requirements are now part of the listing creation process.
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => navigate('/listings/create')}
                    className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Create Your First Listing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStepComplete(2)}
                    className="border-[#173c1e]/20"
                  >
                    Skip for now
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-[#173c1e]/70">
                  Create your first product listing to start attracting buyers to your cannabis products.
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => navigate('/listings/create')}
                    className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Create First Listing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStepComplete(3)}
                    className="border-[#173c1e]/20"
                  >
                    I'll do this later
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="text-[#173c1e]/70"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-[#a8c566]/20 text-[#173c1e]">
              {completedStepsCount} of {steps.length} completed
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkipOnboarding}
              className="border-[#173c1e]/20 text-[#173c1e]/70"
            >
              Skip Onboarding
            </Button>
            <Button
              onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
              disabled={currentStep === steps.length}
              className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}