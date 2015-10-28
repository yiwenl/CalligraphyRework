precision mediump float;

uniform sampler2D texture;
uniform sampler2D textureNormal;

const vec3 lightPos = vec3(1.0);


varying vec2 vTextureCoord;

void main(void) {
	vec4 color = texture2D(texture, vTextureCoord);
	vec3 N = texture2D(textureNormal, vTextureCoord).rgb;
	N = (N - .5) * 2.0;
	vec3 L = normalize(lightPos);
	float lambert = dot(N, L) * .5 + .5;
	color.rgb *= mix(lambert, 1.0, .5);

    gl_FragColor = color;
}