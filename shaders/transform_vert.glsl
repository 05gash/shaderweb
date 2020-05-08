uniform vec2 iResolution;

out vec3 out_coords;

float random(float x){
	return fract(sin(x)*100000.);
}

vec2 randomTwoVec(vec2 p){
	return vec2(random(p.x * float(gl_VertexID)), random(p.y * float(gl_VertexID)));
}
vec3 getNextStep(vec3 pos, float stepSize){
	float lifetime = pos.z + 1.;
	float ratio = iResolution.x/iResolution.y;

	//TODO double check this logic, might as well do a proper perspective correct later on in the main pipeline makes sense that this simulation be in screen space tho 
	if (pos.x > 1.1 || pos.x < -.1 || pos.y < -.1/ratio || pos.y > 1.1/ratio){
		pos.xy = randomTwoVec(pos.xy);
		pos.x*= 1.2;
		pos.x-= .1;
		pos.y/= ratio*1.2;
		pos.y-= ratio*.1;
		lifetime = 0.;
	}
	float theta = getFlowField(pos.xy);
	return vec3(pos.xy + stepSize*vec2(cos(theta), sin(theta)), lifetime);
}

void main(void) {
	float stepSize = 0.0003;
	out_coords = getNextStep(coordinates, stepSize);
}
