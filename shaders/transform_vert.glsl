uniform vec2 particle_limits;

out vec2 out_coords;

float random(float x){
	return fract(sin(x)*100000.);
}

vec2 randomTwoVec(vec2 p){
	return vec2(random(p.x * float(gl_VertexID)), random(p.y * float(gl_VertexID)));
}
vec3 getNextStep(vec2 pos, float stepSize){
	float bounds = particle_limits.x*2. + 1.;
	if (pos.x > 1. + particle_limits.x || pos.x < -particle_limits.x || pos.y < -particle_limits.y || pos.y > 1. + particle_limits.y){
		pos = randomTwoVec(pos)*bounds - particle_limits.x;
	}
	float theta = getFlowField(pos);
	return vec3(pos + stepSize*vec2(cos(theta), sin(theta)), theta);
}

void main(void) {
	float stepSize = 0.0001;
	out_coords = getNextStep(coordinates, stepSize).xy;
}
