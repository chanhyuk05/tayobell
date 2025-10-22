import { Station } from "@/shared/types/bus";

import prisma from "../lib/prisma";

// 서울 버스 API XML 응답에서 파싱된 데이터 타입 (arrmsg1만 사용)
interface BusItemData {
  arsId?: string; // 정류장 고유번호
  stNm?: string; // 정류장명
  busRouteId?: string; // 노선ID
  busRouteAbrv?: string; // 노선번호
  routeType?: string; // 노선타입
  arrmsg1?: string; // 도착예정버스 메시지
  rtNm?: string; // 노선명 (대체 필드)
}

export class StationAPIService {
  static async getBusData(stationId: string): Promise<Station> {
    try {
      // 서울 버스 API 호출
      const response = await fetch(
        `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?serviceKey=${process.env.BUS_API_KEY}&stId=${stationId}`,
      );

      const xmlText = await response.text();

      // itemList가 있는지 확인
      const hasItemList = xmlText.includes("<itemList>");

      if (hasItemList) {
        const itemListStart = xmlText.indexOf("<itemList>");
        const itemListEnd = xmlText.indexOf("</itemList>");

        if (itemListStart > -1 && itemListEnd > -1) {
          const itemListContent = xmlText.substring(
            itemListStart,
            itemListEnd + 11,
          );
        }
      }

      // XML 파싱
      const busItems = this.parseXmlResponse(xmlText);

      // 호출된 버스 정보 조회 (DB에서)
      const busCall = await this.getStationBusCall(stationId);
      const calledBusIds = new Set(busCall);

      // API 응답 확인
      if (!busItems || busItems.length === 0) {
        console.log("❌ API에서 버스 데이터 없음");
        return {
          name: `정류장 ${stationId}`,
          buses: [],
        };
      }

      // 버스 데이터 변환 및 중복 제거
      const busMap = new Map<
        string,
        {
          id: string;
          name: string;
          routeType: "일반버스" | "마을버스" | "광역버스" | "급행버스";
          arrivalTime: number;
          remainingStops: number;
          isCalled: boolean;
        }
      >();
      let stationName = `정류장 ${stationId}`;

      for (const item of busItems) {
        stationName = item.stNm || stationName;

        const routeName = item.busRouteAbrv || item.rtNm;
        if (!routeName) {
          console.log("⚠️ 노선명 없음:", item);
          continue;
        }
        // 버스 정보 처리 (arrmsg1만 사용)
        if (item.arrmsg1 && item.arrmsg1 !== "출발대기") {
          const parsed = this.parseArrivalMessage(item.arrmsg1);

          if (parsed) {
            const existing = busMap.get(routeName);
            if (!existing || parsed.arrivalTime < existing.arrivalTime) {
              busMap.set(routeName, {
                id: `${item.arsId}-${item.busRouteId}`,
                name: routeName,
                routeType: this.mapRouteType(item.routeType || "3"),
                arrivalTime: parsed.arrivalTime,
                remainingStops: parsed.remainingStops,
                isCalled: calledBusIds.has(routeName),
              });
            } else {
              console.log(`⏭️ 기존 버스가 더 빠름: ${routeName}`);
            }
          } else {
            console.log(`❌ 파싱 실패: ${routeName}`, item.arrmsg1);
          }
        } else {
          console.log(
            `⏭️ 출발대기 또는 arrmsg1 없음: ${routeName}`,
            item.arrmsg1,
          );
        }
      }

      // 도착 시간 순으로 정렬
      const formattedBuses = Array.from(busMap.values()).sort(
        (a, b) => a.arrivalTime - b.arrivalTime,
      );

      console.log(`✅ 파싱 완료: ${formattedBuses.length}개 버스`);
      console.log(
        "📋 최종 버스 목록:",
        formattedBuses.map((bus) => ({
          name: bus.name,
          arrivalTime: bus.arrivalTime,
          remainingStops: bus.remainingStops,
          isCalled: bus.isCalled,
        })),
      );

      // DB에 버스 데이터 저장
      await this.saveBusDataToDB(stationId, stationName, formattedBuses);

      return {
        name: stationName,
        buses: formattedBuses,
      };
    } catch (error) {
      console.error("서울 버스 API 호출 실패:", error);

      // 에러 시 빈 데이터 반환
      return {
        name: `정류장 ${stationId}`,
        buses: [],
      };
    }
  }

  // XML 응답 파싱
  private static parseXmlResponse(xmlText: string): BusItemData[] {
    const items: BusItemData[] = [];

    try {
      console.log("🔍 XML 파싱 시작...");

      // 실제 XML 구조에 맞는 파싱
      // msgBody 안의 모든 itemList 찾기
      const msgBodyMatch = xmlText.match(/<msgBody>(.*?)<\/msgBody>/s);
      console.log("msgBody 매치 결과:", !!msgBodyMatch);

      if (!msgBodyMatch) {
        console.log("❌ msgBody를 찾을 수 없음");
        return items;
      }

      // itemList 태그들을 모두 찾기 (여러 정류장 정보)
      const itemListMatches = msgBodyMatch[1].match(
        /<itemList>(.*?)<\/itemList>/gs,
      );
      console.log("itemList 개수:", itemListMatches?.length || 0);

      if (!itemListMatches) {
        console.log("❌ itemList들을 찾을 수 없음");
        return items;
      }

      for (const itemListMatch of itemListMatches) {
        const item: BusItemData = {};

        // 각 필드 추출 (itemList 내부에서)
        const extractField = (fieldName: string) => {
          const match = itemListMatch.match(
            new RegExp(`<${fieldName}>(.*?)</${fieldName}>`),
          );
          return match ? match[1].trim() : undefined;
        };

        // 실제 XML 필드명으로 파싱 (arrmsg1만 사용)
        item.arsId = extractField("arsId");
        item.stNm = extractField("stNm");
        item.busRouteId = extractField("busRouteId");
        item.busRouteAbrv =
          extractField("busRouteAbrv") || extractField("rtNm");
        item.routeType = extractField("routeType");
        item.arrmsg1 = extractField("arrmsg1");
        item.rtNm = extractField("rtNm");

        // 실제 데이터가 있는 아이템만 추가
        const routeName = item.busRouteAbrv || item.rtNm;
        if (routeName && item.arrmsg1) {
          // 첫 번째 아이템만 상세 로그
          if (items.length === 0) {
            console.log("첫 번째 아이템 파싱 결과:", {
              busRouteAbrv: item.busRouteAbrv,
              rtNm: item.rtNm,
              arrmsg1: item.arrmsg1,
              stNm: item.stNm,
            });
          }
          items.push(item);
        }
      }

      console.log(`📄 XML 파싱 완료: ${items.length}개 아이템`);
      return items;
    } catch (error) {
      console.error("XML 파싱 오류:", error);
      return [];
    }
  }

  // 도착 메시지 파싱 (예: "3분23초후[1번째 전]" -> {arrivalTime: 203, remainingStops: 1})
  private static parseArrivalMessage(arrmsg: string): {
    arrivalTime: number;
    remainingStops: number;
  } | null {
    try {
      // "곧 도착" 처리
      if (arrmsg.includes("곧 도착")) {
        return { arrivalTime: 0, remainingStops: 0 };
      }

      // "출발대기" 처리
      if (arrmsg.includes("출발대기")) {
        return null;
      }

      // 분과 초 추출 (예: "3분23초후[1번째 전]")
      const timeMatch = arrmsg.match(/(\d+)분(\d+)초후/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1]);
        const seconds = parseInt(timeMatch[2]);
        const arrivalTime = minutes * 60 + seconds;

        // 남은 정류장 수 추출 (예: "[1번째 전]")
        const stopsMatch = arrmsg.match(/\[(\d+)번째 전\]/);
        const remainingStops = stopsMatch ? parseInt(stopsMatch[1]) : 0;

        return { arrivalTime, remainingStops };
      }

      // 분만 있는 경우 (예: "2분후[1번째 전]")
      const minuteMatch = arrmsg.match(/(\d+)분후/);
      if (minuteMatch) {
        const minutes = parseInt(minuteMatch[1]);
        const arrivalTime = minutes * 60;

        const stopsMatch = arrmsg.match(/\[(\d+)번째 전\]/);
        const remainingStops = stopsMatch ? parseInt(stopsMatch[1]) : 0;

        return { arrivalTime, remainingStops };
      }

      // 초만 있는 경우 (예: "40초후[4번째 전]")
      const secondMatch = arrmsg.match(/(\d+)초후/);
      if (secondMatch) {
        const seconds = parseInt(secondMatch[1]);
        const arrivalTime = seconds;

        const stopsMatch = arrmsg.match(/\[(\d+)번째 전\]/);
        const remainingStops = stopsMatch ? parseInt(stopsMatch[1]) : 0;

        return { arrivalTime, remainingStops };
      }

      console.log("⚠️ 파싱할 수 없는 도착 메시지:", arrmsg);
      return null;
    } catch (error) {
      console.error("도착 메시지 파싱 오류:", error, "메시지:", arrmsg);
      return null;
    }
  }

  // DB에 버스 데이터 저장
  private static async saveBusDataToDB(
    stationId: string,
    stationName: string,
    buses: Array<{
      id: string;
      name: string;
      routeType: "일반버스" | "마을버스" | "광역버스" | "급행버스";
      arrivalTime: number;
      remainingStops: number;
      isCalled: boolean;
    }>,
  ): Promise<void> {
    try {
      console.log("💾 DB에 버스 데이터 저장 시작...");

      // 각 버스마다 upsert 실행
      for (const bus of buses) {
        const busId = `${stationId}-${bus.name}`; // 정류장-버스명으로 고유 ID 생성

        await prisma.bus.upsert({
          where: {
            id: busId,
          },
          update: {
            routeNo: bus.name,
            stationId: stationId,
            stationName: stationName,
            arrivalTime: bus.arrivalTime,
            arrPrevStationCnt: bus.remainingStops,
            updatedAt: new Date(),
          },
          create: {
            id: busId,
            routeNo: bus.name,
            stationId: stationId,
            stationName: stationName,
            arrivalTime: bus.arrivalTime,
            arrPrevStationCnt: bus.remainingStops,
          },
        });
      }

      console.log(`✅ DB 저장 완료: ${buses.length}개 버스 데이터`);
    } catch (error) {
      console.error("❌ DB 저장 실패:", error);
      // DB 저장 실패해도 API 응답은 정상 반환
    }
  }

  // 노선 타입 매핑
  private static mapRouteType(
    routeType: string,
  ): "일반버스" | "마을버스" | "광역버스" | "급행버스" {
    switch (routeType) {
      case "1": // 공항버스
      case "2": // 마을버스
        return "마을버스";
      case "3": // 간선버스
      case "4": // 지선버스
        return "일반버스";
      case "5": // 순환버스
        return "일반버스";
      case "6": // 광역버스
        return "광역버스";
      case "7": // 인천버스
        return "광역버스";
      default:
        return "일반버스";
    }
  }

  static async getStationBusCall(stationId: string): Promise<string[]> {
    const data = await prisma.busCall.findMany({
      where: {
        stationId: stationId,
      },
    });

    // busId에서 실제 버스 번호만 추출 (예: "s-56-1" -> "56-1")
    return data.map((item) => item.busId);
  }

  static async callBus(stationId: string, busId: string): Promise<boolean> {
    // 이미 호출된 버스인지 확인
    const existingCall = await prisma.busCall.findUnique({
      where: {
        busId_stationId: {
          busId,
          stationId,
        },
      },
    });

    if (existingCall) {
      console.log("❌ 이미 호출된 버스:", busId);
      return false;
    }

    // 새로 호출
    await prisma.busCall.create({
      data: {
        busId,
        stationId,
      },
    });

    return true;
  }

  static async cancelBusCall(
    stationId: string,
    busId: string,
  ): Promise<boolean> {
    await prisma.busCall.delete({
      where: {
        busId_stationId: {
          busId,
          stationId,
        },
      },
    });

    return true;
  }
}
