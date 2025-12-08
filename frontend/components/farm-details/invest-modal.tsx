"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { X, Wallet, TrendingUp, DollarSign, Coins } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface InvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmName: string;
  minInvestment: number | bigint | string; // Accept multiple types
  roi: number;
}

const AGT_PRICE = 100; // 1 AGT = ₦100

export function InvestModal({
  isOpen,
  onClose,
  farmName,
  minInvestment,
  roi,
}: InvestModalProps) {
  // Convert minInvestment to number safely
  const minInvestmentNum =
    typeof minInvestment === "bigint"
      ? Number(minInvestment)
      : typeof minInvestment === "string"
      ? Number(minInvestment)
      : minInvestment;

const [amount, setAmount] = useState(
  minInvestmentNum !== undefined && minInvestmentNum !== null
    ? minInvestmentNum.toString()
    : "0"
  );
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const numericAmount = Number.parseFloat(amount) || 0;
  const agtTokens = numericAmount / AGT_PRICE;
  const expectedReturn = numericAmount * (1 + roi / 100);

  const handleInvest = async () => {
    // Check authentication
    if (!user) {
      addToast("Please sign in to invest", "error");
      router.push("/signin");
      return;
    }

    // Check wallet connection
    if (!user.walletConnected) {
      addToast("Please connect your wallet to proceed", "error");
      return;
    }

    // Validate amount
    if (numericAmount < minInvestmentNum) {
      addToast(
        `Minimum investment is ₦${minInvestmentNum.toLocaleString()}`,
        "error"
      );
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Integrate with useInvest hook
      // const result = await invest(farmId, amount);

      // Mock investment transaction for now
      await new Promise((resolve) => setTimeout(resolve, 2000));

      addToast(
        `Successfully invested ₦${numericAmount.toLocaleString()} in ${farmName}!`,
        "success"
      );
      onClose();
    } catch (error) {
      console.error("Investment error:", error);
      addToast("Investment failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="pointer-events-auto w-full max-w-lg"
            >
              <Card className="border-emerald-200 dark:border-emerald-800 shadow-2xl">
                <CardHeader className="relative">
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4"
                  >
                    <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold text-center">
                    Invest in {farmName}
                  </CardTitle>
                  <CardDescription className="text-center">
                    Enter the amount you want to invest and receive AGT tokens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Investment Amount Input */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Investment Amount (₦)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        placeholder={minInvestmentNum.toString()}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={minInvestmentNum}
                        step={1000}
                        className="pl-10 text-lg"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum investment: ₦{minInvestmentNum.toLocaleString()}
                    </p>
                  </div>

                  {/* Investment Summary */}
                  <div className="space-y-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Coins className="h-4 w-4" />
                        <span>AGT Tokens</span>
                      </div>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {agtTokens.toFixed(2)} AGT
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span>Expected Return ({roi}%)</span>
                      </div>
                      <p className="text-lg font-bold">
                        ₦{expectedReturn.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200 dark:border-emerald-800">
                      <span className="text-sm font-medium">
                        Potential Profit
                      </span>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        ₦{(expectedReturn - numericAmount).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Wallet Info */}
                  {user?.walletConnected && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Connected Wallet
                        </span>
                        <span className="font-mono font-medium text-xs">
                          {user.walletAddress?.slice(0, 6)}...
                          {user.walletAddress?.slice(-4)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleInvest}
                      className="w-full gradient-primary text-white"
                      size="lg"
                      disabled={isLoading || numericAmount < minInvestmentNum}
                    >
                      {isLoading ? (
                        <>
                          <span className="loading loading-spinner loading-sm mr-2"></span>
                          Processing...
                        </>
                      ) : (
                        `Invest ₦${numericAmount.toLocaleString()}`
                      )}
                    </Button>
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="w-full bg-transparent"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-xs text-center text-muted-foreground">
                    By investing, you agree to the terms and conditions.
                    Investments are subject to market risks.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
