import { AbsoluteFill } from "remotion";
import { colors, typography, spacing } from "../theme";

/**
 * Placeholder visual usado nas cenas ainda não implementadas (Fase 1 entrega só 01 e 09 reais).
 * Aparece como cartão claramente identificado para que ninguém passe vídeo placeholder pra cliente.
 */
export const PlaceholderScene: React.FC<{ tipo: string }> = ({
  tipo,
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `repeating-linear-gradient(45deg, ${colors.navyDeep} 0px, ${colors.navyDeep} 40px, ${colors.navy} 40px, ${colors.navy} 80px)`,
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${spacing.lg}px`,
      }}
    >
      <div
        style={{
          padding: `${spacing.xl}px ${spacing.lg}px`,
          backgroundColor: "rgba(0,0,0,0.65)",
          border: `4px dashed ${colors.yellow}`,
          borderRadius: 24,
          textAlign: "center",
          maxWidth: 800,
        }}
      >
        <div
          style={{
            fontFamily: typography.fontFamily,
            fontWeight: typography.weightCaption,
            fontSize: typography.sizeCaption,
            color: colors.yellow,
            letterSpacing: typography.trackingWide,
            textTransform: "uppercase",
            marginBottom: spacing.sm,
          }}
        >
          Cena em desenvolvimento
        </div>
        <div
          style={{
            fontFamily: typography.fontFamily,
            fontWeight: typography.weightBody,
            fontSize: typography.sizeBody,
            color: colors.textMuted,
          }}
        >
          tipo: {tipo}
        </div>
      </div>
    </AbsoluteFill>
  );
};
