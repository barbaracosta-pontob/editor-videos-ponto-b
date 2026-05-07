"use client";

/**
 * Preview do reel usando @remotion/player.
 * Carregado com dynamic + ssr:false pois o Remotion usa APIs de browser.
 *
 * Recebe as props do reel e um `initialFrame` para sincronizar com a cena
 * selecionada no editor.
 */

import { Player, PlayerRef } from "@remotion/player";
import { useEffect, useRef } from "react";
import type { ReelProps } from "@pontob/schema";
import { ReelForPlayer } from "./ReelComposition";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

interface ReelPlayerProps {
  props: ReelProps;
  initialFrame?: number; // frame para pular quando a cena muda
}

export function ReelPlayer({ props, initialFrame = 0 }: ReelPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const totalFrames = Math.max(
    1,
    Math.round(props.cenas.reduce((acc, c) => acc + c.duracao_segundos, 0) * FPS)
  );

  // Quando initialFrame muda (usuário clica numa cena), pula o playhead
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.seekTo(initialFrame);
    }
  }, [initialFrame]);

  return (
    <Player
      ref={playerRef}
      component={ReelForPlayer}
      inputProps={props}
      durationInFrames={totalFrames}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      fps={FPS}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 8,
        overflow: "hidden",
      }}
      controls
      loop
      clickToPlay
      acknowledgeRemotionLicense
      errorFallback={({ error }) => (
        <div style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#0c0c0c", color: "#888", fontSize: 13, padding: 16,
          textAlign: "center",
        }}>
          Erro no player: {error.message}
        </div>
      )}
    />
  );
}
