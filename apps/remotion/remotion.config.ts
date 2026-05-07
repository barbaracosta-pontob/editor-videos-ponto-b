import { Config } from "@remotion/cli/config";
import path from "path";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(1);
Config.setCodec("h264");

// Serve arquivos estáticos (vídeos dos jobs) durante o render
// Vídeos copiados para apps/remotion/public/jobs/<jobId>/ ficam acessíveis
// como URLs relativas: /jobs/<jobId>/video.mp4
Config.setPublicDir(path.join(__dirname, "public"));

// Resolve @pontob/schema diretamente para o arquivo fonte TypeScript.
// __dirname pode ser instável dependendo de como o bundler carrega o config,
// então ancoramos pelo cwd (raiz do monorepo quando rodado via npm workspace).
Config.overrideWebpackConfig((config) => {
  // cwd = apps/remotion quando chamado pelo CLI do Remotion
  const schemaPath = path.resolve(process.cwd(), "../../packages/schema/scenes.ts");
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...((config.resolve?.alias as Record<string, string>) ?? {}),
        "@pontob/schema": schemaPath,
      },
    },
  };
});
