/** True when the browser exposes WebGL. Light check so the 3D code is only downloaded when it can run. */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined" || typeof WebGLRenderingContext === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
