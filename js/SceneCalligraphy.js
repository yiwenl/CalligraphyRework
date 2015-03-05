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

	this.camera.setPerspective(70*Math.PI/180, window.innerWidth/window.innerHeight, 5, 3000);
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

	this._composer = new EffectComposer();
	this._passTriBlur = new bongiovi.post.PassTriangleBlur(20);
	this._composer.addPass(this._passTriBlur);


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

	// this._hBlur.selfOffset = this._vBlur.selfOffset = CalligraphyModel.params.selfShadow;
	// this._hBlur.blur = this._vBlur.blur = CalligraphyModel.params.blur;
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