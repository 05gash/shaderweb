out vec3 out_col;
out vec2 texCoords;

uniform float width;
uniform vec3 iResolution;
uniform mat4 mvp;

uniform float aperture;
uniform float focalLength;
uniform float planeInFocus;

float coc(float depth){
	return max(4.0, abs(aperture*(focalLength*(planeInFocus - depth))/(depth*(planeInFocus - focalLength))));
}
 
void main(void) {
	int x = gl_VertexID / 2;
	int y = gl_VertexID % 2;
	vec4 coords = mvp*coordinates;
	float coc = coc(1./coords.z);
	float life = smoothstep(0.3, .4, length(coordinates.xyz))*smoothstep(2.0, 1.95, length(coordinates.xyz));
	coords.xy = coords.xy + (vec2(x,y)*2. - 1.)*coc*life/iResolution.x,  + null_position.xy;
	gl_Position = coords;
//	gl_Position = vec4((vec2(x, y)*2. - 1.)*width + coords.xy + null_position.xy, coords.z, 1.);

	gl_Position.y *= iResolution.x/iResolution.y;

	gl_Position.xy *=2.;
	gl_Position.xy -=1.;
	out_col = 10.*colour*life/(2.*pi*pow(coc, 2.0));
	texCoords = vec2(x,y);
}
