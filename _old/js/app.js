// app.js

require("./libs/bongiovi-min-post.js");
// require("./libs/bongiovi-compiled.js");

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
			shadowScale:4.0,
			blur:1.4,
			postOffset:0.25
		};


		gui.add(CalligraphyModel.params, "selfShadow", 0, 5);
		gui.add(CalligraphyModel.params, "shadowAlpha", 0, 1).step(.01);
		gui.add(CalligraphyModel.params, "shadowScale", 0, 5).step(.01);
		gui.add(CalligraphyModel.params, "blur", 0, 2).step(.01);
		gui.add(CalligraphyModel.params, "postOffset", 0, 1).step(.01);
	};


	p._loop = function() {
		// console.log("Loop");
		this._scene.loop();
	};

})();


new Main();

