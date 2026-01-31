import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

interface WhaleThreshold {
  token: string;
  amount: number;
}

interface SettingsContextType {
  whaleThresholds: WhaleThreshold[];
  setWhaleThresholds: (thresholds: WhaleThreshold[]) => void;
  defaultThreshold: number;
  setDefaultThreshold: (amount: number) => void;
  isWhale: (token: string, amount: number) => boolean;
  getThresholdForToken: (token: string) => number;
}

const defaultThresholds: WhaleThreshold[] = [
  { token: "QUBIC", amount: 1000000 },
  { token: "QMINE", amount: 500000 },
  { token: "GARTH", amount: 100000 },
  { token: "MATILDA", amount: 100000 },
  { token: "CFB", amount: 50000 },
  { token: "QXMR", amount: 10000 },
];

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [whaleThresholds, setWhaleThresholdsState] = useState<WhaleThreshold[]>(() => {
    const stored = localStorage.getItem("whaleThresholds");
    return stored ? JSON.parse(stored) : defaultThresholds;
  });

  const [defaultThreshold, setDefaultThresholdState] = useState<number>(() => {
    const stored = localStorage.getItem("defaultWhaleThreshold");
    return stored ? parseInt(stored, 10) : 10000; // Default to 10000 for other tokens
  });

  const setWhaleThresholds = (thresholds: WhaleThreshold[]) => {
    setWhaleThresholdsState(thresholds);
    localStorage.setItem("whaleThresholds", JSON.stringify(thresholds));
    toast({
      title: "Settings Saved",
      description: "Whale detection thresholds have been updated.",
    });
  };

  const setDefaultThreshold = (amount: number) => {
    setDefaultThresholdState(amount);
    localStorage.setItem("defaultWhaleThreshold", amount.toString());
    toast({
      title: "Settings Saved",
      description: "Default threshold for other tokens has been updated.",
    });
  };

  const getThresholdForToken = (token: string): number => {
    const threshold = whaleThresholds.find(
      (t) => t.token.toUpperCase() === token.toUpperCase()
    );
    return threshold?.amount ?? defaultThreshold; // Use configurable default
  };

  const isWhale = (token: string, amount: number): boolean => {
    const threshold = getThresholdForToken(token);
    return amount >= threshold;
  };

  return (
    <SettingsContext.Provider
      value={{
        whaleThresholds,
        setWhaleThresholds,
        defaultThreshold,
        setDefaultThreshold,
        isWhale,
        getThresholdForToken,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
