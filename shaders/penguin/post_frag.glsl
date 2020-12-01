in vec2 texCoords;

uniform sampler2D frame;

out vec4 fragColour;

void main(void) {
	vec3 col = texture(frame, texCoords).xyz;
	col.rgb*=3.;
	fragColour.xyz = lin2srgb(col/(1. + col));
	fragColour.w = 0.0;
}
