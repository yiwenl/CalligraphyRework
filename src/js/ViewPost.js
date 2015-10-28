// ViewPost.js

var GL = bongiovi.GL;
var gl;
var glslify = require("glslify");

function ViewPost() {
	bongiovi.View.call(this, null, glslify("../shaders/post.frag"));
}

var p = ViewPost.prototype = new bongiovi.View();
p.constructor = ViewPost;


p._init = function() {
	gl = GL.gl;
	var positions = [];
	var coords = [];
	var indices = [0, 1, 2, 0, 2, 3]; 
	console.log(GL.width, GL.height);

	positions.push([0, 0, 0]);
	positions.push([GL.width, 0, 0]);
	positions.push([GL.width, GL.height, 0]);
	positions.push([0, GL.height, 0]);

	coords.push([0, 0]);
	coords.push([1, 0]);
	coords.push([1, 1]);
	coords.push([0, 1]);

	this.mesh = new bongiovi.Mesh(positions.length, indices.length, GL.gl.TRIANGLES);
	this.mesh.bufferVertex(positions);
	this.mesh.bufferTexCoords(coords);
	this.mesh.bufferIndices(indices);
};

p.render = function(texture, textureNormal) {
	this.shader.bind();
	this.shader.uniform("texture", "uniform1i", 0);
	this.shader.uniform("textureNormal", "uniform1i", 1);
	texture.bind(0);
	textureNormal.bind(1);
	GL.draw(this.mesh);
};

module.exports = ViewPost;
