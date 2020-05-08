uniform vec2 particle_limits;

out vec3 out_coords;

float random(float x){
	return fract(sin(x)*100000.);
}

vec2 randomTwoVec(vec2 p){
	return vec2(random(p.x * float(gl_VertexID)), random(p.y * float(gl_VertexID)));
}
vec3 getNextStep(vec3 pos, float stepSize){
	float lifetime = pos.z + 1.;
	float bounds = particle_limits.x*2. + 1.;
	if (pos.x > 1. + particle_limits.x || pos.x < -particle_limits.x || pos.y < -particle_limits.y || pos.y > 1. + particle_limits.y){
		pos.xy = randomTwoVec(pos.xy)*bounds - particle_limits.x;
		lifetime = 0.;
	}
	float theta = getFlowField(pos.xy);
	return vec3(pos.xy + stepSize*vec2(cos(theta), sin(theta)), lifetime);
}

void main(void) {
	float stepSize = 0.0003;
	out_coords = getNextStep(coordinates, stepSize);
}
