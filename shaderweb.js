function getShader(name){
	const uri = 'shaderweb/shaders/' + name;
	console.log('uri: ' + uri);
	return fetch(uri)
		.then(
			response =>
			response.ok ? response.text() : undefined
		);
}

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
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.bindTexture(gl.TEXTURE_2D, null);

	// -- Init Frame Buffers
	var FRAMEBUFFER = {
		RENDERBUFFER: 0,
		COLORBUFFER: 1
	};
	var framebuffers = [
		gl.createFramebuffer(),
		gl.createFramebuffer()
	];
	var colorRenderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, colorRenderbuffer);
	gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y);

	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorRenderbuffer);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.COLORBUFFER]);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	/* Create and compile Shader programs */

	commonShaders = await getShaders("common");
	//TODO we're defining our sdf as having a boundary at width
	// Use the combined shader program object
	shaderProgram = await getShaderProgram("main", commonShaders);

	transformProgram = await getShaderProgram("transform", commonShaders, ["out_coords"]);


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

	const mouseInput = false;
	if (mouseInput){
		var path = [
			$V([0.1, 0.1]), 
			$V([0.2, 0.7]), 
			$V([0.9, 0.9])
		];
		canvas.addEventListener("mousedown", function(e) 
			{ 
				path.push(getMousePosition(canvas, e));
				renderObjects = recomputeVertices(path, 0.01, $V([0.1, 0.8, 0.8, 1.0]));
			}); 

		function getMousePosition(canvas, event) { 
			let rect = canvas.getBoundingClientRect(); 
			let x = (event.clientX - rect.left)/(canvas.width);
			let y = 1.0 - (event.clientY - rect.top)/(canvas.height);
			return $V([x, y]);
		} 
	}

	var renderObjects = [];


	// set up our starting positions
	NUM_INSTANCES = 20000;
	NUM_COLOURS = 10;
	var startingPositions = [];
	var colours = [];

	function random(){
		return Math.random()*1.2 - 0.1;
	}

	for (var inst = 0; inst<NUM_INSTANCES; inst++){
		startingPositions = startingPositions.concat([random(), random()]);
	}
	for (var inst = 0; inst<NUM_COLOURS; inst++){
		colours = colours.concat([Math.random(), Math.random(), Math.random()]);
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
		gl.vertexAttribPointer(OFFSET_LOCATION, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(OFFSET_LOCATION);

		vertexBuffers[va][POSITION_LOCATION] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[va][POSITION_LOCATION]);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(4*3), gl.STATIC_DRAW); //empty V buffer of our procedural squares 4 vertices*3 per vert
		gl.vertexAttribPointer(POSITION_LOCATION, 2, gl.FLOAT, false, 0, 0);
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


	function transform() {
		var destinationIdx = (currentSourceIdx + 1) % 2;

		// Toggle source and destination VBO
		var sourceVAO = vertexArrays[currentSourceIdx];

		var destinationTransformFeedback = transformFeedbacks[destinationIdx];

		gl.useProgram(transformProgram);

		var particle_limits = gl.getUniformLocation(transformProgram, "particle_limits");
		gl.uniform2fv(particle_limits, [0.1, 0.1]); 

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
		}
	}

	function renderLoop(){
		resize(canvas);
		var d = new Date();
		var millis = (new Date()).getTime();

		// Enable the depth test
		gl.disable(gl.DEPTH_TEST); 

		// Clear the color buffer bit
		gl.clear(gl.COLOR_BUFFER_BIT);
		//deleteBuffers(renderObjects);

		// Set the view port
		gl.viewport(0,0,canvas.width,canvas.height);

		// Pass 1
		//gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		gl.clearBufferfv(gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA);
		// DO UNIFORMS
		gl.useProgram(shaderProgram);
		var resolutionLoc = gl.getUniformLocation(shaderProgram, "iResolution");
		gl.uniform3fv(resolutionLoc, [canvas.width, canvas.height, 0.0]); 
		var timeLoc = gl.getUniformLocation(shaderProgram, "iTime");
		gl.uniform1fv(timeLoc, [(millis-start)/1000.0]);
		// Draw the triangle
		renderObjects.forEach(ob => drawRenderObject(ob)); 
		//Blit framebuffers, no Multisample texture 2d in WebGL 2
		//gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
		//gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		//gl.clearBufferfv(gl.COLOR, 0, [1.0, 1.0, 1.0, 0.0]);
		//gl.blitFramebuffer(
		//	0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
		//	0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
		//	gl.COLOR_BUFFER_BIT, gl.NEAREST
		//);

		transform();
		window.setTimeout(renderLoop, 1000.0/60.0);
	}
	renderLoop();

	//TODO, continue fan code. You haven't tested it yet, and you havent tested the object being used to pass around buffer references
}
