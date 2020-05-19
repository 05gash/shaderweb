uniform vec2 iResolution;

out vec4 out_coords;

float random(float x){
	return fract(sin(x)*100000.);
}

vec2 randomTwoVec(vec2 p){
	return vec2(random(p.x * float(gl_VertexID) + iTime), random(p.y * float(gl_VertexID) + iTime));
}
vec4 getNextStep(vec4 pos, float stepSize){
	//NOTE bounds are at 1.0
	//
	////TODO double check this logic, might as well do a proper perspective correct later on in the main pipeline makes sense that this simulation be in screen space tho 
	//if (pos.x > 1.1 || pos.x < -.1 || pos.y < -.1/ratio || pos.y > 1.1/ratio){
	//	pos.xy = randomTwoVec(pos.xy);
	//	pos.x*= 1.2;
	//	pos.x-= .1;
	//	pos.y*= 1.2/ratio;
	//	pos.y-= .1/ratio;
	//}
	
	if( length(pos.xyz) > 2.){
		vec2 twoVec = 2.*pi*randomTwoVec(pos.xy);
		return vec4(0.2*cos(twoVec.x)*sin(twoVec.y), 0.2*sin(twoVec.x)*sin(twoVec.y), 0.2*cos(twoVec.y), 1.0);
	}
	else{
		float theta = 2.*pi*getFlowField(pos.xyz);
		return vec4(pos.x + stepSize*cos(theta), pos.y, pos.z + stepSize*sin(theta), pos.w);//stepSize*vec2(cos(theta), sin(theta)), pos.z, 1.0);
	}
	
}

void main(void) {
	float stepSize = 0.0001;
	
	out_coords = getNextStep(coordinates, stepSize);
	//
	//float i = float(gl_VertexID);
	//float t = iTime;
	////float x=i-t/3.;
	////vec3 ab = -1.5 - 3.*vec3(cos(x),sin(x),10.*cos(i/10.));
	//////abt.xy*=ab.xy;
	//float ratio = iResolution.x/iResolution.y;

	////shape1
	//float theta = i/42. + t/5.;
	//float phi = mod(i, 57.) - t/20.;
	//vec3 shape1 = vec3(ratio*cos(theta)*sin(phi), sin(theta)*sin(phi), cos(phi));

	////shape 2
	//float x = floor(i/31.)/31.;
	//float y = mod(i,31.)/31.;
	//vec3 shape2 = vec3(x, sin(x + y), y);

	//float param = sin(iTime);
	//param *= param*param;
	//out_coords.xyz = param*shape1 + (1.0 - param)*shape2;
	//out_coords.w = 1.0;
}
