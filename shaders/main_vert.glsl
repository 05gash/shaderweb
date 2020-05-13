out vec3 out_col;
out vec2 texCoords;

uniform float width;
uniform vec3 iResolution;
uniform mat4 perspective;

vec3 doWalk(int numSteps){
	float stepSize = 0.005;
       	vec2 pos = coordinates.xy;
        float theta = getFlowField(pos);
        for (int i = 0; i<numSteps; i++){
               pos += stepSize*vec2(cos(theta), sin(theta));   
               theta = getFlowField(pos);
       }
       return vec3(pos, theta);
}

float coc(float depth){
	float aperture = 111.0;
	float focalLength = 6.5;
	float planeInFocus = 4.8 + 0.5*sin(iTime/5.);
	return max(4.0, abs(aperture*(focalLength*(planeInFocus - depth))/(depth*(planeInFocus - focalLength))));
}
 
void main(void) {
	int x = gl_VertexID / 2;
	int y = gl_VertexID % 2;
	vec4 coords = perspective*coordinates;
	float coc = coc(abs(coordinates.z));
	coords.xy = coords.xy + (vec2(x,y)*2. - 1.)*coc/iResolution.x,  + null_position.xy;
	gl_Position = coords;
//	gl_Position = vec4((vec2(x, y)*2. - 1.)*width + coords.xy + null_position.xy, coords.z, 1.);

	gl_Position.y *= iResolution.x/iResolution.y;

	gl_Position.xy *=2.;
	gl_Position.xy -=1.;
	out_col = colour/(2.*pi*pow(coc, 2.0));
	texCoords = vec2(x,y);
}
