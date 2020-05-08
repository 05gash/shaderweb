uniform vec3 iResolution;
uniform float iTime;
uniform float width;

in float dist;
in vec3 out_col;

out vec4 fragColour;
// *TODO* uniform samplerXX iChannel;

float getCoverage(float d){
	float distanceFunction = abs(dist) - width;
	float anti;
	anti = max(abs(dFdx(distanceFunction)), abs(dFdy(distanceFunction)));
	//anti = abs(fwidth(distanceFunction));
	//anti = abs(dFdx(distanceFunction)) + abs(dFdy(distanceFunction));
	float blend;

	blend = 1.-	clamp(.5 - .75*distanceFunction/anti, 0., 1.);
	//blend = 1. - smoothstep(-anti, anti, distanceFunction);
	//blend = step(distanceFunction, 0.);

	return blend;
}

void main(void) {
	fragColour.xyz = out_col;
	fragColour.w = getCoverage(dist);
	
}
