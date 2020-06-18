function getShader(name, project){
    const uri = 'shaderweb/shaders/' + project + '/' + name;
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

/*
 * returns a tagged array, each element has a name and a shader'
 * each represents a render pass. The main buffer uses the screen as a rendertarget
 */

async function getShaders(name, project){
    const shaderNames = ['frag', 'vert'];
    const shaderVals = await Promise.all(shaderNames.map(shaderType => getShader(name + '_' + shaderType + '.glsl', project)));
    const shaders = shaderNames.map( (name, index) => ({name : name, shader: shaderVals[index]}) );
    return shaders
}

async function go(){
    function getUrlParameter(name) {
        var url = new URL(window.location.href);
        return url.searchParams.get(name);
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

        var project = getUrlParameter('pr');
        var shaders = await getShaders(name, project);
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
        gl.getExtension('EXT_float_blend');
    }

    //END HELPERS
    var canvas = document.getElementById("particles");
    var gl = canvas.getContext('webgl2', {alpha: false});

    checkExtensions(gl);

    //create our MSAA rendertarget

    var FRAMEBUFFER_SIZE = {
        x: canvas.width,
        y: canvas.height
    };

    // -- Init Frame Buffers
    var textures = [
        0,
        0
    ];
    var framebuffers = [
        0, 
        0
    ];

    function doFBOSetup(fboIdx){
        textures[fboIdx] = gl.createTexture();
        framebuffers[fboIdx] = gl.createFramebuffer();
        gl.bindTexture(gl.TEXTURE_2D, textures[fboIdx]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y, 0, gl.RGBA, gl.FLOAT, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[fboIdx]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[fboIdx], 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    var readingFBO = 0;

    for(var i = 0; i<2; i++){
        doFBOSetup(i);
    }

    /* Create and compile Shader programs */

    commonShaders = await getShaders("common", getUrlParameter("pr"));
    //NOTE: we're defining our sdf as having a boundary at width
    // Use the combined shader program object
    shaderProgram = await getShaderProgram("main", commonShaders);

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

    const mouseInput = true;
    var isDrawing = false;
    mousePos = [0, 0]
    pointerPos = [0, 0];
    mouseVel = [0, 0];

    canvas.addEventListener("mousedown", function(e) 
        { 
            isDrawing = true;
        }); 
    canvas.addEventListener("mousemove", function(e) 
        { 
            if (isDrawing){
                mousePos = getMousePosition(canvas, e);
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


    // set up our starting positions

    NUM_COLOURS = 3;
    var startingPositions = [];
    var colours = [];

    function random(){
        return Math.random()*1.2 - 0.1;
    }

    startingPositions = new Float32Array(16);

    // -- Init Vertex Array
    var POSITION_LOCATION = 0;
    var NUM_LOCATIONS = 1;

    var currentSourceIdx = 0;

    var vertexArrays = [gl.createVertexArray(), gl.createVertexArray()];

    // Transform feedback objects track output buffer state
    var transformFeedbacks = [gl.createTransformFeedback(), gl.createTransformFeedback()];

    var vertexBuffers = new Array(vertexArrays.length);

    for (var va = 0; va < vertexArrays.length; ++va) {
        gl.bindVertexArray(vertexArrays[va]);
        vertexBuffers[va] = new Array(NUM_LOCATIONS);

        vertexBuffers[va][POSITION_LOCATION] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[va][POSITION_LOCATION]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(4*3), gl.STATIC_DRAW); //empty V buffer of our procedural squares 4 vertices*3 per vert
        gl.vertexAttribPointer(POSITION_LOCATION, 3, gl.FLOAT, false, 0, 0); //NOTE this
        gl.enableVertexAttribArray(POSITION_LOCATION);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
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

            FRAMEBUFFER_SIZE = {
                x: canvas.width,
                y: canvas.height
            };
            for (var i = 0; i<2; i++){
                gl.deleteFramebuffer(framebuffers[i]);
                gl.deleteTexture(textures[i]);
                doFBOSetup(i);
            }
        }
    }

    function readingBuffer()
    {
        return readingFBO;
    }
    function writingBuffer(){
        return (readingBuffer() + 1) % 2;
    }
    
    var frameNo = 0;

    function doFullscreenQuad(timeMillis){
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[writingBuffer()]);
        gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
        // Clear the color buffer bit
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(shaderProgram);	

        var resolutionLoc = gl.getUniformLocation(shaderProgram, "iResolution");
        gl.uniform3fv(resolutionLoc, [canvas.width, canvas.height, 0.0]); 
        var timeLoc = gl.getUniformLocation(shaderProgram, "iTime");
        gl.uniform1fv(timeLoc, [timeMillis]);

        var iFrameLoc = gl.getUniformLocation(shaderProgram, "iFrame");
        gl.uniform1i(iFrameLoc, frameNo);

        // Draw the triangle
        gl.bindTexture(gl.TEXTURE_2D, textures[readingBuffer()]);
        //set uniforms
        var textureLoc = gl.getUniformLocation(shaderProgram, "frame");
        gl.uniform1i(textureLoc, textures[readingBuffer()]);

        gl.bindVertexArray(vertexArrays[currentSourceIdx]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function doPostProcess(){
        //we need to: 
        //set up our texture for post DONE
        //set up our shader program for post DONEISH
        //bind the texture in as a uniform to the pass
        //draw a fullscreen quad
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.useProgram(postProgram);	

        gl.bindTexture(gl.TEXTURE_2D, textures[writingBuffer()]);

        //set uniforms
        var textureLoc = gl.getUniformLocation(postProgram, "frame");
        gl.uniform1i(textureLoc, textures[readingBuffer()]);

        gl.bindVertexArray(vertexArrays[currentSourceIdx]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        readingFBO = writingBuffer();
        frameNo = frameNo + 1;
    }

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

    function renderLoop(){
        resize(canvas);
        var d = new Date();
        var millis = (new Date()).getTime();
        var timeMillis = (millis-start)/1000.0;

        // Enable the depth test
        gl.disable(gl.DEPTH_TEST); 

        gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
        // Clear the color buffer bit
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Set the view port
        gl.viewport(0,0,canvas.width,canvas.height);

        // Pass 1
        //gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        //gl.enable(gl.BLEND);
        //gl.blendFunc(gl.ONE, gl.ONE);
        // DO UNIFORMS
        gl.useProgram(shaderProgram);

        doFullscreenQuad(timeMillis);
        doPostProcess();
        window.requestAnimationFrame(renderLoop);
    }
    window.requestAnimationFrame(renderLoop);
}
