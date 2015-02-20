precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler0;
uniform float midPoint;
uniform float depthContrast;

const float zNear = 5.0;
const float zFar = 3000.0;


float getDepth(float z) {
	float n = 5.0;
	float f = 1000.0;
	return (2.0 * n) / (f + n - z*(f-n));
	// return (2.0 * zNear) / (zFar + zNear - z*(zFar-zNear));
}


float contrast(float value, float scale, float center) {	return center + (value - center) * scale;	}
float map(float value, float sx, float sy, float tx, float ty) {
	float p = (value - sx) / (sy - sx);
	return tx + ( ty - tx ) * p;
}

void main(void) {
	vec4 color = texture2D(uSampler0, vTextureCoord);
	float grey = getDepth(color.r);
	// float grey = color.r;
	// grey = contrast(grey, midPoint, depthContrast);
	grey = map(color.r, midPoint, 1.0, 0.0, 1.0);
	grey = contrast(grey, depthContrast, .5);
    gl_FragColor = vec4( vec3(1.0-grey), 1.0);
}