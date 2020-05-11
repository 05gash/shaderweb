in vec2 texCoords;

uniform sampler2D frame;

out vec4 fragColour;

//float getCoverage(){
//	
//	float dist = (length(texCoords - vec2(.5))); 
//	float anti;
//	anti = max(abs(dFdx(dist)), abs(dFdy(dist)));
//	float boundary = (0.1+0.1*snoise(3.*gl_FragCoord.xy/iResolution.xy))*smoothstep(0.0, 500., lifetime);
//	float blend = smoothstep(boundary - anti, boundary + anti, dist);
//
//	return blend;
//}

void main(void) {
	fragColour.xyz = texture(frame, texCoords).xyz;
	fragColour.w = 0.0;
}
