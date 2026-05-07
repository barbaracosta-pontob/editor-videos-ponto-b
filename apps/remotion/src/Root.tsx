import { Composition } from "remotion";
import { Reel, ReelPropsSchema, defaultReelProps } from "./compositions/Reel";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Reel"
        component={Reel}
        durationInFrames={Math.round(defaultReelProps.duracao_total_estimada * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={ReelPropsSchema}
        defaultProps={defaultReelProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.duracao_total_estimada * FPS),
        })}
      />
    </>
  );
};
