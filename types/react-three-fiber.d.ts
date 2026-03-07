import type { ThreeElements } from "@react-three/fiber"

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      mesh: any
      planeGeometry: any
      shaderMaterial: any
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      mesh: any
      planeGeometry: any
      shaderMaterial: any
    }
  }
}

export {}
