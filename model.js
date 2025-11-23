class Model {

    constructor(name) {
        this.name = name || 'Surface';
        this.iVertexBuffer = gl.createBuffer();
        this.iIndexBuffer = gl.createBuffer();
        this.iNormalBuffer = gl.createBuffer();
        this.count = 0;
    }


    BufferData(vertices, indices, normals) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        this.count = indices.length;
    }


    Draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
}

class ShaderProgram {

    constructor(name, program) {
        this.name = name || 'Basic';
        this.prog = program;

        this.iAttribVertex = -1;
        this.iColor = -1;
        this.iModelViewProjectionMatrix = -1;
    }

    Use() {
        gl.useProgram(this.prog);
    }
}

window.Model = Model;
window.ShaderProgram = ShaderProgram;

