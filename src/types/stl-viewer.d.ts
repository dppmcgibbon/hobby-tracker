// Type definition for stl-viewer library
declare module "stl-viewer" {
  import { ComponentType } from "react";

  interface STLViewerProps {
    url: string;
    width?: number | string;
    height?: number | string;
    modelColor?: string;
    backgroundColor?: string;
    rotate?: boolean;
    orbitControls?: boolean;
    lights?: Array<Record<string, unknown>>;
    lightColor?: string;
    rotationSpeeds?: [number, number, number];
    cameraX?: number;
    cameraY?: number;
    cameraZ?: number;
    onSceneRendered?: () => void;
    onFinishLoading?: () => void;
  }

  const STLViewer: ComponentType<STLViewerProps>;
  export default STLViewer;
}
