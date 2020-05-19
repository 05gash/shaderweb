function assert_precondition(t, out, tstart) {
	console.assert(typeof(t) === "number");
	if (out === undefined) { out = {}; }
	console.assert(typeof(out) === "object");
	if (tstart === undefined) { tstart = 0; }
	else { console.assert(typeof(tstart) === "number"); }
	console.assert(t >= tstart);
	return [out, tstart];
}

function anim_delay(duration) {
	console.assert(typeof(duration) === "number");
	let f = function(t, out, tstart) { 
		[out, tstart] = assert_precondition(t, out, tstart); return out;
	}
	f.duration = duration;
	f.par = ((g) => anim_parallel(f, g));
	f.seq = ((g) => anim_sequence(f, g));
	return f;
}

function anim_const(field, v) {
	let f = function(t, out, tstart) {
		[out, tstart] = assert_precondition(t, out, tstart); out[field] = v; return out;
	};
	f.duration = 0;
	f.par = ((g) => anim_parallel(f, g));
	f.seq = ((g) => anim_sequence(f, g));
	return f;
}

function ease_linear(vstart, tlin, vend) { return (1.0 - tlin) * vstart + tlin * vend; }

function ease_cubic(vstart, tlin, vend) {
	const cube = (1 - tlin)*(1-tlin)*(1-tlin); return cube * vstart + (1 - cube) * vend;
}
function ease_out_back(vstart, tlin, vend) {
	const c1 = 1.70158; const c3 = c1 + 1; const t = 1 + c3 * Math.pow(tlin - 1, 3) + c1 * Math.pow(tlin - 1, 2);
	return (1-t) * vstart + t*vend;
}

function anim_interpolated(fease, field, vend, duration) {
	let f =  function(t, out, tstart) {
		[out, tstart] = assert_precondition(t, out, tstart);
		if (t < tstart + duration && duration !== 0) {
			const tlin = (t - tstart) /duration;
			console.assert(tlin >= 0);
			console.assert(tlin <= 1);
			const vstart = out[field];
			out[field] = fease(vstart, tlin, vend);
		} else { out[field] = vend; }
		return out;
	};
	f.duration = duration;
	f.par = ((g) => anim_parallel(f, g));
	f.seq = ((g) => anim_sequence(f, g));
	return f;

}

function anim_sequence(anim1, anim2) {
	const duration = anim1.duration + anim2.duration;
	let f =  function(t, out, tstart) {
		[out, tstart] = assert_precondition(t, out, tstart);
		anim1(t, out, tstart);
		if (t >= tstart + anim1.duration) { anim2(t, out, tstart + anim1.duration); }
		return out;
	}
	f.duration = duration;
	f.par = ((g) => anim_parallel(f, g));
	f.seq = ((g) => anim_sequence(f, g));
	return f;
}

function anim_parallel(anim1, anim2) {
	const duration = Math.max(anim1.duration, anim2.duration);
	let f =  function(t, out, tstart) {
		[out, tstart] = assert_precondition(t, out, tstart);
		if (t >= tstart) { anim1(t, out, tstart); anim2(t, out, tstart); }
		return out;
	}
	f.duration = duration;
	f.par = ((g) => anim_parallel(f, g));
	f.seq = ((g) => anim_sequence(f, g));
	return f;
}

function anim_parallel_list(xs) { var x = xs[0]; for(var i = 1; i < xs.length; ++i) { x = x.par(xs[i]); } return x; }
function anim_sequence_list(xs) { var x = xs[0]; for(var i = 1; i < xs.length; ++i) { x = x.seq(xs[i]); } return x; }

function anim_stagger(xs, delta) {
	console.assert(typeof(delta) == "number");
	var ys = [];
	for(var i = 0; i < xs.length; ++i) {
		ys.push(anim_delay(delta*i).seq(xs[i]));
	}
	var y = ys[0];
	for(var i = 1; i < ys.length; ++i) {
		y = y.par(ys[i]);
	}
	return y;
}

function getShader(name){
	const uri = 'shaderweb/shaders/' + name;
	console.log('uri: ' + uri);
	return fetch(uri)
		.then(
			response =>
			response.ok ? response.text() : undefined
		);
}

function getModel(name){
	uri = 'shaderweb/models/' + name + '.txt';
	return fetch(uri)
		.then(
			response =>
			response.ok ? response.text() : undefined
		);
}

var m4 = {
	perspective: function(fieldOfViewInRadians, aspect, near, far) {
		var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
		var rangeInv = 1.0 / (near - far);

		return [
			f / aspect, 0, 0, 0,
			0, f, 0, 0,
			0, 0, (near + far) * rangeInv, -1,
			0, 0, near * far * rangeInv * 2, 0,
		];
	},

	projection: function(width, height, depth) {
		// Note: This matrix flips the Y axis so 0 is at the top.
		return [
			2 / width, 0, 0, 0,
			0, -2 / height, 0, 0,
			0, 0, 2 / depth, 0,
			-1, 1, 0, 1,
		];
	},

	multiply: function(a, b) {
		var a00 = a[0 * 4 + 0];
		var a01 = a[0 * 4 + 1];
		var a02 = a[0 * 4 + 2];
		var a03 = a[0 * 4 + 3];
		var a10 = a[1 * 4 + 0];
		var a11 = a[1 * 4 + 1];
		var a12 = a[1 * 4 + 2];
		var a13 = a[1 * 4 + 3];
		var a20 = a[2 * 4 + 0];
		var a21 = a[2 * 4 + 1];
		var a22 = a[2 * 4 + 2];
		var a23 = a[2 * 4 + 3];
		var a30 = a[3 * 4 + 0];
		var a31 = a[3 * 4 + 1];
		var a32 = a[3 * 4 + 2];
		var a33 = a[3 * 4 + 3];
		var b00 = b[0 * 4 + 0];
		var b01 = b[0 * 4 + 1];
		var b02 = b[0 * 4 + 2];
		var b03 = b[0 * 4 + 3];
		var b10 = b[1 * 4 + 0];
		var b11 = b[1 * 4 + 1];
		var b12 = b[1 * 4 + 2];
		var b13 = b[1 * 4 + 3];
		var b20 = b[2 * 4 + 0];
		var b21 = b[2 * 4 + 1];
		var b22 = b[2 * 4 + 2];
		var b23 = b[2 * 4 + 3];
		var b30 = b[3 * 4 + 0];
		var b31 = b[3 * 4 + 1];
		var b32 = b[3 * 4 + 2];
		var b33 = b[3 * 4 + 3];
		return [
			b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
			b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
			b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
			b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
			b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
			b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
			b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
			b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
			b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
			b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
			b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
			b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
			b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
			b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
			b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
			b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
		];
	},

	translation: function(tx, ty, tz) {
		return [
			1,  0,  0,  0,
			0,  1,  0,  0,
			0,  0,  1,  0,
			tx, ty, tz, 1,
		];
	},

	xRotation: function(angleInRadians) {
		var c = Math.cos(angleInRadians);
		var s = Math.sin(angleInRadians);

		return [
			1, 0, 0, 0,
			0, c, s, 0,
			0, -s, c, 0,
			0, 0, 0, 1,
		];
	},

	yRotation: function(angleInRadians) {
		var c = Math.cos(angleInRadians);
		var s = Math.sin(angleInRadians);

		return [
			c, 0, -s, 0,
			0, 1, 0, 0,
			s, 0, c, 0,
			0, 0, 0, 1,
		];
	},

	zRotation: function(angleInRadians) {
		var c = Math.cos(angleInRadians);
		var s = Math.sin(angleInRadians);

		return [
			c, s, 0, 0,
			-s, c, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		];
	},

	scaling: function(sx, sy, sz) {
		return [
			sx, 0,  0,  0,
			0, sy,  0,  0,
			0,  0, sz,  0,
			0,  0,  0,  1,
		];
	},

	translate: function(m, tx, ty, tz) {
		return m4.multiply(m, m4.translation(tx, ty, tz));
	},

	xRotate: function(m, angleInRadians) {
		return m4.multiply(m, m4.xRotation(angleInRadians));
	},

	yRotate: function(m, angleInRadians) {
		return m4.multiply(m, m4.yRotation(angleInRadians));
	},

	zRotate: function(m, angleInRadians) {
		return m4.multiply(m, m4.zRotation(angleInRadians));
	},

	scale: function(m, sx, sy, sz) {
		return m4.multiply(m, m4.scaling(sx, sy, sz));
	},

	inverse: function(m) {
		var m00 = m[0 * 4 + 0];
		var m01 = m[0 * 4 + 1];
		var m02 = m[0 * 4 + 2];
		var m03 = m[0 * 4 + 3];
		var m10 = m[1 * 4 + 0];
		var m11 = m[1 * 4 + 1];
		var m12 = m[1 * 4 + 2];
		var m13 = m[1 * 4 + 3];
		var m20 = m[2 * 4 + 0];
		var m21 = m[2 * 4 + 1];
		var m22 = m[2 * 4 + 2];
		var m23 = m[2 * 4 + 3];
		var m30 = m[3 * 4 + 0];
		var m31 = m[3 * 4 + 1];
		var m32 = m[3 * 4 + 2];
		var m33 = m[3 * 4 + 3];
		var tmp_0  = m22 * m33;
		var tmp_1  = m32 * m23;
		var tmp_2  = m12 * m33;
		var tmp_3  = m32 * m13;
		var tmp_4  = m12 * m23;
		var tmp_5  = m22 * m13;
		var tmp_6  = m02 * m33;
		var tmp_7  = m32 * m03;
		var tmp_8  = m02 * m23;
		var tmp_9  = m22 * m03;
		var tmp_10 = m02 * m13;
		var tmp_11 = m12 * m03;
		var tmp_12 = m20 * m31;
		var tmp_13 = m30 * m21;
		var tmp_14 = m10 * m31;
		var tmp_15 = m30 * m11;
		var tmp_16 = m10 * m21;
		var tmp_17 = m20 * m11;
		var tmp_18 = m00 * m31;
		var tmp_19 = m30 * m01;
		var tmp_20 = m00 * m21;
		var tmp_21 = m20 * m01;
		var tmp_22 = m00 * m11;
		var tmp_23 = m10 * m01;

		var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
			(tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
		var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
			(tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
		var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
			(tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
		var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
			(tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

		var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

		return [
			d * t0,
			d * t1,
			d * t2,
			d * t3,
			d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
				(tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
			d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
				(tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
			d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
				(tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
			d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
				(tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
			d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
				(tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
			d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
				(tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
			d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
				(tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
			d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
				(tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
			d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
				(tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
			d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
				(tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
			d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
				(tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
			d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
				(tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02)),
		];
	},

	cross: function(a, b) {
		return [
			a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0],
		];
	},

	subtractVectors: function(a, b) {
		return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
	},

	normalize: function(v) {
		var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
		// make sure we don't divide by 0.
		if (length > 0.00001) {
			return [v[0] / length, v[1] / length, v[2] / length];
		} else {
			return [0, 0, 0];
		}
	},

	lookAt: function(cameraPosition, target, up) {
		var zAxis = m4.normalize(
			m4.subtractVectors(cameraPosition, target));
		var xAxis = m4.normalize(m4.cross(up, zAxis));
		var yAxis = m4.normalize(m4.cross(zAxis, xAxis));

		return [
			xAxis[0], xAxis[1], xAxis[2], 0,
			yAxis[0], yAxis[1], yAxis[2], 0,
			zAxis[0], zAxis[1], zAxis[2], 0,
			cameraPosition[0],
			cameraPosition[1],
			cameraPosition[2],
			1,
		];
	},

	transformVector: function(m, v) {
		var dst = [];
		for (var i = 0; i < 4; ++i) {
			dst[i] = 0.0;
			for (var j = 0; j < 4; ++j) {
				dst[i] += v[j] * m[j * 4 + i];
			}
		}
		return dst;
	},

};
/*
 * returns a tagged array, each element has a name and a shader'
 * each represents a render pass. The main buffer uses the screen as a rendertarget
 */
async function getShaders(name){
	const shaderNames = ['frag', 'vert'];
	const shaderVals = await Promise.all(shaderNames.map(shaderType => getShader(name + '_' + shaderType + '.glsl')));
	const shaders = shaderNames.map( (name, index) => ({name : name, shader: shaderVals[index]}) );
	return shaders
}

async function go(canvasName){
	//HELPERS
	function getUrlParameter(name) {
		name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
		var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
		var results = regex.exec(location.search);
		return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
	};
	function doCheck(shader, source){
		// check they compiled alright
		var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		console.log('Shader compiled successfully?: ' + compiled);
		var compilationLog = gl.getShaderInfoLog(shader);
		console.log('Shader compiler log: ' + compilationLog);
		if (!compiled){
			console.log(source);
		}
	}

	async function getShaderProgram(name, commonShaders, feedback_varyings){
		//TODO we're defining our sdf as having a boundary at width
		var vertCommonCode = commonShaders.find( shader => shader.name == 'vert');
		vertCommonCode = vertCommonCode!=undefined ? vertCommonCode.shader : "";
		var fragCommonCode = commonShaders.find( shader => shader.name == 'frag');
		fragCommonCode = fragCommonCode!=undefined ? fragCommonCode.shader : "";

		var shaders = await getShaders(name);
		var vertCode = vertCommonCode + shaders.find( shader => shader.name == 'vert').shader;

		//Create a vertex shader object
		var vertShader = gl.createShader(gl.VERTEX_SHADER);

		//Attach vertex shader source code
		gl.shaderSource(vertShader, vertCode);

		//Compile the vertex shader
		gl.compileShader(vertShader);

		doCheck(vertShader, vertCode);
		//Fragment shader source code

		var fragCode = fragCommonCode + shaders.find( shader => shader.name == 'frag').shader;

		// Create fragment shader object
		var fragShader = gl.createShader(gl.FRAGMENT_SHADER);

		// Attach fragment shader source code
		gl.shaderSource(fragShader, fragCode);

		// Compile the fragment shader
		gl.compileShader(fragShader);

		doCheck(fragShader, fragCode);
		// Create a shader program object to store combined shader program
		var shaderProgram = gl.createProgram();

		// Attach a vertex shader
		gl.attachShader(shaderProgram, vertShader); 

		// Attach a fragment shader
		gl.attachShader(shaderProgram, fragShader);

		if (feedback_varyings){
			gl.transformFeedbackVaryings(
				shaderProgram,
				feedback_varyings,
				gl.INTERLEAVED_ATTRIBS)
		}

		// Link both programs
		gl.linkProgram(shaderProgram);
		return shaderProgram;

	}

	function checkExtensions(gl){
		gl.getExtension('OES_standard_derivatives');
		gl.getExtension('OES_texture_float');
		gl.getExtension('EXT_color_buffer_float');
	}

	//END HELPERS
	console.log(canvasName);
	var canvas = document.getElementById(canvasName);
	var gl = canvas.getContext('webgl2', {alpha: false});

	checkExtensions(gl);


	//create our MSAA rendertarget

	var FRAMEBUFFER_SIZE = {
		x: canvas.width,
		y: canvas.height
	};
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y, 0, gl.RGBA, gl.FLOAT, null);
	gl.bindTexture(gl.TEXTURE_2D, null);

	// -- Init Frame Buffers
	var FRAMEBUFFER = {
		TEXTURE: 0
	};
	var framebuffers = [
		gl.createFramebuffer(),
	];
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.TEXTURE]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	/* Create and compile Shader programs */

	commonShaders = await getShaders("common");
	//NOTE: we're defining our sdf as having a boundary at width
	// Use the combined shader program object
	shaderProgram = await getShaderProgram("main", commonShaders);

	transformProgram = await getShaderProgram("transform", commonShaders, ["out_coords"]);

	//TODO make these shaders
	postProgram = await getShaderProgram("post", commonShaders);


	/* Step5: Drawing the required object (triangle) */

	var d = new Date();
	var start = d.getTime();


	function getSquareObject(numInstances, colour, width){
		return {
			program: null,
			renderStyle: gl.TRIANGLE_STRIP, 
			size: 4,
			colour: colour,
			width: width,
			instances: numInstances
		}
	}

	function drawRenderObject(ob){
		// Bind buffer 
		gl.bindBuffer(gl.ARRAY_BUFFER, ob.vbo);

		//set uniforms
		var colourLoc = gl.getUniformLocation(shaderProgram, "colour");
		gl.uniform4fv(colourLoc, ob.colour.elements);

		var widthLoc = gl.getUniformLocation(shaderProgram, "width");
		gl.uniform1fv(widthLoc, [ob.width]);

		var apertureLoc = gl.getUniformLocation(shaderProgram, "aperture");
		gl.uniform1fv(apertureLoc, [this.aperture]);
		var focalLengthLoc = gl.getUniformLocation(shaderProgram, "focalLength");
		gl.uniform1fv(focalLengthLoc, [this.focalLength]);

		var planeInFocusLoc = gl.getUniformLocation(shaderProgram, "planeInFocus");
		gl.uniform1fv(planeInFocusLoc, [this.planeInFocus]);


		var projectionMat = m4.perspective(this.fov, canvas.width/canvas.height, this.near, this.far);
		var up = [0, 1, 0];
		var cameraPosition = [this.camParams.length*Math.cos(this.camParams.phi)*Math.sin(this.camParams.theta), this.camParams.length*Math.cos(this.camParams.phi)*Math.cos(this.camParams.theta), this.camParams.length*Math.sin(this.camParams.phi)];
		var fPosition = [this.camParams.lookAtX, this.camParams.lookAtY, this.lookAtZ];

		// Compute the camera's matrix using look at.
		var cameraMatrix = m4.lookAt(cameraPosition, fPosition, up);

		// Make a view matrix from the camera matrix.
		var viewMatrix = m4.inverse(cameraMatrix);

		// create a viewProjection matrix. This will both apply perspective
		// AND move the world so that the camera is effectively the origin
		var mvp = m4.multiply(projectionMat, viewMatrix);
		var mvpLoc = gl.getUniformLocation(shaderProgram, "mvp");
		gl.uniformMatrix4fv(mvpLoc, gl.FALSE, mvp);

		gl.bindVertexArray(vertexArrays[currentSourceIdx]);

		// Attributes per-instance when drawing sets back to 1 when drawing instances
		gl.vertexAttribDivisor(OFFSET_LOCATION, 1);
		gl.vertexAttribDivisor(COLOUR_LOCATION, NUM_INSTANCES/NUM_COLOURS);

		gl.drawArraysInstanced(ob.renderStyle, 0, ob.size, ob.instances);
		//gl.drawArrays(ob.renderStyle, 0, ob.size);
	}

	function deleteBuffers(renderObjects){
		renderObjects.forEach(ob => gl.deleteBuffer(ob.vbo));
	}

	const mouseInput = true;
	var isDrawing = false;

	canvas.addEventListener("mousedown", function(e) 
		{ 
			isDrawing = true;
		}); 
	canvas.addEventListener("mousemove", function(e) 
		{ 
			if (isDrawing){
				const mousePos = getMousePosition(canvas, e);
			}
		}); 
	canvas.addEventListener("mouseup", function(e) 
		{ 
			isDrawing = false;
		}); 

	function getMousePosition(canvas, event) { 
		let rect = canvas.getBoundingClientRect(); 
		let x = (event.clientX - rect.left)/(canvas.width);
		let y = 1.0 - (event.clientY - rect.top)/(canvas.height);
		return [x, y];
	} 

	var renderObjects = [];


	// set up our starting positions

	model = eval(await getModel('head'));
	NUM_INSTANCES = model.length/4 - 23;
	NUM_COLOURS = 10;
	var startingPositions = [];
	var colours = [];

	function random(){
		return Math.random()*1.2 - 0.1;
	}

	startingPositions = model;//new Array(NUM_INSTANCES*4);
	for (var inst = 0; inst<NUM_COLOURS; inst++){
		colours = colours.concat([806*Math.random(), 400.*Math.random(), 50.0]);
	}
	console.log(startingPositions);

	/* set up our transform feedback shit*/
	renderObjects = renderObjects.concat([getSquareObject(NUM_INSTANCES, $V([0.8, 0.5, 0.5, 1.0]), 0.0333)]);

	// -- Init Vertex Array
	var OFFSET_LOCATION = 0;
	var POSITION_LOCATION = 1;
	var COLOUR_LOCATION = 2;
	var NUM_LOCATIONS = 3;

	var currentSourceIdx = 0;

	var vertexArrays = [gl.createVertexArray(), gl.createVertexArray()];

	// Transform feedback objects track output buffer state
	var transformFeedbacks = [gl.createTransformFeedback(), gl.createTransformFeedback()];

	var vertexBuffers = new Array(vertexArrays.length);

	for (var va = 0; va < vertexArrays.length; ++va) {
		gl.bindVertexArray(vertexArrays[va]);
		vertexBuffers[va] = new Array(NUM_LOCATIONS);

		vertexBuffers[va][OFFSET_LOCATION] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[va][OFFSET_LOCATION]);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(startingPositions), gl.STREAM_COPY);
		gl.vertexAttribPointer(OFFSET_LOCATION, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(OFFSET_LOCATION);

		vertexBuffers[va][POSITION_LOCATION] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[va][POSITION_LOCATION]);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(4*3), gl.STATIC_DRAW); //empty V buffer of our procedural squares 4 vertices*3 per vert
		gl.vertexAttribPointer(POSITION_LOCATION, 3, gl.FLOAT, false, 0, 0); //NOTE this
		gl.enableVertexAttribArray(POSITION_LOCATION);

		// Colors
		vertexBuffers[va][COLOUR_LOCATION] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[va][COLOUR_LOCATION]);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colours), gl.STATIC_DRAW); //v empty buffer of our colour attributes
		gl.vertexAttribPointer(COLOUR_LOCATION, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(COLOUR_LOCATION);
		gl.vertexAttribDivisor(COLOUR_LOCATION, NUM_INSTANCES/NUM_COLOURS); // attribute used once per instance

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		// Set up output
		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedbacks[va]);
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, vertexBuffers[va][OFFSET_LOCATION]);

		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
	}


	function transform(time) {
		var destinationIdx = (currentSourceIdx + 1) % 2;

		// Toggle source and destination VBO
		var sourceVAO = vertexArrays[currentSourceIdx];

		var destinationTransformFeedback = transformFeedbacks[destinationIdx];

		gl.useProgram(transformProgram);

		var time_loc = gl.getUniformLocation(transformProgram, "iTime");
		gl.uniform1fv(time_loc, [time]); 
		var resolution = gl.getUniformLocation(transformProgram, "iResolution");
		gl.uniform2fv(resolution, [canvas.clientWidth, canvas.clientHeight]); 

		gl.bindVertexArray(sourceVAO);
		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, destinationTransformFeedback);

		// NOTE: The following two lines shouldn't be necessary, but are required to work in ANGLE
		// due to a bug in its handling of transform feedback objects.
		// https://bugs.chromium.org/p/angleproject/issues/detail?id=2051
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, vertexBuffers[destinationIdx][OFFSET_LOCATION]);

		// Attributes per-vertex when doing transform feedback needs setting to 0 when doing transform feedback
		gl.vertexAttribDivisor(OFFSET_LOCATION, 0);
		gl.vertexAttribDivisor(COLOUR_LOCATION, 0);

		// Turn off rasterization - we are not drawing
		gl.enable(gl.RASTERIZER_DISCARD);

		// Update position and rotation using transform feedback
		gl.beginTransformFeedback(gl.POINTS);
		gl.drawArrays(gl.POINTS, 0, NUM_INSTANCES);
		gl.endTransformFeedback();

		// Restore state
		gl.disable(gl.RASTERIZER_DISCARD);
		gl.useProgram(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
		gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);

		// Ping pong the buffers
		currentSourceIdx = (currentSourceIdx + 1) % 2;
	}

	function resize(canvas) {
		// Lookup the size the browser is displaying the canvas.
		var displayWidth  = canvas.clientWidth;
		var displayHeight = canvas.clientHeight;

		// Check if the canvas is not the same size.
		if (canvas.width  !== displayWidth ||
			canvas.height !== displayHeight) {

			// Make the canvas the same size
			canvas.width  = displayWidth;
			canvas.height = displayHeight;

			//TODO dont know if we need to delete the framebuffer of just need to attach new texture
			//resize the framebuffers
			framebuffers.forEach(framebuffer  => gl.deleteFramebuffer(framebuffer));
			gl.deleteTexture(texture);

			FRAMEBUFFER_SIZE = {
				x: canvas.width,
				y: canvas.height
			};
			texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y, 0, gl.RGBA, gl.FLOAT, null);
			gl.bindTexture(gl.TEXTURE_2D, null);

			// -- Init Frame Buffers
			framebuffers = [
				gl.createFramebuffer(),
			];
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.TEXTURE]);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}
	}

	function doPostProcess(){
		//we need to: 
		//set up our texture for post DONE
		//set up our shader program for post DONEISH
		//bind the texture in as a uniform to the pass
		//draw a fullscreen quad
		gl.useProgram(postProgram);	

		gl.bindTexture(gl.TEXTURE_2D, texture);
		//set uniforms
		var textureLoc = gl.getUniformLocation(postProgram, "frame");
		gl.uniform1i(textureLoc, texture);

		gl.bindVertexArray(vertexArrays[currentSourceIdx]);

		// Attributes per-instance when drawing sets back to 0 when 
		gl.vertexAttribDivisor(OFFSET_LOCATION, 0);
		gl.vertexAttribDivisor(COLOUR_LOCATION, 0);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	this.aperture = 24.;
	this.focalLength = .56;
	this.planeInFocus = 2.28;
	const gui = new dat.GUI();
	var dof = gui.addFolder('dof');
	dof.add(this, 'aperture');
	dof.add(this, 'focalLength', 0., 5.);
	dof.add(this, 'planeInFocus', 0.0, 3.);

	this.fov = .7;
	this.camLength = 10.;
	this.lookAtZ = 0.;
	this.near = 1.;
	this.far = 100.;
	var camera = gui.addFolder('camera');
	camera.add(this, 'fov', 0, 3.14);
	camera.add(this, 'lookAtZ');
	camera.add(this, 'near');
	camera.add(this, 'far');
	cameraAnimations = anim_const("length", 10)
		.seq(anim_const("phi", 1.4))
		.seq(anim_const("theta", 0))
		.seq(anim_const("lookAtX", 0))
		.seq(anim_const("lookAtY", 0))
		.seq(
			anim_interpolated(ease_cubic, "length", 4, 20)
			.par(anim_interpolated(ease_cubic, "lookAtY", 1.0, 20))
			.par(anim_interpolated(ease_cubic, "phi", 0.8, 20))
		);

	function chooseBetween(min, max){
		return min + Math.random()*(min-max);
	}

	var travelTime = 30;
	function addDistanceInTime(dist){
		const rtn = dist;
		if(Math.random() > 0.5){
			return -rtn;
		}
		else{
			return rtn;
		}
	}

	function chooseCameraParams(time){
		let startPhi = chooseBetween(1,1.3);;
		let startTheta = chooseBetween(0,1);;
		let startLength = chooseBetween(7, 10);
		let startLookAtY = chooseBetween(0, .5);
		cameraAnimations = anim_const("length", startLength)
			.seq(anim_const("phi", startPhi))
			.seq(anim_const("theta", 0))
			.seq(anim_const("lookAtX", 0))
			.seq(anim_const("lookAtY", startLookAtY))
			.seq(anim_delay(time-10.))
			.seq(
				anim_interpolated(ease_cubic, "length", startLength+addDistanceInTime(2), time + 30)
				.par(anim_interpolated(ease_cubic, "lookAtY", startLookAtY + addDistanceInTime(.5), time + 30))
				.par(anim_interpolated(ease_cubic, "phi", startPhi + addDistanceInTime(1), time + 30))
				.par(anim_interpolated(ease_cubic, "theta", startTheta + addDistanceInTime(1), time + 30))
			);
		console.log(cameraAnimations);
	}

	Tone.Transport.scheduleRepeat(chooseCameraParams, "7m", "+7m");

	function renderLoop(){
		resize(canvas);
		var d = new Date();
		var millis = (new Date()).getTime();
		var timeMillis = (millis-start)/1000.0;

		// Enable the depth test
		gl.disable(gl.DEPTH_TEST); 

		// Clear the color buffer bit
		gl.clear(gl.COLOR_BUFFER_BIT);
		//deleteBuffers(renderObjects);

		// Set the view port
		gl.viewport(0,0,canvas.width,canvas.height);

		// Pass 1
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.TEXTURE]);
		//gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE);
		// DO UNIFORMS
		gl.useProgram(shaderProgram);
		var resolutionLoc = gl.getUniformLocation(shaderProgram, "iResolution");
		gl.uniform3fv(resolutionLoc, [canvas.width, canvas.height, 0.0]); 
		var timeLoc = gl.getUniformLocation(shaderProgram, "iTime");
		gl.uniform1fv(timeLoc, [timeMillis]);
		// Draw the triangle

		this.camParams = cameraAnimations(timeMillis);
		renderObjects.forEach(ob => drawRenderObject(ob)); 
		//Blit framebuffers, no Multisample texture 2d in WebGL 2

		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		doPostProcess();

		//gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
		//gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		//gl.clearBufferfv(gl.COLOR, 0, [1.0, 1.0, 1.0, 0.0]);
		//gl.blitFramebuffer(
		//	0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
		//	0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
		//	gl.COLOR_BUFFER_BIT, gl.NEAREST
		//);

		transform(timeMillis);
		window.setTimeout(renderLoop, 1000.0/60.0);
	}
	renderLoop();

	//TODO, continue fan code. You haven't tested it yet, and you havent tested the object being used to pass around buffer references
}

function doTone(){
	//the feedback delay

	// SETUP REVERB
	var reverb = new Tone.Freeverb({
		"roomSize" : 0.9,
		"cutoff" : 5000
	}).toMaster();

	var feedbackDelay = new Tone.FeedbackDelay({
		"delayTime" : 0.75,
		"feedback" : 0.9,
		"wet" : 0.7
	}).connect(reverb);

	var split = new Tone.Mono().connect(feedbackDelay);

	var sounds = new Tone.Players({
		"Am_1" : "sound/sounds/Am_1.ogg",
		"Am_2" : "sound/sounds/Am_2.ogg",
		"Am_3" : "sound/sounds/Am_3.ogg",
		"Am_4" : "sound/sounds/Am_4.ogg",
		"Am_5" : "sound/sounds/Am_5.ogg",
		"Am_6" : "sound/sounds/Am_6.ogg",
		"Am_7" : "sound/sounds/Am_7.ogg",
		"Am_8" : "sound/sounds/Am_8.ogg",

		"Dm_1" : "sound/sounds/Dm_1.ogg",
		"Dm_2" : "sound/sounds/Dm_2.ogg",
		"Dm_3" : "sound/sounds/Dm_3.ogg",
		"Dm_4" : "sound/sounds/Dm_4.ogg",
		"Dm_5" : "sound/sounds/Dm_5.ogg",
		"Dm_6" : "sound/sounds/Dm_6.ogg",
		"Dm_7" : "sound/sounds/Dm_7.ogg",
		"Dm_8" : "sound/sounds/Dm_8.ogg",

		"F_1" : "sound/sounds/F_1.ogg",
		"F_2" : "sound/sounds/F_2.ogg",
		"F_3" : "sound/sounds/F_3.ogg",
		"F_4" : "sound/sounds/F_4.ogg",
		"F_5" : "sound/sounds/F_5.ogg",
		"F_6" : "sound/sounds/F_6.ogg",
		"F_7" : "sound/sounds/F_7.ogg",
		"F_8" : "sound/sounds/F_8.ogg",
		"F_9" : "sound/sounds/F_9.ogg"
	}, () => {
		document.querySelector("tone-button").removeAttribute("disabled")
	}).connect(split);

	var f_samples = ["F_1", "F_2", "F_3", "F_4", "F_5", "F_6", "F_7", "F_8", "F_9"];
	var a_samples = ["Am_1", "Am_2", "Am_3", "Am_4", "Am_5", "Am_6", "Am_7", "Am_8"];
	var d_samples = ["Dm_1",  "Dm_2",  "Dm_3",  "Dm_4",  "Dm_5",  "Dm_6",  "Dm_7",  "Dm_8"];
	var sample_collection = [f_samples, a_samples, d_samples];

	function playSample(time){
		samples = sample_collection[Math.floor(3.0*Math.sin(time/220.0))];
		//console.log(3.0*Math.sin(time/220.0));
		//console.log(samples);
		player = sounds.get(samples[Math.floor(Math.random()*samples.length)])
		player.start();
	}

	function changeTempo(time){
		Tone.Transport.bpm.rampTo(Math.random()*30 + 90, "+5m");
	}
	function changeParams(time){
		feedbackDelay.delayTime.rampTo(Math.random()*0.6 + 0.4, "+5m");
	}

	Tone.Transport.scheduleRepeat(playSample, "5m");
	Tone.Transport.scheduleRepeat(changeTempo, "20m", "+20m");
	Tone.Transport.scheduleRepeat(changeParams, "30m", "+30m");
	//bind the interface
	document.querySelector("button").addEventListener('mousedown', e => {Tone.Transport.toggle(); go("lol")});
}
