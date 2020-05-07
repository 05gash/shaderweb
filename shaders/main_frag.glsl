uniform vec3 iResolution;
uniform vec4 colour;
uniform float iTime;
uniform float width;
in float dist;
out vec4 fragColour;
// *TODO* uniform samplerXX iChannel;

vec3 blockRender(float d, vec3 color){
	float distanceFunction = abs(dist) - width;
	float anti;
	anti = max(abs(dFdx(distanceFunction)), abs(dFdy(distanceFunction)));
	//anti = abs(fwidth(distanceFunction));
	//anti = abs(dFdx(distanceFunction)) + abs(dFdy(distanceFunction));
	float blend;

	blend =	clamp(.5 - .75*distanceFunction/anti, 0., 1.);
	//blend = step(distanceFunction, 0.);
	//blend = step(distanceFunction, 0.);

	return colour.xyz*blend;
}
void main(void) {
	fragColour.xyz = blockRender(dist, colour.xyz);
	fragColour.w = 1.0;
}
