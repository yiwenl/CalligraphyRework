// ViewShadow.js

var GL = bongiovi.GL;
var gl = GL.gl;

function ViewShadow() {
	bongiovi.View.call(this, "assets/shaders/copy.vert", "assets/shaders/shadow.frag");
}

var p = ViewShadow.prototype = new bongiovi.View();
p.constructor = ViewShadow;


p._init = function() {
	var positions = [];
	var coords = [];
	var indices = [0,1,2,0,2,3];

	var size = 1;
	var offset = -1.2;
	positions.push([-size, -size+offset, 0]);
	positions.push([size, -size+offset, 0]);
	positions.push([size, size+offset, 0]);
	positions.push([-size, size+offset, 0]);

	coords.push([0, 0]);
	coords.push([1, 0]);
	coords.push([1, 1]);
	coords.push([0, 1]);

	this.mesh = new bongiovi.Mesh(4, 6, GL.gl.TRIANGLES);
	this.mesh.bufferVertex(positions);
	this.mesh.bufferTexCoords(coords);
	this.mesh.bufferIndices(indices);
};

p.render = function(texture, textureFloor) {
	if(!this.shader.isReady())return;
	this.shader.bind();
	this.shader.uniform("texture", "uniform1i", 0);
	this.shader.uniform("textureFloor", "uniform1i", 1);
	this.shader.uniform("alpha", "uniform1f", CalligraphyModel.params.shadowAlpha);
	this.shader.uniform("shadowScale", "uniform1f", CalligraphyModel.params.shadowScale);
	texture.bind(0);
	textureFloor.bind(1);
	GL.draw(this.mesh);
};

module.exports = ViewShadow;