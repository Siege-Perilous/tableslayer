uniform sampler2D previousState;
uniform vec2 start;
uniform vec2 end;
uniform float brushSize;
uniform vec2 textureSize;
uniform vec4 brushColor;
uniform bool isClearOperation;
uniform bool isResetOperation;
uniform int shapeType;

varying vec2 vUv;

bool isInsideEllipse(vec2 p, vec2 a, vec2 b) {
    // Find center of ellipse
  vec2 center = (a + b) / 2.0;

    // Find semi-major and semi-minor axes
  vec2 radii = abs(b - a) / 2.0;

    // Translate point to origin
  vec2 p0 = p - center;

    // Check if point is inside ellipse using equation (x/a)^2 + (y/b)^2 <= 1
  return (p0.x * p0.x) / (radii.x * radii.x) + (p0.y * p0.y) / (radii.y * radii.y) <= 1.0;
}

bool isInsideRectangle(vec2 p, vec2 a, vec2 b) {
  vec2 rectMin = vec2(min(a.x, b.x), min(a.y, b.y));
  vec2 rectMax = vec2(max(a.x, b.x), max(a.y, b.y));
  return p.x >= rectMin.x && p.x <= rectMax.x &&
    p.y >= rectMin.y && p.y <= rectMax.y;
}

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

    float brushMask = 0.0;

    if(shapeType == 1) {
      float dist = distanceToLine(pixelPos, start, end);
      brushMask = smoothstep(brushSize + 2.0, brushSize, dist);
    } else if(shapeType == 2) {
      brushMask = isInsideRectangle(pixelPos, start, end) ? 1.0 : 0.0;
    } else if(shapeType == 3) {
      brushMask = isInsideEllipse(pixelPos, start, end) ? 1.0 : 0.0;
    }

    gl_FragColor = mix(prevColor, brushColor, brushMask);
  }
}