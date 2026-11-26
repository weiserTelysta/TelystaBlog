export const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float seed;
uniform int scene;
uniform int centered;
mat2 rotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, s, -s, c);
}
vec3 julia(vec2 p) {
  vec2 z = rotate(-0.29 + sin(time * 0.34) * 0.19) * p * 1.49;
  vec2 c = vec2(-0.778 + 0.02 * seed, 0.136 - 0.04 * seed);
  float escape = 0.0;
  vec2 derivative = vec2(1.0, 0.0);
  float orbit = 2.0;
  for (int step = 0; step < 82; ++step) {
    derivative = 2.0 * vec2(derivative.x * z.x - derivative.y * z.y, derivative.x * z.y + derivative.y * z.x);
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    orbit = min(orbit, abs(length(z) - 0.72));
    if (dot(z, z) > 16.0) {
      escape = float(step) + 1.0 - log2(log2(length(z)));
      break;
    }
  }
  float body = (1.0 - exp(-escape * 0.08)) * (0.22 + 0.78 * exp(-orbit * 19.0));
  float rim = exp(-orbit * 40.0) * 0.32;
  float radius = length(z);
  float distance = radius * log(max(radius, 1.0)) / max(length(derivative), 1.0);
  body *= smoothstep(0.0, 6.0 / resolution.y, distance);
  vec3 color = mix(vec3(0.40, 0.30, 0.47), vec3(0.25, 0.46, 0.49), clamp(escape / 48.0, 0.0, 1.0));
  return color * (body + rim) * 0.8;
}
vec2 foldedField(vec3 p) {
  float scale = 1.0;
  float orbit = 1.0;
  for (int level = 0; level < 5; ++level) {
    p = 2.0 * clamp(p, -1.0, 1.0) - p;
    float inversion = max(1.42 / max(dot(p, p), 0.035), 1.0);
    p *= inversion;
    scale *= inversion;
    orbit = min(orbit, abs(length(p.xy) - 0.8));
  }
  return vec2((length(p) - 0.92) / scale, orbit);
}
vec3 apollonian(vec2 p) {
  float angle = 0.26 * sin(time * 0.37) + seed * 1.2;
  vec3 origin = vec3(0.5 + seed * 0.45, 1.0, -2.82);
  vec3 ray = normalize(vec3(p * 1.16, 1.55));
  origin.xz = rotate(angle) * origin.xz;
  ray.xz = rotate(angle) * ray.xz;
  float traveled = 0.0;
  vec3 light = vec3(0.0);
  for (int step = 0; step < 54; ++step) {
    vec2 samplePoint = foldedField(origin + traveled * ray);
    float distance = abs(samplePoint.x);
    float glow = exp(-distance * 180.0) * (0.20 + 0.80 * exp(-samplePoint.y * 7.0));
    vec3 color = mix(vec3(0.54, 0.37, 0.55), vec3(0.25, 0.39, 0.54), smoothstep(0.0, 3.0, traveled));
    light += color * glow * exp(-0.17 * traveled) * 0.055;
    traveled += clamp(distance * 0.83, 0.010, 0.38);
    if (traveled > 5.5) break;
  }
  return light;
}
void main() {
  vec2 screen = gl_FragCoord.xy / resolution;
  float aspect = resolution.x / resolution.y;
  vec2 center = centered != 0
    ? vec2(0.5, 0.52)
    : (aspect > 1.4 ? vec2(0.78, 0.52) : vec2(0.64, 0.69));
  vec2 p = (screen - center) * vec2(aspect, 1.0) * 2.0;
  float envelope = exp(-0.39 * dot(p, p));
  vec3 color = scene == 0 ? apollonian(p) : julia(p);
  // Fade in place against the existing page background and preserve the avatar's contrast.
  float clearCenter = centered != 0 ? 1.0 : mix(0.14, 1.0, smoothstep(0.09, 0.46, length((screen - vec2(0.5, 0.47)) * vec2(aspect, 1.0))));
  vec3 light = min(color * 1.72, vec3(1.0));
  float energy = max(light.r, max(light.g, light.b));
  float alpha = energy * envelope * clearCenter * (centered != 0 ? 1.0 : smoothstep(0.02, 0.23, screen.y));
  gl_FragColor = vec4(light / max(energy, 0.0001), alpha);
}
`;
