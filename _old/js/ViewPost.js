// ViewPost.js

var GL = bongiovi.GL;
var gl = GL.gl;

function ViewPost() {
	bongiovi.View.call(this, "assets/shaders/copy.vert", "assets/shaders/post.frag");
}

var p = ViewPost.prototype = new bongiovi.View();
p.constructor = ViewPost;


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


p.render = function(texture, textureFloor) {
	if(!this.shader.isReady())return;
	this.shader.bind();
	this.shader.uniform("texture", "uniform1i", 0);
	this.shader.uniform("textureFloor", "uniform1i", 1);
	this.shader.uniform("postOffset", "uniform1f", CalligraphyModel.params.postOffset);
	texture.bind(0);
	textureFloor.bind(1);
	GL.draw(this.mesh);
};

module.exports = ViewPost;