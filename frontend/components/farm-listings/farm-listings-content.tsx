"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FarmCard } from "./farm-card";
import { FarmFilters } from "./farm-filters";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSimpleFarms } from "@/hooks/useSimpleFarms";
import { formatUnits } from "viem";

export interface Farm {
  id: string;
  name: string;
  farmer: string;
  cropType: string;
  image: string;
  duration: string;
  roi: number;
  location: string;
  city: string;
  state: string;
  fundingGoal: number;
  amountRaised: number;
  fundingProgress: number;
  minInvestment: number;
  description: string;
  coordinates: [number, number];
  verified: boolean;
  investors: number;
}

export function FarmListingsContent() {
  const { farms: blockchainFarms, loading, error } = useSimpleFarms();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrop, setSelectedCrop] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [roiRange, setRoiRange] = useState<[number, number]>([0, 50]);

  // Transform blockchain farm data to UI format
  const farms: Farm[] = (blockchainFarms || []).map((farm: any) => {
    // Convert BigInt values to numbers
    const fundingGoal = farm.fundingGoal
      ? Number(formatUnits(farm.fundingGoal, 18))
      : 0;

    const amountRaised = farm.totalInvested
      ? Number(formatUnits(farm.totalInvested, 18))
      : 0;

    const minInvestment = farm.sharePrice
      ? Number(formatUnits(farm.sharePrice, 18))
      : 0;

    // Calculate funding progress
    const fundingProgress =
      fundingGoal > 0 ? Math.round((amountRaised / fundingGoal) * 100) : 0;

    // Extract crop type from description (if available)
    const cropType = extractCropType(farm.description);

    // Extract location from description (if available)
    const location = extractLocation(farm.description);

    return {
      id: farm.id || farm.farmId?.toString(),
      name: farm.name || "Unnamed Farm",
      farmer: farm.farmer || "",
      cropType: cropType || "Various",
      image: "/golden-wheat-farm.png", // Default image
      duration: calculateDuration(farm.deadline),
      roi: Number(farm.maxROI) || 0,
      location: location.full || "Nigeria",
      city: location.city || "Lagos",
      state: location.state || "Lagos",
      fundingGoal,
      amountRaised,
      fundingProgress,
      minInvestment,
      description: farm.description || "",
      coordinates: [6.5964, 3.3486] as [number, number],
      verified: farm.verified || false,
      investors: 0, // TODO: Calculate from blockchain data if available
    };
  });

  // Filtering logic
  const filteredFarms = farms.filter((farm) => {
    const matchesSearch =
      farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farm.cropType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farm.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCrop =
      selectedCrop === "all" ||
      farm.cropType.toLowerCase() === selectedCrop.toLowerCase();

    const matchesRegion =
      selectedRegion === "all" ||
      farm.location.toLowerCase().includes(selectedRegion.toLowerCase());

    const matchesRoi = farm.roi >= roiRange[0] && farm.roi <= roiRange[1];

    return matchesSearch && matchesCrop && matchesRegion && matchesRoi;
  });

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="text-muted-foreground">Loading farms...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-red-500">Error loading farms</p>
            <p className="text-sm text-muted-foreground">{String(error)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Explore Farm <span className="text-primary">Opportunities</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Invest in verified farms and earn returns from agricultural yields
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search farms by name, crop type, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Filters */}
        <FarmFilters
          selectedCrop={selectedCrop}
          setSelectedCrop={setSelectedCrop}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          roiRange={roiRange}
          setRoiRange={setRoiRange}
        />

        {/* Results */}
        {farms.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground text-lg">
              No farms available yet
            </p>
            <p className="text-sm text-muted-foreground">
              Be the first to create a farm campaign!
            </p>
          </div>
        ) : filteredFarms.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {filteredFarms.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {farms.length}
                </span>{" "}
                farm{filteredFarms.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFarms.map((farm, index) => (
                <FarmCard key={farm.id || index} farm={farm} index={index} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No farms found matching your criteria</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Helper function to extract crop type from description
function extractCropType(description: string): string {
  if (!description) return "Various";

  const cropTypes = ["wheat", "corn", "rice", "soybeans", "tomatoes"];
  const lowerDesc = description.toLowerCase();

  for (const crop of cropTypes) {
    if (lowerDesc.includes(crop)) {
      return crop.charAt(0).toUpperCase() + crop.slice(1);
    }
  }

  return "Various";
}

// Helper function to extract location from description
function extractLocation(description: string): {
  full: string;
  city: string;
  state: string;
} {
  if (!description) return { full: "Nigeria", city: "Lagos", state: "Lagos" };

  // Look for "Location: City, State" pattern
  const locationMatch = description.match(/Location:\s*([^,\n]+),\s*([^\n]+)/i);

  if (locationMatch) {
    return {
      full: `${locationMatch[1]}, ${locationMatch[2]}`,
      city: locationMatch[1].trim(),
      state: locationMatch[2].trim(),
    };
  }

  return { full: "Nigeria", city: "Lagos", state: "Lagos" };
}

// Helper function to calculate duration from deadline
function calculateDuration(deadline: bigint | number): string {
  if (!deadline) return "6 months";

  const deadlineTimestamp =
    typeof deadline === "bigint" ? Number(deadline) : deadline;

  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = deadlineTimestamp - now;

  if (secondsRemaining <= 0) return "Expired";

  const daysRemaining = Math.floor(secondsRemaining / (60 * 60 * 24));
  const monthsRemaining = Math.floor(daysRemaining / 30);

  if (monthsRemaining > 0) {
    return `${monthsRemaining} month${monthsRemaining !== 1 ? "s" : ""}`;
  } else {
    return `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`;
  }
}
