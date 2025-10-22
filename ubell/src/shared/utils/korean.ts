export const convertNumbersToKorean = (text: string) => {
  // 기본 숫자를 한국어로 변환하는 맵
  const numberMap: Record<string, string> = {
    "0": "영",
    "1": "일",
    "2": "이",
    "3": "삼",
    "4": "사",
    "5": "오",
    "6": "육",
    "7": "칠",
    "8": "팔",
    "9": "구",
  };

  // 1 ~ 9999 변환 (천/백/십에서 '일' 생략 규칙 적용)
  const convertNumber = (n: number): string => {
    if (n === 0) return "영";
    if (n < 0 || n > 9999) return String(n); // 범위 밖은 그대로 둠

    let result = "";

    // 천의 자리
    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      result += thousands === 1 ? "천" : numberMap[thousands.toString()] + "천";
      n %= 1000;
    }

    // 백의 자리
    if (n >= 100) {
      const hundreds = Math.floor(n / 100);
      result += hundreds === 1 ? "백" : numberMap[hundreds.toString()] + "백";
      n %= 100;
    }

    // 십의 자리
    if (n >= 10) {
      const tens = Math.floor(n / 10);
      result += tens === 1 ? "십" : numberMap[tens.toString()] + "십";
      n %= 10;
    }

    // 일의 자리
    if (n > 0) {
      result += numberMap[n.toString()];
    }

    return result;
  };

  // 하이픈(-)이 있는 버스 번호: "56-1" -> "오십육다시일번"
  // 하이픈 없는 버스 번호: "10" -> "십번", "146" -> "백사십육번"
  // 이미 "번"이 붙어 있어도 최종적으로 한 번만 붙도록 처리
  const convertBusToken = (raw: string): string => {
    const hasBeon = raw.endsWith("번");
    const core = hasBeon ? raw.slice(0, -1) : raw;

    // 숫자 또는 숫자-숫자 패턴만 처리
    if (!/^\d+(?:-\d+)?$/.test(core)) return raw;

    if (core.includes("-")) {
      const parts = core.split("-").map((p) => convertNumber(parseInt(p, 10)));
      return parts.join("다시") + "번";
    } else {
      return convertNumber(parseInt(core, 10)) + "번";
    }
  };

  return (
    text
      // 1) 버스 번호(하이픈 포함 가능): 숫자 또는 숫자-숫자 뒤에 선택적으로 '번'이 붙는 경우
      //   - 단, '분' 같은 시간 단위와 충돌하지 않도록 별도 처리
      .replace(/\b(\d+(?:-\d+)?)(번)?\b/g, (match) => convertBusToken(match))
      // 2) 시간 '분' 변환: "5분" -> "오분"
      .replace(/(\d+)분/g, (_, num) => `${convertNumber(parseInt(num, 10))}분`)
  );
};
