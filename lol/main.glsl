float sdSphere(vec2 p, float radius)
{    
    return length(p) - radius;
}

float sdEllipse( in vec2 p, in vec2 ab )
{
    p = abs(p); if( p.x > p.y ) {p=p.yx;ab=ab.yx;}
    float l = ab.y*ab.y - ab.x*ab.x;
    float m = ab.x*p.x/l;      float m2 = m*m; 
    float n = ab.y*p.y/l;      float n2 = n*n; 
    float c = (m2+n2-1.0)/3.0; float c3 = c*c*c;
    float q = c3 + m2*n2*2.0;
    float d = c3 + m2*n2;
    float g = m + m*n2;
    float co;
    if( d<0.0 )
    {
	float h = acos(q/c3)/3.0;
	float s = cos(h);
	float t = sin(h)*sqrt(3.0);
	float rx = sqrt( -c*(s + t + 2.0) + m2 );
	float ry = sqrt( -c*(s - t + 2.0) + m2 );
	co = (ry+sign(l)*rx+abs(g)/(rx*ry)- m)/2.0;
    }
    else
    {
	float h = 2.0*m*n*sqrt( d );
	float s = sign(q+h)*pow(abs(q+h), 1.0/3.0);
	float u = sign(q-h)*pow(abs(q-h), 1.0/3.0);
	float rx = -s - u - c*4.0 + 2.0*m2;
	float ry = (s - u)*sqrt(3.0);
	float rm = sqrt( rx*rx + ry*ry );
	co = (ry/sqrt(rm-rx)+2.0*g/rm-m)/2.0;
    }
    vec2 r = ab * vec2(co, sqrt(1.0-co*co));
    return length(r-p) * sign(p.y-r.y);
}

float sdLine( in vec2 p, in vec2 a, in vec2 b, float thinness)
{
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1. );
    return thinness*length( pa - ba*h );
}

float sdVesica(vec2 p, float r, float d)
{
    p = abs(p);
    float b = sqrt(r*r-d*d);
    return ((p.y-b)*d>p.x*b) ? length(p-vec2(0.0,b))
			     : length(p-vec2(-d,0.0))-r;
}

float sdfLine(vec2 p0, vec2 p1, float width, vec2 coord)
{
    vec2 dir0 = p1 - p0;
	vec2 dir1 = coord - p0;
	float h = clamp(dot(dir0, dir1)/dot(dir0, dir0), 0.0, 1.0);
	return (length(dir1 - dir0 * h) - width * 0.5);
}

float sdfUnion( const float a, const float b )
{
    return min(a, b);
}

float sdfDifference( const float a, const float b)
{
    return max(a, -b);
}

float sdfIntersection( const float a, const float b )
{
    return max(a, b);
}

float sdTriangleIsosceles(in vec2 p, in vec2 q )
{
    p.x = abs(p.x);
    vec2 a = p - q*clamp( dot(p,q)/dot(q,q), 0.0, 1.0 );
    vec2 b = p - q*vec2( clamp( p.x/q.x, 0.0, 1.0 ), 1.0 );
    float s = -sign( q.y );
    vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
		  vec2( dot(b,b), s*(p.y-q.y)  ));
    return -sqrt(d.x)*sign(d.y);
}

vec2 rot( in vec2 p, float theta)
{
    float c = cos(theta);
    float s = sin(theta);
    return mat2(c, -s,
		s, c)*p;
}

vec4 render(float d, vec3 color, float stroke)
{
    //stroke = fwidth(d) * 2.0;
    float anti = fwidth(d) * 1.0;
    vec4 strokeLayer = vec4(vec3(0.05), 1.0-smoothstep(-anti, anti, d - stroke));
    vec4 colorLayer = vec4(color, 1.0-smoothstep(-anti, anti, d));

    if (stroke < 0.000001) {
	return colorLayer;
    }
    return vec4(mix(strokeLayer.rgb, colorLayer.rgb, colorLayer.a), strokeLayer.a);
}

vec4 blockRender(float d, vec3 color, float stroke)
{
    
    //stroke = fwidth(d) * 2.0;
    float anti = fwidth(d) * 1.0;
    vec4 colorLayer = vec4(color, 1.0-smoothstep(-anti, anti, d));

    if (stroke < 0.000001) {
	return colorLayer;
    }
    return colorLayer;
}

float sdBox( in vec2 p, in vec2 b )
{
    vec2 d = abs(p)-b;
    return length(max(d,vec2(0))) + min(max(d.x,d.y),0.0);
}

float sdTri( in vec2 p )
{
    p.y = -p.y;
    const float k = sqrt(3.);
    p.x = abs(p.x) - 1.0;
    p.y = p.y + 1.0/k;
    if( p.x+k*p.y>0.0 ) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
    p.x -= clamp( p.x, -2.0, 0.0 );
    return -length(p)*sign(p.y) - .2;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	float size = min(iResolution.x, iResolution.y);
    float pixSize = 1.0 / size;
	vec2 Ouv = fragCoord.xy / iResolution.x;
    float stroke = pixSize * 1.5;
    vec2 center = vec2(0.5, 0.5 * iResolution.y/iResolution.x);
    
    vec2 uv = Ouv;
    uv.x = center.x - abs(uv.x - center.x);
    
    //head
    float face = sdEllipse(uv - center, vec2(0.275 - 0.003*sin(iTime), 0.15));
    float ears = sdVesica(rot(uv - vec2(center), 0.1*sin(sin(iTime))) + vec2(0.13, 0.0), 0.28, 0.15);
    
    float earsInner = sdVesica(rot(uv - vec2(center), 0.1*sin(sin(iTime))) + vec2(0.13, 0.0), 0.27, 0.16);
    earsInner = max(earsInner,-sdEllipse(uv - center, vec2(0.275 - 0.003*sin(iTime), 0.15)));
    earsInner = max(-(uv.y - center.y), earsInner);


    ears = max(-(uv.y - center.y), ears);
    float d = min(ears, face);

    
    //black of face
    float eye = sdEllipse(rot(uv - center, -0.5 + 0.05*sin(iTime)) + vec2(0.14, 0.05), vec2(0.035, 0.045));
    // mouth
    float bF = min(eye, sdLine(rot(uv - center, -0.1*sin(iTime)) - vec2(0., 0.03 - 0.015*sin(iTime)), vec2(0.1, -0.02), vec2(-.015, -0.08),  2.2));

    //whiskers
    for (int i = 0; i<3; i++){
	
	bF = min(bF, sdLine(rot(rot(uv, -length(uv) + 0.35 - 0.02*sin(iTime)) - center, -float(i)*0.1), vec2(-0.26, -0.05), vec2(-.35, -0.1),  10.*length(uv-center)));
    
    }
    
    float eyeSpec = sdSphere(rot(uv - center, -0.25 + 0.06*sin(iTime)) + vec2(0.138, -0.009), 0.02);

    //nose
    float nose = sdTri(70.*(uv - center - vec2(0., 0.008 -0.005*sin(iTime))));
    
    vec4 layer0 = render(d, vec3(0.504, 0.498, 0.378), stroke);
    
    vec4 layer0_5 = blockRender(earsInner, 0.8*vec3(0.504, 0.498, 0.378), stroke);
    
    //eye black
    vec4 layer1 = render(bF, vec3(0.), stroke);
    //eye spec
    vec4 layer2 = blockRender(eyeSpec, vec3(1.), stroke);
    
    //itty bitty kitty nose
    vec4 layer3 = blockRender(nose, vec3(.9, .65, 0.6), stroke);
    
    
    //BG KITTIES
    //uv.x = center.x - abs(uv.x - center.x);
    
    //vec2 bUV = vec2(length(Ouv - center), abs(0.5*atan((Ouv.x - center.x)/(Ouv.y - center.y))));
    
    vec2 bUV = Ouv;

    float rep = 0.06;
    bUV = mod(bUV + rep, 2.*rep) - rep;
    bUV.x = -abs(bUV.x);
    
    float sz = 0.1;
 
    float bgHead = sdEllipse(bUV, vec2(0.05, 0.03));
    float bgEars = sdTri(50.*rot(bUV, 1.4) + vec2(-1.0, -1.7));

    float bgKitty = min(bgEars, bgHead);
    
    bgKitty = max(bgKitty, -sdSphere(bUV+ vec2(0.025, -.007), 0.007));
    bgKitty = max(bgKitty, -sdTri(200.*(bUV)));

   
    
    vec4 bg = 1.3*vec4(0.8, 0.5, .6, 0.);
    vec4 bgKitties = blockRender(bgKitty, 0.94*bg.rgb, stroke);

    fragColor.rgb = mix(bg.xyz, bgKitties.rgb, bgKitties.a);

    fragColor.rgb = mix(fragColor.xyz, layer0.rgb, layer0.a);
    fragColor.rgb = mix(fragColor.rgb, layer0_5.rgb, layer0_5.a);
    fragColor.rgb = mix(fragColor.rgb, layer1.rgb, layer1.a);
    fragColor.rgb = mix(fragColor.rgb, layer2.rgb, layer2.a);
    fragColor.rgb = mix(fragColor.rgb, layer2.rgb, layer2.a);
    fragColor.rgb = mix(fragColor.rgb, layer3.rgb, layer3.a);
}
