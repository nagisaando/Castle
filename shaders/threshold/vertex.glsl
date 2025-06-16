void main() {
    vec3 newPosition = position;
    
    float bumpWidth = 0.1;
    float bumpHeight = 0.05;
    float edgeShift = 0.02;

    // Bump 1 (Left)
    float isBump1 = step(-0.3, position.x) - step(-0.3 + bumpWidth, position.x);
    newPosition.z += bumpHeight * isBump1;
    newPosition.x += edgeShift * step(position.x, -0.3);

    // Bump 2 (Middle)
    float isBump2 = step(-0.1, position.x) - step(-0.1 + bumpWidth, position.x);
    newPosition.z += bumpHeight * isBump2;
    newPosition.x -= edgeShift * (step(-0.1 + bumpWidth, position.x) - step(0.1, position.x));

    // Bump 3 (Right)
    float isBump3 = step(0.1, position.x) - step(0.1 + bumpWidth, position.x);
    newPosition.z += bumpHeight * isBump3;
    newPosition.x -= edgeShift * step(0.1 + bumpWidth, position.x);

    if(shade)

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}