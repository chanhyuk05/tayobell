import { Sun } from "lucide-react";

import { useCurrentTime } from "@/shared/hooks";

import s from "./style.module.scss";

interface Props {
  stationName: string;
}

export default function Header({ stationName }: Props) {
  const { year, month, day, hour, minute, second } = useCurrentTime();

  return (
    <header className={s.header}>
      <div className={s.left}>
        <h1 className={s.title}>{stationName}</h1>
        <p className={s.subtitle}>BIS 버스 정보 시스템</p>
      </div>
      <div className={s.center}>
        <div className={s.weatherContainer}>
          <Sun />
          <p className={s.weather}>맑음</p>
        </div>
        <p className={s.temperature}>20°C</p>
      </div>
      <div className={s.right}>
        <p className={s.date}>
          {year}년 {month}월 {day}일
        </p>
        <p className={s.time}>
          {hour}시 {minute}분 {second}초
        </p>
      </div>
    </header>
  );
}
