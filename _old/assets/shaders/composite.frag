precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D texture;
uniform sampler2D textureBlur;
uniform sampler2D textureDepth;
uniform sampler2D textureBg;
uniform float darkInDepth;
uniform float paperOverlay;

#define Blend(base, blend, funcf) 		vec3(funcf(base.r, blend.r), funcf(base.g, blend.g), funcf(base.b, blend.b))
#define BlendOverlayf(base, blend) 	(base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))
#define BlendOverlay(base, blend) 		Blend(base, blend, BlendOverlayf)
#define BlendMultiply(base, blend) 		(base * blend)

void main(void) {
    vec4 color = texture2D(texture, vTextureCoord);
    vec4 colorBlur = texture2D(textureBlur, vTextureCoord);
    vec4 colorDepth = texture2D(textureDepth, vTextureCoord);
    vec4 colorPaper = texture2D(textureBg, vTextureCoord);
    colorPaper = colorPaper*paperOverlay + vec4(1.0 - paperOverlay);
    color *= colorPaper;

    color = mix(color, colorBlur, 1.0 - colorDepth.r);
    color *= colorPaper;
    color.a *= colorBlur.a;
    color.rgb *= ( (1.0 - darkInDepth) + darkInDepth * colorDepth .r );
    gl_FragColor = color;
}