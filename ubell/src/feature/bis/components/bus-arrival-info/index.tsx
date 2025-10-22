import { Bus as BusIcon } from "lucide-react";

import { FlexAlign, HStack } from "@/shared/components";
import { Bus } from "@/shared/types";
import { getBusArriveSoon } from "@/shared/utils/bus";

import s from "./style.module.scss";

interface BusArrivalCardProps extends Bus {
  stationId: string;
  selected: boolean;
  fontSize?: number;
  onBusCall?: () => void;
}

export default function BusArrivalCard(props: BusArrivalCardProps) {
  const {
    name,
    arrivalTime,
    remainingStops,
    isCalled,
    routeType,
    selected,
    fontSize = 1.4,
    onBusCall,
  } = props;

  const handleClick = () => {
    if (onBusCall) {
      onBusCall();
    }
  };

  const isArriveSoon = getBusArriveSoon({ arrivalTime, remainingStops });
  const arrivalMinutes = Math.max(0, Math.ceil(arrivalTime / 60));

  return (
    <HStack fullWidth className={s.bus_arrival_card} data-selected={selected}>
      <div className={s.bus_information} data-bus-type={routeType}>
        <BusIcon />
        <p style={{ fontSize: `${fontSize * 1.2}em` }}>{name}</p>
      </div>
      <HStack align={FlexAlign.Center} gap={24}>
        <p
          className={s.bus_arrival_time}
          data-arrive-soon={isArriveSoon}
          style={{ fontSize: `${fontSize * 1.4}em` }}
        >
          {isArriveSoon ? "곧 도착" : `${arrivalMinutes}분`}
        </p>
        {remainingStops > 0 && (
          <p
            className={s.bus_remaining_stops}
            style={{ fontSize: `${fontSize * 1.4}em` }}
          >
            {remainingStops} 정거장 남음
          </p>
        )}
      </HStack>
      <button
        className={`${s.bus_call_button} ${isCalled ? s.bus_call_button_called : ""}`}
        onClick={handleClick}
        style={{ fontSize: `${fontSize * 1.0}em` }}
      >
        {isCalled ? "호출됨" : "호출"}
      </button>
    </HStack>
  );
}
