"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl, Connection, Transaction } from "@solana/web3.js";
import BlinksGPT from "@/components/BlinksGPT";

export default function UnlockBlinks() {
  const [accessGranted, setAccessGranted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    const storedToken = localStorage.getItem('paymentToken');
    const userPublicKey = localStorage.getItem('userPublicKey');
    if (storedToken && userPublicKey === publicKey?.toBase58()) {
      // Verify the token by sending it back to the server or check signature
      // Assuming simple verification by checking stored token
      setAccessGranted(true);
    }
    setIsMounted(true);
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
        body: JSON.stringify({ account: publicKey?.toBase58() }),
      });

      if (response.ok) {
        const { transaction, token } = await response.json();

        // Deserialize the transaction from the API response
        const tx = Transaction.from(Buffer.from(transaction, 'base64'));

        // Sign the transaction with the user's wallet
        const signedTx = await window.solana.signTransaction(tx);

        const connection = new Connection(clusterApiUrl("testnet"), "confirmed");

        // Send the signed transaction
        const signature = await connection.sendRawTransaction(signedTx.serialize());

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const confirmationStrategy = {
          signature,
          blockhash,
          lastValidBlockHeight,
        };

        const confirmation = await connection.confirmTransaction(confirmationStrategy, 'confirmed');

        if (confirmation.value.err) {
          setTransactionStatus("Transaction failed.");
          setErrorMessage("Transaction failed. Please try again.");
        } else {
          setTransactionStatus("Transaction successful!");
          // Delay granting access by 5 seconds
          setTimeout(() => {
            localStorage.setItem('paymentToken', token); // Store the secure token
            localStorage.setItem('userPublicKey', publicKey?.toBase58()!); // Store the user's public key for verification
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

  if (!isMounted) return null;

  // Separate rendering logic based on accessGranted state
  return (
    <>
      {!accessGranted ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl mb-4">Unlock BlinksGPT</h1>

          <WalletMultiButton /> <br />

          <Button onClick={handlePayment} disabled={!connected || transactionStatus === "Transaction in progress..."}>
            Pay 0.1 SOL to Access BlinksGPT
          </Button>

          {transactionStatus && (
            <p className={`mt-4 ${transactionStatus.includes('successful') ? 'text-green-500' : 'text-red-500'}`}>
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
    </>
  );
}
