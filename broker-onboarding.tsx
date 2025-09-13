import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Handshake, CheckCircle2, ArrowRight } from "lucide-react";
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

export default function BrokerOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if not a broker
  useEffect(() => {
    if (user && user.role !== 'broker') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleStartBrokerDashboard = () => {
    navigate('/broker/dashboard');
  };

  const handleViewMandates = () => {
    navigate('/broker/mandates');
  };

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
            You're all set up as a broker. Start connecting with sellers and managing deals.
          </p>
        </div>

        {/* Broker Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-[#173c1e]/20">
            <CardHeader>
              <CardTitle className="flex items-center text-[#173c1e]">
                <UserPlus className="w-6 h-6 mr-2" />
                Invite Sellers
              </CardTitle>
              <CardDescription>
                Send mandate invitations to sellers and manage your broker relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-[#173c1e]/70">
                  As a broker, you can invite sellers to work with you through time-limited mandates. 
                  Once a seller accepts your mandate, you can create and manage listings on their behalf.
                </p>
                <Button
                  onClick={handleStartBrokerDashboard}
                  className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90 w-full"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Go to Broker Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#173c1e]/20">
            <CardHeader>
              <CardTitle className="flex items-center text-[#173c1e]">
                <Handshake className="w-6 h-6 mr-2" />
                Manage Mandates
              </CardTitle>
              <CardDescription>
                View and manage your active broker mandates and commission tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-[#173c1e]/70">
                  Monitor your mandate status, track commissions, and view performance analytics 
                  for all your broker relationships.
                </p>
                <Button
                  onClick={handleViewMandates}
                  variant="outline"
                  className="border-[#173c1e]/20 w-full"
                >
                  <Handshake className="w-4 h-4 mr-2" />
                  View My Mandates
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Features Info */}
        <Card className="mb-6 bg-[#a8c566]/10 border-[#a8c566]/30">
          <CardHeader>
            <CardTitle className="text-[#173c1e] flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              What You Can Do as a Broker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-[#173c1e]">Mandate Management</h4>
                <ul className="text-sm text-[#173c1e]/70 space-y-1">
                  <li>• Send mandate invitations to sellers</li>
                  <li>• Set commission rates and terms</li>
                  <li>• Track mandate status and expiration</li>
                  <li>• View mandate history and analytics</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-[#173c1e]">Listing Management</h4>
                <ul className="text-sm text-[#173c1e]/70 space-y-1">
                  <li>• Create listings on behalf of sellers</li>
                  <li>• Edit and manage seller listings</li>
                  <li>• Track commission earnings per deal</li>
                  <li>• Monitor listing performance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center">
          <Button
            onClick={handleStartBrokerDashboard}
            className="bg-[#173c1e] text-white hover:bg-[#173c1e]/90 px-8"
          >
            Get Started as a Broker
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}