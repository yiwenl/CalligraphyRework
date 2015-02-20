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
};


p._initViews = function() {
	this._vCopy        = new b.ViewCopy();
	this._vRoom        = new ViewRoom();
	this._vCalligraphy = new ViewCalligraphy(this.textureBrushes);
	this._vShadow      = new ViewShadow();
	this._vPost        = new ViewPost();

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