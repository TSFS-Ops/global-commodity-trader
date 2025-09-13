import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { BlockchainVerification } from "@/components/blockchain/blockchain-verification";
import { TransactionRecorder } from "@/components/blockchain/transaction-recorder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, LinkIcon, Lock, ShieldCheck, Database, LayoutGrid } from "lucide-react";

export default function BlockchainPage() {
  const [activeTab, setActiveTab] = useState("verify");
  
  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex flex-col items-start gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-primary flex items-center">
              <LinkIcon className="mr-3 h-7 w-7" />
              Blockchain Transactions
            </h1>
            <p className="text-muted-foreground">
              Verify and record transactions on the blockchain for transparency and trust in the cannabis marketplace
            </p>
          </div>
          
          <Tabs 
            defaultValue="verify" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="verify">Verify Transactions</TabsTrigger>
              <TabsTrigger value="about">About Blockchain</TabsTrigger>
            </TabsList>
            
            <TabsContent value="verify" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                <BlockchainVerification />
              </div>
            </TabsContent>
            
            <TabsContent value="about" className="mt-6">
              <Card className="border-t-4 border-t-primary">
                <CardHeader>
                  <CardTitle className="text-xl text-primary">What is Blockchain Verification?</CardTitle>
                  <CardDescription>
                    Understanding how blockchain ensures transparency and trust in the cannabis industry
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    <p>
                      Blockchain technology provides a secure, transparent and immutable record of transactions
                      between buyers and sellers. This is particularly valuable in the cannabis industry where
                      verification, compliance, and supply chain transparency are critical concerns.
                    </p>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <ShieldCheck className="h-5 w-5" />
                          <h3>Immutable Records</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Once a transaction is recorded on the blockchain, it cannot be altered or deleted,
                          ensuring a permanent history of all transactions.
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <Lock className="h-5 w-5" />
                          <h3>Secure Transactions</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Every transaction is cryptographically secured, protecting sensitive data while
                          still providing necessary verification.
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <Database className="h-5 w-5" />
                          <h3>Decentralized Storage</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Transaction data is stored across a network of computers, eliminating single
                          points of failure and reducing the risk of data loss.
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <LayoutGrid className="h-5 w-5" />
                          <h3>Supply Chain Verification</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Track cannabis products from seed to sale with verifiable blockchain records,
                          ensuring product authenticity and regulatory compliance.
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800">Important Note</h4>
                        <p className="text-sm text-amber-700">
                          The Izenzo platform uses blockchain technology in countries where cannabis trade is legal.
                          Always ensure you're operating within your local regulatory framework. Blockchain records
                          may be used for compliance verification by authorized parties.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}