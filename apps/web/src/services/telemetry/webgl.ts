export interface WebGLInfo {
  /** Three.js r163+ requires WebGL 2. */
  webgl2: boolean;
  vendor: string | null;
  renderer: string | null;
  maxTextureSize: number | null;
  /** Software rasteriser (SwiftShader, llvmpipe…) — GPU effects should be minimal. */
  software: boolean;
  /** Fallback forced with `?webgl=0` (for testing the 2D reactor). */
  forcedOff: boolean;
}

let cached: WebGLInfo | null = null;

const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;

export function getWebGLInfo(): WebGLInfo {
  if (cached) return cached;
  const forcedOff = new URLSearchParams(window.location.search).get('webgl') === '0';
  const info: WebGLInfo = {
    webgl2: false,
    vendor: null,
    renderer: null,
    maxTextureSize: null,
    software: false,
    forcedOff,
  };
  if (!forcedOff) {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
      if (gl) {
        info.webgl2 = true;
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        info.vendor =
          String(gl.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR) ?? '') || null;
        info.renderer =
          String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '') ||
          null;
        info.maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || null;
        info.software = SOFTWARE_RENDERERS.test(info.renderer ?? '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      // Leave as unsupported.
    }
  }
  cached = info;
  return info;
}

/** "ANGLE (Intel, Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2), OpenGL 4.6)" → "Intel Iris Xe Graphics (TGL GT2)" */
export function shortRendererName(renderer: string | null): string {
  if (!renderer) return 'Unknown GPU';
  let name = renderer;
  const angle = /^ANGLE \((.*)\)$/.exec(name);
  if (angle?.[1]) {
    const parts = angle[1].split(', ');
    name = parts[1] ?? parts[0] ?? name;
  }
  return name
    .replace(/\(R\)|\(TM\)|Mesa |Direct3D11.*$|OpenGL.*$|vs_\d_\d.*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
