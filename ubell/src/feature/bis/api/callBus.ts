export const callBus = async (busId: string, stationId: string) => {
  const response = await fetch(
    `http://localhost:3000/api/v2/station/${stationId}/bus/${busId}/call`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ busId, stationId }),
    },
  );

  return response.json();
};

export const cancelBusCall = async (busId: string, stationId: string) => {
  const response = await fetch(
    `http://localhost:3000/api/v2/station/${stationId}/bus/${busId}/call`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ busId, stationId }),
    },
  );

  return response.json();
};
