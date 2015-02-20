precision mediump float;
varying vec2 vTextureCoord;
uniform float isBlack;
uniform sampler2D texture;

void main(void) {
    gl_FragColor = texture2D(texture, vec2(vTextureCoord.s, vTextureCoord.t));
    if(gl_FragColor.a < .1) discard;
    gl_FragColor.rgb -= vec3(isBlack);
}