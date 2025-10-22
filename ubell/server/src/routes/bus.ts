import { Router } from "express";

import prisma from "../lib/prisma";

const router = Router();

// 버스 호출 상태 확인 API
router.get("/:stationId/:busId/status", async (req, res) => {
  try {
    const { stationId, busId } = req.params;

    console.log(`🚌 버스 호출 상태 확인: ${stationId}-${busId}`);

    // 1. Bus 데이터베이스에서 해당 버스 데이터 확인
    const bus = await prisma.bus.findFirst({
      where: {
        stationId: stationId,
        routeNo: busId,
      },
    });

    console.log(bus);

    if (!bus) {
      console.log(`❌ 버스 데이터 없음: ${stationId}-${busId}`);
      return res.json({ hasCall: false, reason: "버스 데이터 없음" });
    }

    console.log(`📊 버스 데이터 발견:`, {
      routeNo: bus.routeNo,
      arrivalTime: bus.arrivalTime,
      arrPrevStationCnt: bus.arrPrevStationCnt,
      updatedAt: bus.updatedAt,
    });

    // 2. 현재 시간 기준으로 남은 시간 계산
    const now = new Date();
    const timeDiff = Math.floor(
      (now.getTime() - bus.updatedAt.getTime()) / 1000,
    );
    const currentArrivalTime = Math.max(0, bus.arrivalTime - timeDiff);

    console.log(`⏰ 시간 계산:`, {
      timeDiff: timeDiff,
      originalArrivalTime: bus.arrivalTime,
      currentArrivalTime: currentArrivalTime,
    });

    // 3. 조건 확인: 남은 시간 60초 이하 AND 남은 정류장 1개 이하
    const meetsTimeCondition = currentArrivalTime <= 60;
    const meetsStopCondition = bus.arrPrevStationCnt <= 1;
    const meetsConditions = meetsTimeCondition && meetsStopCondition;

    console.log(`🔍 조건 확인:`, {
      meetsTimeCondition: meetsTimeCondition,
      meetsStopCondition: meetsStopCondition,
      meetsConditions: meetsConditions,
    });

    if (!meetsConditions) {
      console.log(`❌ 조건 불만족: ${stationId}-${busId}`);
      return res.json({
        hasCall: false,
        reason: "조건 불만족",
        details: {
          currentArrivalTime: currentArrivalTime,
          arrPrevStationCnt: bus.arrPrevStationCnt,
          meetsTimeCondition: meetsTimeCondition,
          meetsStopCondition: meetsStopCondition,
        },
      });
    }

    // 4. BusCall 데이터베이스에서 호출 여부 확인
    const busCallId = `${stationId}-${busId}`;
    const busCall = await prisma.busCall.findUnique({
      where: {
        busId_stationId: {
          busId: busId,
          stationId: stationId,
        },
      },
    });

    const hasCall = !!busCall;
    console.log(`🔔 호출 상태 확인:`, {
      busCallId: busCallId,
      hasCall: hasCall,
      busCall: busCall,
    });

    // 5. 결과 반환
    const result = {
      hasCall: hasCall,
      busInfo: {
        routeNo: bus.routeNo,
        stationName: bus.stationName,
        currentArrivalTime: currentArrivalTime,
        arrPrevStationCnt: bus.arrPrevStationCnt,
      },
    };

    console.log(`✅ 최종 결과: ${stationId}-${busId}`, result);
    res.json(result);
  } catch (error) {
    console.error("버스 호출 상태 확인 오류:", error);
    res.status(500).json({
      hasCall: false,
      error: "서버 오류",
    });
  }
});

export default router;
