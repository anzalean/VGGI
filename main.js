'use strict';

let gl;           // WebGL context
let surface;      // surface model (створюється як new Model(...))
let shProgram;    // shader program wrapper (об'єкт з полями для локацій)
let spaceball;    // Trackball/Spaceball для контролю огляду
let uSlider, vSlider;
let lightAngle = 0;
let texDiffuse, texSpecular, texNormal;

// НОВІ ФУНКЦІЇ ДЛЯ ЗАВАНТАЖЕННЯ ТЕКСТУР
function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

function loadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
   
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([255, 0, 255, 255]); // Яскраво-рожевий як "заглушка"
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No mipmaps for non-power-of-2
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        draw(); // Перемалювати сцену після завантаження текстури
    };
    image.src = url;
    return texture;
}
// ---------------------------------------------


function createSolidTexture(color) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(color));
    return texture;
}

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
    gl.uniform1f(shProgram.iShininess, 32.0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texDiffuse);
    gl.uniform1i(shProgram.iTexDiffuse, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texSpecular);
    gl.uniform1i(shProgram.iTexSpecular, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texNormal);
    gl.uniform1i(shProgram.iTexNormal, 2);


    surface.Draw();
}



function CreateSurfaceData(u_lines, v_lines) {
    let vertexList = [];
    let indices = [];
    let normals = [];
    let texCoords = [];
    let tangents = [];
    let bitangents = [];

    const U_MIN = -1.3;
    const U_MAX = 1.3;
    const V_MIN = -1.3;
    const V_MAX = 1.3;

    function get_shoe_surface_coords(u, v) {
        let x = u;
        let y = v;
        // Поверхня : z = (1/3)u^3 - (1/2)v^2
        let z = u * u * u * 1/3 - v * v * 1/2; 
        return [x, y, z];
    }

    for (let i = 0; i <= u_lines; i++) {
        let u = U_MIN + i * (U_MAX - U_MIN) / u_lines;
        for (let j = 0; j <= v_lines; j++) {
            let v = V_MIN + j * (V_MAX - V_MIN) / v_lines;
            vertexList.push(...get_shoe_surface_coords(u, v));
            texCoords.push(i / u_lines, j / v_lines);
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
        tangents.push(0);
        bitangents.push(0);
    }

    for (let i = 0; i < indices.length; i += 3) {
        const p1_idx = indices[i];
        const p2_idx = indices[i + 1];
        const p3_idx = indices[i + 2];

        const p1 = [vertexList[p1_idx * 3], vertexList[p1_idx * 3 + 1], vertexList[p1_idx * 3 + 2]];
        const p2 = [vertexList[p2_idx * 3], vertexList[p2_idx * 3 + 1], vertexList[p2_idx * 3 + 2]];
        const p3 = [vertexList[p3_idx * 3], vertexList[p3_idx * 3 + 1], vertexList[p3_idx * 3 + 2]];

        const uv1 = [texCoords[p1_idx * 2], texCoords[p1_idx * 2 + 1]];
        const uv2 = [texCoords[p2_idx * 2], texCoords[p2_idx * 2 + 1]];
        const uv3 = [texCoords[p3_idx * 2], texCoords[p3_idx * 2 + 1]];

        const v1 = m4.subtractVectors(p2, p1);
        const v2 = m4.subtractVectors(p3, p1);
        
        const duv1 = [uv2[0] - uv1[0], uv2[1] - uv1[1]];
        const duv2 = [uv3[0] - uv1[0], uv3[1] - uv1[1]];

        const faceNormal = m4.cross(v1, v2);

        const r = 1.0 / (duv1[0] * duv2[1] - duv2[0] * duv1[1]);
        const tangent = m4.scaleVector(m4.subtractVectors(m4.scaleVector(v1, duv2[1]), m4.scaleVector(v2, duv1[1])),r);
        const bitangent = m4.scaleVector(m4.subtractVectors(m4.scaleVector(v2, duv1[0]), m4.scaleVector(v1, duv2[0])),r);
        

        const a1 = Math.acos(m4.dot(m4.normalize(m4.subtractVectors(p2, p1)), m4.normalize(m4.subtractVectors(p3, p1))));
        const a2 = Math.acos(m4.dot(m4.normalize(m4.subtractVectors(p1, p2)), m4.normalize(m4.subtractVectors(p3, p2))));
        const a3 = Math.acos(m4.dot(m4.normalize(m4.subtractVectors(p1, p3)), m4.normalize(m4.subtractVectors(p2, p3))));

        [p1_idx, p2_idx, p3_idx].forEach((idx, k) => {
            let angle = [a1,a2,a3][k]
            normals[idx * 3] += faceNormal[0] * angle;
            normals[idx * 3 + 1] += faceNormal[1] * angle;
            normals[idx * 3 + 2] += faceNormal[2] * angle;

            tangents[idx * 3] += tangent[0] * angle;
            tangents[idx * 3 + 1] += tangent[1] * angle;
            tangents[idx * 3 + 2] += tangent[2] * angle;

            bitangents[idx * 3] += bitangent[0] * angle;
            bitangents[idx * 3 + 1] += bitangent[1] * angle;
            bitangents[idx * 3 + 2] += bitangent[2] * angle;
        });

    }

    for (let i = 0; i < normals.length / 3; i ++) {
        const n = m4.normalize([normals[i*3], normals[i*3+1], normals[i*3+2]]);
        const t = m4.normalize([tangents[i*3], tangents[i*3+1], tangents[i*3+2]]);
        
        // --- Грам-Шмідт: Пріоритет Тангенсу (T) ---
        // 1. Ортогоналізуємо N відносно T
        const n_ = m4.subtractVectors(n, m4.scaleVector(t, m4.dot(t, n))); 
        m4.normalize(n_, n_);
        
        normals[i*3] = n_[0];
        normals[i*3+1] = n_[1];
        normals[i*3+2] = n_[2];

        // 2. T залишається без змін (зберігає пріоритет)
        tangents[i*3] = t[0];
        tangents[i*3+1] = t[1];
        tangents[i*3+2] = t[2];
        
        // 3. Перераховуємо Бітангенс: B = N' x T, щоб забезпечити правильну орієнтацію N, T, B
        const b = m4.cross(n_, t);
        
        // Нормалізація B
        m4.normalize(b, b);
        bitangents[i*3] = b[0];
        bitangents[i*3+1] = b[1];
        bitangents[i*3+2] = b[2];
        // ------------------------------------------
    }

    return {
        vertices: vertexList,
        indices: indices,
        normals: normals,
        texCoords: texCoords,
        tangents: tangents,
        bitangents: bitangents
    };
}

function updateSurface() {
    const u_lines = parseInt(uSlider.value);
    const v_lines = parseInt(vSlider.value);
    const surfaceData = CreateSurfaceData(u_lines, v_lines);
    surface.BufferData(surfaceData.vertices, surfaceData.indices, surfaceData.normals, surfaceData.texCoords, surfaceData.tangents, surfaceData.bitangents);
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
        iAttribTexCoord: -1,
        iAttribTangent: -1,
        iAttribBitangent: -1,
        iModelViewProjectionMatrix: -1,
        iModelViewMatrix: -1,
        iNormalMatrix: -1,
        iLightPosition: -1,
        iLightColor: -1,
        iAmbientColor: -1,
        iDiffuseColor: -1,
        iSpecularColor: -1,
        iShininess: -1,
        iTexDiffuse: -1,
        iTexSpecular: -1,
        iTexNormal: -1
    };

    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "aNormal");
    shProgram.iAttribTexCoord = gl.getAttribLocation(prog, "aTexCoord");
    shProgram.iAttribTangent = gl.getAttribLocation(prog, "aTangent");
    shProgram.iAttribBitangent = gl.getAttribLocation(prog, "aBitangent");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "u_light_position");
    shProgram.iLightColor = gl.getUniformLocation(prog, "u_light_color");
    shProgram.iAmbientColor = gl.getUniformLocation(prog, "u_ambient_color");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "u_diffuse_color");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "u_specular_color");
    shProgram.iShininess = gl.getUniformLocation(prog, "u_shininess");
    shProgram.iTexDiffuse = gl.getUniformLocation(prog, "u_tex_diffuse");
    shProgram.iTexSpecular = gl.getUniformLocation(prog, "u_tex_specular");
    shProgram.iTexNormal = gl.getUniformLocation(prog, "u_tex_normal");


    surface = new Model('Surface');

    // --- ВИКОРИСТАННЯ loadTexture 
    texDiffuse = loadTexture('/material/diff.jpg');
    texSpecular = loadTexture('/material/spec.jpg');
    texNormal = loadTexture('/material/norm.jpg');
    // -------------------------------------------------------------

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