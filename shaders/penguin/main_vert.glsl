out vec2 texCoords;

void main(void) {
	int x = gl_VertexID / 2;
	int y = gl_VertexID % 2;
	gl_Position = vec4(x, y, 1., 1.);

	gl_Position.xy *=2.;
	gl_Position.xy -=1.;
	texCoords = vec2(x,y);
}
