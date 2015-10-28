precision highp float;
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec2 vTextureCoord;

void main(void) {
	vec3 pos = aVertexPosition;
	// pos.y = -200.0;
    gl_Position = uPMatrix * uMVMatrix * vec4(pos, 1.0);
    vTextureCoord = aTextureCoord;
}