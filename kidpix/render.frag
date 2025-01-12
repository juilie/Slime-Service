uniform sampler2D uTexture;
varying vec2 uv;

void main() {
    vec4 state = texture2D(uTexture, uv);
    gl_FragColor = vec4(1.,0., 0., 1.0);
}