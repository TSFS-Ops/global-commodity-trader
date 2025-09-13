import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, CheckCheck, FileCheck, AlertCircle, LinkIcon, ExternalLink } from "lucide-react";

interface BlockchainTransactionProps {
  transactionHash?: string;
  onVerified?: (verified: boolean) => void;
}

interface BlockchainTransaction {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  data: string;
}

export function BlockchainVerification({ transactionHash, onVerified }: BlockchainTransactionProps) {
  const { toast } = useToast();
  const [hash, setHash] = useState(transactionHash || "");
  
  // Query to fetch transaction details
  const {
    data: transaction,
    isLoading: isLoadingTransaction,
    isError: isTransactionError,
    error: transactionError,
    refetch: refetchTransaction
  } = useQuery<BlockchainTransaction>({
    queryKey: ["/api/blockchain/transactions", hash],
    queryFn: async () => {
      if (!hash) throw new Error("Transaction hash is required");
      const res = await apiRequest("GET", `/api/blockchain/transactions/${hash}`);
      return await res.json();
    },
    enabled: !!hash,
    retry: false
  });
  
  // Query to verify transaction
  const {
    data: verification,
    isLoading: isVerifying,
    isError: isVerificationError,
    error: verificationError,
    refetch: refetchVerification
  } = useQuery<{ transactionHash: string; verified: boolean }>({
    queryKey: ["/api/blockchain/verify", hash],
    queryFn: async () => {
      if (!hash) throw new Error("Transaction hash is required");
      const res = await apiRequest("GET", `/api/blockchain/verify/${hash}`);
      return await res.json();
    },
    enabled: !!hash,
    retry: false
  });
  
  // Handle verification success with useEffect
  useEffect(() => {
    if (verification && onVerified) {
      onVerified(verification.verified);
    }
  }, [verification, onVerified]);
  
  // Mutation to record a new transaction
  const recordTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/blockchain/transactions", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transaction recorded",
        description: "The transaction has been successfully recorded on the blockchain",
      });
      setHash(data.transactionHash);
      queryClient.invalidateQueries({ queryKey: ["/api/blockchain/transactions", data.transactionHash] });
      queryClient.invalidateQueries({ queryKey: ["/api/blockchain/verify", data.transactionHash] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to record transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleVerify = () => {
    refetchTransaction();
    refetchVerification();
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  const shortenAddress = (address: string, chars = 6) => {
    if (!address) return "";
    return `${address.substring(0, chars)}...${address.substring(address.length - 4)}`;
  };
  
  const explorerUrl = `https://sepolia.etherscan.io/tx/${hash}`;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5">
        <CardTitle className="text-primary flex items-center">
          <LinkIcon className="mr-2 h-5 w-5" />
          Blockchain Verification
        </CardTitle>
        <CardDescription>
          Verify the authenticity of transactions using blockchain technology
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter transaction hash to verify"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleVerify}
              disabled={!hash || isVerifying || isLoadingTransaction}
            >
              {isVerifying || isLoadingTransaction ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileCheck className="mr-2 h-4 w-4" />
              )}
              Verify
            </Button>
          </div>
          
          {isVerificationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Error</AlertTitle>
              <AlertDescription>
                {verificationError instanceof Error 
                  ? verificationError.message 
                  : "Failed to verify transaction. Please check the hash and try again."}
              </AlertDescription>
            </Alert>
          )}
          
          {isTransactionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Transaction Error</AlertTitle>
              <AlertDescription>
                {transactionError instanceof Error 
                  ? transactionError.message 
                  : "Failed to retrieve transaction details. Please check the hash and try again."}
              </AlertDescription>
            </Alert>
          )}
          
          {verification && (
            <Alert variant={verification.verified ? "default" : "destructive"} className={verification.verified ? "border-green-500 bg-green-50" : ""}>
              {verification.verified ? (
                <CheckCheck className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {verification.verified ? "Verified Transaction" : "Unverified Transaction"}
              </AlertTitle>
              <AlertDescription>
                {verification.verified 
                  ? "This transaction has been verified on the blockchain." 
                  : "This transaction could not be verified. It may not exist or has not been confirmed yet."}
              </AlertDescription>
            </Alert>
          )}
          
          {transaction && (
            <div className="space-y-4 mt-2">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction Hash</p>
                    <p className="font-mono text-sm break-all">{transaction.transactionHash}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Block Number</p>
                    <p className="font-mono">{transaction.blockNumber}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p>{formatTimestamp(transaction.timestamp)}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-mono text-sm">
                      {transaction.from}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {shortenAddress(transaction.from)}
                      </Badge>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-mono text-sm">
                      {transaction.to}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {shortenAddress(transaction.to)}
                      </Badge>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Value</p>
                    <p className="font-mono">{transaction.value} ETH</p>
                  </div>
                </div>
              </div>
              
              <div>
                <Button 
                  variant="outline" 
                  className="mt-2" 
                  onClick={() => window.open(explorerUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Blockchain Explorer
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}