precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D texture;
uniform sampler2D textureFloor;
uniform float shadowScale;
uniform float alpha;

void main(void) {
	vec2 uv = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);
	uv.y *= (1.0 + shadowScale);
    gl_FragColor = texture2D(texture, uv);
    gl_FragColor.rgb = vec3(0.0);
    gl_FragColor.a *= alpha;


    vec4 colorFloor = texture2D(textureFloor, vTextureCoord);
    gl_FragColor *= colorFloor;
}