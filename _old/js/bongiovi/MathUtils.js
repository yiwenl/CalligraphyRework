MathUtils = {};

MathUtils.random = function(min, max) {	
	if(!max) {
		max = min;
		min = 0;
	}
	return Math.random() * (max-min) + min;  
}

MathUtils.map = function(value, smin, smax, tmin, tmax) {
	var p = (value - smin) / (smax - smin);
	return tmin + p * (tmax - tmin);
}


MathUtils.contrast = function(value, center, scale) {
	return center + (value - center) * scale;
}


MathUtils.clamp = function(value, min, max) {
	if(value > max) return max;
	else if ( value < min) return min;
	else return value;
}


MathUtils.level = function(i) {
	if(i==0) return 1;
	else return i*MathUtils.level(i-1);
}


MathUtils.binCoefficient = function(n, i) {
	return MathUtils.level(n) / ( MathUtils.level(i) * MathUtils.level(n-i) );
}


MathUtils.getBezierPoints = function(points, numSeg) {
	var bezierPoints = [];
	numPoints = points.length;
	var t, tx, ty, tz;
	var bc, pow1, pow2;
	for(var i=0; i<numSeg; i++) {
		t = i/numSeg;	

		tx = ty = tz = 0;
		for(var j=0; j<points.length; j++) {
			bc = MathUtils.binCoefficient(numPoints-1, j);
			pow1 = Math.pow((1-t), numPoints-j-1);
			pow2 = Math.pow(t, j);
			tx += bc * pow1 * pow2 * points[j][0];
			ty += bc * pow1 * pow2 * points[j][1];
			tz += bc * pow1 * pow2 * points[j][2];
		}

		// var p = vec3.fromValues(tx, ty, tz);
		var p = [tx, ty, tz];
		var index = Math.floor(points.length * t);
		if(index == points.length) index = points.length-1;
		p.distance = points[index].distance;
		bezierPoints.push(p);
	}

	return bezierPoints;
}