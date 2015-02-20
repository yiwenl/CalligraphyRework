// ViewRoom.js

var GL = bongiovi.GL;
var gl = GL.gl;

function ViewRoom() {
	bongiovi.View.call(this, "assets/shaders/room.vert", "assets/shaders/room.frag");
}

var p = ViewRoom.prototype = new bongiovi.View();
p.constructor = ViewRoom;


p._init = function() {
	console.log("init View Room");

	var size = 500;
	var positions = [];
	var coords = [];
	var indices = [];
	var index = 0;

	//	FRONT
	positions.push([-size, -size,  -size]);
	positions.push([ size, -size,  -size]);
	positions.push([ size,  size,  -size]);
	positions.push([-size,  size,  -size]);

	coords.push([0, 0]);
	coords.push([1, 0]);
	coords.push([1, 1]);
	coords.push([0, 1]);

	indices.push(index * 4 + 0);
	indices.push(index * 4 + 1);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 3);


	//	LEFT
	positions.push([-size, -size,   size]);
	positions.push([-size, -size,  -size]);
	positions.push([-size,  size,  -size]);
	positions.push([-size,  size,   size]);

	coords.push([0, 0]);
	coords.push([1, 0]);
	coords.push([1, 1]);
	coords.push([0, 1]);

	index++;
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 1);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 3);


	//	RIGHT
	positions.push([ size, -size,  -size]);
	positions.push([ size, -size,   size]);
	positions.push([ size,  size,   size]);
	positions.push([ size,  size,  -size]);

	coords.push([0, 0]);
	coords.push([1, 0]);
	coords.push([1, 1]);
	coords.push([0, 1]);

	index++;
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 1);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 3);


	//	BACK
	positions.push([ size, -size,   size]);
	positions.push([-size, -size,   size]);
	positions.push([-size,  size,   size]);
	positions.push([ size,  size,   size]);

	coords.push([0, 0]);
	coords.push([1, 0]);
	coords.push([1, 1]);
	coords.push([0, 1]);

	index++;
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 1);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 3);


	//	TOP
	positions.push([-size,  size,  -size]);
	positions.push([ size,  size,  -size]);
	positions.push([ size,  size,   size]);
	positions.push([-size,  size,   size]);

	coords.push([0, 0]);
	coords.push([1, 0]);
	coords.push([1, 1]);
	coords.push([0, 1]);

	index++;
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 1);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 3);


	//	BOTTOM
	positions.push([-size, -size,   size]);
	positions.push([ size, -size,   size]);
	positions.push([ size, -size,  -size]);
	positions.push([-size, -size,  -size]);

	coords.push([0, 0]);
	coords.push([1, 0]);
	coords.push([1, 1]);
	coords.push([0, 1]);

	index++;
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 1);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 0);
	indices.push(index * 4 + 2);
	indices.push(index * 4 + 3);

	this.mesh = new bongiovi.Mesh(positions.length, indices.length, GL.gl.TRIANGLES);
	this.mesh.bufferVertex(positions);
	this.mesh.bufferTexCoords(coords);
	this.mesh.bufferIndices(indices);
};


p.render = function(texture) {
	if(!this.shader.isReady()) return;

	this.shader.bind();
	this.shader.uniform("texture", "uniform1i", 0);
	texture.bind(0);
	GL.draw(this.mesh);
};


module.exports = ViewRoom;