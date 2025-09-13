import { MainLayout } from "@/components/layout/main-layout";
import { ListingFormStepper } from "@/components/listings/listing-form-stepper";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CreateListingPage() {
  const { user } = useAuth();
  
  
  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="text-neutral-600 mb-6">You must be logged in to create listings</p>
          <Link to="/auth">
            <Button>Login</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }
  
  if (user.role !== 'seller' && user.role !== 'admin') {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-neutral-600 mb-2">Only sellers and admins can create listings</p>
          <p className="text-sm text-neutral-500 mb-6">Your current role: {user.role}</p>
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-800">Create New Listing</h1>
          <p className="text-neutral-600 mt-2">
            List your cannabis products for buyers to discover and purchase.
          </p>
        </div>
        <ListingFormStepper />
      </div>
    </MainLayout>
  );
}