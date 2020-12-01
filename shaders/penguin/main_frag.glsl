uniform vec3 iResolution;
uniform float iTime;
uniform int iFrame;
uniform float width;

uniform sampler2D frame;

in vec2 texCoords;

out vec4 fragColour;

// Some useful functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

//
// Description : GLSL 2D simplex noise function
//      Author : Ian McEwan, Ashima Arts
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License :
//  Copyright (C) 2011 Ashima Arts. All rights reserved.
//  Distributed under the MIT License. See LICENSE file.
//  https://github.com/ashima/webgl-noise
//
float snoise(vec2 v) {
    // Precompute values for skewed triangular grid
    const vec4 C = vec4(0.211324865405187,
            // (3.0-sqrt(3.0))/6.0
            0.366025403784439,
            // 0.5*(sqrt(3.0)-1.0)
            -0.577350269189626,
            // -1.0 + 2.0 * C.x
            0.024390243902439);
    // 1.0 / 41.0

    // First corner (x0)
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    // Other two corners (x1, x2)
    vec2 i1 = vec2(0.0);
    i1 = (x0.x > x0.y)? vec2(1.0, 0.0):vec2(0.0, 1.0);
    vec2 x1 = x0.xy + C.xx - i1;
    vec2 x2 = x0.xy + C.zz;

    // Do some permutations to avoid
    // truncation effects in permutation
    i = mod289(i);
    vec3 p = permute(
            permute( i.y + vec3(0.0, i1.y, 1.0))
            + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(
                dot(x0,x0),
                dot(x1,x1),
                dot(x2,x2)
                ), 0.0);

    m = m*m ;
    m = m*m ;

    // Gradients:
    //  41 pts uniformly over a line, mapped onto a diamond
    //  The ring size 17*17 = 289 is close to a multiple
    //      of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt(a0*a0 + h*h);
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);

    // Compute final noise value at P
    vec3 g = vec3(0.0);
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
    return 130.0 * dot(m, g);
}

float noise(float x){
    return fract(sin(x)*1000000.);
}

const mat2 m = mat2( 0.80,  0.60, -0.60,  0.80 );

// thanks IQ for a lot of this, fizzer for a lot of the shading
float smin( float a, float b, float k )
{
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}


float smax(float a,float b, float k)
{
    return -smin(-a,-b,k);
}

mat2 rotmat(float a)
{
    return mat2(cos(a),sin(a),-sin(a),cos(a));
}

float torsoFront(vec3 p){
    p.z += .3;
    return length(p*vec3(1,0.8,1)*1.2)-1.;
}

float sdVerticalCapsule( vec3 p, float h, float r )
{
  p.y -= clamp( p.y, 0.0, h );
  return length( p ) - r;
}

float foot(vec3 p){
    vec3 op;
    float d = 1.0;
    op = p;
    for (int i = 0; i<3; i++){
        p.yx *= rotmat(1./2.);
        d = smin(sdVerticalCapsule(p, .3, 0.04), d, 0.01);
    }
    return d;
}

float sceneDist(vec3 p)
{
    vec3 op=p;
    
    float d = p.y;
    p.y-=1.5;

    // torso back
    //d=min(d,length(p*vec3(1,0.8,1))-1.);
    
    d = smin(d,foot(p), 0.2);

    // torso front
    //d=min(d,torsoFront(p));
 

    return min(d,10.);
}



vec3 sceneNorm(vec3 p)
{
    vec3 e=vec3(1e-3,0,0);
    float d = sceneDist(p);
    return normalize(vec3(sceneDist(p + e.xyy) - sceneDist(p - e.xyy), sceneDist(p + e.yxy) - sceneDist(p - e.yxy),
                          sceneDist(p + e.yyx) - sceneDist(p - e.yyx)));
}


// from simon green and others
float ambientOcclusion(vec3 p, vec3 n)
{
    const int steps = 4;
    const float delta = 0.15;

    float a = 0.0;
    float weight = 4.;
    for(int i=1; i<=steps; i++) {
        float d = (float(i) / float(steps)) * delta; 
        a += weight*(d - sceneDist(p + n*d));
        weight *= 0.5;
    }
    return clamp(1.0 - a, 0.0, 1.0);
}

void main(void) {
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = texCoords;

    float an=cos(iTime)*.1;

    vec2 ot=uv*2.-1.;
    ot.y*=iResolution.y/iResolution.x;
    vec3 ro=vec3(0.,1.4,4.);
    vec3 rd=normalize(vec3(ot.xy,-1.3));

    rd.xz=mat2(cos(an),sin(an),sin(an),-cos(an))*rd.xz;
    ro.xz=mat2(cos(an),sin(an),sin(an),-cos(an))*ro.xz;

    float s=20.;

    // primary ray
    float t=0.,d=0.;
    for(int i=0;i<80;++i)
    {
        d=sceneDist(ro+rd*t);
        if(d<1e-4)
            break;
        if(t>10.)
            break;
        t+=d*.9;
    }

    t=min(t,10.0);

    // shadow ray
    vec3 rp=ro+rd*t;
    vec3 n=sceneNorm(rp);
    float st=5e-3;
    vec3 ld=normalize(vec3(2,4,-4));
    for(int i=0;i<20;++i)
    {
        d=sceneDist(rp+ld*st);
        if(d<1e-5)
            break;
        if(st>5.)
            break;
        st+=d*2.;
    }

    // ambient occlusion and shadowing
    vec3 ao=vec3(ambientOcclusion(rp, n));
    float shad=mix(.85,1.,step(5.,st));

    ao*=mix(.3,1.,.5+.5*n.y);


    vec3 diff=vec3(1);
    vec3 emit=vec3(0);

    // fresnel
    diff+=pow(clamp(1.-dot(-rd,n),0.,.9),4.)*.5;

    // background and floor fade

    fragColour.rgb=mix(vec3(.15,0,0),vec3(1),ao)*shad*diff*1.1;
    fragColour.rgb+=emit;
}
