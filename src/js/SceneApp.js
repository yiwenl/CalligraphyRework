// SceneApp.js

var GL = bongiovi.GL, gl;
var ViewPost = require("./ViewPost");
var ViewCalligraphy = require("./ViewCalligraphy");

function SceneApp() {
	gl = GL.gl;
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	bongiovi.Scene.call(this);

	window.addEventListener("resize", this.resize.bind(this));
}


var p = SceneApp.prototype = new bongiovi.Scene();

p._initTextures = function() {
	console.log('Init Textures');
	this._brushes = [];
	for(var i=0; i<=5; i++) {
		var t = new bongiovi.GLTexture(images['brush'+i]);
		this._brushes.push(t);
	}

	this._texturePaper = new bongiovi.GLTexture(images.paper);
	this._texturePaperNormal = new bongiovi.GLTexture(images.paperNormal);
};

p._initViews = function() {
	console.log('Init Views');

	this._vCopy = new bongiovi.ViewCopy();
	this._vPost = new ViewPost();

	var cx = GL.width/2;
	var cy = GL.height/2;

	var points = [];
	var r = 150;
	var num = 24;
	for(var i=0; i<num; i++) {
		var theta = i/num * Math.PI * 2.0;
		var x = cx + Math.cos(theta) * r;
		var y = cy + Math.sin(theta) * r;
		points.push([x, y, 0]);
	}	

	// var points = [
	// 	[cx-200, cy-200, 0],
	// 	[cx+200, cy-200, 0],
	// 	[cx+200, cy+200, 0],
	// 	[cx-200, cy+200, 0]
	// ];

	this._vCalligraphy = new ViewCalligraphy(points);
};

p.render = function() {
	GL.setMatrices(this.cameraOrthoScreen);
	GL.rotate(this.sceneRotation.matrix);

	// this._vCopy.render(this._texturePaper);
	this._vPost.render(this._texturePaper, this._texturePaperNormal);
	this._vCalligraphy.render(this._brushes[0]);
};

p.resize = function() {
	GL.setSize(window.innerWidth, window.innerHeight);
	this.camera.resize(GL.aspectRatio);
};

module.exports = SceneApp;