import { Mic } from "lucide-react";

import s from "./style.module.scss";

interface VoiceModeIndicatorProps {
  isActive: boolean;
}

export default function VoiceModeIndicator({
  isActive,
}: VoiceModeIndicatorProps) {
  if (!isActive) return null;

  return (
    <div className={s.voice_mode_indicator}>
      <div className={s.icon_container}>
        <Mic className={s.mic_icon} />
      </div>
      <div className={s.text_container}>
        <span className={s.title}>음성 모드</span>
        <span className={s.instructions}>
          [+][-] 버스 선택 | [Enter] 호출 | [0] 종료
        </span>
      </div>
    </div>
  );
}
