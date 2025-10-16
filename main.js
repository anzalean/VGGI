'use strict';

let gl;           // WebGL context
let surface;      // surface model (створюється як new Model(...))
let shProgram;    // shader program wrapper (об'єкт з полями для локацій)
let spaceball;    // Trackball/Spaceball для контролю огляду


function draw() {
    gl.clearColor(0.02, 0.02, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    let projection = m4.perspective(Math.PI/8, 1, 8, 12);
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    let modelViewProjection = m4.multiply(projection, matAccum1);


    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniform4fv(shProgram.iColor, [0.0, 1.0, 0.95, 0.9]);


    surface.Draw();
}



function CreateSurfaceData() {
    let vertexList = [];

    const U_MIN = -1.3;
    const U_MAX = 1.3;
    const V_MIN = -1.3;
    const V_MAX = 1.3;

    const u_lines = 30;
    const v_lines = 30;
    const segments = 50;

    function get_shoe_surface_coords(u, v) {
        let x = u;
        let y = v;
        let z = u * u * u * 1/3 - v * v * 1/2;
        return [x, y, z];
    }

    const verticesPerULine = segments + 1;
    let u_start_offset = vertexList.length / 3;

    for (let i = 0; i < v_lines; i++) {
        let v = V_MIN + i * (V_MAX - V_MIN) / (v_lines - 1);
        for (let j = 0; j <= segments; j++) {
            let u = U_MIN + j * (U_MAX - U_MIN) / segments;
            vertexList.push(...get_shoe_surface_coords(u, v));
        }
    }

    const verticesPerVLine = segments + 1;
    let v_start_offset = vertexList.length / 3;

    for (let i = 0; i < u_lines; i++) {
        let u = U_MIN + i * (U_MAX - U_MIN) / (u_lines - 1);
        for (let j = 0; j <= segments; j++) {
            let v = V_MIN + j * (V_MAX - V_MIN) / segments;
            vertexList.push(...get_shoe_surface_coords(u, v));
        }
    }

    return {
        vertices: vertexList,
        uInfo: {
            offset: u_start_offset,
            count: v_lines * verticesPerULine,
            verticesPerLine: verticesPerULine,
            numLines: v_lines
        },
        vInfo: {
            offset: v_start_offset,
            count: u_lines * verticesPerVLine,
            verticesPerLine: verticesPerVLine,
            numLines: u_lines
        }
    };
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);


    shProgram = {
        name: 'Basic',
        prog: prog,
        Use: function () { gl.useProgram(this.prog); },
        iAttribVertex: -1,
        iColor: -1,
        iModelViewProjectionMatrix: -1
    };

    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");


    surface = new Model('Surface');

    const surfaceData = CreateSurfaceData();
    surface.BufferData(surfaceData.vertices, surfaceData.uInfo, surfaceData.vInfo);

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


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
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

    draw();
}
