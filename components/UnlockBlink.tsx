"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CanvasClient } from "@dscvr-one/canvas-client-sdk";
import { registerCanvasWallet } from "@dscvr-one/canvas-wallet-adapter";
import { useWallet, ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, Transaction, clusterApiUrl } from "@solana/web3.js";
import BlinksGPT from "@/components/BlinksGPT";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css"; // For wallet styles

export default function UnlockBlinks() {
  const [isReady, setIsReady] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { publicKey, connected, connecting } = useWallet(); // Added `connecting` to track the connecting state

  useEffect(() => {
    // Initialize CanvasClient and register the canvas wallet
    const client = new CanvasClient();
    registerCanvasWallet(client);

    const startClient = async () => {
      const response = await client.ready();
      if (response) {
        setIsReady(true); // Set canvas as ready
      }
    };

    startClient();

    return () => {
      client.destroy();
    };
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("paymentToken");
    const storedPublicKey = localStorage.getItem("userPublicKey");
    if (storedToken && storedPublicKey === publicKey?.toBase58()) {
      setAccessGranted(true);
    }
  }, [publicKey]);

  const handlePayment = async () => {
    if (!connected) {
      alert("Please connect your wallet");
      return;
    }

    setTransactionStatus("Transaction in progress...");
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/actions/unlock-blinks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicKey: publicKey?.toBase58() }),
      });

      if (response.ok) {
        const { transaction, token } = await response.json();

        // Deserialize the transaction from the API response
        const tx = Transaction.from(Buffer.from(transaction, "base64"));

        // Sign the transaction with the user's wallet
        const signedTx = await window.solana.signTransaction(tx);

        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("testnet"), "confirmed");

        // Send the signed transaction
        const signature = await connection.sendRawTransaction(signedTx.serialize());

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const confirmationStrategy = {
          signature,
          blockhash,
          lastValidBlockHeight,
        };

        const confirmation = await connection.confirmTransaction(confirmationStrategy, "confirmed");

        if (confirmation.value.err) {
          setTransactionStatus("Transaction failed.");
          setErrorMessage("Transaction failed. Please try again.");
        } else {
          setTransactionStatus("Transaction successful!");
          // Delay granting access by 5 seconds
          setTimeout(() => {
            localStorage.setItem("paymentToken", token); // Store the secure token
            localStorage.setItem("userPublicKey", publicKey?.toBase58()!); // Store the user's `publicKey` for verification
            setAccessGranted(true);
          }, 5000);
        }
      } else {
        setTransactionStatus("Transaction failed.");
        setErrorMessage("Payment failed. Please try again.");
      }
    } catch (error) {
      setTransactionStatus("Transaction failed.");
      setErrorMessage("An error occurred during the transaction. Please try again.");
      console.error("Payment error:", error);
    }
  };

  if (!isReady) {
    return <p className="text-center">Loading...</p>; // Loading state while the canvas client initializes
  }

  return (
    <ConnectionProvider endpoint={clusterApiUrl("testnet")}>
      <WalletProvider wallets={[new PhantomWalletAdapter()]} autoConnect>
        <WalletModalProvider>
          {!accessGranted ? (
            <div className="flex flex-col items-center justify-center h-screen">
              <h1 className="text-2xl mb-4">Unlock BlinksGPT</h1>

              {!connected && !connecting ? (
                <WalletMultiButton />
              ) : (
                <Button onClick={handlePayment} disabled={transactionStatus === "Transaction in progress..." || connecting}>
                  Pay 0.1 SOL to Access BlinksGPT
                </Button>
              )}

              {transactionStatus && (
                <p className={`mt-4 ${transactionStatus.includes("successful") ? "text-green-500" : "text-red-500"}`}>
                  {transactionStatus}
                </p>
              )}

              {errorMessage && (
                <p className="mt-2 text-red-500">
                  {errorMessage}
                </p>
              )}
            </div>
          ) : (
            <BlinksGPT />
          )}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
