// ViewCalligraphy.js

// ViewCalligraphy.js

var GL = bongiovi.GL;
var gl;
var glm = bongiovi.glm;
var W = 660;
var H = 428;
var glslify = require("glslify");

var MathUtils = require("./MathUtils");

function map(value, sx, sy, tx, ty) {
	var p = (value - sx) / (sy - sx);
	return tx + (ty - tx) * p;
};

function getDist(a, b) {
	return Math.sqrt( (b[0] - a[0])*(b[0] - a[0]) + (b[1] - a[1])*(b[1] - a[1]) + (b[2] - a[2])*(b[2] - a[2]) );
};

function ViewCalligraphy(points, y) {
	this.y = y === undefined ? 0 : y;
	this.textureIndex = Math.floor(Math.random() * 5);
	this._points = this._simplifyPoints(points);
	console.log(this._points);
	this.opacity = new bongiovi.EaseNumber(1);
	this.progress = new bongiovi.EaseNumber(0, .025);

	// bongiovi.View.call(this, glslify("../shaders/calligraphy.vert"), glslify("../shaders/calligraphy.frag"));
	// bongiovi.View.call(this, null, bongiovi.ShaderLibs.get("simpleColorFrag"));
	bongiovi.View.call(this);
}

var p = ViewCalligraphy.prototype = new bongiovi.View();
p.constructor = ViewCalligraphy;


p._simplifyPoints = function(points) {
	var newPoints = [];
	var lastPoint;
	var minDistance = 30;

	for(var i=0; i<points.length; i++) {
		var p = points[i];
		if(lastPoint === undefined) {
			newPoints.push(p);
			lastPoint = p;
		} else {
			var distance = getDist(lastPoint, p);
			// console.log(distance);
			if(distance > minDistance) {
				newPoints.push(p);
				lastPoint = p;
			}
		}
	}

	return newPoints;
};

p.select = function() {
	this.opacity.value = 1;
	this.progress.value = 1;
};


p.unSelect = function() {
	this.opacity.value = 0;	
	this.progress.value = 0;
	// this.progress.setTo(0);
};


p._init = function() {
	gl = GL.gl;
	this._particles = MathUtils.getBezierPoints(this._points, this._points.length*3);

	var dir = glm.vec3.create();
	var z = glm.vec3.fromValues(0, 0, 1);
	var strokeSize = 15;
	
	this._quads = [];
	this._normals = [];

	for (var i = 0; i < this._particles.length; i++) {
		var size = strokeSize + strokeSize * (Perlin.noise(i*.1, 0, 0) - .5);
		var left = glm.vec3.create();
		var right = glm.vec3.create();
		var normal = glm.vec3.create();

		var p = this._particles[i];
		if(i<this._particles.length-1) {
			var pNext = this._particles[i+1];	
			glm.vec3.subtract(dir, pNext, p);
		}

		glm.vec3.normalize(dir, dir);

		glm.vec3.cross(left, dir, z);
		glm.vec3.scale(left, left, size);
		glm.vec3.scale(right, left, -1);

		glm.vec3.cross(normal, left, dir);
		glm.vec3.normalize(normal, normal);

		
		glm.vec3.add(left, left, p);
		glm.vec3.add(right, right, p);

		this._quads.push([left, right, p]);
		this._normals.push(normal);
	};

	var positions = [];
	var coords = [];
	var indices = [];

	var p0, p1, p2, p3;
	var s = 1/(this._quads.length-1);
	var yOffset = 1.5;
	var index = 0;

	for(var i=0; i<this._quads.length-1; i++) {
		var curr = this._quads[i];
		var next = this._quads[i+1];
		var norm0 = this._normals[i];
		var norm1 = this._normals[i+1];

		p0 = curr[2];
		p1 = next[2];
		p2 = next[0];
		p3 = curr[0];

		positions.push([ p0[0], p0[1]*yOffset, p0[2] ]);
		positions.push([ p1[0], p1[1]*yOffset, p1[2] ]);
		positions.push([ p2[0], p2[1]*yOffset, p2[2] ]);
		positions.push([ p3[0], p3[1]*yOffset, p3[2] ]);

		coords.push([s*i, .5]);
		coords.push([s*(i+1), .5]);
		coords.push([s*(i+1), 1]);
		coords.push([s*i, 1]);

		indices.push(index*4 + 0);
		indices.push(index*4 + 1);
		indices.push(index*4 + 2);
		indices.push(index*4 + 0);
		indices.push(index*4 + 2);
		indices.push(index*4 + 3);

		index++;

		p0 = curr[1];
		p1 = next[1];
		p2 = next[2];
		p3 = curr[2];

		positions.push([ p0[0], p0[1]*yOffset, p0[2] ]);
		positions.push([ p1[0], p1[1]*yOffset, p1[2] ]);
		positions.push([ p2[0], p2[1]*yOffset, p2[2] ]);
		positions.push([ p3[0], p3[1]*yOffset, p3[2] ]);

		coords.push([s*i, .0]);
		coords.push([s*(i+1), 0]);
		coords.push([s*(i+1), .5]);
		coords.push([s*i, .5]);

		indices.push(index*4 + 0);
		indices.push(index*4 + 1);
		indices.push(index*4 + 2);
		indices.push(index*4 + 0);
		indices.push(index*4 + 2);
		indices.push(index*4 + 3);

		index++;
	}

	this.positions = positions;
	this.indices = indices;
	this.coords = coords;

	console.log(positions);

	this.mesh = new bongiovi.Mesh(positions.length, indices.length, GL.gl.TRIANGLES);
	this.mesh.bufferVertex(positions);
	this.mesh.bufferTexCoords(coords);
	this.mesh.bufferIndices(indices);
};

p.render = function(texture) {
	this.shader.bind();
	this.shader.uniform("texture", "uniform1i", 0);
	texture.bind(0);
	this.shader.uniform("color", "uniform3fv", [1, 1, 1]);
	this.shader.uniform("opacity", "uniform1f", 1);
	GL.draw(this.mesh);
};

module.exports = ViewCalligraphy;