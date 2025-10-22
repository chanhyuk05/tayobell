import { Router } from "express";

import { StationAPIService } from "../services/station";

const router = Router();

router.get("/:stationId", async (req, res) => {
  const { stationId } = req.params;

  const station = await StationAPIService.getBusData(stationId);

  res.json(station);
});

router.post("/:stationId/bus/:busId/call", async (req, res) => {
  const { stationId, busId } = req.params;

  const isCalled = await StationAPIService.callBus(stationId, busId);

  res.json({
    isCalled,
  });
});

router.delete("/:stationId/bus/:busId/call", async (req, res) => {
  const { stationId, busId } = req.params;

  const isCalled = await StationAPIService.cancelBusCall(stationId, busId);

  res.json({
    isCalled,
  });
});

export default router;
