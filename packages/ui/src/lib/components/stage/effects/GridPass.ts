import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export enum GridType {
  Square = 0,
  Hex = 1
}

export interface GridProps {
  /**
   * The type of grid. 0 for square, 1 for hex
   */
  type: GridType;

  /**
   * The opacity of the grid lines (0 to 1)
   */
  opacity: number;

  /**
   * The grid spacing
   */
  spacing: number;

  /**
   * Offset of the grid origin
   */
  offset: THREE.Vector2;

  /**
   * Line thickness
   */
  lineThickness: number;

  /**
   * Line color
   */
  lineColor: string;
}

export class GridPass extends ShaderPass {
  constructor(props: GridProps, screenSize: THREE.Vector2) {
    // Screen-space grid shader (custom)
    const customShader = {
      uniforms: {
        tDiffuse: { value: null }, // Screen texture, automatically populated by EffectComposer
        opacity: { value: props.opacity },
        spacing: { value: props.spacing },
        lineThickness: { value: props.lineThickness },
        lineColor: { value: new THREE.Color(props.lineColor) },
        offset: { value: props.offset },
        screenSize: { value: screenSize },
        gridType: { value: props.type }
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
      fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      uniform float opacity;
      uniform float spacing;
      uniform vec2 screenSize;
      uniform vec2 offset;
      uniform float lineThickness;
      uniform vec3 lineColor;
      uniform int gridType; // 0 for square, 1 for hex
        
      #define PI 3.141592653589793
      
      // Helper vector. If you're doing anything that involves regular triangles or hexagons, the
      // 30-60-90 triangle will be involved in some way, which has sides of 1, sqrt(3) and 2.
      const vec2 s = vec2(1, 1.7320508);

      // Hex functions taken from this example: https://codepen.io/shubniggurath/pen/QmKpRR
      float hex(in vec2 p) {
        p = abs(p);
        return max(dot(p, s * 0.5), p.x); // Hexagon.
      }

      vec4 getHex(vec2 p) {
        vec4 hC = floor(vec4(p, p - vec2(0.5, 1)) / s.xyxy) + 0.5;
        vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
        return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hC.xy) : vec4(h.zw, hC.zw + vec2(0.5, 1));
      }
        
      void main() {
        // Sample the scene texture
        vec4 sceneColor = texture2D(tDiffuse, mod(vUv + 1.0, 2.0) - 1.0);

        // Convert UV screen-space coordinates to screen pixel
        vec2 p = vUv * screenSize + offset;

        vec3 finalColor;
        if (gridType == 0) {
          // Square grid
          float lineX = smoothstep(-lineThickness, lineThickness, spacing * (1.0 + sin(p.x / spacing)));
          float lineY = smoothstep(-lineThickness, lineThickness, spacing * (1.0 + sin(p.y / spacing)));
          float gridFactor = lineX * lineY;
          finalColor = mix(lineColor, sceneColor.rgb, gridFactor);
         } else {
          // Hex grid
          vec4 hex_uv = getHex(p / spacing / 10.0);
          float hexValue = hex(hex_uv.xy);
          float gridFactor = smoothstep(0.5 - lineThickness / 10.0, 0.5 + lineThickness / 10.0, hexValue);
          finalColor = mix(sceneColor.rgb, lineColor, gridFactor);
        }

        // Modulate by opacity of the grid lines
        finalColor = mix(sceneColor.rgb, finalColor, opacity);

        gl_FragColor = vec4(finalColor, sceneColor.a);
      }`
    };

    super(customShader);
  }

  update(props: GridProps) {
    console.log(props);
    this.uniforms['gridType'].value = props.type;
    this.uniforms['opacity'].value = props.opacity;
    this.uniforms['spacing'].value = props.spacing;
    this.uniforms['offset'].value = props.offset;
    this.uniforms['lineThickness'].value = props.lineThickness;
    this.uniforms['lineColor'].value = new THREE.Color(props.lineColor);
  }
}
