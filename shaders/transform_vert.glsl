uniform vec2 iResolution;

out vec4 out_coords;

float random(float x){
	return fract(sin(x)*100000.);
}

vec2 randomTwoVec(vec2 p){
	return vec2(random(p.x * float(gl_VertexID)), random(p.y * float(gl_VertexID)));
}
vec4 getNextStep(vec4 pos, float stepSize){
	float lifetime = pos.z + 1.;

	float ratio = iResolution.x/iResolution.y;
	////TODO double check this logic, might as well do a proper perspective correct later on in the main pipeline makes sense that this simulation be in screen space tho 
	//if (pos.x > 1.1 || pos.x < -.1 || pos.y < -.1/ratio || pos.y > 1.1/ratio){
	//	pos.xy = randomTwoVec(pos.xy);
	//	pos.x*= 1.2;
	//	pos.x-= .1;
	//	pos.y*= 1.2/ratio;
	//	pos.y-= .1/ratio;
	//}
	float theta = 2.*pi*getFlowField(pos.yz/2.);
	return vec4(pos.x, pos.y + stepSize*cos(theta), pos.z + stepSize*sin(theta), 1.0);//stepSize*vec2(cos(theta), sin(theta)), pos.z, 1.0);
}

void main(void) {
	float stepSize = 0.003;
	//out_coords = getNextStep(coordinates, stepSize);
	
	float i = float(gl_VertexID);
	float t = iTime;
	//float x=i-t/3.;
	//vec3 ab = -1.5 - 3.*vec3(cos(x),sin(x),10.*cos(i/10.));
	////abt.xy*=ab.xy;
	float ratio = iResolution.x/iResolution.y;

	//shape1
	float theta = i/42. + t/5.;
	float phi = mod(i, 57.) - t/20.;
	vec3 shape1 = vec3(ratio*cos(theta)*sin(phi), sin(theta)*sin(phi), -5.*cos(phi) - 10.);

	//shape 2
	float x = -1.3 + floor(i/200.)/4.;
	float y = -4.-mod(i,100.)/4.; 
	vec3 shape2 = vec3(ratio*x, 0.1*sin(t/5. + x + y), y);

	float param = smoothstep(10., 24., t);
	param *= param*param;
	out_coords.xyz = param*shape1 + (1.0 - param)*shape2;
	out_coords.w = 1.0;
}
