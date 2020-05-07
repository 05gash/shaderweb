out float dist;
uniform float iTime;
uniform float width;

vec3 doWalk(int numSteps){
	float stepSize = 0.005;
       	vec2 pos = coordinates;
        float theta = getFlowField(pos);
        for (int i = 0; i<numSteps; i++){
               pos += stepSize*vec2(cos(theta), sin(theta));   
               theta = getFlowField(pos);
       }
       return vec3(pos, theta);
}
 
void main(void) {
	vec3 pos = doWalk(gl_VertexID/2) + null_position.xyz;

	if (gl_VertexID % 2 == 0){
		gl_Position = vec4(pos.xy + 2.*width*vec2(cos(pos.z+pi/2.), sin(pos.z+pi/2.)), 0.0, 1.0);
		dist = 2.*width;
	}
	else{
		gl_Position = vec4(pos.xy - 2.*width*vec2(cos(pos.z+pi/2.), sin(pos.z+pi/2.)), 0.0, 1.0);
		dist = -2.*width;
	}
	gl_Position.xy *=2.0;
	gl_Position.xy -=1.0;
}
