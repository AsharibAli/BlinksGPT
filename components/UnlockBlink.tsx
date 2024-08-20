"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CanvasClient } from "@dscvr-one/canvas-client-sdk";
import { registerCanvasWallet } from "@dscvr-one/canvas-wallet-adapter";
import BlinksGPT from "@/components/BlinksGPT";
import * as bs58 from "bs58";  // Import Base58 for encoding/decoding
import "@solana/wallet-adapter-react-ui/styles.css";

export default function UnlockBlinks() {
  const [isReady, setIsReady] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const canvasClientRef = useRef<CanvasClient | null>(null);

  useEffect(() => {
    // Initialize CanvasClient and register the canvas wallet
    const client = new CanvasClient();
    registerCanvasWallet(client); // Register only the DSCVR Canvas Wallet
    canvasClientRef.current = client;

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
    const storedAddress = localStorage.getItem("userAddress");
    if (storedToken && storedAddress === address) {
      setAccessGranted(true);
    }
  }, [address]);

  const handleConnectWallet = async () => {
    if (!canvasClientRef.current) {
      console.error("CanvasClient is not initialized");
      setErrorMessage("CanvasClient is not initialized. Please try again.");
      return;
    }

    try {
      const response = await canvasClientRef.current.connectWallet("solana:103");
      if (response && response.untrusted.success) {
        setAddress(response.untrusted.address);
        localStorage.setItem("userAddress", response.untrusted.address);
        setErrorMessage(null); // Clear any previous error message
      } else {
        setErrorMessage("Failed to connect wallet. Please try again.");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      setErrorMessage("Failed to connect wallet. Please try again.");
    }
  };

  const handlePayment = async () => {
    if (!address) {
      setErrorMessage("Wallet is not connected. Please connect your wallet first.");
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
        body: JSON.stringify({ publicKey: address }),
      });

      if (response.ok) {
        const { transaction, token } = await response.json();

        // Decode the transaction from Base58
        const decodedTx = bs58.decode(transaction);

        // Encode the Buffer back to a Base58 string
        const unsignedTx = bs58.encode(decodedTx);

        // Sign and send the transaction with the user's wallet
        const results = await canvasClientRef.current?.signAndSendTransaction({
          unsignedTx: unsignedTx,
          awaitCommitment: "confirmed",
          chainId: "solana:103",
        });

        if (results?.untrusted.success) {
          setTransactionStatus("Transaction successful! Please wait...");
          setTimeout(() => {
            localStorage.setItem("paymentToken", token);
            setAccessGranted(true);
            setTransactionStatus(null);
          }, 5000);
        } else {
          setTransactionStatus("Transaction failed.");
          setErrorMessage("Transaction failed. Please try again.");
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
    return <p className="text-center">Loading...</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl mb-4">Unlock BlinksGPT</h1>

      {!address ? (
        <Button onClick={handleConnectWallet}>Connect Wallet</Button>
      ) : (
        <>
          <p className="text-sm mb-2 text-gray-500">Connected Wallet: {address}</p>
          <Button
            onClick={handlePayment}
            disabled={transactionStatus === "Transaction in progress..."}
          >
            Pay 0.1 SOL to Access BlinksGPT
          </Button>
        </>
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

      {accessGranted && <BlinksGPT />}
    </div>
  );
}
