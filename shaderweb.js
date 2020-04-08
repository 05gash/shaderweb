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
var gl = canvas.getContext('experimental-webgl');

checkExtensions(gl);	
/* Step2: Define the geometry and store it in buffer objects */

var vertices = [
		 -1.0,  1.0, //triangle 1
		 -1.0, -1.0,
		  1.0,  1.0,
		 -1.0, -1.0, //triangle 2
		  1.0, -1.0,
		  1.0,  1.0
		];

// Create a new buffer object
var vertex_buffer = gl.createBuffer();

// Bind an empty array buffer to it
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

// Pass the vertices data to the buffer
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

// Unbind the buffer
gl.bindBuffer(gl.ARRAY_BUFFER, null);

/* Step3: Create and compile Shader programs */

// Vertex shader source code
var vertCode =
`
   attribute vec2 coordinates;
   void main(void) {
	gl_Position = vec4(coordinates,0.0, 1.0);
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

var fragCode = `
	#extension GL_OES_standard_derivatives : enable
	precision highp float;
	uniform vec3 iResolution;
	uniform float iTime;
	// *TODO* uniform samplerXX iChannel;

`
//    + ( commonShader.shader ? commonShader.shader : "" ) + //using falseyness of undefined 
    + mainShader.shader + 
`

	void main(void) {
		mainImage(gl_FragColor, gl_FragCoord.xy);
		gl_FragColor.a = 1.0;
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

/* Step 4: Associate the shader programs to buffer objects */

//Bind vertex buffer object
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

//Get the attribute location
var coord = gl.getAttribLocation(shaderProgram, "coordinates");

//point an attribute to the currently bound VBO
gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);

//Enable the attribute
gl.enableVertexAttribArray(coord);

/* Step5: Drawing the required object (triangle) */

var d = new Date();
var start = d.getTime();

function drawStrip(path){
	//we want to bind the shader program we're using

	const width = 0.03;

	//openGL screen space coordinates
	var strip = [];
	//compute triangle strip coords
	for (i = 0; i < path.length; i++){
		if(i == 0){
			console.log("begin");
			a = path[i]
			b = path[i+1]
			line = (b.subtract(a)).toUnitVector();
			perpendicular = line.rotate(Math.PI/2, Vector.Zero(2));
			strip = strip.concat(a.add(perpendicular.x(width)).elements);
			strip = strip.concat(a.add(perpendicular.x(-width)).elements);
		}
		else if (i == path.length - 1){ // we're at the end
			console.log("end");
			a = path[i - 1]
			b = path[i]
			line = (b.subtract(a)).toUnitVector();
			perpendicular = line.rotate(Math.PI/2, Vector.Zero(2));
			strip = strip.concat(b.add(perpendicular.x(width)).elements);
			strip = strip.concat(b.add(perpendicular.x(-width)).elements);
		}
		else{
			console.log("middle");
			a = path[i-1]
			b = path[i]
			c = path[i+1]
			ab = (b.subtract(a)).toUnitVector();
			bc = (c.subtract(b)).toUnitVector();
			
			line = (ab.add(bc)).x(0.5);
			perpendicular = line.rotate(Math.PI/2, Vector.Zero(2));
			strip = strip.concat(b.add(perpendicular.x(width)).elements);
			strip = strip.concat(b.add(perpendicular.x(-width)).elements);
		}

	}
	console.log(strip)

	// Create a new buffer object
	var vertex_buffer = gl.createBuffer();

	// Bind an empty array buffer to it
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

	// Pass the vertices data to the buffer
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(strip), gl.STATIC_DRAW);

	//Get the attribute location
	var coord = gl.getAttribLocation(shaderProgram, "coordinates");

	//point an attribute to the currently bound VBO
	gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);

	//Enable the attribute
	gl.enableVertexAttribArray(coord);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, path.length*2);
}

var path = [
	$V([-0.9, -0.9]), 
	$V([-0.9, -0.7]), 
	$V([0.9, 0.9])
	];

function getMousePosition(canvas, event) { 
            let rect = canvas.getBoundingClientRect(); 
            let x = event.clientX - rect.left; 
            let y = event.clientY - rect.top; 
            console.log("Coordinate x: " + x,  
                        "Coordinate y: " + y); 
        } 

function renderLoop(){
	var d = new Date();
	var millis = (new Date()).getTime();

	// Clear the canvas
	gl.clearColor(0.8, 0.5, 0.5, 1.0);

	// Enable the depth test
	gl.enable(gl.DEPTH_TEST); 
	
	// Clear the color buffer bit
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Set the view port
	gl.viewport(0,0,canvas.width,canvas.height);

	// DO UNIFORMS
	var resolutionLoc = gl.getUniformLocation(shaderProgram, "iResolution");
	gl.uniform3fv(resolutionLoc, [canvas.width, canvas.height, 0.0]); 
	var timeLoc = gl.getUniformLocation(shaderProgram, "iTime");
	gl.uniform1fv(timeLoc, [(millis-start)/1000.0]);

	// Draw the triangle
	drawStrip()	
	//window.setTimeout(renderLoop, 1000.0/60.0);
}
renderLoop();
}
