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

	async function getShaderProgram(name, feedback_varyings){
		//TODO we're defining our sdf as having a boundary at width

		var shaders = await getShaders(name);
		var vertCode = shaders.find( shader => shader.name == 'vert').shader;

		//Create a vertex shader object
		var vertShader = gl.createShader(gl.VERTEX_SHADER);

		//Attach vertex shader source code
		gl.shaderSource(vertShader, vertCode);

		//Compile the vertex shader
		gl.compileShader(vertShader);

		doCheck(vertShader, vertCode);
		//Fragment shader source code

		var fragCode = shaders.find( shader => shader.name == 'frag').shader;

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
	var gl = canvas.getContext('webgl2');

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

	//TODO we're defining our sdf as having a boundary at width
	// Use the combined shader program object
	shaderProgram = await getShaderProgram("main")
	gl.useProgram(shaderProgram);
	/* Step5: Drawing the required object (triangle) */

	var d = new Date();
	var start = d.getTime();


	function getStripObject(numSegments, startingPositions, colour, width){
		// Create a new buffer object
		var vertex_buffer = gl.createBuffer();

		// Bind an empty array buffer to it
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

		// Pass the vertices data to the buffer
		//2 vertices per segment, 3 attributes per vertex: x, y, dist
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(numSegments*3*2), gl.STATIC_DRAW);


		// Create a new buffer object
		var positions_buffer = gl.createBuffer();

		// Bind an empty array buffer to it
		gl.bindBuffer(gl.ARRAY_BUFFER, positions_buffer);

		// Pass the positions
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(startingPositions), gl.STATIC_DRAW);

		return {
			program: null,
			vbo: vertex_buffer,
			renderStyle: gl.TRIANGLE_STRIP, 
			size: numSegments*2,
			colour: colour,
			width: width,
			instances: startingPositions.length/2,
			instance_attributes: [
				{
					name: "start", 
					buffer:  positions_buffer,
					size: 2
				}
			]
		}
	}

	function drawRenderObject(ob){
		// Bind buffer 
		gl.bindBuffer(gl.ARRAY_BUFFER, ob.vbo);

		//Get the attribute location
		var coord = gl.getAttribLocation(shaderProgram, "coordinates");

		//point an attribute to the currently bound VBO
		gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);

		//Enable the attribute
		gl.enableVertexAttribArray(coord);

		//set uniforms
		var colourLoc = gl.getUniformLocation(shaderProgram, "colour");
		gl.uniform4fv(colourLoc, ob.colour.elements);

		var widthLoc = gl.getUniformLocation(shaderProgram, "width");
		gl.uniform1fv(widthLoc, [ob.width]);

		//instance attributes
		for (var i = 0; i<ob.instance_attributes.length; i++){
			attr = ob.instance_attributes[i];
			gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
			var loc = gl.getAttribLocation(shaderProgram, attr.name);
			gl.enableVertexAttribArray(loc);
			gl.vertexAttribPointer(loc, attr.size, gl.FLOAT, false, 0, 0);
			gl.vertexAttribDivisor(loc, 1);
		}
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
	var startingPositions = [];
	for (i = 0.1; i<0.9; i += 0.1){
		startingPositions = startingPositions.concat([0.1, i]);
	}
	console.log(startingPositions);
		
	renderObjects = renderObjects.concat([getStripObject(100, startingPositions, $V([0.8, 0.5, 0.5, 1.0]), 0.0016)]);


	function renderLoop(){
		var d = new Date();
		var millis = (new Date()).getTime();

		// Enable the depth test
		gl.disable(gl.DEPTH_TEST); 

		// Clear the color buffer bit
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		//deleteBuffers(renderObjects);

		// Set the view port
		gl.viewport(0,0,canvas.width,canvas.height);

		// Pass 1
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
		gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE);

		// DO UNIFORMS
		var resolutionLoc = gl.getUniformLocation(shaderProgram, "iResolution");
		gl.uniform3fv(resolutionLoc, [canvas.width, canvas.height, 0.0]); 
		var timeLoc = gl.getUniformLocation(shaderProgram, "iTime");
		gl.uniform1fv(timeLoc, [(millis-start)/1000.0]);

		// Draw the triangle
		renderObjects.forEach(ob => drawRenderObject(ob)); 
		//Blit framebuffers, no Multisample texture 2d in WebGL 2
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
		gl.blitFramebuffer(
		    0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
		    0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
		    gl.COLOR_BUFFER_BIT, gl.NEAREST
		);
		window.setTimeout(renderLoop, 1000.0/60.0);
	}
	renderLoop();
	
	//TODO, continue fan code. You haven't tested it yet, and you havent tested the object being used to pass around buffer references
}
