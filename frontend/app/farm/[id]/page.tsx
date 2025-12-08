"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { FarmDetailsContent } from "@/components/farm-details/farm-details-content";
import { useSimpleFarms } from "@/hooks/useSimpleFarms";
import { useRouter } from "next/navigation";
import { useEffect, use } from "react";

export default function FarmDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap the params promise
  const unwrappedParams = use(params);
  const farmId = unwrappedParams.id;

  const { farms, loading, error } = useSimpleFarms();
  const router = useRouter();

  // Find the farm
  const farm = farms?.find((f) => f.id === farmId);

  // Redirect if farm not found after loading
  useEffect(() => {
    if (!loading && farms && farms.length > 0 && !farm) {
      router.push("/marketplace");
    }
  }, [loading, farms, farm, router, farmId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="text-muted-foreground">Loading farm details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-red-500">Error loading farm</p>
            <button
              onClick={() => router.push("/marketplace")}
              className="btn btn-primary"
            >
              Back to Marketplace
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not found state
  if (!farm) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Farm Not Found</h2>
            <p className="text-muted-foreground">
              The farm with ID "{farmId}" does not exist.
            </p>
            <button
              onClick={() => router.push("/marketplace")}
              className="btn btn-primary"
            >
              Back to Marketplace
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <FarmDetailsContent farm={farm} />
      </main>
      <Footer />
    </div>
  );
}
