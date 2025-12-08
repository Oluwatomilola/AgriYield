import { AGRIYIELD_CONTRACT_ABI } from "@/const/abi";
import { useReadContracts } from "wagmi";
import { useState, useEffect } from "react";

const contractAddress = process.env
  .NEXT_PUBLIC_AGRIYIELD_CONTRACT_ADDRESS as `0x${string}`;
const MAX_FARMS_TO_CHECK = 20; // Check first 20 possible farm IDs

export const useSimpleFarms = () => {
  const [farms, setFarms] = useState<any[]>([]);

  // Debug contract address
  useEffect(() => {
    console.log("🔍 Contract Address:", contractAddress);
    console.log(
      "🔍 Address is valid:",
      contractAddress && contractAddress.startsWith("0x")
    );
  }, []);

  // Generate array of farm IDs to check (1 to 20)
  const farmIdsToCheck = Array.from(
    { length: MAX_FARMS_TO_CHECK },
    (_, i) => i + 1
  );

  // Fetch all farms at once using multicall
  const {
    data: farmsData,
    isLoading,
    error,
    refetch,
  } = useReadContracts({
    contracts: farmIdsToCheck.map((id) => ({
      address: contractAddress,
      abi: AGRIYIELD_CONTRACT_ABI,
      functionName: "getFarm" as const,
      args: [BigInt(id)],
    })),
  });

  // Process farm data whenever it changes
  useEffect(() => {
    if (!farmsData) return;

    console.log(
      "📊 Processing farm data for",
      farmIdsToCheck.length,
      "potential farms"
    );

    const processedFarms = farmsData
      .map((result: any, index: number) => {
        const farmId = farmIdsToCheck[index];

        // Check if the call succeeded
        if (result.status !== "success" || !result.result) {
          console.log(`⚠️ Farm ${farmId}: No data or error`);
          return null;
        }

        const farmData = result.result;

        // Check if farm actually exists (farmId should not be 0)
        const farmExists = farmData.farmId && Number(farmData.farmId) > 0;

        if (!farmExists) {
          console.log(`❌ Farm ${farmId}: Does not exist (farmId is 0)`);
          return null;
        }

        console.log(`✅ Farm ${farmId}: Valid farm found`, {
          name: farmData.name,
          status: farmData.status,
          verified: farmData.verified,
        });

        return {
          id: farmId.toString(),
          farmId: Number(farmData.farmId),
          name: farmData.name,
          description: farmData.description,
          farmer: farmData.farmer,
          fundingGoal: farmData.fundingGoal,
          sharePrice: farmData.sharePrice,
          totalInvested: farmData.totalInvested,
          proceeds: farmData.proceeds,
          deadline: farmData.deadline,
          verified: farmData.verified,
          status: farmData.status,
          metaCID: farmData.metaCID,
          minROI: farmData.minROI,
          maxROI: farmData.maxROI,
        };
      })
      .filter(Boolean); // Remove null entries

    console.log(`✅ Total valid farms found: ${processedFarms.length}`);
    console.log(
      "Valid farm IDs:",
      processedFarms.map((f: any) => f.id)
    );

    setFarms(processedFarms as any[]);
  }, [farmsData]);

  return {
    farms,
    loading: isLoading,
    error,
    contractAddress,
    refetch: () => {
      console.log("🔄 Refetching all farms...");
      refetch();
    },
  };
};
