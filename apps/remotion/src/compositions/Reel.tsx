import { AbsoluteFill, Sequence, OffthreadVideo, delayRender, continueRender } from "remotion";
import { useMemo, useEffect, useRef } from "react";

import { ReelPropsSchema, type ReelProps, type Cena } from "@pontob/schema";

import { HookScene } from "../scenes/HookScene";
import { CtaScene } from "../scenes/CtaScene";
import { FraseImpactoScene } from "../scenes/FraseImpactoScene";
import { ComparativoNumericoScene } from "../scenes/ComparativoNumericoScene";
import { VideoCitacaoScene } from "../scenes/VideoCitacaoScene";
import { ListaPontosScene } from "../scenes/ListaPontosScene";
import { MiniCasoScene } from "../scenes/MiniCasoScene";
import { TransicaoTextoScene } from "../scenes/TransicaoTextoScene";
import { ConviteEventoScene } from "../scenes/ConviteEventoScene";
import { GraficoLinhaScene } from "../scenes/GraficoLinhaScene";
import { GraficoBarraScene } from "../scenes/GraficoBarraScene";
import { PlaceholderScene } from "../scenes/PlaceholderScene";
import { colors } from "../theme";

export { ReelPropsSchema, type ReelProps };

const FPS = 30;

const FontLoader: React.FC<{ fonteUrl: string }> = ({ fonteUrl }) => {
  const handleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!fonteUrl) return;
    handleRef.current = delayRender(`loading-font-${fonteUrl}`);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fonteUrl;
    link.onload = () => {
      if (handleRef.current !== null) continueRender(handleRef.current);
    };
    link.onerror = () => {
      if (handleRef.current !== null) continueRender(handleRef.current);
    };
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [fonteUrl]);

  return null;
};

export const Reel: React.FC<ReelProps> = (props) => {
  const sequencias = useMemo(() => {
    let cursor = 0;
    return props.cenas.map((cena, index) => {
      const duracaoFrames = Math.max(1, Math.round(cena.duracao_segundos * FPS));
      const inicioFrames = Math.round(cursor * FPS);
      cursor += cena.duracao_segundos;
      return { cena, inicioFrames, duracaoFrames, index };
    });
  }, [props.cenas]);

  const hookCena = props.cenas.find(
    (c): c is Extract<Cena, { tipo: "Hook" }> => c.tipo === "Hook"
  );
  const videoPath =
    hookCena?.video_path ??
    props.video_original_path ??
    (props.cenas.find((c) => "video_path" in c) as { video_path: string } | undefined)
      ?.video_path;

  const videoStartFrom = Math.round((hookCena?.start_segundos ?? 0) * FPS);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy }}>
      {props.fonte_url ? <FontLoader fonteUrl={props.fonte_url} /> : null}

      {videoPath ? (
        <OffthreadVideo
          src={videoPath}
          startFrom={videoStartFrom}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}

      {videoPath ? (
        <AbsoluteFill style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }} />
      ) : null}

      {sequencias.map(({ cena, inicioFrames, duracaoFrames, index }) => (
        <Sequence
          key={`${cena.tipo}-${index}`}
          from={inicioFrames}
          durationInFrames={duracaoFrames}
          name={`${index + 1}_${cena.tipo}`}
        >
          <SceneRouter
            cena={cena}
            corPrimaria={props.cor_primaria}
            corSecundaria={props.cor_secundaria}
            fonteFamilia={props.fonte_familia}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const SceneRouter: React.FC<{
  cena: Cena;
  corPrimaria?: string;
  corSecundaria?: string;
  fonteFamilia?: string;
}> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const p = { corPrimaria, corSecundaria, fonteFamilia };
  switch (cena.tipo) {
    case "Hook":
      return <HookScene cena={cena} {...p} />;
    case "CTA":
      return <CtaScene cena={cena} {...p} />;
    case "FraseImpacto":
      return <FraseImpactoScene cena={cena} {...p} />;
    case "ComparativoNumerico":
      return <ComparativoNumericoScene cena={cena} corPrimaria={corPrimaria} corSecundaria={corSecundaria} fonteFamilia={fonteFamilia} />;
    case "VideoCitacao":
      return <VideoCitacaoScene cena={cena} corPrimaria={corPrimaria} fonteFamilia={fonteFamilia} />;
    case "ListaPontos":
      return <ListaPontosScene cena={cena} corPrimaria={corPrimaria} fonteFamilia={fonteFamilia} />;
    case "MiniCaso":
      return <MiniCasoScene cena={cena} {...p} />;
    case "TransicaoTexto":
      return <TransicaoTextoScene cena={cena} fonteFamilia={fonteFamilia} />;
    case "ConviteEvento":
      return <ConviteEventoScene cena={cena} corPrimaria={corPrimaria} fonteFamilia={fonteFamilia} />;
    case "GraficoLinha":
      return <GraficoLinhaScene cena={cena} corPrimaria={corPrimaria} corSecundaria={corSecundaria} fonteFamilia={fonteFamilia} />;
    case "GraficoBarra":
      return <GraficoBarraScene cena={cena} corPrimaria={corPrimaria} corSecundaria={corSecundaria} fonteFamilia={fonteFamilia} />;
    default: {
      const _exhaustive: never = cena;
      return <PlaceholderScene tipo={(_exhaustive as Cena).tipo} />;
    }
  }
};

export const defaultReelProps: ReelProps = {
  duracao_total_estimada: 66,
  video_original_path: "jobs/teste01/video.mp4",
  cenas: [
    {
      tipo: "Hook",
      titulo: "VIVER COM 20 MIL POR MES EXIGE 2 MILHOES",
      palavras_destacadas: [
        { palavra: "20 MIL", cor: "primaria" },
        { palavra: "2 MILHOES", cor: "primaria" },
      ],
      video_path: "jobs/teste01/video.mp4",
      start_segundos: 0,
      duracao_segundos: 6,
      animacao_entrada: "spring",
    },
    {
      tipo: "FraseImpacto",
      texto: "A maioria investe certo. Mas no instrumento errado.",
      palavras_destacadas: [{ palavra: "instrumento errado", cor: "primaria" }],
      alinhamento: "centro",
      duracao_segundos: 5,
      fundo: "navy",
    },
    {
      tipo: "GraficoLinha",
      titulo: "Patrimonio acumulado",
      subtitulo: "Juros compostos com aportes mensais",
      unidade: "R$",
      pontos: [
        { rotulo: "Jan", valor: 10000 },
        { rotulo: "Jun", valor: 14200 },
        { rotulo: "Dez", valor: 21000 },
      ],
      mostrar_area: true,
      duracao_segundos: 7,
    },
    {
      tipo: "GraficoBarra",
      titulo: "Rentabilidade anual por estrategia",
      unidade: "%",
      barras: [
        { rotulo: "Poupanca", valor: 6.2, eh_destaque: false },
        { rotulo: "Tesouro", valor: 11.8, eh_destaque: false },
        { rotulo: "Metodo V", valor: 28.3, eh_destaque: true },
      ],
      duracao_segundos: 7,
    },
    {
      tipo: "CTA",
      texto_principal: "Comente MARATONA aqui embaixo",
      texto_secundario: "Vou te enviar a inscricao gratuita",
      duracao_segundos: 6,
      mostrar_seta: true,
      cor_seta: "primaria",
    },
  ],
};
