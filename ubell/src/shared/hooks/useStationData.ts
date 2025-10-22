import { useEffect, useState } from "react";

import { Station } from "../types/bus";

export function useStationData(stationId: string) {
  const [stationData, setStationData] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStationData = async () => {
    setLoading(true);
    const response = await fetch(
      `http://localhost:3000/api/v2/station/${stationId}`,
    );

    const data: Station = await response.json();
    setStationData(data);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!stationId) return;

    fetchStationData();

    const interval = setInterval(fetchStationData, 10000);

    return () => clearInterval(interval);
  }, [stationId]);

  return {
    stationData: stationData as Station,
    loading,
    error,
    refetch: fetchStationData,
  };
}
