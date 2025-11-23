'use strict';

let gl;           // WebGL context
let surface;      // surface model (створюється як new Model(...))
let shProgram;    // shader program wrapper (об'єкт з полями для локацій)
let spaceball;    // Trackball/Spaceball для контролю огляду
let uSlider, vSlider;
let lightAngle = 0;

function draw() {
    gl.clearColor(0.8, 0.9, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI/8, 1, 8, 12);
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let modelViewMatrix = m4.multiply(translateToPointZero, matAccum0);

    let modelViewProjection = m4.multiply(projection, modelViewMatrix);
    
    const normalMatrix = m4.transpose(m4.inverse(modelViewMatrix));

    lightAngle += 0.01;
    const lightPosition = [5 * Math.cos(lightAngle), 5 * Math.sin(lightAngle), 0];

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix.slice(0,9));
    
    gl.uniform3fv(shProgram.iLightPosition, lightPosition);
    gl.uniform4fv(shProgram.iLightColor, [1.0, 1.0, 1.0, 1.0]);
    gl.uniform4fv(shProgram.iAmbientColor, [0.4, 0.4, 0.4, 1.0]);
    gl.uniform4fv(shProgram.iDiffuseColor, [1.0, 0.4, 0.6, 1.0]);
    gl.uniform4fv(shProgram.iSpecularColor, [1.0, 1.0, 1.0, 1.0]);
    gl.uniform1f(shProgram.iShininess, 32.0);


    surface.Draw();
}



function CreateSurfaceData(u_lines, v_lines) {
    let vertexList = [];
    let indices = [];
    let normals = [];

    const U_MIN = -1.3;
    const U_MAX = 1.3;
    const V_MIN = -1.3;
    const V_MAX = 1.3;

    function get_shoe_surface_coords(u, v) {
        let x = u;
        let y = v;
        let z = u * u * u * 1/3 - v * v * 1/2;
        return [x, y, z];
    }

    for (let i = 0; i <= u_lines; i++) {
        let u = U_MIN + i * (U_MAX - U_MIN) / u_lines;
        for (let j = 0; j <= v_lines; j++) {
            let v = V_MIN + j * (V_MAX - V_MIN) / v_lines;
            vertexList.push(...get_shoe_surface_coords(u, v));
        }
    }

    for (let i = 0; i < u_lines; i++) {
        for (let j = 0; j < v_lines; j++) {
            let p1 = i * (v_lines + 1) + j;
            let p2 = p1 + 1;
            let p3 = (i + 1) * (v_lines + 1) + j;
            let p4 = p3 + 1;
            indices.push(p1, p2, p3);
            indices.push(p2, p4, p3);
        }
    }

    for (let i = 0; i < vertexList.length; i++) {
        normals.push(0);
    }

    for (let i = 0; i < indices.length; i += 3) {
        const p1_idx = indices[i];
        const p2_idx = indices[i + 1];
        const p3_idx = indices[i + 2];

        const p1 = [vertexList[p1_idx * 3], vertexList[p1_idx * 3 + 1], vertexList[p1_idx * 3 + 2]];
        const p2 = [vertexList[p2_idx * 3], vertexList[p2_idx * 3 + 1], vertexList[p2_idx * 3 + 2]];
        const p3 = [vertexList[p3_idx * 3], vertexList[p3_idx * 3 + 1], vertexList[p3_idx * 3 + 2]];

        const v1 = m4.subtractVectors(p2, p1);
        const v2 = m4.subtractVectors(p3, p1);
        const faceNormal = m4.cross(v1, v2);

        const a1 = Math.acos(m4.dot(m4.normalize(m4.subtractVectors(p2, p1)), m4.normalize(m4.subtractVectors(p3, p1))));
        const a2 = Math.acos(m4.dot(m4.normalize(m4.subtractVectors(p1, p2)), m4.normalize(m4.subtractVectors(p3, p2))));
        const a3 = Math.acos(m4.dot(m4.normalize(m4.subtractVectors(p1, p3)), m4.normalize(m4.subtractVectors(p2, p3))));

        normals[p1_idx * 3] += faceNormal[0] * a1;
        normals[p1_idx * 3 + 1] += faceNormal[1] * a1;
        normals[p1_idx * 3 + 2] += faceNormal[2] * a1;

        normals[p2_idx * 3] += faceNormal[0] * a2;
        normals[p2_idx * 3 + 1] += faceNormal[1] * a2;
        normals[p2_idx * 3 + 2] += faceNormal[2] * a2;

        normals[p3_idx * 3] += faceNormal[0] * a3;
        normals[p3_idx * 3 + 1] += faceNormal[1] * a3;
        normals[p3_idx * 3 + 2] += faceNormal[2] * a3;
    }

    for (let i = 0; i < normals.length; i += 3) {
        const n = m4.normalize([normals[i], normals[i+1], normals[i+2]]);
        normals[i] = n[0];
        normals[i+1] = n[1];
        normals[i+2] = n[2];
    }

    return {
        vertices: vertexList,
        indices: indices,
        normals: normals
    };
}

function updateSurface() {
    const u_lines = parseInt(uSlider.value);
    const v_lines = parseInt(vSlider.value);
    const surfaceData = CreateSurfaceData(u_lines, v_lines);
    surface.BufferData(surfaceData.vertices, surfaceData.indices, surfaceData.normals);
    draw();
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);


    shProgram = {
        name: 'Phong',
        prog: prog,
        Use: function () { gl.useProgram(this.prog); },
        iAttribVertex: -1,
        iAttribNormal: -1,
        iModelViewProjectionMatrix: -1,
        iModelViewMatrix: -1,
        iNormalMatrix: -1,
        iLightPosition: -1,
        iLightColor: -1,
        iAmbientColor: -1,
        iDiffuseColor: -1,
        iSpecularColor: -1,
        iShininess: -1
    };

    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "aNormal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "u_light_position");
    shProgram.iLightColor = gl.getUniformLocation(prog, "u_light_color");
    shProgram.iAmbientColor = gl.getUniformLocation(prog, "u_ambient_color");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "u_diffuse_color");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "u_specular_color");
    shProgram.iShininess = gl.getUniformLocation(prog, "u_shininess");


    surface = new Model('Surface');

    gl.enable(gl.DEPTH_TEST);
}


function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function animate() {
    draw();
    window.requestAnimationFrame(animate);
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    uSlider = document.getElementById('u-slider');
    vSlider = document.getElementById('v-slider');

    uSlider.addEventListener('input', updateSurface);
    vSlider.addEventListener('input', updateSurface);

    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    updateSurface();
    animate();
}
