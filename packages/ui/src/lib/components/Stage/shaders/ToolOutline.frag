uniform vec2 uStart;
uniform vec2 uEnd;
uniform float uBrushSize;
uniform vec2 uTextureSize;
uniform int uShapeType;
uniform vec3 uOutlineColor;
uniform float uOutlineThickness;

varying vec2 vUv;

// Re-use the distance functions from Drawing.frag
float isInsideEllipse(vec2 p, vec2 a, vec2 b) {
  vec2 center = (a + b) / 2.0;
  vec2 radii = abs(b - a) / 2.0;
  vec2 p0 = p - center;
  float value = (p0.x * p0.x) / (radii.x * radii.x) + (p0.y * p0.y) / (radii.y * radii.y);
  vec2 scaledP = vec2(p0.x / radii.x, p0.y / radii.y);
  float dist = (length(scaledP) - 1.0) * min(radii.x, radii.y);
  return dist;
}

float distanceToRectangle(vec2 p, vec2 a, vec2 b) {
  vec2 rectMin = vec2(min(a.x, b.x), min(a.y, b.y));
  vec2 rectMax = vec2(max(a.x, b.x), max(a.y, b.y));
  vec2 closest = vec2(clamp(p.x, rectMin.x, rectMax.x), clamp(p.y, rectMin.y, rectMax.y));
  return length(p - closest);
}

float distanceToLine(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t);
}

void main() {
  vec2 pixelPos = vUv * uTextureSize;
  float dist;
  float outlineWidth = uOutlineThickness;

  if(uShapeType == 1) { // Brush
    dist = distanceToLine(pixelPos, uStart, uEnd);
    float inner = smoothstep(uBrushSize - outlineWidth, uBrushSize, dist);
    float outer = smoothstep(uBrushSize, uBrushSize + outlineWidth, dist);
    float outline = inner - outer;
    gl_FragColor = vec4(uOutlineColor, outline);
  } else if(uShapeType == 2) { // Rectangle
    dist = distanceToRectangle(pixelPos, uStart, uEnd);
    float outline = smoothstep(0.0, outlineWidth, dist) - smoothstep(outlineWidth, outlineWidth * 2.0, dist);
    gl_FragColor = vec4(uOutlineColor, outline);
  } else if(uShapeType == 3) { // Ellipse
    dist = isInsideEllipse(pixelPos, uStart, uEnd);
    float outline = smoothstep(0.0, outlineWidth, dist) - smoothstep(outlineWidth, outlineWidth * 2.0, dist);
    gl_FragColor = vec4(uOutlineColor, outline);
  }
}