// ViewBlur.js

var GL = bongiovi.GL;
var gl = GL.gl;

function ViewBlur(pathVert, pathFrag) {
	this.blur = 1;
	this.selfOffset = 0.0;
	bongiovi.View.call(this, pathVert, pathFrag);
}

var p = ViewBlur.prototype = new bongiovi.View();
p.constructor = ViewBlur;

p._init = function() {
	var positions = [];
	var coords = [];
	var indices = [0,1,2,0,2,3];

	var size = 1;
	positions.push([-size, -size, 0]);
	positions.push([size, -size, 0]);
	positions.push([size, size, 0]);
	positions.push([-size, size, 0]);

	coords.push([0, 0]);
	coords.push([1, 0]);
	coords.push([1, 1]);
	coords.push([0, 1]);

	this.mesh = new bongiovi.Mesh(4, 6, GL.gl.TRIANGLES);
	this.mesh.bufferVertex(positions);
	this.mesh.bufferTexCoords(coords);
	this.mesh.bufferIndices(indices);
};

p.render = function(texture) {
	if(!this.shader.isReady())return;
	this.shader.bind();
	this.shader.uniform("blur", "uniform1f", this.blur);
	this.shader.uniform("selfOffset", "uniform1f", this.selfOffset);
	this.shader.uniform("texture", "uniform1i", 0);
	texture.bind(0);
	GL.draw(this.mesh);
};


module.exports = ViewBlur;