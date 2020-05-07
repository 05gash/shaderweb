uniform vec2 particle_limits;

out vec2 out_coords;

float random(float x){
	return fract(sin(x)*100000.);
}

vec2 randomTwoVec(vec2 p){
	return vec2(random(p.x * float(gl_VertexID)), random(p.y * float(gl_VertexID)));
}
vec3 getNextStep(vec2 pos, float stepSize){
	if (abs(pos.x) > 1. + particle_limits.x){
		pos = vec2(-particle_limits.x, random(float(gl_VertexID)*pos.y));
	}
	if (abs(pos.y) > 1. + particle_limits.y){
		pos = vec2(-particle_limits.y, random(float(gl_VertexID)*pos.x)).yx;
	}
	float theta = getFlowField(pos);
	return vec3(pos + stepSize*vec2(cos(theta), sin(theta)), theta);
}

void main(void) {
	float stepSize = 0.001;
	out_coords = getNextStep(coordinates, stepSize).xy;
}
