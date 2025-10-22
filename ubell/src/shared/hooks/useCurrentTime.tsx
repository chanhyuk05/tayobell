import { useEffect, useState } from "react";

export default function useCurrentTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    year: time.getFullYear().toString(),
    month: time.getMonth().toString().padStart(2, "0"),
    day: time.getDate().toString().padStart(2, "0"),
    hour: time.getHours().toString().padStart(2, "0"),
    minute: time.getMinutes().toString().padStart(2, "0"),
    second: time.getSeconds().toString().padStart(2, "0"),
  };
}
