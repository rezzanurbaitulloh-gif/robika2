export interface ManifestImage {
  url: string;
  width?: number;
  height?: number;
}
export interface ManifestSheet {
  url: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps?: number;
  repeat: number;
}
export interface AssetManifest {
  images: Record<string, ManifestImage>;
  spritesheets: Record<string, ManifestSheet>;
  tiles?: Record<string, Record<string, number>>;
}

export const ASSET_MANIFEST_URL = "/assets/manifest.json";
