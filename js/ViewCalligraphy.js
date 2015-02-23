// ViewCalligraphy.js

var GL = bongiovi.GL;
var gl = GL.gl;
var W  = window.innerWidth;
var H  = window.innerHeight;

var NUM_PARTICLES = 0;
var MIN_DIST      = 30;
var DROP_THRESH   = .85;
var AUDIO_THRESH  = .5;
var PERLIN_SEED   = Math.random() * 9999;

var random = function(min, max) {	return min + Math.random() * ( max - min);	}
var dist = function(p0, p1) {
	var dist = vec3.create();
	vec3.subtract(dist, p0, p1);
	return vec3.length(dist);
}

function ViewCalligraphy(textures, main) {
	
	this.textures = textures;
	this.texture = this.textures[Math.floor(Math.random()*this.textures.length)];
	this.main = main;
	this._isKeyDown = false;
	this._needUpdate = false;
	this.mouse = vec3.create([0, 0, 0]);
	this._particles = [];
	this._points = [];
	this._count = 0;
	this._hasEnded = false;

	bongiovi.View.call(this, "assets/shaders/calligraphy.vert", "assets/shaders/calligraphy.frag");
}


var p = ViewCalligraphy.prototype = new bongiovi.View();
p.constructor = ViewCalligraphy;


p._init = function() {
	var that = this;

	GL.canvas.addEventListener("keydown", function(e){
		if(that._hasEnded) return;
		if ( e.shiftKey ) return;;
		if(e.keyCode==82 && !that._isKeyDown) {
			that._isKeyDown = true;
			that._points = [];
			that._particles = [];
			// that.main.clearDrops();
			that.texture = that.textures[Math.floor(Math.random()*that.textures.length)];
		}
	});


	GL.canvas.addEventListener("mousedown", function(e){
		if(that._hasEnded) return;
		if ( e.shiftKey ) return;;
		if(!that._isKeyDown) {
			that._isKeyDown = true;
			that._points = [];
			that._particles = [];
			// that.main.clearDrops();
			that.texture = that.textures[Math.floor(Math.random()*that.textures.length)];
		}
	});

	GL.canvas.addEventListener("keyup", function(e){
		that._isKeyDown = false;
		if(that._hasEnded) return;
	});


	window.addEventListener("mouseup", function(e){
		if(that._hasEnded) return;
		that._hasEnded = true;
		that._isKeyDown = false;
		that.main.createNewStroke();
	});


	GL.canvas.addEventListener("mousemove", this._onMouseMove.bind(this));
};


p._onMouseMove = function(e) {
	if(this._hasEnded) return;
	if ( e.shiftKey ) return;

	if(this._isKeyDown) {
		var t = new Date().getTime() * .005;
		var z = (Perlin.noise(t, PERLIN_SEED, 0) -.5 ) * 1000;
		var current = vec3.fromValues(e.clientX - W/2, -e.clientY + H/2, z);
		vec3.scale(current, current, .5);
		if(this._points.length == 0) {
			this._points.push(current);
			this._needUpdate = true;
		} else {
			var distance = dist(current, this._points[this._points.length-1]);
			if( distance > MIN_DIST) {
				current.distance = distance;
				this._points.push(current);
				this._needUpdate = true;

				// if(Math.random() > DROP_THRESH) this.main.addDrop(vec3.create(current));
			}
		}
	}
};


p.updateParticles = function(funcParams) {
	var points = this._points;
	this._particles = MathUtils.getBezierPoints(points, points.length*2);

	var dir = vec3.create();
	var z = vec3.fromValues(0, 0, 1);
	var mtxLeft = mat4.create();
	var mtxRight = mat4.create();
	var strokeSize = 30;
	
	mat4.identity(mtxLeft);
	mat4.identity(mtxRight);
	mat4.rotateZ(mtxLeft, mtxLeft, -Math.PI/2);
	mat4.rotateZ(mtxRight, mtxRight, Math.PI/2);
	this._quads = [];
	this._normals = [];

	for (var i = 0; i < this._particles.length; i++) {
		var size = strokeSize + strokeSize * (Perlin.noise(i*.1, 0, 0) - .5);
		var left = vec3.create();
		var right = vec3.create();
		var normal = vec3.create();

		var p = this._particles[i];
		if(i<this._particles.length-1) {
			var pNext = this._particles[i+1];	
			vec3.subtract(dir, pNext, p);
		}

		vec3.normalize(dir, dir);

		vec3.cross(left, dir, z);
		vec3.scale(left, left, size);
		vec3.scale(right, left, -1);

		vec3.cross(normal, left, dir);
		vec3.normalize(normal, normal);

		
		vec3.add(left, left, p);
		vec3.add(right, right, p);

		this._quads.push([left, right, p]);
		this._normals.push(normal);
	};

	this._needUpdate = false;


	var positions = [];
	var coords = [];
	var indices = [];

	var p0, p1, p2, p3;
	var s = 1/(this._quads.length-1);
	var vOffset = 1;
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

		positions.push([ p0[0], p0[1], p0[2] ]);
		positions.push([ p1[0], p1[1], p1[2] ]);
		positions.push([ p2[0], p2[1], p2[2] ]);
		positions.push([ p3[0], p3[1], p3[2] ]);

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

		positions.push([ p0[0], p0[1], p0[2] ]);
		positions.push([ p1[0], p1[1], p1[2] ]);
		positions.push([ p2[0], p2[1], p2[2] ]);
		positions.push([ p3[0], p3[1], p3[2] ]);

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

	this.mesh = new bongiovi.Mesh(positions.length, indices.length, GL.gl.TRIANGLES);
	this.mesh.bufferVertex(positions);
	this.mesh.bufferTexCoords(coords);
	this.mesh.bufferIndices(indices);
};


p.render = function(isBlack) {
	isBlack = isBlack || false;
	if(this._needUpdate) this.updateParticles();
	if(this._particles.length <=0) return;

	if(!this.shader.isReady())return;
	this.shader.bind();
	this.shader.uniform("texture", "uniform1i", 0);
	this.shader.uniform("isBlack", "uniform1f", isBlack ? 1.0 : 0.0);
	this.texture.bind(0);
	GL.draw(this.mesh);
};

p.destroy = function() {
	this._hasEnded = true;
	this._particles = [];
};

module.exports = ViewCalligraphy;