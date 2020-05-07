uniform vec3 iResolution;
uniform vec4 colour;
uniform float iTime;
uniform float width;
in float dist;
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
	fragColour = colour;
	fragColour.w = getCoverage(dist);
	
}
