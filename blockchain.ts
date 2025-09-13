import { NextFunction, Request, Response } from "express";
import { ethers } from "ethers";

export interface BlockchainTransaction {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  data: string;
}

class BlockchainService {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private initialized = false;
  private network: string = 'sepolia';
  private contractAddress: string = '';
  private mockMode = true;
  private mockTransactions: Map<string, BlockchainTransaction> = new Map();
  private mockTxCount = 0;

  constructor() {
    // Check if we have the required environment variables
    if (
      process.env.BLOCKCHAIN_PROVIDER_URL && 
      process.env.BLOCKCHAIN_PRIVATE_KEY && 
      process.env.BLOCKCHAIN_CONTRACT_ADDRESS
    ) {
      this.mockMode = false;
      this.network = process.env.BLOCKCHAIN_NETWORK || 'sepolia';
      this.contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;
      this.init();
    } else {
      console.log("Blockchain service running in mock mode - environment variables not configured");
    }
  }

  private async init() {
    if (this.initialized) return;
    
    try {
      if (this.mockMode) return;
      
      this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_PROVIDER_URL);
      this.wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY!, this.provider);
      
      if (this.contractAddress) {
        // Simplified ABI for a basic transaction recording contract
        const abi = [
          "function recordTransaction(uint256 productId, uint256 sellerId, uint256 quantity, uint256 price) public returns (string)",
          "function getTransaction(string txHash) public view returns (uint256 blockNumber, uint256 timestamp, address from, address to, uint256 value, string data)"
        ];
        
        this.contract = new ethers.Contract(this.contractAddress, abi, this.wallet);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error("Error initializing blockchain service:", error);
      this.mockMode = true;
    }
  }

  /**
   * Records a transaction on the blockchain
   */
  public async recordTransaction(
    productId: string,
    buyerId: string,
    sellerId: string,
    quantity: number,
    price: number
  ): Promise<string> {
    try {
      if (this.mockMode) {
        // Create a mock transaction hash
        const txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        
        // Create mock transaction details
        const mockTx: BlockchainTransaction = {
          transactionHash: txHash,
          blockNumber: 10000000 + this.mockTxCount,
          timestamp: Math.floor(Date.now() / 1000),
          from: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          to: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
          value: "0.0",
          data: JSON.stringify({
            productId,
            buyerId,
            sellerId,
            quantity,
            price,
            total: quantity * price
          })
        };
        
        this.mockTransactions.set(txHash, mockTx);
        this.mockTxCount++;
        
        return txHash;
      }
      
      await this.init();
      
      if (!this.contract) {
        throw new Error("Blockchain contract not initialized");
      }
      
      // Record transaction on the blockchain
      const tx = await this.contract.recordTransaction(
        productId,
        sellerId,
        quantity,
        price
      );
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error: any) {
      console.error("Error recording transaction:", error);
      throw new Error(`Failed to record transaction: ${error.message}`);
    }
  }

  /**
   * Retrieves a transaction from the blockchain by its hash
   */
  public async getTransaction(txHash: string): Promise<BlockchainTransaction | null> {
    try {
      if (this.mockMode) {
        // Return mock transaction if it exists
        const mockTx = this.mockTransactions.get(txHash);
        if (mockTx) {
          return mockTx;
        }
        
        // If exact match not found, try to find a mock tx that starts with the same characters
        for (const [hash, tx] of this.mockTransactions.entries()) {
          if (hash.startsWith(txHash) || txHash.startsWith(hash.substring(0, 10))) {
            return tx;
          }
        }
        
        throw new Error("Transaction not found");
      }
      
      await this.init();
      
      if (!this.provider) {
        throw new Error("Blockchain provider not initialized");
      }
      
      // Get transaction from the blockchain
      const tx = await this.provider.getTransaction(txHash);
      
      if (!tx) {
        throw new Error("Transaction not found");
      }
      
      // Get transaction receipt for additional information
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }
      
      // Get block information for timestamp
      const block = await this.provider.getBlock(receipt.blockNumber);
      
      if (!block) {
        throw new Error("Block information not found");
      }
      
      // Format the transaction data
      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: block.timestamp,
        from: tx.from,
        to: tx.to || "",
        value: ethers.formatEther(tx.value),
        data: tx.data
      };
    } catch (error: any) {
      console.error("Error retrieving transaction:", error);
      throw new Error(`Failed to retrieve transaction: ${error.message}`);
    }
  }

  /**
   * Verifies a transaction exists on the blockchain
   */
  public async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      if (this.mockMode) {
        // Check if the transaction exists in our mock storage
        const exists = this.mockTransactions.has(txHash);
        
        // If exact match not found, try to find a mock tx that starts with the same characters
        if (!exists) {
          for (const hash of this.mockTransactions.keys()) {
            if (hash.startsWith(txHash) || txHash.startsWith(hash.substring(0, 10))) {
              return true;
            }
          }
        }
        
        return exists;
      }
      
      await this.init();
      
      if (!this.provider) {
        throw new Error("Blockchain provider not initialized");
      }
      
      // Check if the transaction exists on the blockchain
      const tx = await this.provider.getTransaction(txHash);
      
      return !!tx;
    } catch (error) {
      console.error("Error verifying transaction:", error);
      return false;
    }
  }
}

const blockchainService = new BlockchainService();
export default blockchainService;

// Middleware to require blockchain verification
export function requireBlockchainVerification(req: Request, res: Response, next: NextFunction) {
  const { transactionHash } = req.body;
  
  if (!transactionHash) {
    return res.status(400).json({ error: "Transaction hash is required" });
  }
  
  blockchainService
    .verifyTransaction(transactionHash)
    .then((verified) => {
      if (!verified) {
        return res.status(400).json({ 
          error: "Transaction could not be verified on the blockchain" 
        });
      }
      next();
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
}