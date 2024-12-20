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
    float brushMask = step(dist, brushSize);

    vec4 brushColorWithAlpha = vec4(brushColor.rgb, brushMask * brushColor.a);

    // Alpha blending
    float finalAlpha = brushColorWithAlpha.a + prevColor.a * (1.0 - brushColorWithAlpha.a);
    vec3 finalColor = (brushColorWithAlpha.rgb * brushColorWithAlpha.a +
      prevColor.rgb * prevColor.a * (1.0 - brushColorWithAlpha.a)) /
      max(finalAlpha, 0.0001);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
}