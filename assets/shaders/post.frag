precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D texture;
uniform sampler2D textureFloor;
uniform float postOffset;

void main(void) {
    vec4 color = texture2D(texture, vTextureCoord);
    vec4 colorFloor = texture2D(textureFloor, vTextureCoord);
    colorFloor = mix(colorFloor, vec4(1.0), postOffset);
    gl_FragColor = color * colorFloor;
}