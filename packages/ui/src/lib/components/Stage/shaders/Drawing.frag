uniform sampler2D uPreviousState;
uniform vec2 uStart;
uniform vec2 uEnd;
uniform float uBrushSize;
uniform vec2 uTextureSize;
uniform vec4 uBrushColor;
uniform bool uIsCopyOperation;
uniform bool uIsClearOperation;
uniform bool uIsResetOperation;
uniform int uShapeType;

varying vec2 vUv;

float isInsideEllipse(vec2 p, vec2 a, vec2 b) {
    // Find center of ellipse
  vec2 center = (a + b) / 2.0;

    // Find semi-major and semi-minor axes
  vec2 radii = abs(b - a) / 2.0;

    // Translate point to origin
  vec2 p0 = p - center;

    // Calculate normalized distance from point to ellipse
  float value = (p0.x * p0.x) / (radii.x * radii.x) + (p0.y * p0.y) / (radii.y * radii.y);

    // If inside ellipse, return 0
  if(value <= 1.0) {
    return 0.0;
  }

    // Otherwise return approximate distance to ellipse edge
    // Scale p0 to make the ellipse a circle, find distance to unit circle, then scale back
  vec2 scaledP = vec2(p0.x / radii.x, p0.y / radii.y);
  float dist = (length(scaledP) - 1.0) * min(radii.x, radii.y);
  return dist;
}

float distanceToRectangle(vec2 p, vec2 a, vec2 b) {
  vec2 rectMin = vec2(min(a.x, b.x), min(a.y, b.y));
  vec2 rectMax = vec2(max(a.x, b.x), max(a.y, b.y));

  // Find closest point on rectangle to p
  vec2 closest = vec2(clamp(p.x, rectMin.x, rectMax.x), clamp(p.y, rectMin.y, rectMax.y));

  // Return distance to closest point
  return length(p - closest);
}

float distanceToLine(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t);
}

void main() {
  if(uIsCopyOperation) {
    gl_FragColor = texture2D(uPreviousState, vUv);
  } else if(uIsClearOperation) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  } else if(uIsResetOperation) {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  } else {
    vec2 pixelPos = vUv * uTextureSize;
    vec4 prevColor = texture2D(uPreviousState, vUv);

    float brushMask = 0.0;

    if(uShapeType == 1) {
      float dist = distanceToLine(pixelPos, uStart, uEnd);
      brushMask = step(dist, uBrushSize);
    } else if(uShapeType == 2) {
      float dist = distanceToRectangle(pixelPos, uStart, uEnd);
      brushMask = dist < 1.0 ? 1.0 : 0.0;
    } else if(uShapeType == 3) {
      float dist = isInsideEllipse(pixelPos, uStart, uEnd);
      brushMask = dist < 1.0 ? 1.0 : 0.0;
    }

    gl_FragColor = mix(prevColor, uBrushColor, brushMask);
  }
}
