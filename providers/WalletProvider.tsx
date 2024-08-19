"use client";

import { WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import React, { useEffect, useState } from "react";
import { CanvasClient } from "@dscvr-one/canvas-client-sdk";
import { registerCanvasWallet } from "@dscvr-one/canvas-wallet-adapter";
import CanvasWalletAdapter from "@dscvr-one/canvas-wallet-adapter"
import "@solana/wallet-adapter-react-ui/styles.css";

const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const network = clusterApiUrl("testnet"); // Change to "mainnet-beta" or "testnet" as required
  const [canvasClient, setCanvasClient] = useState<CanvasClient | null>(null);
  const [wallets, setWallets] = useState<[]>([]);

  useEffect(() => {
    const initializeCanvasClient = async () => {
      const client = new CanvasClient();
      setCanvasClient(client);

      // Register the DSCVR Canvas Wallet
      const canvasWalletAdapter = registerCanvasWallet(client);

      setWallets([]); // Set the DSCVR Canvas Wallet as the only wallet adapter
    };

    initializeCanvasClient();

    return () => {
      if (canvasClient) {
        canvasClient.destroy(); // Cleanup the canvas client on unmount
      }
    };
  }, []);

  return (
    <ConnectionProvider endpoint={network}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export default WalletProvider;
