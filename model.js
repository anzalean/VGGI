class Model {

    constructor(name) {
        this.name = name || 'Surface';
        this.iVertexBuffer = gl.createBuffer();

        this.gridU = { startIndex: 0, verticesPerLine: 0, lineCount: 0 };
        this.gridV = { startIndex: 0, verticesPerLine: 0, lineCount: 0 };
        this.count = 0;
    }


    BufferData(vertices, uInfo, vInfo) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.count = vertices.length / 3;

        this.gridU = {
            startIndex: uInfo.offset,
            verticesPerLine: uInfo.verticesPerLine,
            lineCount: uInfo.numLines
        };

        this.gridV = {
            startIndex: vInfo.offset,
            verticesPerLine: vInfo.verticesPerLine,
            lineCount: vInfo.numLines
        };
    }


    Draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);

        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        // --- Малювання U-ліній ---
        let curIndex = this.gridU.startIndex;
        const vertsPerU = this.gridU.verticesPerLine;
        for (let line = 0; line < this.gridU.lineCount; line++) {
            if (vertsPerU > 0) {
                gl.drawArrays(gl.LINE_STRIP, curIndex, vertsPerU);
            }
            curIndex += vertsPerU;
        }

        // --- Малювання V-ліній ---
        curIndex = this.gridV.startIndex;
        const vertsPerV = this.gridV.verticesPerLine;
        for (let line = 0; line < this.gridV.lineCount; line++) {
            if (vertsPerV > 0) {
                gl.drawArrays(gl.LINE_STRIP, curIndex, vertsPerV);
            }
            curIndex += vertsPerV;
        }
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

