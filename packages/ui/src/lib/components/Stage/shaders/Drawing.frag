uniform sampler2D previousState;
uniform vec2 lineStart;
uniform vec2 lineEnd;
uniform float brushSize;
uniform vec2 textureSize;
uniform vec4 brushColor;
uniform bool isClearOperation;
uniform bool isResetOperation;

varying vec2 vUv;

float distanceToLine(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t);
}

void main() {
  // If clearing, output transparent
  if(isClearOperation) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  } else if(isResetOperation) {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  } else {
    vec2 pixelPos = vUv * textureSize;
    vec4 prevColor = texture2D(previousState, vUv);

    float dist = distanceToLine(pixelPos, lineStart, lineEnd);
    float brushMask = smoothstep(brushSize + 2.0, brushSize, dist);

    gl_FragColor = mix(prevColor, brushColor, brushMask);
  }
}