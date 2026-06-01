import { Composition } from "remotion";
import { Reel, ReelPropsSchema, defaultReelProps } from "./compositions/Reel";

const FPS = 30;

const FORMATS = [
  { id: "Reel",       width: 1080, height: 1920 }, // 9:16 vertical (Stories/Reels)
  { id: "ReelWide",   width: 1920, height: 1080 }, // 16:9 wide (YouTube)
  { id: "ReelSquare", width: 1080, height: 1080 }, // 1:1 square (Feed)
] as const;

export const Root: React.FC = () => {
  return (
    <>
      {FORMATS.map(({ id, width, height }) => (
        <Composition
          key={id}
          id={id}
          component={Reel}
          durationInFrames={Math.round(defaultReelProps.duracao_total_estimada * FPS)}
          fps={FPS}
          width={width}
          height={height}
          schema={ReelPropsSchema}
          defaultProps={defaultReelProps}
          calculateMetadata={({ props }) => ({
            durationInFrames: Math.round(props.duracao_total_estimada * FPS),
          })}
        />
      ))}
    </>
  );
};
