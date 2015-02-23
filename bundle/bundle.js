(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// app.js

// require("./libs/bongiovi-min.js");
require("./libs/bongiovi-compiled.js");

window.CalligraphyModel = {};

(function() {

	var SceneCalligraphy = require("./SceneCalligraphy.js");


	Main = function() {
		this._loadImages();
	}

	var p = Main.prototype;

	p._loadImages = function() {
		var images = [
						"assets/images/floor.jpg",
						"assets/images/floor1.jpg",
						"assets/images/brushes/brush0.png",
						"assets/images/brushes/brush1.png",
						"assets/images/brushes/brush2.png",
						"assets/images/brushes/brush3.png",
						"assets/images/brushes/brush4.png",
						"assets/images/brushes/brush5.png"
						];

		bongiovi.SimpleImageLoader.load(images, this, this._onImageLoaded, this._onImageProgress);
	};


	p._onImageProgress = function(percent) {
		console.log("Loading Image : ", percent);
	};

	p._onImageLoaded = function(imgs) {
		CalligraphyModel.images = imgs;


		this._init3D();
	};


	p._init3D = function() {
		this.canvas = document.createElement("canvas");
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.canvas.className = "canvas-calligraphy";

		document.body.appendChild(this.canvas);
		bongiovi.GL.init(this.canvas);

		this._scene = new SceneCalligraphy();
		bongiovi.Scheduler.addEF(this, this._loop);

		this._initGui();
	};


	p._initGui = function() {
		var gui = new dat.GUI({width:300});
		CalligraphyModel.params = {
			selfShadow:1.7,
			shadowAlpha:.44,
			shadowScale:2.3,
			blur:1.4,
			postOffset:0.25
		};


		gui.add(CalligraphyModel.params, "selfShadow", 0, 5);
		gui.add(CalligraphyModel.params, "shadowAlpha", 0, 1).step(.01);
		gui.add(CalligraphyModel.params, "shadowScale", 0, 3).step(.01);
		gui.add(CalligraphyModel.params, "blur", 0, 2).step(.01);
		gui.add(CalligraphyModel.params, "postOffset", 0, 1).step(.01);
	};


	p._loop = function() {
		// console.log("Loop");
		this._scene.loop();
	};

})();


new Main();


},{"./SceneCalligraphy.js":2,"./libs/bongiovi-compiled.js":23}],2:[function(require,module,exports){
// GL
var b  = bongiovi;	//	ALIAS
var GL = bongiovi.GL;
var gl = GL.gl;

//	CONSTANTS
var FBO_BLUR_SIZE   = 512;

//	IMPORTS
var FrameBuffer    = bongiovi.FrameBuffer;
var Pass           = bongiovi.Pass;
var EffectComposer = bongiovi.EffectComposer;
var GLTexture      = bongiovi.GLTexture;

//	VIEWS
var ViewRoom        = require("./ViewRoom");
var ViewCalligraphy = require("./ViewCalligraphy");
var ViewBlur        = require("./ViewBlur");
var ViewShadow      = require("./ViewShadow");
var ViewPost 		= require("./ViewPost");

function SceneCalligraphy() {
	GL = bongiovi.GL;
	gl = GL.gl;

	bongiovi.Scene.call(this);

	this.camera.setPerspective(90*Math.PI/180, window.innerWidth/window.innerHeight, 5, 3000);
	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.CULL_FACE);
	this.sceneRotation.lock(true);
}

var p = SceneCalligraphy.prototype = new bongiovi.Scene();
p.constructor = SceneCalligraphy;


p._initTextures = function() {
	this._video = document.body.querySelector(".video-color");
	// console.log(this._video);
	this._textureFloor = new GLTexture(CalligraphyModel.images.floor);
	this._textureFloor1 = new GLTexture(CalligraphyModel.images.floor1);
	this._textureVideo = new GLTexture(this._video);

	var i=0;
	var o = {
		magFilter:gl.NEAREST,
		minFilter:gl.NEAREST
	}
	this.textureBrushes = [];
	while(CalligraphyModel.images["brush"+i] != undefined) {
		var texture = new b.GLTexture(CalligraphyModel.images["brush"+i], false, o);
		this.textureBrushes.push(texture);
		i++;
	}

	this.fboCalligraphy = new FrameBuffer(window.innerWidth, window.innerHeight, o);
	this.fboDepth       = new FrameBuffer(window.innerWidth, window.innerHeight, o);
	this.fboBlur        = new FrameBuffer(window.innerWidth, window.innerHeight, o);
	this.fboDepthBlur   = new FrameBuffer(FBO_BLUR_SIZE, FBO_BLUR_SIZE);

	var that = this;
	window.addEventListener("keydown", function(e) {
		if(e.keyCode == 67) that.clearAllStrokes();
		else if(e.keyCode == 83) that.save();
	})
};


p._initViews = function() {
	console.log('Init Views');
	this._vCopy        = new b.ViewCopy();
	this._vRoom        = new ViewRoom();
	this._vCalligraphy = new ViewCalligraphy(this.textureBrushes, this);
	this._vShadow      = new ViewShadow();
	this._vPost        = new ViewPost();

	this.strokes 		= [];

	this._hBlur			= new ViewBlur("assets/shaders/HBlur.vert", "assets/shaders/blur.frag");
	this._passHBlur 	= new Pass(this._hBlur, FBO_BLUR_SIZE, FBO_BLUR_SIZE);
	this._vBlur			= new ViewBlur("assets/shaders/VBlur.vert", "assets/shaders/blur.frag");
	this._passVBlur 	= new Pass(this._vBlur, FBO_BLUR_SIZE, FBO_BLUR_SIZE);

	this._hBlur1		= new ViewBlur("assets/shaders/HBlur.vert", "assets/shaders/blur.frag");
	this._passHBlur1 	= new Pass(this._hBlur, FBO_BLUR_SIZE, FBO_BLUR_SIZE);
	this._vBlur1		= new ViewBlur("assets/shaders/VBlur.vert", "assets/shaders/blur.frag");
	this._passVBlur1 	= new Pass(this._vBlur, FBO_BLUR_SIZE, FBO_BLUR_SIZE);


	this._hBlur.blur = this._vBlur.blur = 1.2;
	this._hBlur.selfOffset = this._vBlur.selfOffset = 2;

	this._hBlur1.blur = this._vBlur1.blur = 1.0;
	this._hBlur1.selfOffset = this._vBlur1.selfOffset = 1;

	this._composer = new EffectComposer();
	this._composer.addPass(this._passHBlur);
	this._composer.addPass(this._passVBlur);
	this._composer.addPass(this._passHBlur1);
	this._composer.addPass(this._passVBlur1);


	this.btnClear = document.body.querySelector(".clear");
	this.btnClear.addEventListener("click", this.clearAllStrokes.bind(this));

	this.btnSave = document.body.querySelector(".save");
	this.btnSave.addEventListener("click", this.save.bind(this));
};


p.createNewStroke = function() {
	this.strokes.push(this._vCalligraphy);
	this._vCalligraphy = new ViewCalligraphy(this.textureBrushes, this);
	this._vCalligraphy.id = "c" + this.strokes.length;
};

p.clearAllStrokes = function() {
	this._vCalligraphy.destroy();

	this.strokes = [];
	this._vCalligraphy = new ViewCalligraphy(this.textureBrushes, this);	
	this._vCalligraphy.id = "c" + this.strokes.length;
};


p.save = function() {
	this.render();
	var dt = GL.canvas.toDataURL('image/jpeg');
	this.btnSave.href = dt;
};


p.render = function() {
	//	UPDATE VIDEO TEXTURE
	this._textureVideo.updateTexture(this._video);

	this._hBlur.selfOffset = this._vBlur.selfOffset = CalligraphyModel.params.selfShadow;
	this._hBlur.blur = this._vBlur.blur = CalligraphyModel.params.blur;

	gl.disable(gl.DEPTH_TEST);
	GL.setMatrices(this.cameraOtho);
	GL.rotate(this.rotationFront);
	this._vCopy.render(this._textureFloor1);

	gl.enable(gl.DEPTH_TEST);
	GL.setMatrices(this.camera);
	GL.rotate(this.sceneRotation.matrix);

	this.fboBlur.bind();
	GL.clear(0, 0, 0, 0);
	GL.setViewport(0, 0, this.fboBlur.width, this.fboBlur.height);
	for(var i=0; i<this.strokes.length;i++) {
		this.strokes[i].render();
	}
	this._vCalligraphy.render();
	this.fboBlur.unbind();
	
	GL.setMatrices(this.cameraOtho);
	GL.rotate(this.rotationFront);
	this._composer.render( this.fboBlur.getTexture() );

	GL.setViewport(0, 0, window.innerWidth, window.innerHeight);
	gl.disable(gl.DEPTH_TEST);
	this._vShadow.render(this._composer.getTexture(), this._textureFloor1 );
	this._vPost.render(this.fboBlur.getTexture(), this._textureVideo );
};


module.exports = SceneCalligraphy;
},{"./ViewBlur":3,"./ViewCalligraphy":4,"./ViewPost":5,"./ViewRoom":6,"./ViewShadow":7}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
bongiovi = window.bongiovi || {};

(function() {

	var Camera = function() {
		this.matrix = mat4.create();
		mat4.identity(this.matrix);
	};

	var p = Camera.prototype;

	p.lookAt = function(aEye, aCenter, aUp) {
		mat4.identity(this.matrix);
		mat4.lookAt(this.matrix, aEye, aCenter, aUp);
	};

	p.getMatrix = function() {
		return this.matrix;
	};

	bongiovi.Camera = Camera;
	
})();
},{}],9:[function(require,module,exports){
bongiovi = window.bongiovi || {};

(function() {

	var SuperClass = bongiovi.Camera;

	var CameraPerspective = function() {
		SuperClass.call(this);

		this.projection = mat4.create();
		mat4.identity(this.projection);
		this.mtxFinal = mat4.create();
	};

	var p = CameraPerspective.prototype = new SuperClass();
	var s = SuperClass.prototype;

	p.setPerspective = function(aFov, aAspectRatio, aNear, aFar) {
		mat4.perspective(this.projection, aFov, aAspectRatio, aNear, aFar);
	};

	p.getMatrix = function() {
		mat4.multiply(this.mtxFinal, this.projection, this.matrix);
		return this.mtxFinal;
	};

	bongiovi.CameraPerspective = CameraPerspective;

})();
},{}],10:[function(require,module,exports){
// EffectComposer.js

// define(["alfrid/Pass"], function(Pass) {
(function(Pass) {
	var EffectComposer = function() {
		this.texture;
		this._passes = [];
	}

	var p = EffectComposer.prototype = new bongiovi.Pass();
	var s = bongiovi.Pass.prototype;

	p.addPass = function(pass) {
		this._passes.push(pass);
	};

	p.render = function(texture) {
		this.texture = texture;
		for(var i=0; i<this._passes.length; i++) {
			this.texture = this._passes[i].render(this.texture);
		}

		return this.texture;
	};

	p.getTexture = function() {
		return this.texture;	
	};

	bongiovi.EffectComposer = EffectComposer;
	
})();
},{}],11:[function(require,module,exports){
// FrameBuffer.js

// define(["alfrid/GLTool", "alfrid/GLTexture"], function(GLTool, GLTexture) {
(function() {
	var gl;
	var GLTexture = bongiovi.GLTexture;
	var isPowerOfTwo = function(x) {	return !(x == 0) && !(x & (x - 1));	}

	var FrameBuffer = function(width, height, options) {
		gl = bongiovi.GLTool.gl;
		options        = options || {};
		this.width     = width;
		this.height    = height;
		this.magFilter = options.magFilter || gl.LINEAR;
		this.minFilter = options.minFilter || gl.LINEAR_MIPMAP_NEAREST;
		this.wrapS     = options.wrapS || gl.MIRRORED_REPEAT;
		this.wrapT     = options.wrapT || gl.MIRRORED_REPEAT;

		if(!isPowerOfTwo(width) || !isPowerOfTwo(height)) {
			this.wrapS = this.wrapT = gl.CLAMP_TO_EDGE;
			if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST) this.minFilter = gl.LINEAR;
		} 

		this._init();
	}

	var p = FrameBuffer.prototype;

	p._init = function() {
		this.depthTextureExt 	= gl.getExtension("WEBKIT_WEBGL_depth_texture"); // Or browser-appropriate prefix

		this.texture            = gl.createTexture();
		this.depthTexture       = gl.createTexture();
		this.glTexture			= new GLTexture(this.texture, true);
		this.glDepthTexture		= new GLTexture(this.depthTexture, true);
		this.frameBuffer        = gl.createFramebuffer();		
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
		this.frameBuffer.width  = this.width;
		this.frameBuffer.height = this.height;
		var size                = this.width;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		if(this.magFilter == gl.NEAREST && this.minFilter == gl.NEAREST) 
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.frameBuffer.width, this.frameBuffer.height, 0, gl.RGBA, gl.FLOAT, null);
		else
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.frameBuffer.width, this.frameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST)	gl.generateMipmap(gl.TEXTURE_2D);

		gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		if(this.depthTextureExt != null)gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

	    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
	    if(this.depthTextureExt == null) {
	    	console.log( "no depth texture" );
	    	var renderbuffer = gl.createRenderbuffer();
	    	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	    	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.frameBuffer.width, this.frameBuffer.height);
	    	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
	    } else {
	    	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
	    }
	    
	    

	    gl.bindTexture(gl.TEXTURE_2D, null);
	    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};


	p.bind = function() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
	};


	p.unbind = function() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};


	p.getTexture = function() {
		return this.glTexture;
	};


	p.getDepthTexture = function() {
		return this.glDepthTexture;
	};

	bongiovi.FrameBuffer = FrameBuffer;
})();
},{}],12:[function(require,module,exports){

// define(["alfrid/GLTool"], function(GLTool) {
(function() {

	var GLShader = function(aVertexShaderId, aFragmentShaderId) {
		this.gl = bongiovi.GL.gl;
		this.idVertex = aVertexShaderId;
		this.idFragment = aFragmentShaderId;
		this.parameters = [];

		// Can't decice if I would prefer this to be a null here then set to array in the Bind function.
		// Or it's set to an array here then does not change in the bind function.
		this.uniformTextures = [];

		this.vertexShader = undefined;
		this.fragmentShader = undefined;
		this._isReady = false;
		this._loadedCount = 0;

		this.init();
	};

	var p = GLShader.prototype;

	p.init = function() {
		this.getShader(this.idVertex, true);
		this.getShader(this.idFragment, false);
	};

	p.getShader = function(aId, aIsVertexShader) {
		var req = new XMLHttpRequest();
		req.hasCompleted = false;
		var that = this;
		req.onreadystatechange = function(e) {
			// console.log(e.target.readyState);
			if(e.target.readyState == 4) {
				if(aIsVertexShader)
					that.createVertexShaderProgram(e.target.responseText);
				else
					that.createFragmentShaderProgram(e.target.responseText);
			}
		};
		req.open("GET", aId, true);
		req.send(null);
	};

	p.createVertexShaderProgram = function(aStr) {
		var shader = this.gl.createShader(this.gl.VERTEX_SHADER);

		this.gl.shaderSource(shader, aStr);
		this.gl.compileShader(shader);

		if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.warn(this.gl.getShaderInfoLog(shader));
			return null;
		}

		this.vertexShader = shader;
		
		if(this.vertexShader != undefined && this.fragmentShader != undefined)
			this.attachShaderProgram();

		this._loadedCount++;
	};


	p.createFragmentShaderProgram = function(aStr) {
		var shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

		this.gl.shaderSource(shader, aStr);
		this.gl.compileShader(shader);

		if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.warn(this.gl.getShaderInfoLog(shader));
			return null;
		}

		this.fragmentShader = shader;

		if(this.vertexShader != undefined && this.fragmentShader != undefined)
			this.attachShaderProgram();

		this._loadedCount++;
	};

	p.attachShaderProgram = function() {
		this._isReady = true;
		// console.log("Create shader : ", this.idVertex, this.idFragment);
		this.shaderProgram = this.gl.createProgram();
		this.gl.attachShader(this.shaderProgram, this.vertexShader);
		this.gl.attachShader(this.shaderProgram, this.fragmentShader);
		this.gl.linkProgram(this.shaderProgram);
	};

	p.bind = function() {
		if(!this._isReady) return;
		this.gl.useProgram(this.shaderProgram);

		if(this.shaderProgram.pMatrixUniform == undefined) this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
		if(this.shaderProgram.mvMatrixUniform == undefined) this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");

		bongiovi.GLTool.setShader(this);
		bongiovi.GLTool.setShaderProgram(this.shaderProgram);

		this.uniformTextures = [];
	};

	p.isReady = function() {	return this._isReady;	};

	p.uniform = function(aName, aType, aValue) {
		if(!this._isReady) return;

		if(aType == "texture") aType = "uniform1i";

		var hasUniform = false;
		var oUniform;
		for(var i=0; i<this.parameters.length; i++) {
			oUniform = this.parameters[i];
			if(oUniform.name == aName) {
				oUniform.value = aValue;
				hasUniform = true;
				break;
			}
		}

		if(!hasUniform) {
			this.shaderProgram[aName] = this.gl.getUniformLocation(this.shaderProgram, aName);
			this.parameters.push({name : aName, type: aType, value: aValue, uniformLoc: this.shaderProgram[aName]});
		} else {
			this.shaderProgram[aName] = oUniform.uniformLoc;
		}

		if(aType.indexOf("Matrix") == -1) {
			this.gl[aType](this.shaderProgram[aName], aValue);
		} else {
			this.gl[aType](this.shaderProgram[aName], false, aValue);
		}

		if(aType == "uniform1i") {
			// Texture
			this.uniformTextures[aValue] = this.shaderProgram[aName];
		}
	};

	p.unbind = function() {

	};

	bongiovi.GLShader = GLShader;
	
})();
},{}],13:[function(require,module,exports){
// GLTexture.js

(function() {
	var gl, GL;
	var isPowerOfTwo = function(x) {	return !(x == 0) && !(x & (x - 1));	}

	var GLTexture = function(source, isTexture, options) {
		isTexture = isTexture || false;
		options = options || {};
		gl = bongiovi.GL.gl;
		GL = bongiovi.GL;
		if(isTexture) {
			this.texture = source;
		} else {
			this.texture   = gl.createTexture();
			this._isVideo  = (source.tagName == "VIDEO");
			this.magFilter = options.magFilter || gl.LINEAR;
			this.minFilter = options.minFilter || gl.LINEAR_MIPMAP_NEAREST;

			this.wrapS     = options.wrapS || gl.MIRRORED_REPEAT;
			this.wrapT     = options.wrapT || gl.MIRRORED_REPEAT;

			if(source.width) {
				if(!isPowerOfTwo(source.width) || !isPowerOfTwo(source.height)) {
					this.wrapS = this.wrapT = gl.CLAMP_TO_EDGE;
					if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST) this.minFilter = gl.LINEAR;
				} 	
			}

			

			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

			if(!this._isVideo) {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT);
				
				if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST)	gl.generateMipmap(gl.TEXTURE_2D);
				
			} else {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT);

				if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST)	gl.generateMipmap(gl.TEXTURE_2D);
			}

			gl.bindTexture(gl.TEXTURE_2D, null);
		}
	}

	var p = GLTexture.prototype;


	p.updateTexture = function(source) {
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

		if(!this._isVideo) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
			if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST)	gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}

		gl.bindTexture(gl.TEXTURE_2D, null);
	};


	p.bind = function(index, toDebug) {
		if(index == undefined) index = 0;

		gl.activeTexture(gl.TEXTURE0 + index);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(GL.shader.uniformTextures[index], index);
		this._bindIndex = index;
	};


	p.unbind = function() {
		gl.bindTexture(gl.TEXTURE_2D, null);
	};

	bongiovi.GLTexture = GLTexture;
})();
},{}],14:[function(require,module,exports){
bongiovi = window.bongiovi || {};

(function() {

	var instance = null;

	var GLTools = function() {
		this.aspectRatio = window.innerWidth/window.innerHeight;
		this.fieldOfView = 45;
		this.zNear = 5;
		this.zFar = 3000;

		this.canvas = null;
		this.gl = null;
		
		this.W = 0;
		this.H = 0;

		this.shader = null;
		this.shaderProgram = null;
	};

	var p = GLTools.prototype;

	p.init = function(aCanvas) {
		this.canvas = aCanvas;
		this.gl = this.canvas.getContext("experimental-webgl", {antialias:true});
		this.resize();

		var size = this.gl.getParameter(this.gl.SAMPLES);
		var antialias = this.gl.getContextAttributes().antialias;

		this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.CULL_FACE)
		this.gl.enable(this.gl.BLEND);
		this.gl.clearColor( 0, 0, 0, 1 );
		this.gl.clearDepth( 1 );

		this.matrix = mat4.create();
		mat4.identity(this.matrix);
		this.depthTextureExt 	= this.gl.getExtension("WEBKIT_WEBGL_depth_texture"); // Or browser-appropriate prefix
		this.floatTextureExt 	= this.gl.getExtension("OES_texture_float") // Or browser-appropriate prefix

		this.enableAlphaBlending();

		var that = this;
		window.addEventListener("resize", function() {
			that.resize();
		});

	};

	p.getGL = function() {	return this.gl;	};

	p.setShader = function(aShader) {
		this.shader = aShader;
	};
	p.setShaderProgram = function(aShaderProgram) {
		this.shaderProgram = aShaderProgram;
	}

	p.setViewport = function(aX, aY, aW, aH) {
		this.gl.viewport(aX, aY, aW, aH);
	};

	p.setMatrices = function(aCamera) {
		this.camera = aCamera;	
	};

	p.rotate = function(aRotation) {
		mat4.copy(this.matrix, aRotation);
	};

	p.render = function() {
		if(this.shaderProgram == null) return;
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
	};

	p.enableAlphaBlending = function() {
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);	
	};

	p.enableAdditiveBlending = function() {
		this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
	};

	p.clear = function(r, g, b, a) {
		this.gl.clearColor( r, g, b, a );
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	}

	p.draw = function(aMesh) {

		this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.camera.getMatrix() );
		this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.matrix );

		// 	VERTEX POSITIONS
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, aMesh.vBufferPos);
		var vertexPositionAttribute = getAttribLoc(this.gl, this.shaderProgram, "aVertexPosition");
		this.gl.vertexAttribPointer(vertexPositionAttribute, aMesh.vBufferPos.itemSize, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(vertexPositionAttribute);

		//	TEXTURE COORDS
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, aMesh.vBufferUV);
		var textureCoordAttribute = getAttribLoc(this.gl, this.shaderProgram, "aTextureCoord");
		this.gl.vertexAttribPointer(textureCoordAttribute, aMesh.vBufferUV.itemSize, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(textureCoordAttribute);

		//	INDICES
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, aMesh.iBuffer);

		//	EXTRA ATTRIBUTES
		for(var i=0; i<aMesh.extraAttributes.length; i++) {
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, aMesh.extraAttributes[i].buffer);
			var attrPosition = getAttribLoc(this.gl, this.shaderProgram, aMesh.extraAttributes[i].name);
			this.gl.vertexAttribPointer(attrPosition, aMesh.extraAttributes[i].itemSize, this.gl.FLOAT, false, 0, 0);
			this.gl.enableVertexAttribArray(attrPosition);		
		}

		//	DRAWING
		if(aMesh.drawType == this.gl.POINTS ) {
			this.gl.drawArrays(aMesh.drawType, 0, aMesh.vertexSize);	
		} else {
			this.gl.drawElements(aMesh.drawType, aMesh.iBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);	
		}


		function getAttribLoc(gl, shaderProgram, name) {
			if(shaderProgram.cacheAttribLoc  == undefined) shaderProgram.cacheAttribLoc = {};
			if(shaderProgram.cacheAttribLoc[name] == undefined) {
				shaderProgram.cacheAttribLoc[name] = gl.getAttribLocation(shaderProgram, name);
			}

			return shaderProgram.cacheAttribLoc[name];
		}

	};

	p.resize = function() {
		this.W 	= window.innerWidth;
		this.H  = window.innerHeight;

		this.canvas.width      = this.W;
		this.canvas.height     = this.H;
		this.gl.viewportWidth  = this.W;
		this.gl.viewportHeight = this.H;
		this.gl.viewport(0, 0, this.W, this.H);
		this.aspectRatio       = window.innerWidth/window.innerHeight;

		this.render();
	};

	GLTools.getInstance = function() {
		if(instance == null) {
			instance = new GLTools();
		}
		return instance;
	};


	bongiovi.GL = GLTools.getInstance();
	bongiovi.GLTool = GLTools.getInstance();

})();

},{}],15:[function(require,module,exports){
(function() {

	var Mesh = function(aVertexSize, aIndexSize, aDrawType) {

		this.gl = bongiovi.GLTool.gl;
		this.vertexSize = aVertexSize;
		this.indexSize = aIndexSize;
		this.drawType = aDrawType;
		this.extraAttributes = [];
		
		this.vBufferPos = undefined;
		this._floatArrayVertex = undefined;

		this._init();
	};

	var p = Mesh.prototype;

	p._init = function() {

	};

	p.bufferVertex = function(aArrayVertices) {
		var vertices = [];

		for(var i=0; i<aArrayVertices.length; i++) {
			for(var j=0; j<aArrayVertices[i].length; j++) vertices.push(aArrayVertices[i][j]);
		}

		if(this.vBufferPos == undefined) this.vBufferPos = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vBufferPos);

		if(this._floatArrayVertex == undefined) {
			this._floatArrayVertex = new Float32Array(vertices);
		} else {
			if(aArrayVertices.length != this._floatArrayVertex.length) {
				this._floatArrayVertex = new Float32Array(vertices);
			} else {
				for(var i=0; i<aArrayVertices.length; i++) {
					this._floatArrayVertex[i] = aArrayVertices[i];
				}
			}
		}

		this.gl.bufferData(this.gl.ARRAY_BUFFER, this._floatArrayVertex, this.gl.STATIC_DRAW);
		this.vBufferPos.itemSize = 3;
	};

	p.bufferTexCoords = function(aArrayTexCoords) {
		var coords = [];

		for(var i=0; i<aArrayTexCoords.length; i++) {
			for(var j=0; j<aArrayTexCoords[i].length; j++) coords.push(aArrayTexCoords[i][j]);
		}

		this.vBufferUV = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vBufferUV);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(coords), this.gl.STATIC_DRAW);
		this.vBufferUV.itemSize = 2;
	};

	p.bufferData = function(aData, aName, aItemSize) {
		var index = -1;

		for(var i=0; i<this.extraAttributes.length; i++) {
			if(this.extraAttributes[i].name == aName) {
				this.extraAttributes[i].data = aData;
				index = i;
				break;
			}
		}

		var bufferData = [];
		for(var i=0; i<aData.length; i++) {
			for(var j=0; j<aData[i].length; j++) bufferData.push(aData[i][j]);
		}

		if(index == -1) {
			var buffer = this.gl.createBuffer();
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
			var floatArray = new Float32Array(bufferData);
			this.gl.bufferData(this.gl.ARRAY_BUFFER, floatArray, this.gl.STATIC_DRAW);
			this.extraAttributes.push({name:aName, data:aData, itemSize: aItemSize, buffer:buffer, floatArray:floatArray});
		} else {
			var buffer = this.extraAttributes[index].buffer;
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
			var floatArray = this.extraAttributes[index].floatArray;
			for(var i=0; i<bufferData.length; i++) {
				floatArray[i] = bufferData[i];
			}
			this.gl.bufferData(this.gl.ARRAY_BUFFER, floatArray, this.gl.STATIC_DRAW);
		}

	};

	p.bufferIndices = function(aArrayIndices) {
		this.iBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(aArrayIndices), this.gl.STATIC_DRAW);
		this.iBuffer.itemSize = 1;
		this.iBuffer.numItems = aArrayIndices.length;
	};

	bongiovi.Mesh = Mesh;

})();
},{}],16:[function(require,module,exports){
(function() {
	var gl, GL;

	var Pass = function(params, width, height) {
		gl = bongiovi.GL.gl;
		GL = bongiovi.GL;

		if(params == undefined) return;
		if( (typeof params) == "string") {
			this.view = new bongiovi.ViewCopy("assets/shaders/copy.vert", params);
		} else {
			this.view = params;
		}

		this.width = width == undefined ? 512 : width;
		this.height = height == undefined ? 512 : height;
		this._init();
	}

	var p = Pass.prototype;


	p._init = function() {
		this.fbo = new bongiovi.FrameBuffer(this.width, this.height);
		this.fbo.bind();
		GL.setViewport(0, 0, this.fbo.width, this.fbo.height);
		GL.clear(0, 0, 0, 0);
		this.fbo.unbind();
	};

	p.render = function(texture) {
		// console.log( "Set Viewport : ", this.fbo.width, this.fbo.height );
		GL.setViewport(0, 0, this.fbo.width, this.fbo.height);
		this.fbo.bind();
		GL.clear(0, 0, 0, 0);
		this.view.render(texture);
		this.fbo.unbind();

		return this.fbo.getTexture();
	};


	p.getTexture = function() {
		return this.fbo.getTexture();
	};

	bongiovi.Pass = Pass;
})();

},{}],17:[function(require,module,exports){
(function() {
	var Scene = function() {
		this.gl = bongiovi.GLTool.gl;

		this._init();
	};

	var p = Scene.prototype;

	p._init = function() {
		this.camera = new bongiovi.CameraPerspective();
		this.camera.setPerspective(45, window.innerWidth/window.innerHeight, 5, 3000);

		var eye            = vec3.clone([0, 0, 500]  );
		var center         = vec3.create( );
		var up             = vec3.clone( [0,-1,0] );
		this.camera.lookAt(eye, center, up);
		
		this.sceneRotation = new bongiovi.SceneRotation();
		this.rotationFront = mat4.create();
		mat4.identity(this.rotationFront);
		
		this.cameraOtho    = new bongiovi.Camera();

		// In SuperClass should call following functions.
		this._initTextures();
		this._initViews();
	};

	p._initTextures = function() {
		// console.log("Should be overwritten by SuperClass");
	};

	p._initViews = function() {
		// console.log("Should be overwritten by SuperClass");
	};

	p.loop = function() {
		this.update();
		this.render();
	};

	p.update = function() {
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.sceneRotation.update();
		bongiovi.GLTool.setMatrices(this.camera );
		bongiovi.GLTool.rotate(this.sceneRotation.matrix);
	};

	p.render = function() {

	};

	bongiovi.Scene = Scene;

})();
},{}],18:[function(require,module,exports){
bongiovi = window.bongiovi || {};

(function() {

	var SceneRotation = function(aListenerTarget) {
		if(aListenerTarget == undefined) aListenerTarget = document;

		this._z             = 0;
		this._mouseZ        = 0;
		this._preZ          = 0;
		this._isRotateZ     = 0;
		this.matrix         = mat4.create();
		this.m              = mat4.create();
		this._vZaxis        = vec3.clone([0, 0, 0]);
		this._zAxis         = vec3.clone([0, 0, -1]);
		this.preMouse       = {x:0, y:0};
		this.mouse          = {x:0, y:0};
		this._isMouseDown   = false;
		this._rotation      = quat.clone([0, 0, 1, 0]);
		this.tempRotation   = quat.clone([0, 0, 0, 0]);
		this._rotateZMargin = 0;
		this.diffX          = 0;
		this.diffY          = 0;
		this._currDiffX     = 0;
		this._currDiffY     = 0;
		this._offset        = .004;
		this._easing        = .1;
		this._slerp			= -1;

		var that = this;
		aListenerTarget.addEventListener("mousedown", function(aEvent) { that._onMouseDown(aEvent); });
		aListenerTarget.addEventListener("touchstart", function(aEvent) {	that._onMouseDown(aEvent); });
		aListenerTarget.addEventListener("mouseup", function(aEvent) { that._onMouseUp(aEvent); });
		aListenerTarget.addEventListener("touchend", function(aEvent) { that._onMouseUp(aEvent); });
		aListenerTarget.addEventListener("mousemove", function(aEvent) { that._onMouseMove(aEvent); });
		aListenerTarget.addEventListener("touchmove", function(aEvent) { that._onMouseMove(aEvent); });
		aListenerTarget.addEventListener("mousewheel", function(aEvent) {	that._onMouseWheel(aEvent); });
		aListenerTarget.addEventListener("DOMMouseScroll", function(aEvent) {	that._onMouseWheel(aEvent); });
	};

	var p = SceneRotation.prototype;

	p.getMousePos = function(aEvent) {
		var mouseX, mouseY;

		if(aEvent.changedTouches != undefined) {
			mouseX = aEvent.changedTouches[0].pageX;
			mouseY = aEvent.changedTouches[0].pageY;
		} else {
			mouseX = aEvent.clientX;
			mouseY = aEvent.clientY;
		}
		
		return {x:mouseX, y:mouseY};
	};

	p._onMouseDown = function(aEvent) {
		if ( !aEvent.shiftKey ) {
			this.setCameraPos(quat.clone([0, 0, 1, 0]));
			return;
		}

		if(this._isMouseDown) return;

		var mouse = this.getMousePos(aEvent);
		var tempRotation = quat.clone(this._rotation);
		this._updateRotation(tempRotation);
		this._rotation = tempRotation;

		this._isMouseDown = true;
		this._isRotateZ = 0;
		this.preMouse = {x:mouse.x, y:mouse.y};

		if(mouse.y < this._rotateZMargin || mouse.y > (window.innerHeight - this._rotateZMargin) ) this._isRotateZ = 1;
		else if(mouse.x < this._rotateZMargin || mouse.x > (window.innerWidth - this._rotateZMargin) ) this._isRotateZ = 2;	
		
		this._z = this._preZ;

		this._currDiffX = this.diffX = 0;
		this._currDiffY = this.diffY = 0;
	};

	p._onMouseMove = function(aEvent) {
		if ( !aEvent.shiftKey ) return;
		this.mouse = this.getMousePos(aEvent);
	};

	p._onMouseUp = function(aEvent) {
		if ( !aEvent.shiftKey ) return;
		if(!this._isMouseDown) return;
		this._isMouseDown = false;
	};

	p._onMouseWheel = function(aEvent) {
		aEvent.preventDefault();
		var w = aEvent.wheelDelta;
		var d = aEvent.detail;
		var value = 0;
		if (d){
			if (w) value = w/d/40*d>0?1:-1; // Opera
			else value = -d/3;              // Firefox;         TODO: do not /3 for OS X
		} else value = w/120; 

		this._preZ -= value*5;
	};

	p.setCameraPos = function(mQuat) {
		if(this._slerp > 0) return;

		var tempRotation = quat.clone(this._rotation);
		this._updateRotation(tempRotation);
		this._rotation = quat.clone(tempRotation);
		this._currDiffX = this.diffX = 0;
		this._currDiffY = this.diffY = 0;

		this._isMouseDown = false;
		this._isRotateZ = 0;

		this._targetQuat = quat.clone(mQuat);
		this._slerp = 1;
	};


	p.resetQuat = function() {
		this._rotation    = quat.clone([0, 0, 1, 0]);
		this.tempRotation = quat.clone([0, 0, 0, 0]);
		this._targetQuat  = undefined;
		this._slerp       = -1;
	};

	p.update = function() {
		mat4.identity(this.m);

		if(this._targetQuat == undefined) { 
			quat.set(this.tempRotation, this._rotation[0], this._rotation[1], this._rotation[2], this._rotation[3]);
			this._updateRotation(this.tempRotation);
		} else {
			this._slerp += (0 - this._slerp) * .1;

			if(this._slerp < .001) {
				// quat.set(this._targetQuat, this._rotation);
				quat.set(this._rotation, this._targetQuat[0], this._targetQuat[1], this._targetQuat[2], this._targetQuat[3]);
				this._targetQuat = undefined;
				this._slerp = -1;
			} else {
				quat.set(this.tempRotation, 0, 0, 0, 0); 
				quat.slerp(this.tempRotation, this._targetQuat, this._rotation, this._slerp);
			}
		}


		// vec3.set([0, 0, this._z], this._vZaxis[0], this._vZaxis[1], this._vZaxis[2]);
		vec3.set(this._vZaxis, 0, 0, this._z);
		vec3.transformQuat(this._vZaxis, this._vZaxis, this.tempRotation);

		mat4.translate(this.m, this.m, this._vZaxis);

		mat4.fromQuat(this.matrix, this.tempRotation);
		mat4.multiply(this.matrix, this.matrix, this.m);
	};

	var multiplyVec3 = function(out, quat, vec) {
		var x = vec[0], y = vec[1], z = vec[2];
		var qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3];

		// calculate quat * vec
		var ix = qw*x + qy*z - qz*y;
		var iy = qw*y + qz*x - qx*z;
		var iz = qw*z + qx*y - qy*x;
		var iw = -qx*x - qy*y - qz*z;
		
		// calculate result * inverse quat
		out[0] = ix*qw + iw*-qx + iy*-qz - iz*-qy;
		out[1] = iy*qw + iw*-qy + iz*-qx - ix*-qz;
		out[2] = iz*qw + iw*-qz + ix*-qy - iy*-qx;
		
		return out;
	};

	p._updateRotation = function(aTempRotation) {
		if(this._isMouseDown && !this._isLocked) {
			this.diffX = (this.mouse.x - this.preMouse.x) ;
			this.diffY = -(this.mouse.y - this.preMouse.y) ;

			if(this._isInvert) this.diffX = -this.diffX;
			if(this._isInvert) this.diffY = -this.diffY;
		}
		
		this._currDiffX += (this.diffX - this._currDiffX) * this._easing;
		this._currDiffY += (this.diffY - this._currDiffY) * this._easing;

		if(this._isRotateZ > 0) {
			if(this._isRotateZ == 1) {
				var angle = -this._currDiffX * this._offset; 
				angle *= (this.preMouse.y < this._rotateZMargin) ? -1 : 1;
				var _quat = quat.clone( [0, 0, Math.sin(angle), Math.cos(angle) ] );
				quat.multiply(quat, aTempRotation, _quat);
			} else {
				var angle = -this._currDiffY * this._offset; 
				angle *= (this.preMouse.x < this._rotateZMargin) ? 1 : -1;
				var _quat = quat.clone( [0, 0, Math.sin(angle), Math.cos(angle) ] );
				quat.multiply(quat, aTempRotation, _quat);
			}
		} else {
			var v = vec3.clone([this._currDiffX, this._currDiffY, 0]);
			var axis = vec3.create();
			vec3.cross(axis, v, this._zAxis);
			vec3.normalize(axis, axis);
			var angle = vec3.length(v) * this._offset;
			var _quat = quat.clone( [Math.sin(angle) * axis[0], Math.sin(angle) * axis[1], Math.sin(angle) * axis[2], Math.cos(angle) ] );
			quat.multiply(aTempRotation, _quat, aTempRotation);
		}
		
		this._z += (this._preZ - this._z) * this._easing;

	};

	bongiovi.SceneRotation = SceneRotation;
	
})();
},{}],19:[function(require,module,exports){
// Scheduler.js

bongiovi = window.bongiovi || {};

if(window.requestAnimFrame == undefined) {
	window.requestAnimFrame = (function(){
		return  window.requestAnimationFrame       || 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame    || 
		window.oRequestAnimationFrame      || 
		window.msRequestAnimationFrame     || 
		function( callback ){
		window.setTimeout(callback, 1000 / 60);
		};
	})();
}

(function() {
	var Scheduler = function() {
		this.FRAMERATE = 60;
		this._delayTasks = [];
		this._nextTasks = [];
		this._deferTasks = [];
		this._highTasks = [];
		this._usurpTask = [];
		this._enterframeTasks = [];
		this._idTable = 0;

		requestAnimFrame( this._loop.bind(this) );
	}

	var p = Scheduler.prototype;

	p._loop = function() {
		requestAnimFrame( this._loop.bind(this) );
		this._process();
	}


	p._process = function() {
		for ( var i=0; i<this._enterframeTasks.length; i++) {
			var task = this._enterframeTasks[i];
			if(task != null && task != undefined) {
				task.func.apply(task.scope, task.params);
			}
		}
		
		while ( this._highTasks.length > 0) {
			var t = this._highTasks.pop();
			t.func.apply(t.scope, t.params);
		}
		

		var startTime = new Date().getTime();

		for ( var i=0; i<this._delayTasks.length; i++) {
			var t = this._delayTasks[i];
			if(startTime-t.time > t.delay) {
				t.func.apply(t.scope, t.params);
				this._delayTasks.splice(i, 1);
			}
		}

		startTime = new Date().getTime();
		var interval = 1000 / this.FRAMERATE;
		while(this._deferTasks.length > 0) {
			var task = this._deferTasks.shift();
			var current = new Date().getTime();
			if(current - startTime < interval ) {
				task.func.apply(task.scope, task.params);
			} else {
				this._deferTasks.unshift(task);
				break;
			}
		}


		startTime = new Date().getTime();
		var interval = 1000 / this.FRAMERATE;
		while(this._usurpTask.length > 0) {
			var task = this._usurpTask.shift();
			var current = new Date().getTime();
			if(current - startTime < interval ) {
				task.func.apply(task.scope, task.params);
			} else {
				// this._usurpTask.unshift(task);
				break;
			}
		}



		this._highTasks = this._highTasks.concat(this._nextTasks);
		this._nextTasks = [];
		this._usurpTask = [];
	}


	p.addEF = function(scope, func, params) {
		params = params || [];
		var id = this._idTable;
		this._enterframeTasks[id] = {scope:scope, func:func, params:params};
		this._idTable ++;
		return id;
	}


	p.removeEF = function(id) {
		if(this._enterframeTasks[id] != undefined) {
			this._enterframeTasks[id] = null
		}
		return -1;
	}


	p.delay = function(scope, func, params, delay) {
		var time = new Date().getTime();
		var t = {scope:scope, func:func, params:params, delay:delay, time:time};
		this._delayTasks.push(t);
	}


	p.defer = function(scope, func, params) {
		var t = {scope:scope, func:func, params:params};
		this._deferTasks.push(t);
	}


	p.next = function(scope, func, params) {
		var t = {scope:scope, func:func, params:params};
		this._nextTasks.push(t);
	}


	p.usurp = function(scope, func, params) {
		var t = {scope:scope, func:func, params:params};
		this._usurpTask.push(t);
	}

	bongiovi.Scheduler = new Scheduler();
	
})();



},{}],20:[function(require,module,exports){
// SimpleImageLoader.js

bongiovi = window.bongiovi || {};

(function() {
	SimpleImageLoader = function() {
		this._imgs = {};
		this._loadedCount = 0;
		this._toLoadCount = 0;
		this._scope;
		this._callback;
		this._callbackProgress;
	}

	var p = SimpleImageLoader.prototype;


	p.load = function(imgs, scope, callback, progressCallback) {
		this._imgs = {};
		this._loadedCount = 0;
		this._toLoadCount = imgs.length;
		this._scope = scope;
		this._callback = callback;
		this._callbackProgress = progressCallback;

		var that = this;

		for ( var i=0; i<imgs.length ; i++) {
			var img         = new Image();
			img.onload      = function() {	that._onImageLoaded();	}
			var path        = imgs[i];
			var tmp         = path.split("/");
			var ref         = tmp[tmp.length-1].split(".")[0];
			this._imgs[ref] = img;
			img.src         = path;
		}
	};


	p._onImageLoaded = function() {
		this._loadedCount++;

		if(this._loadedCount == this._toLoadCount) {
			this._callback.call(this._scope, this._imgs);
		} else {
			var p = this._loadedCount / this._toLoadCount;
			if(this._callbackProgress) this._callbackProgress.call(this._scope, p);
		}
	};
})();

bongiovi.SimpleImageLoader = new SimpleImageLoader();
},{}],21:[function(require,module,exports){
// define(["alfrid/GLShader"], function(GLShader) {
(function() {

	var View = function(aPathVert, aPathFrag) {
		if(aPathVert == undefined) {
			// console.warn("aPathVert is undefined");
			return;
		}
		
		this.shader = new bongiovi.GLShader(aPathVert, aPathFrag);
		this._init();
	};

	var p = View.prototype;

	p._init = function() {
		console.log("Should be overwritten by SuperClass");
	};

	p.render = function() {
		console.log("Should be overwritten by SuperClass");
	};

	bongiovi.View = View;
	
})();
},{}],22:[function(require,module,exports){
// define(["alfrid/View", "alfrid/GLTool", "alfrid/Mesh"], function(View, GLTool, Mesh) {
(function() {
	var ViewCopy = function(aPathVert, aPathFrag) {
		if(aPathVert == undefined) {
			aPathVert = "assets/shaders/copy.vert";
			aPathFrag = "assets/shaders/copy.frag";
		}
		bongiovi.View.call(this, aPathVert, aPathFrag);
	};

	var p = ViewCopy.prototype = new bongiovi.View();
	var s = bongiovi.View.prototype;

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

		this.mesh = new bongiovi.Mesh(4, 6, bongiovi.GLTool.gl.TRIANGLES);
		this.mesh.bufferVertex(positions);
		this.mesh.bufferTexCoords(coords);
		this.mesh.bufferIndices(indices);
	};

	p.render = function(aTexture) {
		// Were has the reference of this.shader come from?
		if(!this.shader.isReady())return;
		this.shader.bind();
		this.shader.uniform("texture", "uniform1i", 0);
		aTexture.bind(0);
		bongiovi.GLTool.draw(this.mesh);
	};

	bongiovi.ViewCopy = ViewCopy;
	
})();
},{}],23:[function(require,module,exports){
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// app.js

console.log("Library bongiovi V1.0.0");

//	UTILS
var Scheduler         = require("../../js/bongiovi/Scheduler.js");
var SimpleImageLoader = require("../../js/bongiovi/SimpleImageLoader.js");

//	3D
var SimpleImageLoader = require("../../js/bongiovi/GLTool.js");
var SceneRotation     = require("../../js/bongiovi/SceneRotation.js");
var Scene             = require("../../js/bongiovi/Scene.js");
var Camera            = require("../../js/bongiovi/Camera.js");
var CameraPerspective = require("../../js/bongiovi/CameraPerspective.js");
var Mesh              = require("../../js/bongiovi/Mesh.js");
var GLShader          = require("../../js/bongiovi/GLShader.js");
var GLTexture         = require("../../js/bongiovi/GLTexture.js");
var View              = require("../../js/bongiovi/View.js");
var ViewCopy          = require("../../js/bongiovi/ViewCopy.js");
var FrameBuffer       = require("../../js/bongiovi/FrameBuffer.js");
var Pass              = require("../../js/bongiovi/Pass.js");
var EffectComposer    = require("../../js/bongiovi/EffectComposer.js");

},{"../../js/bongiovi/Camera.js":2,"../../js/bongiovi/CameraPerspective.js":3,"../../js/bongiovi/EffectComposer.js":4,"../../js/bongiovi/FrameBuffer.js":5,"../../js/bongiovi/GLShader.js":6,"../../js/bongiovi/GLTexture.js":7,"../../js/bongiovi/GLTool.js":8,"../../js/bongiovi/Mesh.js":9,"../../js/bongiovi/Pass.js":10,"../../js/bongiovi/Scene.js":11,"../../js/bongiovi/SceneRotation.js":12,"../../js/bongiovi/Scheduler.js":13,"../../js/bongiovi/SimpleImageLoader.js":14,"../../js/bongiovi/View.js":15,"../../js/bongiovi/ViewCopy.js":16}],2:[function(require,module,exports){
bongiovi = window.bongiovi || {};

(function() {

	var Camera = function() {
		this.matrix = mat4.create();
		mat4.identity(this.matrix);
	};

	var p = Camera.prototype;

	p.lookAt = function(aEye, aCenter, aUp) {
		mat4.identity(this.matrix);
		mat4.lookAt(this.matrix, aEye, aCenter, aUp);
	};

	p.getMatrix = function() {
		return this.matrix;
	};

	bongiovi.Camera = Camera;
	
})();
},{}],3:[function(require,module,exports){
bongiovi = window.bongiovi || {};

(function() {

	var SuperClass = bongiovi.Camera;

	var CameraPerspective = function() {
		SuperClass.call(this);

		this.projection = mat4.create();
		mat4.identity(this.projection);
		this.mtxFinal = mat4.create();
	};

	var p = CameraPerspective.prototype = new SuperClass();
	var s = SuperClass.prototype;

	p.setPerspective = function(aFov, aAspectRatio, aNear, aFar) {
		mat4.perspective(this.projection, aFov, aAspectRatio, aNear, aFar);
	};

	p.getMatrix = function() {
		mat4.multiply(this.mtxFinal, this.projection, this.matrix);
		return this.mtxFinal;
	};

	bongiovi.CameraPerspective = CameraPerspective;

})();
},{}],4:[function(require,module,exports){
// EffectComposer.js

// define(["alfrid/Pass"], function(Pass) {
(function(Pass) {
	var EffectComposer = function() {
		this.texture;
		this._passes = [];
	}

	var p = EffectComposer.prototype = new bongiovi.Pass();
	var s = bongiovi.Pass.prototype;

	p.addPass = function(pass) {
		this._passes.push(pass);
	};

	p.render = function(texture) {
		this.texture = texture;
		for(var i=0; i<this._passes.length; i++) {
			this.texture = this._passes[i].render(this.texture);
		}

		return this.texture;
	};

	p.getTexture = function() {
		return this.texture;	
	};

	bongiovi.EffectComposer = EffectComposer;
	
})();
},{}],5:[function(require,module,exports){
// FrameBuffer.js

// define(["alfrid/GLTool", "alfrid/GLTexture"], function(GLTool, GLTexture) {
(function() {
	var gl;
	var GLTexture = bongiovi.GLTexture;
	var isPowerOfTwo = function(x) {	return !(x == 0) && !(x & (x - 1));	}

	var FrameBuffer = function(width, height, options) {
		gl = bongiovi.GLTool.gl;
		options        = options || {};
		this.width     = width;
		this.height    = height;
		this.magFilter = options.magFilter || gl.LINEAR;
		this.minFilter = options.minFilter || gl.LINEAR_MIPMAP_NEAREST;
		this.wrapS     = options.wrapS || gl.MIRRORED_REPEAT;
		this.wrapT     = options.wrapT || gl.MIRRORED_REPEAT;

		if(!isPowerOfTwo(width) || !isPowerOfTwo(height)) {
			this.wrapS = this.wrapT = gl.CLAMP_TO_EDGE;
			if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST) this.minFilter = gl.LINEAR;
		} 

		this._init();
	}

	var p = FrameBuffer.prototype;

	p._init = function() {
		this.depthTextureExt 	= gl.getExtension("WEBKIT_WEBGL_depth_texture"); // Or browser-appropriate prefix

		this.texture            = gl.createTexture();
		this.depthTexture       = gl.createTexture();
		this.glTexture			= new GLTexture(this.texture, true);
		this.glDepthTexture		= new GLTexture(this.depthTexture, true);
		this.frameBuffer        = gl.createFramebuffer();		
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
		this.frameBuffer.width  = this.width;
		this.frameBuffer.height = this.height;
		var size                = this.width;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		if(this.magFilter == gl.NEAREST && this.minFilter == gl.NEAREST) 
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.frameBuffer.width, this.frameBuffer.height, 0, gl.RGBA, gl.FLOAT, null);
		else
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.frameBuffer.width, this.frameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST)	gl.generateMipmap(gl.TEXTURE_2D);

		gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		if(this.depthTextureExt != null)gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

	    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
	    if(this.depthTextureExt == null) {
	    	console.log( "no depth texture" );
	    	var renderbuffer = gl.createRenderbuffer();
	    	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	    	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.frameBuffer.width, this.frameBuffer.height);
	    	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
	    } else {
	    	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
	    }
	    
	    

	    gl.bindTexture(gl.TEXTURE_2D, null);
	    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};


	p.bind = function() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
	};


	p.unbind = function() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};


	p.getTexture = function() {
		return this.glTexture;
	};


	p.getDepthTexture = function() {
		return this.glDepthTexture;
	};

	bongiovi.FrameBuffer = FrameBuffer;
})();
},{}],6:[function(require,module,exports){

// define(["alfrid/GLTool"], function(GLTool) {
(function() {

	var GLShader = function(aVertexShaderId, aFragmentShaderId) {
		this.gl = bongiovi.GL.gl;
		this.idVertex = aVertexShaderId;
		this.idFragment = aFragmentShaderId;
		this.parameters = [];

		// Can't decice if I would prefer this to be a null here then set to array in the Bind function.
		// Or it's set to an array here then does not change in the bind function.
		this.uniformTextures = [];

		this.vertexShader = undefined;
		this.fragmentShader = undefined;
		this._isReady = false;
		this._loadedCount = 0;

		this.init();
	};

	var p = GLShader.prototype;

	p.init = function() {
		this.getShader(this.idVertex, true);
		this.getShader(this.idFragment, false);
	};

	p.getShader = function(aId, aIsVertexShader) {
		var req = new XMLHttpRequest();
		req.hasCompleted = false;
		var that = this;
		req.onreadystatechange = function(e) {
			// console.log(e.target.readyState);
			if(e.target.readyState == 4) {
				if(aIsVertexShader)
					that.createVertexShaderProgram(e.target.responseText);
				else
					that.createFragmentShaderProgram(e.target.responseText);
			}
		};
		req.open("GET", aId, true);
		req.send(null);
	};

	p.createVertexShaderProgram = function(aStr) {
		var shader = this.gl.createShader(this.gl.VERTEX_SHADER);

		this.gl.shaderSource(shader, aStr);
		this.gl.compileShader(shader);

		if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.warn(this.gl.getShaderInfoLog(shader));
			return null;
		}

		this.vertexShader = shader;
		
		if(this.vertexShader != undefined && this.fragmentShader != undefined)
			this.attachShaderProgram();

		this._loadedCount++;
	};


	p.createFragmentShaderProgram = function(aStr) {
		var shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

		this.gl.shaderSource(shader, aStr);
		this.gl.compileShader(shader);

		if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.warn(this.gl.getShaderInfoLog(shader));
			return null;
		}

		this.fragmentShader = shader;

		if(this.vertexShader != undefined && this.fragmentShader != undefined)
			this.attachShaderProgram();

		this._loadedCount++;
	};

	p.attachShaderProgram = function() {
		this._isReady = true;
		// console.log("Create shader : ", this.idVertex, this.idFragment);
		this.shaderProgram = this.gl.createProgram();
		this.gl.attachShader(this.shaderProgram, this.vertexShader);
		this.gl.attachShader(this.shaderProgram, this.fragmentShader);
		this.gl.linkProgram(this.shaderProgram);
	};

	p.bind = function() {
		if(!this._isReady) return;
		this.gl.useProgram(this.shaderProgram);

		if(this.shaderProgram.pMatrixUniform == undefined) this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
		if(this.shaderProgram.mvMatrixUniform == undefined) this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");

		bongiovi.GLTool.setShader(this);
		bongiovi.GLTool.setShaderProgram(this.shaderProgram);

		this.uniformTextures = [];
	};

	p.isReady = function() {	return this._isReady;	};

	p.uniform = function(aName, aType, aValue) {
		if(!this._isReady) return;

		if(aType == "texture") aType = "uniform1i";

		var hasUniform = false;
		var oUniform;
		for(var i=0; i<this.parameters.length; i++) {
			oUniform = this.parameters[i];
			if(oUniform.name == aName) {
				oUniform.value = aValue;
				hasUniform = true;
				break;
			}
		}

		if(!hasUniform) {
			this.shaderProgram[aName] = this.gl.getUniformLocation(this.shaderProgram, aName);
			this.parameters.push({name : aName, type: aType, value: aValue, uniformLoc: this.shaderProgram[aName]});
		} else {
			this.shaderProgram[aName] = oUniform.uniformLoc;
		}

		if(aType.indexOf("Matrix") == -1) {
			this.gl[aType](this.shaderProgram[aName], aValue);
		} else {
			this.gl[aType](this.shaderProgram[aName], false, aValue);
		}

		if(aType == "uniform1i") {
			// Texture
			this.uniformTextures[aValue] = this.shaderProgram[aName];
		}
	};

	p.unbind = function() {

	};

	bongiovi.GLShader = GLShader;
	
})();
},{}],7:[function(require,module,exports){
// GLTexture.js

(function() {
	var gl, GL;
	var isPowerOfTwo = function(x) {	return !(x == 0) && !(x & (x - 1));	}

	var GLTexture = function(source, isTexture, options) {
		isTexture = isTexture || false;
		options = options || {};
		gl = bongiovi.GL.gl;
		GL = bongiovi.GL;
		if(isTexture) {
			this.texture = source;
		} else {
			this.texture   = gl.createTexture();
			this._isVideo  = (source.tagName == "VIDEO");
			this.magFilter = options.magFilter || gl.LINEAR;
			this.minFilter = options.minFilter || gl.LINEAR_MIPMAP_NEAREST;

			this.wrapS     = options.wrapS || gl.MIRRORED_REPEAT;
			this.wrapT     = options.wrapT || gl.MIRRORED_REPEAT;

			var width = source.width || source.videoWidth;
			var height = source.height || source.videoHeight;

			if(width) {
				if(!isPowerOfTwo(width) || !isPowerOfTwo(height)) {
					this.wrapS = this.wrapT = gl.CLAMP_TO_EDGE;
					if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST) this.minFilter = gl.LINEAR;
					console.log(this.minFilter, gl.LINEAR_MIPMAP_NEAREST, gl.LINEAR);
				} 	
			} else {
				this.wrapS = this.wrapT = gl.CLAMP_TO_EDGE;
				if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST) this.minFilter = gl.LINEAR;
			}

			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT);
			
			if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST)	gl.generateMipmap(gl.TEXTURE_2D);

			gl.bindTexture(gl.TEXTURE_2D, null);
		}
	}

	var p = GLTexture.prototype;


	p.updateTexture = function(source) {
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
		if(this.minFilter == gl.LINEAR_MIPMAP_NEAREST)	gl.generateMipmap(gl.TEXTURE_2D);

		gl.bindTexture(gl.TEXTURE_2D, null);
	};


	p.bind = function(index, toDebug) {
		if(index == undefined) index = 0;

		gl.activeTexture(gl.TEXTURE0 + index);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(GL.shader.uniformTextures[index], index);
		this._bindIndex = index;
	};


	p.unbind = function() {
		gl.bindTexture(gl.TEXTURE_2D, null);
	};

	bongiovi.GLTexture = GLTexture;
})();
},{}],8:[function(require,module,exports){
bongiovi = window.bongiovi || {};

(function() {

	var instance = null;

	var GLTools = function() {
		this.aspectRatio = window.innerWidth/window.innerHeight;
		this.fieldOfView = 45;
		this.zNear = 5;
		this.zFar = 3000;

		this.canvas = null;
		this.gl = null;
		
		this.W = 0;
		this.H = 0;

		this.shader = null;
		this.shaderProgram = null;
	};

	var p = GLTools.prototype;

	p.init = function(aCanvas) {
		this.canvas = aCanvas;
		this.gl = this.canvas.getContext("experimental-webgl", {antialias:true});
		this.resize();

		var size = this.gl.getParameter(this.gl.SAMPLES);
		var antialias = this.gl.getContextAttributes().antialias;

		this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.CULL_FACE)
		this.gl.enable(this.gl.BLEND);
		this.gl.clearColor( 0, 0, 0, 1 );
		this.gl.clearDepth( 1 );

		this.matrix = mat4.create();
		mat4.identity(this.matrix);
		this.depthTextureExt 	= this.gl.getExtension("WEBKIT_WEBGL_depth_texture"); // Or browser-appropriate prefix
		this.floatTextureExt 	= this.gl.getExtension("OES_texture_float") // Or browser-appropriate prefix

		this.enableAlphaBlending();

		var that = this;
		window.addEventListener("resize", function() {
			that.resize();
		});

	};

	p.getGL = function() {	return this.gl;	};

	p.setShader = function(aShader) {
		this.shader = aShader;
	};
	p.setShaderProgram = function(aShaderProgram) {
		this.shaderProgram = aShaderProgram;
	}

	p.setViewport = function(aX, aY, aW, aH) {
		this.gl.viewport(aX, aY, aW, aH);
	};

	p.setMatrices = function(aCamera) {
		this.camera = aCamera;	
	};

	p.rotate = function(aRotation) {
		mat4.copy(this.matrix, aRotation);
	};

	p.render = function() {
		if(this.shaderProgram == null) return;
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
	};

	p.enableAlphaBlending = function() {
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);	
	};

	p.enableAdditiveBlending = function() {
		this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
	};

	p.clear = function(r, g, b, a) {
		this.gl.clearColor( r, g, b, a );
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	}

	p.draw = function(aMesh) {

		this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.camera.getMatrix() );
		this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.matrix );

		// 	VERTEX POSITIONS
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, aMesh.vBufferPos);
		var vertexPositionAttribute = getAttribLoc(this.gl, this.shaderProgram, "aVertexPosition");
		this.gl.vertexAttribPointer(vertexPositionAttribute, aMesh.vBufferPos.itemSize, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(vertexPositionAttribute);

		//	TEXTURE COORDS
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, aMesh.vBufferUV);
		var textureCoordAttribute = getAttribLoc(this.gl, this.shaderProgram, "aTextureCoord");
		this.gl.vertexAttribPointer(textureCoordAttribute, aMesh.vBufferUV.itemSize, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(textureCoordAttribute);

		//	INDICES
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, aMesh.iBuffer);

		//	EXTRA ATTRIBUTES
		for(var i=0; i<aMesh.extraAttributes.length; i++) {
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, aMesh.extraAttributes[i].buffer);
			var attrPosition = getAttribLoc(this.gl, this.shaderProgram, aMesh.extraAttributes[i].name);
			this.gl.vertexAttribPointer(attrPosition, aMesh.extraAttributes[i].itemSize, this.gl.FLOAT, false, 0, 0);
			this.gl.enableVertexAttribArray(attrPosition);		
		}

		//	DRAWING
		if(aMesh.drawType == this.gl.POINTS ) {
			this.gl.drawArrays(aMesh.drawType, 0, aMesh.vertexSize);	
		} else {
			this.gl.drawElements(aMesh.drawType, aMesh.iBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);	
		}


		function getAttribLoc(gl, shaderProgram, name) {
			if(shaderProgram.cacheAttribLoc  == undefined) shaderProgram.cacheAttribLoc = {};
			if(shaderProgram.cacheAttribLoc[name] == undefined) {
				shaderProgram.cacheAttribLoc[name] = gl.getAttribLocation(shaderProgram, name);
			}

			return shaderProgram.cacheAttribLoc[name];
		}

	};

	p.resize = function() {
		this.W 	= window.innerWidth;
		this.H  = window.innerHeight;

		this.canvas.width      = this.W;
		this.canvas.height     = this.H;
		this.gl.viewportWidth  = this.W;
		this.gl.viewportHeight = this.H;
		this.gl.viewport(0, 0, this.W, this.H);
		this.aspectRatio       = window.innerWidth/window.innerHeight;

		this.render();
	};

	GLTools.getInstance = function() {
		if(instance == null) {
			instance = new GLTools();
		}
		return instance;
	};


	bongiovi.GL = GLTools.getInstance();
	bongiovi.GLTool = GLTools.getInstance();

})();

},{}],9:[function(require,module,exports){
(function() {

	var Mesh = function(aVertexSize, aIndexSize, aDrawType) {

		this.gl = bongiovi.GLTool.gl;
		this.vertexSize = aVertexSize;
		this.indexSize = aIndexSize;
		this.drawType = aDrawType;
		this.extraAttributes = [];
		
		this.vBufferPos = undefined;
		this._floatArrayVertex = undefined;

		this._init();
	};

	var p = Mesh.prototype;

	p._init = function() {

	};

	p.bufferVertex = function(aArrayVertices) {
		var vertices = [];

		for(var i=0; i<aArrayVertices.length; i++) {
			for(var j=0; j<aArrayVertices[i].length; j++) vertices.push(aArrayVertices[i][j]);
		}

		if(this.vBufferPos == undefined) this.vBufferPos = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vBufferPos);

		if(this._floatArrayVertex == undefined) {
			this._floatArrayVertex = new Float32Array(vertices);
		} else {
			if(aArrayVertices.length != this._floatArrayVertex.length) {
				this._floatArrayVertex = new Float32Array(vertices);
			} else {
				for(var i=0; i<aArrayVertices.length; i++) {
					this._floatArrayVertex[i] = aArrayVertices[i];
				}
			}
		}

		this.gl.bufferData(this.gl.ARRAY_BUFFER, this._floatArrayVertex, this.gl.STATIC_DRAW);
		this.vBufferPos.itemSize = 3;
	};

	p.bufferTexCoords = function(aArrayTexCoords) {
		var coords = [];

		for(var i=0; i<aArrayTexCoords.length; i++) {
			for(var j=0; j<aArrayTexCoords[i].length; j++) coords.push(aArrayTexCoords[i][j]);
		}

		this.vBufferUV = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vBufferUV);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(coords), this.gl.STATIC_DRAW);
		this.vBufferUV.itemSize = 2;
	};

	p.bufferData = function(aData, aName, aItemSize) {
		var index = -1;

		for(var i=0; i<this.extraAttributes.length; i++) {
			if(this.extraAttributes[i].name == aName) {
				this.extraAttributes[i].data = aData;
				index = i;
				break;
			}
		}

		var bufferData = [];
		for(var i=0; i<aData.length; i++) {
			for(var j=0; j<aData[i].length; j++) bufferData.push(aData[i][j]);
		}

		if(index == -1) {
			var buffer = this.gl.createBuffer();
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
			var floatArray = new Float32Array(bufferData);
			this.gl.bufferData(this.gl.ARRAY_BUFFER, floatArray, this.gl.STATIC_DRAW);
			this.extraAttributes.push({name:aName, data:aData, itemSize: aItemSize, buffer:buffer, floatArray:floatArray});
		} else {
			var buffer = this.extraAttributes[index].buffer;
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
			var floatArray = this.extraAttributes[index].floatArray;
			for(var i=0; i<bufferData.length; i++) {
				floatArray[i] = bufferData[i];
			}
			this.gl.bufferData(this.gl.ARRAY_BUFFER, floatArray, this.gl.STATIC_DRAW);
		}

	};

	p.bufferIndices = function(aArrayIndices) {
		this.iBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.iBuffer);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(aArrayIndices), this.gl.STATIC_DRAW);
		this.iBuffer.itemSize = 1;
		this.iBuffer.numItems = aArrayIndices.length;
	};

	bongiovi.Mesh = Mesh;

})();
},{}],10:[function(require,module,exports){
(function() {
	var gl, GL;

	var Pass = function(params, width, height) {
		gl = bongiovi.GL.gl;
		GL = bongiovi.GL;

		if(params == undefined) return;
		if( (typeof params) == "string") {
			this.view = new bongiovi.ViewCopy("assets/shaders/copy.vert", params);
		} else {
			this.view = params;
		}

		this.width = width == undefined ? 512 : width;
		this.height = height == undefined ? 512 : height;
		this._init();
	}

	var p = Pass.prototype;


	p._init = function() {
		this.fbo = new bongiovi.FrameBuffer(this.width, this.height);
		this.fbo.bind();
		GL.setViewport(0, 0, this.fbo.width, this.fbo.height);
		GL.clear(0, 0, 0, 0);
		this.fbo.unbind();
	};

	p.render = function(texture) {
		// console.log( "Set Viewport : ", this.fbo.width, this.fbo.height );
		GL.setViewport(0, 0, this.fbo.width, this.fbo.height);
		this.fbo.bind();
		GL.clear(0, 0, 0, 0);
		this.view.render(texture);
		this.fbo.unbind();

		return this.fbo.getTexture();
	};


	p.getTexture = function() {
		return this.fbo.getTexture();
	};

	bongiovi.Pass = Pass;
})();

},{}],11:[function(require,module,exports){
(function() {
	var Scene = function() {
		this.gl = bongiovi.GLTool.gl;

		this._init();
	};

	var p = Scene.prototype;

	p._init = function() {
		this.camera = new bongiovi.CameraPerspective();
		this.camera.setPerspective(45, window.innerWidth/window.innerHeight, 5, 3000);

		var eye            = vec3.clone([0, 0, 500]  );
		var center         = vec3.create( );
		var up             = vec3.clone( [0,-1,0] );
		this.camera.lookAt(eye, center, up);
		
		this.sceneRotation = new bongiovi.SceneRotation();
		this.rotationFront = mat4.create();
		mat4.identity(this.rotationFront);
		
		this.cameraOtho    = new bongiovi.Camera();

		// In SuperClass should call following functions.
		this._initTextures();
		this._initViews();
	};

	p._initTextures = function() {
		// console.log("Should be overwritten by SuperClass");
	};

	p._initViews = function() {
		// console.log("Should be overwritten by SuperClass");
	};

	p.loop = function() {
		this.update();
		this.render();
	};

	p.update = function() {
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.sceneRotation.update();
		bongiovi.GLTool.setMatrices(this.camera );
		bongiovi.GLTool.rotate(this.sceneRotation.matrix);
	};

	p.render = function() {

	};

	bongiovi.Scene = Scene;

})();
},{}],12:[function(require,module,exports){
bongiovi = window.bongiovi || {};

(function() {

	var SceneRotation = function(aListenerTarget) {
		if(aListenerTarget == undefined) aListenerTarget = document;

		this._z             = 0;
		this._mouseZ        = 0;
		this._preZ          = 0;
		this._isRotateZ     = 0;
		this.matrix         = mat4.create();
		this.m              = mat4.create();
		this._vZaxis        = vec3.clone([0, 0, 0]);
		this._zAxis         = vec3.clone([0, 0, -1]);
		this.preMouse       = {x:0, y:0};
		this.mouse          = {x:0, y:0};
		this._isMouseDown   = false;
		this._rotation      = quat.clone([0, 0, 1, 0]);
		this.tempRotation   = quat.clone([0, 0, 0, 0]);
		this._rotateZMargin = 0;
		this.diffX          = 0;
		this.diffY          = 0;
		this._currDiffX     = 0;
		this._currDiffY     = 0;
		this._offset        = .004;
		this._easing        = .1;
		this._slerp			= -1;
		this._isLocked 		= false;

		var that = this;
		aListenerTarget.addEventListener("mousedown", function(aEvent) { that._onMouseDown(aEvent); });
		aListenerTarget.addEventListener("touchstart", function(aEvent) {	that._onMouseDown(aEvent); });
		aListenerTarget.addEventListener("mouseup", function(aEvent) { that._onMouseUp(aEvent); });
		aListenerTarget.addEventListener("touchend", function(aEvent) { that._onMouseUp(aEvent); });
		aListenerTarget.addEventListener("mousemove", function(aEvent) { that._onMouseMove(aEvent); });
		aListenerTarget.addEventListener("touchmove", function(aEvent) { that._onMouseMove(aEvent); });
		aListenerTarget.addEventListener("mousewheel", function(aEvent) {	that._onMouseWheel(aEvent); });
		aListenerTarget.addEventListener("DOMMouseScroll", function(aEvent) {	that._onMouseWheel(aEvent); });
	};

	var p = SceneRotation.prototype;

	p.lock = function(value) {
		this._isLocked = value;
	};

	p.getMousePos = function(aEvent) {
		var mouseX, mouseY;

		if(aEvent.changedTouches != undefined) {
			mouseX = aEvent.changedTouches[0].pageX;
			mouseY = aEvent.changedTouches[0].pageY;
		} else {
			mouseX = aEvent.clientX;
			mouseY = aEvent.clientY;
		}
		
		return {x:mouseX, y:mouseY};
	};

	p._onMouseDown = function(aEvent) {
		if(this._isLocked) return;
		if(this._isMouseDown) return;

		var mouse = this.getMousePos(aEvent);
		var tempRotation = quat.clone(this._rotation);
		this._updateRotation(tempRotation);
		this._rotation = tempRotation;

		this._isMouseDown = true;
		this._isRotateZ = 0;
		this.preMouse = {x:mouse.x, y:mouse.y};

		if(mouse.y < this._rotateZMargin || mouse.y > (window.innerHeight - this._rotateZMargin) ) this._isRotateZ = 1;
		else if(mouse.x < this._rotateZMargin || mouse.x > (window.innerWidth - this._rotateZMargin) ) this._isRotateZ = 2;	
		
		this._z = this._preZ;

		this._currDiffX = this.diffX = 0;
		this._currDiffY = this.diffY = 0;
	};

	p._onMouseMove = function(aEvent) {
		if(this._isLocked) return;
		this.mouse = this.getMousePos(aEvent);
	};

	p._onMouseUp = function(aEvent) {
		if(this._isLocked) return;
		if(!this._isMouseDown) return;
		this._isMouseDown = false;
	};

	p._onMouseWheel = function(aEvent) {
		if(this._isLocked) return;
		aEvent.preventDefault();
		var w = aEvent.wheelDelta;
		var d = aEvent.detail;
		var value = 0;
		if (d){
			if (w) value = w/d/40*d>0?1:-1; // Opera
			else value = -d/3;              // Firefox;         TODO: do not /3 for OS X
		} else value = w/120; 

		this._preZ -= value*5;
	};

	p.setCameraPos = function(quat) {
		console.log( "Set camera pos : ", quat );

		if(this._slerp > 0) return;

		var tempRotation = quat.clone(this._rotation);
		this._updateRotation(tempRotation);
		this._rotation = quat.clone(tempRotation);
		this._currDiffX = this.diffX = 0;
		this._currDiffY = this.diffY = 0;

		this._isMouseDown = false;
		this._isRotateZ = 0;

		this._targetQuat = quat.clone(quat);
		this._slerp = 1;

	};


	p.resetQuat = function() {
		this._rotation    = quat.clone([0, 0, 1, 0]);
		this.tempRotation = quat.clone([0, 0, 0, 0]);
		this._targetQuat  = undefined;
		this._slerp       = -1;
	};

	p.update = function() {
		mat4.identity(this.m);

		if(this._targetQuat == undefined) { 
			quat.set(this.tempRotation, this._rotation[0], this._rotation[1], this._rotation[2], this._rotation[3]);
			this._updateRotation(this.tempRotation);
		} else {
			this._slerp += (0 - this._slerp) * .1;

			if(this._slerp < .001) {
				// quat.set(this._targetQuat, this._rotation);
				quat.set(this._rotation, this._targetQuat[0], this._targetQuat[1], this._targetQuat[2], this._targetQuat[3]);
				this._targetQuat = undefined;
				this._slerp = -1;
			} else {
				quat.set(this.tempRotation, 0, 0, 0, 0);
				quat.slerp(this.tempRotation, this._targetQuat, this._rotation, this._slerp);
			}
		}


		// vec3.set([0, 0, this._z], this._vZaxis[0], this._vZaxis[1], this._vZaxis[2]);
		vec3.set(this._vZaxis, 0, 0, this._z);
		vec3.transformQuat(this._vZaxis, this._vZaxis, this.tempRotation);

		mat4.translate(this.m, this.m, this._vZaxis);
		var toTrace = Math.random() > .95;


		mat4.fromQuat(this.matrix, this.tempRotation);
		mat4.multiply(this.matrix, this.matrix, this.m);
	};

	var multiplyVec3 = function(out, quat, vec) {
		var x = vec[0], y = vec[1], z = vec[2];
		var qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3];

		// calculate quat * vec
		var ix = qw*x + qy*z - qz*y;
		var iy = qw*y + qz*x - qx*z;
		var iz = qw*z + qx*y - qy*x;
		var iw = -qx*x - qy*y - qz*z;
		
		// calculate result * inverse quat
		out[0] = ix*qw + iw*-qx + iy*-qz - iz*-qy;
		out[1] = iy*qw + iw*-qy + iz*-qx - ix*-qz;
		out[2] = iz*qw + iw*-qz + ix*-qy - iy*-qx;
		
		return out;
	};

	p._updateRotation = function(aTempRotation) {
		if(this._isMouseDown && !this._isLocked) {
			this.diffX = (this.mouse.x - this.preMouse.x) ;
			this.diffY = -(this.mouse.y - this.preMouse.y) ;

			if(this._isInvert) this.diffX = -this.diffX;
			if(this._isInvert) this.diffY = -this.diffY;
		}
		
		this._currDiffX += (this.diffX - this._currDiffX) * this._easing;
		this._currDiffY += (this.diffY - this._currDiffY) * this._easing;

		if(this._isRotateZ > 0) {
			if(this._isRotateZ == 1) {
				var angle = -this._currDiffX * this._offset; 
				angle *= (this.preMouse.y < this._rotateZMargin) ? -1 : 1;
				var _quat = quat.clone( [0, 0, Math.sin(angle), Math.cos(angle) ] );
				quat.multiply(quat, aTempRotation, _quat);
			} else {
				var angle = -this._currDiffY * this._offset; 
				angle *= (this.preMouse.x < this._rotateZMargin) ? 1 : -1;
				var _quat = quat.clone( [0, 0, Math.sin(angle), Math.cos(angle) ] );
				quat.multiply(quat, aTempRotation, _quat);
			}
		} else {
			var v = vec3.clone([this._currDiffX, this._currDiffY, 0]);
			var axis = vec3.create();
			vec3.cross(axis, v, this._zAxis);
			vec3.normalize(axis, axis);
			var angle = vec3.length(v) * this._offset;
			var _quat = quat.clone( [Math.sin(angle) * axis[0], Math.sin(angle) * axis[1], Math.sin(angle) * axis[2], Math.cos(angle) ] );
			quat.multiply(aTempRotation, _quat, aTempRotation);
		}
		
		this._z += (this._preZ - this._z) * this._easing;

	};

	bongiovi.SceneRotation = SceneRotation;
	
})();
},{}],13:[function(require,module,exports){
// Scheduler.js

bongiovi = window.bongiovi || {};

if(window.requestAnimFrame == undefined) {
	window.requestAnimFrame = (function(){
		return  window.requestAnimationFrame       || 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame    || 
		window.oRequestAnimationFrame      || 
		window.msRequestAnimationFrame     || 
		function( callback ){
		window.setTimeout(callback, 1000 / 60);
		};
	})();
}

(function() {
	var Scheduler = function() {
		this.FRAMERATE = 60;
		this._delayTasks = [];
		this._nextTasks = [];
		this._deferTasks = [];
		this._highTasks = [];
		this._usurpTask = [];
		this._enterframeTasks = [];
		this._idTable = 0;

		requestAnimFrame( this._loop.bind(this) );
	}

	var p = Scheduler.prototype;

	p._loop = function() {
		requestAnimFrame( this._loop.bind(this) );
		this._process();
	}


	p._process = function() {
		for ( var i=0; i<this._enterframeTasks.length; i++) {
			var task = this._enterframeTasks[i];
			if(task != null && task != undefined) {
				task.func.apply(task.scope, task.params);
			}
		}
		
		while ( this._highTasks.length > 0) {
			var t = this._highTasks.pop();
			t.func.apply(t.scope, t.params);
		}
		

		var startTime = new Date().getTime();

		for ( var i=0; i<this._delayTasks.length; i++) {
			var t = this._delayTasks[i];
			if(startTime-t.time > t.delay) {
				t.func.apply(t.scope, t.params);
				this._delayTasks.splice(i, 1);
			}
		}

		startTime = new Date().getTime();
		var interval = 1000 / this.FRAMERATE;
		while(this._deferTasks.length > 0) {
			var task = this._deferTasks.shift();
			var current = new Date().getTime();
			if(current - startTime < interval ) {
				task.func.apply(task.scope, task.params);
			} else {
				this._deferTasks.unshift(task);
				break;
			}
		}


		startTime = new Date().getTime();
		var interval = 1000 / this.FRAMERATE;
		while(this._usurpTask.length > 0) {
			var task = this._usurpTask.shift();
			var current = new Date().getTime();
			if(current - startTime < interval ) {
				task.func.apply(task.scope, task.params);
			} else {
				// this._usurpTask.unshift(task);
				break;
			}
		}



		this._highTasks = this._highTasks.concat(this._nextTasks);
		this._nextTasks = [];
		this._usurpTask = [];
	}


	p.addEF = function(scope, func, params) {
		params = params || [];
		var id = this._idTable;
		this._enterframeTasks[id] = {scope:scope, func:func, params:params};
		this._idTable ++;
		return id;
	}


	p.removeEF = function(id) {
		if(this._enterframeTasks[id] != undefined) {
			this._enterframeTasks[id] = null
		}
		return -1;
	}


	p.delay = function(scope, func, params, delay) {
		var time = new Date().getTime();
		var t = {scope:scope, func:func, params:params, delay:delay, time:time};
		this._delayTasks.push(t);
	}


	p.defer = function(scope, func, params) {
		var t = {scope:scope, func:func, params:params};
		this._deferTasks.push(t);
	}


	p.next = function(scope, func, params) {
		var t = {scope:scope, func:func, params:params};
		this._nextTasks.push(t);
	}


	p.usurp = function(scope, func, params) {
		var t = {scope:scope, func:func, params:params};
		this._usurpTask.push(t);
	}

	bongiovi.Scheduler = new Scheduler();
	
})();



},{}],14:[function(require,module,exports){
// SimpleImageLoader.js

bongiovi = window.bongiovi || {};

(function() {
	SimpleImageLoader = function() {
		this._imgs = {};
		this._loadedCount = 0;
		this._toLoadCount = 0;
		this._scope;
		this._callback;
		this._callbackProgress;
	}

	var p = SimpleImageLoader.prototype;


	p.load = function(imgs, scope, callback, progressCallback) {
		this._imgs = {};
		this._loadedCount = 0;
		this._toLoadCount = imgs.length;
		this._scope = scope;
		this._callback = callback;
		this._callbackProgress = progressCallback;

		var that = this;

		for ( var i=0; i<imgs.length ; i++) {
			var img         = new Image();
			img.onload      = function() {	that._onImageLoaded();	}
			var path        = imgs[i];
			var tmp         = path.split("/");
			var ref         = tmp[tmp.length-1].split(".")[0];
			this._imgs[ref] = img;
			img.src         = path;
		}
	};


	p._onImageLoaded = function() {
		this._loadedCount++;

		if(this._loadedCount == this._toLoadCount) {
			this._callback.call(this._scope, this._imgs);
		} else {
			var p = this._loadedCount / this._toLoadCount;
			if(this._callbackProgress) this._callbackProgress.call(this._scope, p);
		}
	};
})();

bongiovi.SimpleImageLoader = new SimpleImageLoader();
},{}],15:[function(require,module,exports){
// define(["alfrid/GLShader"], function(GLShader) {
(function() {

	var View = function(aPathVert, aPathFrag) {
		if(aPathVert == undefined) {
			// console.warn("aPathVert is undefined");
			return;
		}
		this.shader = new bongiovi.GLShader(aPathVert, aPathFrag);
		this._init();
	};

	var p = View.prototype;

	p._init = function() {
		console.log("Should be overwritten by SuperClass");
	};

	p.render = function() {
		console.log("Should be overwritten by SuperClass");
	};

	bongiovi.View = View;
	
})();
},{}],16:[function(require,module,exports){
// define(["alfrid/View", "alfrid/GLTool", "alfrid/Mesh"], function(View, GLTool, Mesh) {
(function() {

	var SuperClass = bongiovi.View;

	var ViewCopy = function(aPathVert, aPathFrag) {
		if(aPathVert == undefined) {
			aPathVert = "assets/shaders/copy.vert";
			aPathFrag = "assets/shaders/copy.frag";
		}
		SuperClass.call(this, aPathVert, aPathFrag);
	};

	var p = ViewCopy.prototype = new SuperClass();
	var s = SuperClass.prototype;

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

		this.mesh = new bongiovi.Mesh(4, 6, bongiovi.GLTool.gl.TRIANGLES);
		this.mesh.bufferVertex(positions);
		this.mesh.bufferTexCoords(coords);
		this.mesh.bufferIndices(indices);
	};

	p.render = function(aTexture) {
		// Were has the reference of this.shader come from?
		if(!this.shader.isReady())return;
		this.shader.bind();
		this.shader.uniform("texture", "uniform1i", 0);
		aTexture.bind(0);
		bongiovi.GLTool.draw(this.mesh);
	};

	bongiovi.ViewCopy = ViewCopy;
	
})();
},{}]},{},[1]);

},{"../../js/bongiovi/Camera.js":8,"../../js/bongiovi/CameraPerspective.js":9,"../../js/bongiovi/EffectComposer.js":10,"../../js/bongiovi/FrameBuffer.js":11,"../../js/bongiovi/GLShader.js":12,"../../js/bongiovi/GLTexture.js":13,"../../js/bongiovi/GLTool.js":14,"../../js/bongiovi/Mesh.js":15,"../../js/bongiovi/Pass.js":16,"../../js/bongiovi/Scene.js":17,"../../js/bongiovi/SceneRotation.js":18,"../../js/bongiovi/Scheduler.js":19,"../../js/bongiovi/SimpleImageLoader.js":20,"../../js/bongiovi/View.js":21,"../../js/bongiovi/ViewCopy.js":22}]},{},[1]);
