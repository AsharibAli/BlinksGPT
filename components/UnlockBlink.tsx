"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CanvasClient } from "@dscvr-one/canvas-client-sdk";
import { registerCanvasWallet } from "@dscvr-one/canvas-wallet-adapter";
import { Connection, Transaction } from "@solana/web3.js";
import BlinksGPT from "@/components/BlinksGPT";
import "@solana/wallet-adapter-react-ui/styles.css"; // For wallet styles

export default function UnlockBlinks() {
  const [isReady, setIsReady] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null); // Use `id` to identify the user
  const canvasClientRef = useRef<CanvasClient | null>(null);

  useEffect(() => {
    // Initialize CanvasClient and register the canvas wallet
    const client = new CanvasClient();
    registerCanvasWallet(client);
    canvasClientRef.current = client;

    const startClient = async () => {
      const response = await client.ready();
      if (response) {
        setIsReady(true); // Set canvas as ready
        setUserId(response.untrusted.user?.id || null); // Use `id` instead of `publicKey`
      }
      client.resize();
    };

    startClient();

    // Resize observer to handle changes in the canvas size
    const resizeObserver = new ResizeObserver(() => client.resize());
    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
      client.destroy();
    };
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("paymentToken");
    const storedUserId = localStorage.getItem("userId"); // Use `id` instead of `publicKey`
    if (storedToken && storedUserId === userId) {
      setAccessGranted(true);
    }
  }, [userId]);

  const handleConnectWallet = async () => {
    try {
      if (canvasClientRef.current) {
        // Trigger the connection via DSCVR's Canvas Wallet Adapter
        await canvasClientRef.current.ready();
        setConnected(true);
      }
    } catch (error) {
      setErrorMessage("Failed to connect wallet. Please try again.");
      console.error("Wallet connection error:", error);
    }
  };

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
        body: JSON.stringify({ account: userId }), // Send `id` instead of `publicKey`
      });

      if (response.ok) {
        const { transaction, token } = await response.json();

        // Deserialize the transaction from the API response
        const tx = Transaction.from(Buffer.from(transaction, "base64"));

        // Sign the transaction with the user's wallet
        const signedTx = await window.solana.signTransaction(tx);

        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.testnet.solana.com", "confirmed");

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
            localStorage.setItem("userId", userId!); // Store the user's `id` for verification
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
    <>
      {!accessGranted ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl mb-4">Unlock BlinksGPT</h1>

          {!connected ? (
            <Button onClick={handleConnectWallet}>
              Connect Wallet
            </Button>
          ) : (
            <Button onClick={handlePayment} disabled={transactionStatus === "Transaction in progress..."}>
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
    </>
  );
}
