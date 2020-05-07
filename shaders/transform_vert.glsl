uniform vec2 particle_limits;

out vec2 out_coords;

float random(float x){
	return fract(sin(x)*100000.);
}

vec2 randomTwoVec(vec2 p){
	return vec2(random(p.x * float(gl_VertexID)), random(p.y * float(gl_VertexID)));
}
vec3 getNextStep(vec2 pos, float stepSize){
	float theta = getFlowField(pos);
	if (abs(pos.x) > particle_limits.x || abs(pos.y) > particle_limits.y){
		pos = randomTwoVec(pos)*2.*particle_limits - 1.*particle_limits;
	}
	return vec3(pos + stepSize*vec2(cos(theta), sin(theta)), theta);
}

void main(void) {
	float stepSize = 0.001;
	out_coords = getNextStep(coordinates, stepSize).xy;
}
