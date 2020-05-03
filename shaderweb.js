function getShader(canvasName, bufferName){
	const uri = 'shaderweb/' + canvasName + '/' + bufferName + '.glsl';
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
async function getShaders(canvasName){
	const shaderNames = ['main', 'buffer1', 'common'];
	const shaderVals = await Promise.all(shaderNames.map(shader => getShader(canvasName, shader)));
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


	// Vertex shader source code
	var vertCode =
		`#version 300 es
	in vec3 coordinates;
	out float dist;
	void main(void) {
		dist = coordinates.z;
		gl_Position = vec4(2.0*coordinates.xy - vec2(1.0) ,0.0, 1.0);
	}
	`;

	//Create a vertex shader object
	var vertShader = gl.createShader(gl.VERTEX_SHADER);

	//Attach vertex shader source code
	gl.shaderSource(vertShader, vertCode);

	//Compile the vertex shader
	gl.compileShader(vertShader);

	doCheck(vertShader, vertCode);
	//Fragment shader source code

	var shaders = await getShaders(canvasName);
	var mainShader = shaders.find( shader => shader.name == 'main');
	var commonShader = shaders.find( shader => shader.name == 'common');

	var fragCode = `#version 300 es
	#extension GL_OES_standard_derivatives : enable
	precision highp float;
	uniform vec3 iResolution;
	uniform vec4 colour;
	uniform float iTime;
	uniform float width;
	in float dist;
	out vec4 fragColour;
	// *TODO* uniform samplerXX iChannel;
	` +
	`

	vec3 blockRender(float d, vec3 color){
		float distanceFunction = abs(dist) - width;
		float anti;
		anti = max(abs(dFdx(distanceFunction)), abs(dFdy(distanceFunction)));
		anti = fwidth(distanceFunction);
		float blend;

		blend =	.5 - .75*distanceFunction/anti;

		return vec3(blend);
	}
	void main(void) {
		fragColour.xyz = blockRender(dist, colour.xyz);
		fragColour.w = 1.0;
	}
	`;

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

	// Link both programs
	gl.linkProgram(shaderProgram);


	// Use the combined shader program object
	gl.useProgram(shaderProgram);
	/* Step5: Drawing the required object (triangle) */

	var d = new Date();
	var start = d.getTime();


	function getRenderObject(vertices, renderStyle, colour, width){
		// Create a new buffer object
		var vertex_buffer = gl.createBuffer();

		// Bind an empty array buffer to it
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

		// Pass the vertices data to the buffer
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

		return {
			vbo: vertex_buffer,
			renderStyle: renderStyle,
			size: vertices.length/3,
			colour: colour,
			width: width
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

		gl.drawArrays(ob.renderStyle, 0, ob.size);
	}

	function deleteBuffers(renderObjects){
		renderObjects.forEach(ob => gl.deleteBuffer(ob.vbo));
	}

	//recomputes Vertices for a path, returns the renderObjects for that path
	function recomputeVertices(vertexPath, width, colour){
		// TODO this needs refactoring very soon, smells bad
		const numFanSegments = 10;
		//delete the old buffer
		//we want to bind the shader program we're using

		var strip = [];
		var fanBeg = [];
		var fanEnd = [];
		//compute triangle strip coords
		for (i = 0; i < vertexPath.length-1; i++){
			a = vertexPath[i]
			b = vertexPath[i+1]
			ab = (b.subtract(a)).toUnitVector();

			perpendicular = ab.rotate(Math.PI/2, Vector.Zero(2));
			strip = strip.concat(a.add(perpendicular.x(2*width)).elements).concat(2*width);
			strip = strip.concat(a.add(perpendicular.x(-2*width)).elements).concat(-2*width);
			strip = strip.concat(b.add(perpendicular.x(2*width)).elements).concat(2*width);
			strip = strip.concat(b.add(perpendicular.x(-2*width)).elements).concat(-2*width);

			// compute fan strips, TODO merge the below code into one
			if (i == 0){
				fanBeg = a.elements.concat(0);
				for (j = 0; j <= numFanSegments; j++){
					var newVector = perpendicular.rotate(Math.PI*(j/numFanSegments), Vector.Zero(2));
					fanBeg = fanBeg.concat(a.add(newVector.x(2*width)).elements).concat(2*width);
				}
			}
			else if (i == vertexPath.length - 2){
				fanEnd = b.elements.concat(0);
				for (j = 0; j <= numFanSegments; j++){
					var newVector = perpendicular.rotate(Math.PI*(-j/numFanSegments), Vector.Zero(2)); //TODO this is mostly duplicate code of that above :(
					fanEnd = fanEnd.concat(b.add(newVector.x(2*width)).elements).concat(2*width);
				}
			}
		}
		renderObjects = [
			getRenderObject(strip, gl.TRIANGLE_STRIP, colour, width),
			getRenderObject(fanBeg, gl.TRIANGLE_FAN, colour, width),
			getRenderObject(fanEnd, gl.TRIANGLE_FAN, colour, width)
		];
		return renderObjects;
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

	function doPaintStroke(path, colour, width){
		renderObjects = renderObjects.concat(recomputeVertices(path, width, colour));
	}

	//calculate the actual paths
	const spacing = 0.1;
	const numSegments = 200.;
	const startRad = 0.3;
	var path = []
	for (var step = 0.0; step < Math.PI; step += 2*Math.PI/numSegments){
		path = path.concat($V([ 0.5 + startRad*Math.cos(step), 0.5 + startRad*Math.sin(step)]));
	}
	doPaintStroke(path, $V([0.1, 0.2 + Math.sin(startRad), 0.8, 1.0]), 0.01);

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

		// DO UNIFORMS
		var resolutionLoc = gl.getUniformLocation(shaderProgram, "iResolution");
		gl.uniform3fv(resolutionLoc, [canvas.width, canvas.height, 0.0]); 
		var timeLoc = gl.getUniformLocation(shaderProgram, "iTime");
		gl.uniform1fv(timeLoc, [(millis-start)/1000.0]);

		// Draw the triangle
		renderObjects.forEach(ob => drawRenderObject(ob));

		//window.setTimeout(renderLoop, 1000.0/60.0);
		//Blit framebuffers, no Multisample texture 2d in WebGL 2
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
		gl.blitFramebuffer(
		    0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
		    0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
		    gl.COLOR_BUFFER_BIT, gl.NEAREST
		);
	}
	renderLoop();
	//TODO, continue fan code. You haven't tested it yet, and you havent tested the object being used to pass around buffer references
}
