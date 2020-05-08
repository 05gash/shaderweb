out vec3 out_col;
out vec2 texCoords;
out float lifetime;

uniform float width;
uniform vec3 iResolution;

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
 
void main(void) {
	int x = gl_VertexID / 2;
	int y = gl_VertexID % 2;
	gl_Position = vec4((vec2(x, y)*2. - 1.)*width + coordinates.xy + null_position.xy, 0., 1.);

	gl_Position.y *= iResolution.x/iResolution.y;

	gl_Position.xy *=2.;
	gl_Position.xy -=1.;
	out_col = colour;
	texCoords = vec2(x,y);
	lifetime = coordinates.z;
}
