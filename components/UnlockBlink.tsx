"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CanvasClient } from "@dscvr-one/canvas-client-sdk";
import { registerCanvasWallet } from "@dscvr-one/canvas-wallet-adapter";
import BlinksGPT from "@/components/BlinksGPT";
import * as bs58 from "bs58";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function UnlockBlinks() {
  const [isReady, setIsReady] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const canvasClientRef = useRef<CanvasClient | null>(null);

  useEffect(() => {
    const client = new CanvasClient();
    registerCanvasWallet(client);
    canvasClientRef.current = client;

    const startClient = async () => {
      const response = await client.ready();
      if (response) {
        setIsReady(true);

        const user: any = response.untrusted.user;
        setUsername(user.username || "User");
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
      const response = await canvasClientRef.current.connectWallet(
        "solana:103"
      );
      if (response && response.untrusted.success) {
        setAddress(response.untrusted.address);
        localStorage.setItem("userAddress", response.untrusted.address);
        setErrorMessage(null);
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
      setErrorMessage(
        "Wallet is not connected. Please connect your wallet first."
      );
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

        const decodedTx = bs58.decode(transaction);

        const unsignedTx = bs58.encode(decodedTx);

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
      setErrorMessage(
        "An error occurred during the transaction. Please try again."
      );
      console.error("Payment error:", error);
    }
  };

  if (!isReady) {
    return <p className="text-center">Loading...</p>;
  }

  if (accessGranted) {
    return <BlinksGPT />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl mb-4">
        💗 Welcome {username ? username : "User"} to the BlinksGPT 🤖
      </h1>
      {address ? (
        <h3 className="text-sm mb-4 text-gray-500">
          <strong>Connected Wallet Address:</strong> {address}
        </h3>
      ) : (
        <p className="text-sm mb-4 text-red-500">
          Please connect your wallet to proceed.
        </p>
      )}
      {!address ? (
        <Button onClick={handleConnectWallet}>Connect Wallet</Button>
      ) : (
        <>
          <Button
            onClick={handlePayment}
            disabled={transactionStatus === "Transaction in progress..."}
          >
            Pay 0.1 Devnet SOL to Access BlinksGPT
          </Button>
        </>
      )}

      {transactionStatus && (
        <p
          className={`mt-4 ${
            transactionStatus.includes("successful")
              ? "text-green-500"
              : "text-red-500"
          }`}
        >
          {transactionStatus}
        </p>
      )}

      {errorMessage && <p className="mt-2 text-red-500">{errorMessage}</p>}
    </div>
  );
}
