import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plus, X } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

export default function Settings() {
  const { whaleThresholds, setWhaleThresholds, defaultThreshold, setDefaultThreshold } = useSettings();
  
  const [thresholdInputs, setThresholdInputs] = useState<Record<string, string>>(() => {
    const inputs: Record<string, string> = {};
    whaleThresholds.forEach((t) => {
      inputs[t.token] = t.amount.toString();
    });
    return inputs;
  });

  const [defaultThresholdInput, setDefaultThresholdInput] = useState<string>(defaultThreshold.toString());

  // Sync default threshold input when context value changes
  useEffect(() => {
    setDefaultThresholdInput(defaultThreshold.toString());
  }, [defaultThreshold]);

  // State for adding custom token
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenAmount, setNewTokenAmount] = useState("");

  const handleThresholdChange = (token: string, value: string) => {
    setThresholdInputs((prev) => ({
      ...prev,
      [token]: value,
    }));
  };

  const handleAddCustomToken = () => {
    const tokenName = newTokenName.trim().toUpperCase();
    const amount = parseInt(newTokenAmount);

    if (!tokenName || isNaN(amount) || amount <= 0) return;
    
    // Check if token already exists
    if (whaleThresholds.some((t) => t.token.toUpperCase() === tokenName)) {
      return;
    }

    const newThresholds = [...whaleThresholds, { token: tokenName, amount }];
    setWhaleThresholds(newThresholds);
    setThresholdInputs((prev) => ({
      ...prev,
      [tokenName]: amount.toString(),
    }));
    setNewTokenName("");
    setNewTokenAmount("");
  };

  const handleRemoveToken = (tokenToRemove: string) => {
    const newThresholds = whaleThresholds.filter((t) => t.token !== tokenToRemove);
    setWhaleThresholds(newThresholds);
    setThresholdInputs((prev) => {
      const updated = { ...prev };
      delete updated[tokenToRemove];
      return updated;
    });
  };

  const handleSaveThresholds = () => {
    const newThresholds = whaleThresholds.map((t) => ({
      token: t.token,
      amount: parseInt(thresholdInputs[t.token]) || t.amount,
    }));

    // Only update per-token thresholds if they actually changed
    const tokenThresholdsChanged =
      newThresholds.length !== whaleThresholds.length ||
      newThresholds.some(
        (t, i) =>
          whaleThresholds[i]?.token !== t.token ||
          whaleThresholds[i]?.amount !== t.amount
      );
    if (tokenThresholdsChanged) {
      setWhaleThresholds(newThresholds);
    }

    // Only update default threshold for other tokens if it actually changed
    const defaultAmount = parseInt(defaultThresholdInput, 10);
    if (
      !isNaN(defaultAmount) &&
      defaultAmount > 0 &&
      defaultAmount !== defaultThreshold
    ) {
      setDefaultThreshold(defaultAmount);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl space-y-6">
        {/* Whale Detection Thresholds */}
        <Card className="gradient-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Whale Detection Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set the minimum token amount to classify a transaction as a whale event. 
              When an event exceeds these thresholds, it will be tagged as "Whale" across all pages.
            </p>
            
            {/* Default Threshold for Other Tokens */}
            <div className="border-b border-border pb-4 mb-4">
              <Label className="text-base font-medium mb-2 block">
                Other Tokens (Default)
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Threshold for tokens not listed below. This will be used for any token that doesn't have a specific threshold configured.
              </p>
              <div className="flex items-center gap-2 max-w-xs">
                <Input
                  type="number"
                  value={defaultThresholdInput}
                  onChange={(e) => setDefaultThresholdInput(e.target.value)}
                  className="font-mono"
                  placeholder={defaultThreshold.toString()}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  tokens
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              {whaleThresholds.map((threshold) => (
                <div key={threshold.token} className="flex items-center justify-between gap-4">
                  <Label className="text-base font-medium min-w-[80px]">
                    {threshold.token}
                  </Label>
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <Input
                      type="number"
                      value={thresholdInputs[threshold.token] || ""}
                      onChange={(e) => handleThresholdChange(threshold.token, e.target.value)}
                      className="font-mono"
                      placeholder={threshold.amount.toString()}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {threshold.token}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveToken(threshold.token)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Token */}
            <div className="border-t border-border pt-4 mt-4">
              <Label className="text-sm text-muted-foreground mb-3 block">
                Add Custom Token Threshold
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Token name (e.g., NEWTOKEN)"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value.toUpperCase())}
                  className="font-mono flex-1 max-w-[160px]"
                />
                <Input
                  type="number"
                  placeholder="Threshold amount"
                  value={newTokenAmount}
                  onChange={(e) => setNewTokenAmount(e.target.value)}
                  className="font-mono flex-1 max-w-[160px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomToken}
                  disabled={!newTokenName.trim() || !newTokenAmount}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </div>

            <Button 
              className="w-full bg-primary hover:bg-primary/90 mt-4"
              onClick={handleSaveThresholds}
            >
              Save Thresholds
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
