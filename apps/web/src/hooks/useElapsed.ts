import { useEffect, useState } from "react";
import { elapsedSince } from "@/lib/format";

/** Live hh:mm:ss tick from a server start ISO timestamp. */
export function useElapsed(startIso: string | null | undefined): string {
  const [label, setLabel] = useState(() =>
    startIso ? elapsedSince(startIso) : "00:00:00",
  );

  useEffect(() => {
    if (!startIso) {
      setLabel("00:00:00");
      return;
    }
    setLabel(elapsedSince(startIso));
    const id = window.setInterval(() => {
      setLabel(elapsedSince(startIso));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startIso]);

  return label;
}
