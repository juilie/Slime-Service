uniform vec2 uMouse;
uniform float uTime;
varying vec2 uv;

void main() {
    vec2 mouseDist = uv - uMouse;
    float dist = length(mouseDist);
    vec3 color = vec3(dist, dist, dist);
    gl_FragColor = vec4(color, 1.0);
}