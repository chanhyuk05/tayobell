import { Bus } from "@/shared/types";

export function getBusArriveSoon({
  arrivalTime,
  remainingStops,
}: Pick<Bus, "arrivalTime" | "remainingStops">) {
  return arrivalTime <= 60 && remainingStops === 0;
}

export function sortBusesByName(buses: Bus[]): Bus[] {
  return [...buses].sort((a, b) => {
    // 숫자 부분과 문자 부분을 분리해서 정렬
    const getBusNameParts = (name: string) => {
      const match = name.match(/^(\d+)(.*)$/);
      if (match) {
        return {
          number: parseInt(match[1], 10),
          suffix: match[2] || "",
        };
      }
      return { number: 0, suffix: name };
    };

    const aParts = getBusNameParts(a.name);
    const bParts = getBusNameParts(b.name);

    // 숫자 부분으로 먼저 정렬
    if (aParts.number !== bParts.number) {
      return aParts.number - bParts.number;
    }

    // 숫자가 같으면 문자 부분으로 정렬
    return aParts.suffix.localeCompare(bParts.suffix);
  });
}
