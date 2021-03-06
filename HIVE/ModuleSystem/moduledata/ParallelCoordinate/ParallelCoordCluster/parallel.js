/**
 * @constructor
 * @classdesc パラレルコーディネートを Cluster モードで描画するクラス
 * @param     {HTMLElement} parentElement - 埋め込み対象となる HTMLElement
 * @param     {Object}      [option]      - 初期化時のオプション（ファイルの末尾に詳細）
 */
function ParallelCoordCluster(parentElement, option){
    this.width = 0;
    this.height = 0;
    this.padding = 0;
    this.axisCount = 0;      // 自身に含まれる列の数
    this.axisArray = [];     // 列（Axis インスタンス）格納する配列
    this.beginFlow = 'left'; // どちらが始点となりデータが流れていくか（未使用）
    this.stateData = null;   // 選択状況も含めた内部的なデータ全体
    this.draggingAxis = -1;  // 軸ごとドラッグ中の軸インデックス

    this.parent = parentElement;                        // 自身を格納している親 DOM
    this.wrapper = document.createElement('div');       // 全体の外側 DOM
    this.footer = document.createElement('div');        // 全体の外側の下の DOM
    this.footerWrap = document.createElement('div');    // 全体の外側の下の DOM
    this.footerPlot = document.createElement('div');    // 全体の外側の下の DOM
    this.parentElement = document.createElement('div'); // Canvas 側の親 DOM
    this.plotElement = document.createElement('div');   // Scatter plot 用の領域も動的生成
    this.canvas = document.createElement('canvas');     // Canvas は動的に生成
    this.layer = document.createElement('div');         // Canvas の上に乗るレイヤ（SVG などが入る）も動的生成
    this.plotCanvas = document.createElement('canvas'); // Plot 用の Canvas は動的に生成
    this.plotLayer = document.createElement('div');     // Plot 用の Canvas の上に乗るレイヤ（SVG などが入る）も動的生成
    this.parent.appendChild(this.wrapper);              // 親 DOM に wrapper を append
    this.parent.appendChild(this.footer);               // 親 DOM に footer を append
    this.wrapper.appendChild(this.parentElement);       // 親 DOM に Canvas と Layer を格納する DOM を append
    this.wrapper.appendChild(this.plotElement);         // 親 DOM に plot 用の DOM を append
    this.footer.appendChild(this.footerWrap);           // 親 DOM に wrap 用の DOM を append
    this.footer.appendChild(this.footerPlot);           // 親 DOM に plot 用の DOM を append
    this.parentElement.appendChild(this.canvas);        // Canvas を親 DOM 内の外装に append
    this.parentElement.appendChild(this.layer);         // Layer を親 DOM 内の外装に append
    this.plotElement.appendChild(this.plotCanvas);      // Canvas を親 DOM 内の外装に append
    this.plotElement.appendChild(this.plotLayer);       // Layer を親 DOM 内の外装に append

    this.selectedCallback = null;

    this.gl = null;
    this.glReady = false;
    this.glFrame = null;
    this.glFrameSize = 512;
    this.mat = null;
    this.qtn = null;
    this.drawRect = null;

    this.NS_SVG = 'http://www.w3.org/2000/svg';
    this.NS = function(e){return document.createElementNS(this.NS_SVG, e);}.bind(this);

    this.PARALLEL_PADDING_H = 70;
    this.PARALLEL_PADDING_V = 30;
    this.SVG_DEFAULT_WIDTH = 40;
    this.SVG_TEXT_BASELINE = 30;
    this.SVG_TEXT_SIZE = 'medium';
    this.SVG_SCALE_SIZE = 'small';
    this.AXIS_LINE_WIDTH = 2;
    this.AXIS_LINE_COLOR = '#333';
    this.AXIS_LINE_SELECT_COLOR = '#666';
    this.AXIS_LINE_BRUSH_COLOR = '#f33';
    this.AXIS_BRUSH_HANDLE_COLOR = 'transparent';
    this.AXIS_BRUSHED_EDGE_HEIGHT = 3;
    this.AXIS_SCALE_WIDTH = 10;
    this.BEZIER_DIVISION = 100;
    this.BEZIER_LINE_SCALE = 3.0;
    this.PLOT_AREA_WIDTH = 1;
    this.PLOT_RECT_COLOR = 'deeppink';
    this.FOOTER_AREA_HEIGHT = 70;

    // option setting
    this.setOption(option);

    // style modify
    this.parent.style.display = 'flex';
    this.parent.style.flexDirection = 'column';
    this.wrapper.style.width = '100%';
    this.wrapper.style.height = 'calc(100% - ' + this.FOOTER_AREA_HEIGHT + 'px)';
    this.wrapper.style.display = 'flex';
    this.wrapper.style.flexDirection = 'row';
    this.footer.style.display = 'flex';
    this.footer.style.flexDirection = 'row';
    this.footer.style.width = '100%';
    this.footer.style.height = this.FOOTER_AREA_HEIGHT + 'px';
    this.footer.style.backgroundColor = '#222';
    this.footerWrap.style.width = 'calc(100% - ' + this.PLOT_AREA_WIDTH + 'px)';
    this.footerWrap.style.height = '100%';
    this.footerWrap.style.display = 'flex';
    this.footerWrap.style.flexDirection = 'row';
    this.footerWrap.style.justifyContent = 'space-around';
    this.footerPlot.style.width = this.PLOT_AREA_WIDTH + 'px';
    this.footerPlot.style.height = '100%';
    this.parentElement.style.width = 'calc(100% - ' + this.PLOT_AREA_WIDTH + 'px)';
    this.plotElement.style.width = this.PLOT_AREA_WIDTH + 'px';
    this.plotElement.style.height = '100%';
    this.canvas.style.backgroundColor = 'white';
    this.canvas.style.float = 'left';
    this.canvas.width = this.parentElement.clientWidth;
    this.canvas.height = this.parentElement.clientHeight;
    this.canvas.style.position = 'absolute';
    this.layer.style.width = this.parentElement.clientWidth + 'px';
    this.layer.style.height = this.parentElement.clientHeight + 'px';
    this.layer.style.position = 'relative';
    this.plotCanvas.style.float = 'left';
    this.plotCanvas.width = this.plotElement.clientWidth;
    this.plotCanvas.height = this.plotElement.clientHeight;
    this.plotCanvas.style.position = 'absolute';
    this.plotLayer.style.width = this.plotElement.clientWidth + 'px';
    this.plotLayer.style.height = this.plotElement.clientHeight + 'px';
    this.plotLayer.style.position = 'relative';

    this.initCanvas();                  // canvas の WebGL 関連初期化
    this.resetCanvas();                 // 初期化以降にリセットする場合
    this.resetBezierCanvas();           // ベジェ曲線モードでリセット
    this.resetBezierGeometryCanvas();   // ベジェ曲線ポリゴンジオメトリモード
    this.drawRect = this.getDrawRect(); // 描画対象の矩形領域
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseNormalX = 0;
    this.mouseNormalY = 0;
    this.selectedAxis = false; // 軸ごと選択されたときの情報
    this.selectedArray = [];   // brush されたときの情報
}
/**
 * オプションをまとめてセットする
 * @param {Object} option - セットするオプションを格納したオブジェクト
 */
ParallelCoordCluster.prototype.setOption = function(option){
    if(!option){return false;}
    var s = 'padding';
    if(this.checkOption(option, s)){
        this.PARALLEL_PADDING_H = option[s];
        this.PARALLEL_PADDING_V = option[s];
    }
    if(this.checkOption(option, 'svg')){
        s = 'defaultwidth';
        if(this.checkOption(option.svg, s)){this.SVG_DEFAULT_WIDTH = option.svg[s];}
        s = 'textbaseline';
        if(this.checkOption(option.svg, s)){this.SVG_TEXT_BASELINE = option.svg[s];}
        s = 'textsize';
        if(this.checkOption(option.svg, s)){this.SVG_TEXT_SIZE = option.svg[s];}
        s = 'scalesize';
        if(this.checkOption(option.svg, s)){this.SVG_SCALE_SIZE = option.svg[s];}
    }
    if(this.checkOption(option, 'axis')){
        s = 'linewidth';
        if(this.checkOption(option.axis, s)){this.AXIS_LINE_WIDTH = option.axis[s];}
        s = 'linecolor';
        if(this.checkOption(option.axis, s)){this.AXIS_LINE_COLOR = option.axis[s];}
        s = 'scalewidth';
        if(this.checkOption(option.axis, s)){this.AXIS_SCALE_WIDTH = option.axis[s];}
    }
    if(this.checkOption(option, 'bezier')){
        s = 'division';
        if(this.checkOption(option.bezier, s)){this.BEZIER_DIVISION = option.bezier[s];}
        s = 'linescale';
        if(this.checkOption(option.bezier, s)){this.BEZIER_LINE_SCALE = option.bezier[s];}
    }
    if(this.checkOption(option, 'plot')){
        s = 'width';
        if(this.checkOption(option.bezier, s)){this.PLOT_AREA_WIDTH = option.plot[s];}
        s = 'color';
        if(this.checkOption(option.bezier, s)){this.PLOT_RECT_COLOR = option.plot[s];}
    }
    if(this.checkOption(option, 'callback')){
        s = 'selected';
        if(this.checkOption(option.callback, s)){this.selectedCallback = option.callback[s];}
    }
};

/**
 * オプションに該当するメンバが存在するかチェックする
 * @param {Object} option - 走査対象のオプション
 * @param {String} name   - 操作したいメンバの名前
 */
ParallelCoordCluster.prototype.checkOption = function(option, name){
    return (
        option.hasOwnProperty(name) &&
        option[name] !== null &&
        option[name] !== undefined &&
        option[name] !== '' &&
        option[name] !== 0
    );
};
/**
 * コンポーネントのサイズをセット
 * @param {Number} width  - 幅
 * @param {Number} height - 高さ
 */
ParallelCoordCluster.prototype.setRect = function(width, height){
    this.canvas.width = this.parentElement.clientWidth;
    this.canvas.height = this.parentElement.clientHeight;
    this.layer.style.width = this.parentElement.clientWidth + 'px';
    this.layer.style.height = this.parentElement.clientHeight + 'px';
    this.plotCanvas.width = this.plotElement.clientWidth;
    this.plotCanvas.height = this.plotElement.clientHeight;
    this.plotLayer.style.width = this.plotElement.clientWidth + 'px';
    this.plotLayer.style.height = this.plotElement.clientHeight + 'px';
};

/**
 * 軸を追加する
 */
ParallelCoordCluster.prototype.addAxis = function(){
    var i, j;
    for(i = 0, j = this.stateData.axis.length; i < j; ++i){
        this.axisArray.push(new Axis(this, i));
        this.axisCount = this.axisArray.length;
    }
};

/**
 * 列の配置をリセットして可能なら canvas を再描画する
 * @param {Object} resetData - リセット時に再セットするデータ
 */
ParallelCoordCluster.prototype.resetAxis = function(resetData){
    var i, j, v;
    var space, margin;
    if(resetData && resetData.hasOwnProperty('axis') && resetData.axis.length > 0){
        for(i = 0; i < this.axisCount; ++i){
            this.axisArray[i].delete();
        }
        // reset state and add data
        var tmps = JSON.parse(JSON.stringify(resetData.axis));
        for(i = 0, j = resetData.axis.length; i < j; ++i){
            resetData.axis[i] = tmps[tmps[i].order];
        }
        this.stateData = resetData;
        this.selectedAxis = false;
        this.selectedArray = [];
        this.axisArray = [];
        this.addAxis();
    }
    space = this.layer.clientWidth - this.PARALLEL_PADDING_H * 2;
    margin = space / (this.axisCount - 1);
    for(i = 0; i < this.axisCount; ++i){
        this.axisArray[i].update();
    }
    for(i = 0; i < this.axisCount; ++i){
        j = this.PARALLEL_PADDING_H + (margin - this.SVG_DEFAULT_WIDTH) * i - this.SVG_DEFAULT_WIDTH / 2;
        this.axisArray[i].setPosition(j);
    }

    // 軸ごと選択しているか
    for(i = 0, j = this.axisArray.length; i < j; ++i){
        if(this.axisArray[i].selectedAxis){
            this.selectedAxis = true;
            this.getAllBrushedRange(this.axisArray[i], false, true);
            break;
        }
    }
    if(!this.selectedAxis){
        // 軸ごと選択ではないとき
        v = [];
        for(i = 0, j = this.axisArray.length; i < j; ++i){
            if(this.axisArray[i].selectedNumber > -1){
                v[this.axisArray[i].selectedNumber] = i;
            }
            if(v.length > 0 && (v[0] === undefined || v[0] === null)){
                v.splice(0, 1);
            }
        }
        for(i = 0, j = v.length; i < j; ++i){
            this.getAllBrushedRange(this.axisArray[v[i]], true);
        }
    }

    if(this.glReady){
        this.drawCanvas();
    }
    return this;
};

/**
 * WebGL コンテキストを生成して初期化する
 */
ParallelCoordCluster.prototype.initCanvas = function(){
    this.gl = this.canvas.getContext('webgl');
    this.glReady = this.gl !== null && this.gl !== undefined;
    this.glFrameSize = 1024;
    this.glFrame = create_framebuffer(this.gl, null, this.glFrameSize, this.glFrameSize);
    this.layer.addEventListener('mousemove', (function(eve){
        var r = eve.currentTarget.getBoundingClientRect();
        var x = eve.clientX - r.left;
        var y = eve.clientY - r.top;
        var topMargin = this.PARALLEL_PADDING_V + this.SVG_TEXT_BASELINE;
        this.mouseX = x;
        this.mouseY = y;
        this.mouseNormalX = Math.min(Math.max(0, x - this.drawRect.x), this.drawRect.width) / this.drawRect.width;
        this.mouseNormalY = Math.min(Math.max(0, (r.height - y) - this.drawRect.y), this.drawRect.height) / this.drawRect.height;
        if(this.glReady){
            var gl = this.gl;
            var u8 = new Uint8Array(4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.glFrame.framebuffer);
            gl.readPixels(x, r.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, u8);
        }
    }).bind(this), false);
    return this;
};

/**
 * WebGL の設定やシェーダを初期化する
 */
ParallelCoordCluster.prototype.resetCanvas = function(){
    var gl = this.gl;
    var mat = this.mat;
    if(!this.glReady){return;}
    if(!this.mat){this.mat = new matIV();}
    if(!this.qtn){this.qtn = new qtnIV();}
    this.drawRect = this.getDrawRect();

    var vSource = '';
    vSource += 'attribute vec3 position;';
    vSource += 'uniform mat4 matrix;';
    vSource += 'void main(){';
    vSource += '    gl_Position = matrix * vec4(position, 1.0);';
    vSource += '}';
    var fSource = '';
    fSource += 'precision mediump float;';
    fSource += 'uniform vec4 color;';
    fSource += 'void main(){';
    fSource += '    gl_FragColor = color;';
    fSource += '}';
    var vs = create_shader(gl, vSource, gl.VERTEX_SHADER);
    var fs = create_shader(gl, fSource, gl.FRAGMENT_SHADER);
    this.prg = create_program(gl, vs, fs);
    this.attL = [gl.getAttribLocation(this.prg, 'position')];
    this.attS = [3];
    this.uniL = {
        matrix: gl.getUniformLocation(this.prg, 'matrix'),
        color:  gl.getUniformLocation(this.prg, 'color')
    };
    var position = [
        0.5, 1.0, 0.0,
        0.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0 // triangle look
    ];
    var vPosition = create_vbo(gl, position);
    this.vboList = [vPosition];
};

/**
 * ベジェ曲線をラインで描画するための初期化処理を行う
 */
ParallelCoordCluster.prototype.resetBezierCanvas = function(){
    var i, j;
    var gl = this.gl;
    var mat = this.mat;
    if(!this.glReady){return;}
    if(!this.mat){this.mat = new matIV();}
    if(!this.qtn){this.qtn = new qtnIV();}
    this.drawRect = this.getDrawRect();

    var vSource = '';
    vSource += 'attribute vec3 position;';
    vSource += 'uniform mat4 matrix;';
    vSource += 'uniform vec4 point;';
    vSource += '';
    vSource += 'vec2 bezier(float t, vec2 p0, vec2 p1, vec2 p2, vec2 p3){';
    vSource += '    float r = 1.0 - t;';
    vSource += '    return vec2(  r * r * r *     p0.x +';
    vSource += '                3.0 * r * r * t * p1.x +';
    vSource += '                3.0 * r * t * t * p2.x +';
    vSource += '                  t * t * t *     p3.x,';
    vSource += '                  r * r * r *     p0.y +';
    vSource += '                3.0 * r * r * t * p1.y +';
    vSource += '                3.0 * r * t * t * p2.y +';
    vSource += '                  t * t * t *     p3.y);';
    vSource += '}';
    vSource += '';
    vSource += 'void main(){';
    vSource += '    vec2 p0 = vec2(point.x, point.z);';
    vSource += '    vec2 p1 = vec2(point.x + (point.y - point.x) * 0.5, point.z);';
    vSource += '    vec2 p2 = vec2(point.y + (point.x - point.y) * 0.5, point.w);';
    vSource += '    vec2 p3 = vec2(point.y, point.w);';
    vSource += '    gl_Position = matrix * vec4(bezier(position.x, p0, p1, p2, p3), 0.0, 1.0);';
    vSource += '}';
    var fSource = '';
    fSource += 'precision mediump float;';
    fSource += 'uniform vec4 color;';
    fSource += 'void main(){';
    fSource += '    gl_FragColor = color;';
    fSource += '}';
    var vs = create_shader(gl, vSource, gl.VERTEX_SHADER);
    var fs = create_shader(gl, fSource, gl.FRAGMENT_SHADER);
    this.bPrg = create_program(gl, vs, fs);
    this.bAttL = [gl.getAttribLocation(this.bPrg, 'position')];
    this.bAttS = [3];
    this.bUniL = {
        matrix: gl.getUniformLocation(this.bPrg, 'matrix'),
        point:  gl.getUniformLocation(this.bPrg, 'point'),
        color:  gl.getUniformLocation(this.bPrg, 'color')
    };
    var position = [];
    j = 1.0 / this.BEZIER_DIVISION;
    j += j / this.BEZIER_DIVISION;
    for(i = 0; i < this.BEZIER_DIVISION; ++i){
        position.push(i * j, 0.0, 0.0);
    }
    var vPosition = create_vbo(gl, position);
    this.bVboList = [vPosition];
    return this;
};

/**
 * ベジェ曲線をジオメトリとして描画するための初期化を行う
 */
ParallelCoordCluster.prototype.resetBezierGeometryCanvas = function(){
    var i, j;
    var gl = this.gl;
    var mat = this.mat;
    if(!this.glReady){return;}
    if(!this.mat){this.mat = new matIV();}
    if(!this.qtn){this.qtn = new qtnIV();}
    this.drawRect = this.getDrawRect();

    var vSource = '';
    vSource += 'attribute vec3 position;';
    vSource += 'attribute float signs;';
    vSource += 'uniform mat4 matrix;';
    vSource += 'uniform vec4 point;';
    vSource += 'uniform float nextTime;';
    vSource += 'uniform float scale;';
    vSource += 'const float PI = 3.141592;';
    vSource += '';
    vSource += 'vec2 bezier(float t, vec2 p0, vec2 p1, vec2 p2, vec2 p3){';
    vSource += '    float r = 1.0 - t;';
    vSource += '    return vec2(  r * r * r *     p0.x +';
    vSource += '                3.0 * r * r * t * p1.x +';
    vSource += '                3.0 * r * t * t * p2.x +';
    vSource += '                  t * t * t *     p3.x,';
    vSource += '                  r * r * r *     p0.y +';
    vSource += '                3.0 * r * r * t * p1.y +';
    vSource += '                3.0 * r * t * t * p2.y +';
    vSource += '                  t * t * t *     p3.y);';
    vSource += '}';
    vSource += '';
    vSource += 'void main(){';
    vSource += '    float f = abs(position.x - 0.5) * 2.0;';
    vSource += '    float g = (1.0 - cos(f * PI)) * 0.75 + 1.0;';
    vSource += '    vec2 p0 = vec2(point.x, point.z);';
    vSource += '    vec2 p1 = vec2(point.x + (point.y - point.x) * 0.5, point.z);';
    vSource += '    vec2 p2 = vec2(point.y + (point.x - point.y) * 0.5, point.w);';
    vSource += '    vec2 p3 = vec2(point.y, point.w);';
    vSource += '    vec2 p  = bezier(position.x, p0, p1, p2, p3);';
    vSource += '    vec2 n  = bezier(position.x + nextTime, p0, p1, p2, p3);';
    vSource += '    vec2 r  = normalize(n - p);';
    vSource += '    gl_Position = matrix * vec4(p + (vec2(r.y, -r.x) * signs) * scale * g, 0.0, 1.0);';
    vSource += '}';
    var fSource = '';
    fSource += 'precision mediump float;';
    fSource += 'uniform vec4 color;';
    fSource += 'void main(){';
    fSource += '    gl_FragColor = color;';
    fSource += '}';
    var vs = create_shader(gl, vSource, gl.VERTEX_SHADER);
    var fs = create_shader(gl, fSource, gl.FRAGMENT_SHADER);
    this.bgPrg = create_program(gl, vs, fs);
    this.bgAttL = [
        gl.getAttribLocation(this.bgPrg, 'position'),
        gl.getAttribLocation(this.bgPrg, 'signs')
    ];
    this.bgAttS = [3, 1];
    this.bgUniL = {
        matrix:   gl.getUniformLocation(this.bgPrg, 'matrix'),
        point:    gl.getUniformLocation(this.bgPrg, 'point'),
        nextTime: gl.getUniformLocation(this.bgPrg, 'nextTime'),
        scale:    gl.getUniformLocation(this.bgPrg, 'scale'),
        color:    gl.getUniformLocation(this.bgPrg, 'color')
    };
    var position = [];
    var signs = [];
    j = 1.0 / this.BEZIER_DIVISION;
    j += j / this.BEZIER_DIVISION;
    for(i = 0; i < this.BEZIER_DIVISION; ++i){
        position.push(i * j, 0.0, 0.0, i * j, 0.0, 0.0);
        signs.push(1.0, -1.0);
    }
    var vPosition = create_vbo(gl, position);
    var vSigns = create_vbo(gl, signs);
    this.bgVboList = [vPosition, vSigns];
    return this;
};

/**
 * 初期化が全て完了したあとに呼び出す描画プロセス
 */
ParallelCoordCluster.prototype.drawCanvas = function(){
    var a, b, c, d, e, f, i, j, k, l, m, n, o;
    var p, q, r, s, t, u, v, w, x, y;
    var gl = this.gl;
    var mat = this.mat;
    var mMatrix   = mat.identity(mat.create());
    var vMatrix   = mat.identity(mat.create());
    var pMatrix   = mat.identity(mat.create());
    var vpMatrix  = mat.identity(mat.create());
    var mvpMatrix = mat.identity(mat.create());
    if(!this.glReady){return;}
    this.canvas.width = this.parentElement.clientWidth;
    this.canvas.height = this.parentElement.clientHeight;
    this.drawRect = this.getDrawRect();
    mat.lookAt(
        [0.0, 0.0, 1.0],
        [0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        vMatrix
    );
    mat.ortho(
        0,
        this.drawRect.width,
        this.drawRect.height,
        0,
        0.5,
        1.0,
        pMatrix
    );
    mat.multiply(pMatrix, vMatrix, vpMatrix);

    var drawClusterRect = function(left, right, top, bottom, color, summit){
        gl.disable(gl.BLEND);
        var w = right - left;
        var h = top - bottom;
        // top triangle ==========
        var nSummit = summit;
        mat.identity(mMatrix);
        mat.translate(mMatrix, [0.0, (h * (1.0 - nSummit)), 0.0], mMatrix);
        mat.translate(mMatrix, [left - w / 2, bottom, 0.0], mMatrix);
        mat.scale(mMatrix, [w, h * nSummit, 1.0], mMatrix);
        mat.multiply(vpMatrix, mMatrix, mvpMatrix);
        gl.useProgram(this.prg);
        gl.uniformMatrix4fv(this.uniL.matrix, false, mvpMatrix);
        gl.uniform4fv(this.uniL.color, color);
        set_attribute(gl, this.vboList, this.attL, this.attS);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // bottom triangle ========
        mat.identity(mMatrix);
        mat.translate(mMatrix, [0.0, (h * (1.0 - nSummit)), 0.0], mMatrix);
        mat.translate(mMatrix, [left + w / 2, bottom, 0.0], mMatrix);
        mat.rotate(mMatrix, Math.PI, [0.0, 0.0, 1.0], mMatrix);
        mat.scale(mMatrix, [w, h * (1.0 - nSummit), 1.0], mMatrix);
        mat.multiply(vpMatrix, mMatrix, mvpMatrix);
        gl.useProgram(this.prg);
        gl.uniformMatrix4fv(this.uniL.matrix, false, mvpMatrix);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }.bind(this);

    var drawBeziercurve = function(left, right, first, second, color){
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
        gl.useProgram(this.bPrg);
        gl.uniformMatrix4fv(this.bUniL.matrix, false, vpMatrix);
        gl.uniform4fv(this.bUniL.point, [left, right, first, second]);
        gl.uniform4fv(this.bUniL.color, color);

        set_attribute(gl, this.bVboList, this.bAttL, this.bAttS);
        gl.drawArrays(gl.LINE_STRIP, 0, this.BEZIER_DIVISION);
    }.bind(this);

    var drawBezierGeometry = function(left, right, first, second, color){
        gl.disable(gl.BLEND);
        gl.useProgram(this.bgPrg);
        gl.uniformMatrix4fv(this.bgUniL.matrix, false, vpMatrix);
        gl.uniform4fv(this.bgUniL.point, [left, right, first, second]);
        gl.uniform1f(this.bgUniL.nextTime, 1.0 / this.BEZIER_DIVISION);
        gl.uniform1f(this.bgUniL.scale, this.BEZIER_LINE_SCALE);
        gl.uniform4fv(this.bgUniL.color, color);

        set_attribute(gl, this.bgVboList, this.bgAttL, this.bgAttS);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.BEZIER_DIVISION * 2);
    }.bind(this);

    if(this.axisArray.length > 1){
        a = [];
        for(i = 0, j = this.axisArray.length; i < j; ++i){
            a[i] = {cluster: null, line: []};
            // cluster sort
            b = [];
            d = [];
            for(k = 0, l = this.axisArray[i].clusters.length; k < l; ++k){
                e = this.axisArray[i].clusters[k].getInputPower() + this.axisArray[i].clusters[k].getOutputPower();
                b.push({index: k, value: e});
                if(i !== this.axisArray.length - 1){
                    // line sort
                    c = this.axisArray[i].clusters[k].getOutputLinePower();
                    for(m = 0, n = c.right.length; m < n; ++m){
                        d[m] = {index: m, value: c.right[m]};
                    }
                    d.sort(function(a, b){return a.value - b.value;});
                    a[i].line[k] = d.concat();
                }
            }
            b.sort(function(a, b){return a.value - b.value;});
            a[i].cluster = b.concat();
        }
        render.bind(this)(this.glFrame.framebuffer);
        render.bind(this)(null);
        function render(target){
            var gl = this.gl;
            var arr = {back: [], front: []};
            gl.bindFramebuffer(gl.FRAMEBUFFER, target);
            if(target){
                gl.viewport(this.drawRect.x, this.drawRect.y, this.drawRect.width, this.drawRect.height);
                gl.clearColor(0.0, 0.0, 0.0, 0.0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }else{
                gl.viewport(this.drawRect.x, this.drawRect.y, this.drawRect.width, this.drawRect.height);
                gl.clearColor(1.0, 1.0, 1.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            for(i = 0, j = this.axisArray.length; i < j; ++i){
                q = this.axisArray[i].height - this.SVG_TEXT_BASELINE;     // Canvas の描画すべきエリアの高さ
                x = this.axisArray[i].getHorizontalRange();                // 対象軸の X 座標（非正規）
                for(e = 0, f = this.axisArray[i].clusters.length; e < f; ++e){
                    k = a[i].cluster[e].index;                             // ソート済みの描画すべきインデックス
                    v = this.axisArray[i].clusters[k].getNormalizeRange(); // クラスタの上下限値（正規）
                    w = q * v.min;                                         // 高さに正規化済みのクラスタの下限値掛ける
                    y = q * v.max;                                         // 高さに正規化済みのクラスタの上限値掛ける
                    // bezier curve
                    if(i !== (this.axisArray.length - 1)){                 // 最終軸じゃないときだけやる
                        t = this.axisArray[i + 1].getHorizontalRange();    // 右隣の軸の X 座標（非正規）
                        u = (y - w) * v.top + w;                           // v.top は正規化されているので除算ではなく乗算
                        var linePower = this.axisArray[i].clusters[k].getOutputLinePower();
                        for(o = 0, s = this.axisArray[i + 1].clusters.length; o < s; ++o){
                            r = a[i].line[k][o].index;                     // ソート済みの描画すべきインデックス
                            v = this.axisArray[i + 1].clusters[r].getNormalizeRange();
                            w = q * ((v.max - v.min) * v.top + v.min);     // v.top は正規化されているので除算ではなく乗算する
                            var fromColor = this.axisArray[i].clusters[k].color;
                            var gotoColor = this.axisArray[i + 1].clusters[r].color;
                            var drawColor = [];
                            if(
                                fromColor[0] + fromColor[1] + fromColor[2] === 0 ||
                                gotoColor[0] + gotoColor[1] + gotoColor[2] === 0
                            ){
                                drawColor = [
                                    fromColor[0] * gotoColor[0],
                                    fromColor[1] * gotoColor[1],
                                    fromColor[2] * gotoColor[2],
                                    0.5
                                    // fromColor[3] * gotoColor[3]
                                ];
                                arr.back.push({x: x, t: t, u: u, w: w, color: drawColor.concat()});
                            }else{
                                drawColor = [
                                    fromColor[0] * 0.5 + gotoColor[0] * 0.5,
                                    fromColor[1] * 0.5 + gotoColor[1] * 0.5,
                                    fromColor[2] * 0.5 + gotoColor[2] * 0.5,
                                    fromColor[3] * 0.5 + gotoColor[3] * 0.5
                                ];
                                arr.front.push({x: x, t: t, u: u, w: w, color: drawColor.concat()});
                            }
                        }
                    }
                }
            }
            for(i = 0, j = arr.back.length; i < j; ++i){
                // x == 対称軸の X 座標
                // t == 右軸の X 座標
                // u == 対象クラスタの中心の Y 座標
                // w == 右軸対象クラスタの中心の Y 座標
                drawBezierGeometry(
                    arr.back[i].x,
                    arr.back[i].t,
                    arr.back[i].u,
                    arr.back[i].w,
                    arr.back[i].color
                );
            }
            for(i = 0, j = arr.front.length; i < j; ++i){
                // x == 対称軸の X 座標
                // t == 右軸の X 座標
                // u == 対象クラスタの中心の Y 座標
                // w == 右軸対象クラスタの中心の Y 座標
                drawBezierGeometry(
                    arr.front[i].x,
                    arr.front[i].t,
                    arr.front[i].u,
                    arr.front[i].w,
                    arr.front[i].color
                );
            }
            // 少々冗長なのだが、軸上の矩形を確実に上に描画させるために
            for(i = 0, j = this.axisArray.length; i < j; ++i){
                q = this.axisArray[i].height - this.SVG_TEXT_BASELINE;     // Canvas の描画すべきエリアの高さ
                x = this.axisArray[i].getHorizontalRange();                // 対象軸の X 座標（非正規）
                for(e = 0, f = this.axisArray[i].clusters.length; e < f; ++e){
                    k = a[i].cluster[e].index;                             // ソート済みの描画すべきインデックス
                    v = this.axisArray[i].clusters[k].getNormalizeRange(); // クラスタの上下限値（正規）
                    w = q * v.min;                                         // 高さに正規化済みのクラスタの下限値掛ける
                    y = q * v.max;                                         // 高さに正規化済みのクラスタの上限値掛ける
                    var _min = this.axisArray[i].clusters[k].min;
                    var _max = this.axisArray[i].clusters[k].max;
                    var _top = this.axisArray[i].clusters[k].top;
                    drawClusterRect(
                        x,
                        x + this.SVG_DEFAULT_WIDTH,
                        y,
                        w,
                        this.axisArray[i].clusters[k].color,
                        (_max - _top) / (_max - _min)
                    );
                }
            }
        }
    }

    gl.flush();

    return this;
};

/**
 * Canvas 上の描画対象エリアとなる矩形の情報を取得する
 */
ParallelCoordCluster.prototype.getDrawRect = function(){
    var w = this.parentElement.clientWidth - this.PARALLEL_PADDING_H * 2;
    var h = this.parentElement.clientHeight - this.PARALLEL_PADDING_V * 2 - this.SVG_TEXT_BASELINE;
    return {
        x: this.PARALLEL_PADDING_H,
        y: this.PARALLEL_PADDING_V,
        width: w,
        height: h,
        mx: this.mouseX,
        my: this.mouseY,
        mnx: this.mouseNormalX,
        mny: this.mouseNormalY
    };
};

/**
 * 現在のステートを返す
 */
ParallelCoordCluster.prototype.getStateData = function(){
    return this.stateData;
};

/**
 * 現在のステートを JSON で返す
 */
ParallelCoordCluster.prototype.getStateJSON = function(){
    return JSON.stringify(this.stateData);
};

/**
 * 全軸上のその時点での選択範囲・input に返すべき情報をオブジェクトとして返す
 * @param {Object}  [currentAxis]  - カレントな軸を指定する場合に渡す
 * @param {Boolean} [isDragEvent]  - ドラッグイベント由来のものかどうか
 * @param {Boolean} [isSelectAxis] - 選択操作由来のものかどうか
 */
ParallelCoordCluster.prototype.getAllBrushedRange = function(currentAxis, isDragEvent, isSelectAxis){
    var f, e, i, j, k, l, v, w;
    var min, max, len;
    var selLength = this.selectedArray.length;

    // return value gen and update
    v = []; w = []; e = [];
    for(i = 0, j = this.axisArray.length; i < j; ++i){
        min = max = len = null;
        v[i] = this.axisArray[i].getBrushedRange();
        e[i] = (v[i] !== null && v[i].top !== null && v[i].bottom !== null);
        if(e[i]){
            len = this.axisArray[i].max - this.axisArray[i].min;
            min = len * (1.0 - v[i].bottom) + this.axisArray[i].min;
            max = len * (1.0 - v[i].top)    + this.axisArray[i].min;
        }
        this.stateData.axis[i].brush.min = min; // brush 領域の min
        this.stateData.axis[i].brush.max = max; // brush 領域の max
        this.stateData.axis[i].range.min = this.axisArray[i].min;
        this.stateData.axis[i].range.max = this.axisArray[i].max;
        this.stateData.axis[i].sigma     = this.axisArray[i].sigma;
        this.stateData.axis[i].volume = {       // ボリューム全体の軸ごとの minmax
            min: this.stateData.volume.minmax[i].min,
            max: this.stateData.volume.minmax[i].max
        };
        w[i] = this.axisArray[i].getClusterBrushed();
        for(k = 0, l = w[i].length; k < l; ++k){
            if(w[i][k]){
                this.axisArray[i].clusters[k].setSelected(true);
                this.stateData.axis[i].cluster[k].selected = w[i][k];
            }else{
                this.axisArray[i].clusters[k].setSelected(false);
                this.stateData.axis[i].cluster[k].selected = false;
            }
        }
        this.stateData.axis[i].order = this.axisArray[i].order;
    }

    // check selection count
    if(isDragEvent){
        f = false;
        if(!currentAxis || !currentAxis.index === undefined){return;}
        j = currentAxis.index;
        for(i = 0; i < selLength; ++i){                 // 既存の選択状態をチェックする
            if(this.selectedArray[i].index === j){      // インデックスが一致しているか
                f = true;                               // 一致していたものが存在した
                if(!e[j]){                              // 選択されているか
                    // 一致したが選択されていない状態なので消す
                    this.stateData.axis[this.selectedArray[i].index].selectedNumber = -1;
                    this.axisArray[this.selectedArray[i].index].selectedNumber = -1;
                    this.selectedArray.splice(i, 1);
                }
                break;
            }
        }
        // 一致していたものが存在しなかったら追加する
        if(!f){
            for(i = 0; i < this.axisArray.length; ++i){ // 選択状態をリセット
                this.axisArray[i].selectedAxis = false;
                this.stateData.axis[i].selectedAxis = false;
            }
            this.selectedArray.push({
                index: currentAxis.index
            });
            currentAxis.selectedNumber = this.selectedArray.length - 1;
            this.stateData.axis[currentAxis.index].selectedNumber = currentAxis.selectedNumber;
        }
    }
    // check select axis
    if(isSelectAxis){
        this.selectedAxis = true;
        this.selectedArray = [];
        j = currentAxis.index;
        for(i = 0; i < this.axisArray.length; ++i){ // 選択状態を一度リセット
            this.axisArray[i].selectedAxis = false;
            this.axisArray[i].brushed = false;
            this.axisArray[i].onBrush = false;
            this.stateData.axis[i].selectedAxis = false;
            this.stateData.axis[i].brushed = false;
            this.stateData.axis[i].onBrush = false;
            this.stateData.axis[i].brush.min = null;
            this.stateData.axis[i].brush.max = null;
        }
        this.axisArray[currentAxis.index].selectedAxis = true;
        this.stateData.axis[currentAxis.index].selectedAxis = true;
    }else{
        this.selectedAxis = false;
    }

    this.setClusterColor(e);
    return this.stateData.axis;
};

/**
 * 指定された軸上のクラスタに色を割り当てる
 * @param {Object} selectedAxis - 選択している軸
 */
ParallelCoordCluster.prototype.setClusterColor = function(selectedAxis){
    var i, j, k, l, m, n, o, p, q, r, s, t;
    var a, b, c, d;
    var f;
    var colorStride = 480 / 7;
    var selectedAxisIndex = null;

    // いったん色を全リセット
    for(i = 0, j = this.axisArray.length; i < j; ++i){
        for(k = 0, l = this.axisArray[i].clusters.length; k < l; ++k){
            this.axisArray[i].clusters[k].color[0]     = 0.0;
            this.axisArray[i].clusters[k].color[1]     = 0.0;
            this.axisArray[i].clusters[k].color[2]     = 0.0;
            this.stateData.axis[i].cluster[k].color[0] = 0.0;
            this.stateData.axis[i].cluster[k].color[1] = 0.0;
            this.stateData.axis[i].cluster[k].color[2] = 0.0;
        }
        if(this.selectedAxis){
            if(this.axisArray[i].selectedAxis !== null && this.axisArray[i].selectedAxis !== false){
                selectedAxisIndex = i;
            }
        }
    }

    // 軸選択か brush 選択か
    if(selectedAxisIndex !== null){
        // 軸ごと選択されている
        // この場合、選択軸のクラスタ数に応じて色を決め、それを全体に割り振る
        // つまりこの段階ですべてのクラスタには色が指定された状態になる（一発塗り）
        i = selectedAxisIndex;
        for(k = 0, l = this.axisArray[i].clusters.length; k < l; ++k){
            a = hsva(colorStride * k + 180, 1.0, 0.75, 1.0);
            this.axisArray[i].clusters[k].color[0]     = a[0];
            this.axisArray[i].clusters[k].color[1]     = a[1];
            this.axisArray[i].clusters[k].color[2]     = a[2];
            this.axisArray[i].clusters[k].color[3]     = 1.0;
            this.stateData.axis[i].cluster[k].color[0] = a[0];
            this.stateData.axis[i].cluster[k].color[1] = a[1];
            this.stateData.axis[i].cluster[k].color[2] = a[2];
            this.stateData.axis[i].cluster[k].color[3] = 1.0;
        }
        // 自身の左軸が存在するか
        if(this.axisArray[i].putData.left){
            // 左側にある軸の回数分繰り返す
            for(o = 1; i - o > -1; ++o){
                // 対象のクラスタの個数分繰り返す
                for(q = 0, r = this.axisArray[i - o].clusters.length; q < r; ++q){
                    c = this.axisArray[i - o].clusters[q].getInputLinePower().right;
                    for(s = 0, t = c.length; s < t; ++s){
                        a = this.axisArray[i - o + 1].clusters[s].color;
                        this.axisArray[i - o].clusters[q].color[0] += a[0] * c[s];
                        this.axisArray[i - o].clusters[q].color[1] += a[1] * c[s];
                        this.axisArray[i - o].clusters[q].color[2] += a[2] * c[s];
                        this.axisArray[i - o].clusters[q].color[3] = 1.0;
                        this.stateData.axis[i - o].cluster[q].color[0] += a[0] * c[s];
                        this.stateData.axis[i - o].cluster[q].color[1] += a[1] * c[s];
                        this.stateData.axis[i - o].cluster[q].color[2] += a[2] * c[s];
                        this.stateData.axis[i - o].cluster[q].color[3] = 1.0;
                    }
                }
            }
        }
        // 自身の右軸が存在するか
        if(this.axisArray[i].putData.right){
            // 右側にある軸の回数分繰り返す
            for(o = 1, p = this.axisArray.length - i; o < p; ++o){
                // 対象の軸のクラスタの個数分繰り返す
                for(q = 0, r = this.axisArray[i + o].clusters.length; q < r; ++q){
                    c = this.axisArray[i + o].clusters[q].getInputLinePower().left;
                    // 左隣のクラスタ群からそれぞれどのような割合で色を持ってくるか計算する
                    for(s = 0, t = c.length; s < t; ++s){
                        a = this.axisArray[i + o - 1].clusters[s].color;
                        this.axisArray[i + o].clusters[q].color[0] += a[0] * c[s];
                        this.axisArray[i + o].clusters[q].color[1] += a[1] * c[s];
                        this.axisArray[i + o].clusters[q].color[2] += a[2] * c[s];
                        this.axisArray[i + o].clusters[q].color[3] = 1.0;
                        this.stateData.axis[i + o].cluster[q].color[0] += a[0] * c[s];
                        this.stateData.axis[i + o].cluster[q].color[1] += a[1] * c[s];
                        this.stateData.axis[i + o].cluster[q].color[2] += a[2] * c[s];
                        this.stateData.axis[i + o].cluster[q].color[3] = 1.0;
                    }
                }
            }
        }
    }else{
        // brushing
        // この場合は AND で参照できるすべてのクラスタの色を塗る
        a = hsva(120, 1.0, 0.75, 1.0);
        // 左側の軸から順番に走査
        for(i = 0, j = this.axisArray.length; i < j; ++i){
            // クラスタをひとつずつ見ていく
            for(k = 0, l = this.axisArray[i].clusters.length; k < l; ++k){
                // 軸選択されていて、自身が選択されている → 着色して continue
                if(this.axisArray[i].clusters[k].selected){
                    this.axisArray[i].clusters[k].color[0] = a[0];
                    this.axisArray[i].clusters[k].color[1] = a[1];
                    this.axisArray[i].clusters[k].color[2] = a[2];
                    this.axisArray[i].clusters[k].color[3] = 1.0;
                    this.stateData.axis[i].cluster[k].color[0] = a[0];
                    this.stateData.axis[i].cluster[k].color[1] = a[1];
                    this.stateData.axis[i].cluster[k].color[2] = a[2];
                    this.stateData.axis[i].cluster[k].color[3] = 1.0;
                    continue;
                }
                // brushされているのに自身が選択されていない → 色はつけずに continue
                if(this.axisArray[i].selectedNumber > -1 && !this.axisArray[i].clusters[k].selected){
                    continue;
                }
                // ここからは、軸選択が無いところにいるクラスタであるから
                // 左右の軸への自身の振り分けを見ながら、選択されているものが出てくるか
                // すべてチェック終わるまでループで走査する
                if(checkfuncleft(this, this.axisArray[i], k) || checkfuncright(this, this.axisArray[i], k)){
                    this.axisArray[i].clusters[k].color[0] = a[0];
                    this.axisArray[i].clusters[k].color[1] = a[1];
                    this.axisArray[i].clusters[k].color[2] = a[2];
                    this.axisArray[i].clusters[k].color[3] = 1.0;
                    this.stateData.axis[i].cluster[k].color[0] = a[0];
                    this.stateData.axis[i].cluster[k].color[1] = a[1];
                    this.stateData.axis[i].cluster[k].color[2] = a[2];
                    this.stateData.axis[i].cluster[k].color[3] = 1.0;
                    continue;
                }
            }
        }
    }
    function checkfuncleft(self, axis, clusterindex){
        var a = axis.clusters[clusterindex].getOutputLinePower().left;
        var f = false, g = false;
        if(!a){return self.axisArray[axis.index].clusters[clusterindex].selected;} // 左が無いので selected を返却して抜ける
        if(axis.clusters[clusterindex].selected){return true;}                     // 自分が選択されてるので返却して抜ける
        for(var i = 0, j = a.length; i < j; ++i){ // 対象のクラスタをチェック
            if(a[i] > 0){
                g = checkfuncleft(self, self.axisArray[axis.index - 1], i);
                f = f || g;
            }
            if(f) return true;
        }
        return f;
    }
    function checkfuncright(self, axis, clusterindex){
        var a = axis.clusters[clusterindex].getOutputLinePower().right;
        var f = false, g = false;
        if(!a){return self.axisArray[axis.index].clusters[clusterindex].selected;} // 右が無いので selected を返却して抜ける
        if(axis.clusters[clusterindex].selected){return true;}                     // 自分が選択されてるので返却して抜ける
        for(var i = 0, j = a.length; i < j; ++i){ // 対象のクラスタをチェック
            if(a[i] > 0){
                g = checkfuncright(self, self.axisArray[axis.index + 1], i);
                f = f || g;
            }
            if(f) return true;
        }
        return f;
    }

};

/**
 * 色を線形に補間して返す
 * @param {Array}  a - 基準色A
 * @param {Array}  b - 基準色B
 * @param {Number} t - 係数（0.0 ~ 1.0）
 */
ParallelCoordCluster.prototype.mixColor = function(a, b, t){
    var s = 1.0 - t;
    return [
        a[0] * s + b[0] * t,
        a[1] * s + b[1] * t,
        a[2] * s + b[2] * t
    ];
};

/**
 * @constructor
 * @classdesc 軸の情報や挙動を定義しているクラス
 * @param     {ParallelCoordCluster} parent - 親となる ParallelCoordCluster クラスのインスタンス
 * @param     {Number}               index  - 軸のインデックス
 */
function Axis(parent, index){
    var i, j;
    var axisData = parent.stateData.axis[index];
    var tempWrapper = null;
    var tempLabel = null;
    this.parent = parent;                // 親となる ParallelCoordCluster インスタンス
    this.title = axisData.title;         // 列のラベル
    this.index = index;                  // インデックス（通常左から読み込んだ順に配置）
    this.svg = this.parent.NS('svg');    // SVG エレメント
    this.axisRectSvg = null;             // axis area rect
    this.brushInput = axisData.brush;    // brushing flag
    this.brushed = false;                // brushing flag
    this.onBrush = false;                // on brush start flag
    this.onBrushRect = false;            // on brush rect drag start flag
    this.eventCurrentSvg = null;         // use currentTarget check
    this.brushDefaultHeight = 0;         // brush start height (normalize range)
    this.brushStartHeight = 0;           // brush start height (normalize range)
    this.brushEndHeight = 0;             // brush end height (normalize range)
    this.brushRectSvg = null;            // brush area
    this.brushTopRectSvg = null;         // brush top area
    this.brushBottomRectSvg = null;      // brush bottom area
    this.brushRectDefaultHeight = 0;     // brush start height (normalize range)
    this.min = 0;                        // min
    this.max = 0;                        // max
    this.sigma = axisData.sigma || 0;    // sigma
    this.order = axisData.order;         // order
    this.defaultOrder = axisData.defaultOrder; // defaultOrder
    this.width = 0;
    this.height = 0;
    this.left = 0;
    this.titleDragStart = 0;             // タイトルがクリックされた瞬間のタイムスタンプ（軸選択判定のため）
    this.onAxisTitleDrag = false;        // ドラッグされているかどうかのフラグ
    this.centerH = 0;                    // 軸の中心が矩形の左から何ピクセル目にあるか
    this.bbox = null;                    // svg.getBBox の結果
    this.listeners = [];                 // リスナを殺すためにキャッシュするので配列を用意
    this.clusters = [];                  // 自身に格納しているクラスタ
    this.putData = {left: null, right: null};
    this.dataLength = parent.stateData.edge.volumenum;
    this.inputWrapper = null; // input
    this.inputMin = null;     // input
    this.inputMax = null;     // input
    this.inputSigma = null;   // input
    this.selectedAxis = axisData.selectedAxis;
    this.selectedNumber = axisData.selectedNumber;
    if(this.order === 0){
        this.putData.right = parent.stateData.edge.cluster[this.order];
    }else if(this.order === parent.stateData.edge.cluster.length){
        this.putData.left  = parent.stateData.edge.cluster[this.order - 1];
    }else{
        this.putData.left  = parent.stateData.edge.cluster[this.order - 1];
        this.putData.right = parent.stateData.edge.cluster[this.order];
    }
    // if(index === 0){
    //     this.putData.right = parent.stateData.edge.cluster[index];
    // }else if(index === parent.stateData.edge.cluster.length){
    //     this.putData.left  = parent.stateData.edge.cluster[index - 1];
    // }else{
    //     this.putData.left  = parent.stateData.edge.cluster[index - 1];
    //     this.putData.right = parent.stateData.edge.cluster[index];
    // }
    for(i = 0, j = axisData.cluster.length; i < j; ++i){
        this.clusters.push(new Cluster(
            this, // axis 自身
            i,    // axis のインデックス
            axisData.cluster[i].selected, // 選択状態
            axisData.cluster[i].top,      // temp
            axisData.cluster[i].min,      // min
            axisData.cluster[i].max,      // max
            axisData.cluster[i].top,      // top
            null                          // color
        ));
        this.parent.stateData.axis[index].cluster[i].color[0] = this.clusters[i].color[0];
        this.parent.stateData.axis[index].cluster[i].color[1] = this.clusters[i].color[1];
        this.parent.stateData.axis[index].cluster[i].color[2] = this.clusters[i].color[2];
        this.parent.stateData.axis[index].cluster[i].color[3] = this.clusters[i].color[3];
    }
    // 外部から range 来てたら使う、なければクラスタの minmax をなめる
    if(axisData.range && axisData.range.min && axisData.range.max){
        this.min = axisData.range.min;
        this.max = axisData.range.max;
    }else{
        this.getClustersMinMax(); // クラスタの minmax とってきて自身に適用
    }
    this.svg.style.position = 'relative';
    this.svg.style.overflow = 'visible';
    this.parent.layer.appendChild(this.svg);

    this.inputWrapper = document.createElement('div');
    this.inputWrapper.style.display = 'flex';
    this.inputWrapper.style.flexDirection = 'column';
    this.inputMin   = document.createElement('input');
    this.inputMin.style.width = '65px';
    this.inputMin.type = 'number';
    this.inputMin.step = '0.0001';
    this.inputMin.value = this.min;
    this.inputMax   = document.createElement('input');
    this.inputMax.style.width = '65px';
    this.inputMax.type = 'number';
    this.inputMax.step = '0.0001';
    this.inputMax.value = this.max;
    this.inputSigma = document.createElement('input');
    this.inputSigma.style.width = '90%';
    this.inputSigma.type = 'range';
    this.inputSigma.min = 0.001;
    this.inputSigma.max = 0.1;
    this.inputSigma.step = 0.001;
    this.inputSigma.value = this.sigma;
    tempWrapper = document.createElement('div');
    tempWrapper.appendChild(this.inputSigma);
    this.inputWrapper.appendChild(tempWrapper);
    tempWrapper = document.createElement('div');
    tempLabel = document.createElement('span');
    tempLabel.style.display = 'inline-block';
    tempLabel.style.width = '40px';
    tempLabel.textContent = 'max: ';
    tempWrapper.appendChild(tempLabel);
    tempWrapper.appendChild(this.inputMax);
    this.inputWrapper.appendChild(tempWrapper);
    tempWrapper = document.createElement('div');
    tempLabel = document.createElement('span');
    tempLabel.style.display = 'inline-block';
    tempLabel.style.width = '40px';
    tempLabel.textContent = 'min: ';
    tempWrapper.appendChild(tempLabel);
    tempWrapper.appendChild(this.inputMin);
    this.inputWrapper.appendChild(tempWrapper);
    this.parent.footerWrap.appendChild(this.inputWrapper);
}

/**
 * 軸を設定して SVG を生成し描画する
 * @param {String} titleString - 軸タイトルに指定する文字列
 * @param {Array}  minmax      - 配列に格納した最小値と最大値（[最小値, 最大値]）
 */
Axis.prototype.update = function(titleString, minmax){
    var i, j;
    var path = null;
    var text = null;
    var title = titleString;
    var funcDown = this.dragStart.bind(this);
    var funcMove = this.dragMove.bind(this);
    var funcUp   = this.dragEnd.bind(this);
    var funcAxisDown   = this.dragAxisStart.bind(this);
    var funcAxisMove   = this.dragAxisMove.bind(this);
    var funcAxisUp     = this.dragAxisEnd.bind(this);
    var funcAxisHandle = this.dragAxisHandleStart.bind(this);
    var funcBrushDown  = this.dragAxisBrushStart.bind(this);
    var funcBrushMove  = this.dragAxisBrushMove.bind(this);
    var funcBrushUp    = this.dragAxisBrushEnd.bind(this);
    var funcDomMin     = this.domInputMin.bind(this);
    var funcDomMax     = this.domInputMax.bind(this);
    var funcDomSigmaDown = this.domInputSigmaDown.bind(this);
    var funcDomSigmaMove = this.domInputSigmaMove.bind(this);
    var funcDomSigmaUp   = this.domInputSigmaUp.bind(this);
    if(titleString){
        this.title = titleString;
    }else{
        title = this.title;
    }
    if(minmax && minmax.hasOwnProperty('length') && minmax.length > 0){
        this.setMinMax(minmax[0], minmax[1]);
    }
    // 軸上のイベントがメモリリークしないように
    if(this.listeners.length > 0){
        for(i = 0, j = this.listeners.length; i < j; ++i){
            this.listeners[i].bind(this)();
        }
        this.listeners = [];
    }
    this.svg.innerHTML = '';
    text = this.parent.NS('text');
    text.addEventListener('mousedown', funcDown, false);
    this.parent.layer.addEventListener('mousemove', funcMove, false);
    this.parent.layer.addEventListener('mouseup', funcUp, false);
    this.listeners.push(
        (function(){return function(){text.removeEventListener('mousedown', funcDown, false);};}()),
        (function(){return function(){this.parent.layer.removeEventListener('mousemove', funcMove, false);};}()),
        (function(){return function(){this.parent.layer.removeEventListener('mouseup', funcUp, false);};}())
    );
    text.textContent = title;
    text.style.fontSize = this.parent.SVG_TEXT_SIZE;
    text.setAttribute('fill', this.selectedAxis ? 'crimson' : this.parent.AXIS_LINE_COLOR);
    text.setAttribute('x', 0);
    text.setAttribute('y', this.parent.SVG_TEXT_BASELINE - 10);
    text.style.cursor = 'pointer';
    this.svg.appendChild(text);
    this.bbox = text.getBBox();
    this.width = this.bbox.width;
    this.height = this.parent.layer.clientHeight - this.parent.PARALLEL_PADDING_V * 2;
    this.centerH = this.parent.SVG_DEFAULT_WIDTH / 2;
    text.setAttribute('x', -(this.width - this.parent.SVG_DEFAULT_WIDTH) / 2);
    this.svg.style.position = 'relative';
    this.svg.style.width = this.parent.SVG_DEFAULT_WIDTH;
    this.svg.style.height = this.height;
    this.svg.style.top = this.parent.PARALLEL_PADDING_V;
    this.svg.style.left = this.parent.PARALLEL_PADDING_H - (this.parent.SVG_DEFAULT_WIDTH / 2);
    path = this.parent.NS('path');
    path.setAttribute('stroke', this.parent.AXIS_LINE_COLOR);
    path.setAttribute('stroke-width', this.parent.AXIS_LINE_WIDTH);
    path.setAttribute(
        'd',
        'M ' + this.centerH + ' ' + this.parent.SVG_TEXT_BASELINE + ' v ' + (this.height - this.parent.SVG_TEXT_BASELINE)
    );
    this.svg.appendChild(path);
    this.drawScale();
    // 軸上の選択可能な領域
    this.axisRectSvg = this.parent.NS('path');
    this.axisRectSvg.setAttribute('fill', 'transparent');
    this.axisRectSvg.setAttribute('stroke', this.parent.AXIS_LINE_SELECT_COLOR);
    this.axisRectSvg.setAttribute('stroke-width', this.parent.AXIS_LINE_WIDTH - 1);
    this.axisRectSvg.setAttribute('class', 'parallelAxisRect');
    this.svg.appendChild(this.axisRectSvg);
    // 軸上の選択された部分を表す矩形
    this.brushRectSvg = this.parent.NS('path');
    this.brushRectSvg.setAttribute('fill', 'rgba(196, 196, 196, 0.5)');
    this.brushRectSvg.setAttribute('stroke', this.parent.AXIS_LINE_BRUSH_COLOR);
    this.brushRectSvg.setAttribute('stroke-width', this.parent.AXIS_LINE_WIDTH - 1);
    this.brushRectSvg.setAttribute('style', 'display: none;');
    this.svg.appendChild(this.brushRectSvg);
    // 軸上の選択領域の上下の先端部分（不可視だがBrush領域を拡縮するのに使う）※上端
    this.brushTopRectSvg = this.parent.NS('path');
    this.brushTopRectSvg.setAttribute('fill', this.parent.AXIS_BRUSH_HANDLE_COLOR);
    this.brushTopRectSvg.setAttribute('stroke', 'transparent');
    this.brushTopRectSvg.setAttribute('style', 'cursor: row-resize; display: none;');
    this.svg.appendChild(this.brushTopRectSvg);
    // 軸上の選択領域の上下の先端部分（不可視だがBrush領域を拡縮するのに使う）※下端
    this.brushBottomRectSvg = this.parent.NS('path');
    this.brushBottomRectSvg.setAttribute('fill', this.parent.AXIS_BRUSH_HANDLE_COLOR);
    this.brushBottomRectSvg.setAttribute('stroke', 'transparent');
    this.brushBottomRectSvg.setAttribute('style', 'cursor: row-resize; display: none;');
    this.svg.appendChild(this.brushBottomRectSvg);

    // 軸関連のイベントの登録とリムーバの配列へのプッシュ
    this.axisRectSvg.addEventListener('mousedown', funcAxisDown, false);
    this.parent.layer.addEventListener('mousemove', funcAxisMove, false);
    this.parent.layer.addEventListener('mouseup', funcAxisUp, false);
    this.brushTopRectSvg.addEventListener('mousedown', funcAxisHandle, false);
    this.brushBottomRectSvg.addEventListener('mousedown', funcAxisHandle, false);
    this.brushRectSvg.addEventListener('mousedown', funcBrushDown, false);
    this.parent.layer.addEventListener('mousemove', funcBrushMove, false);
    this.parent.layer.addEventListener('mouseup', funcBrushUp, false);
    this.inputMin.addEventListener('change', funcDomMin, false);
    this.inputMax.addEventListener('change', funcDomMax, false);
    this.inputSigma.addEventListener('mousedown', funcDomSigmaDown, false);
    this.inputSigma.addEventListener('mousemove', funcDomSigmaMove, false);
    this.inputSigma.addEventListener('mouseup', funcDomSigmaUp, false);
    this.listeners.push(
        (function(){return function(){this.axisRectSvg.removeEventListener('mousedown', funcAxisDown, false);};}()),
        (function(){return function(){this.parent.layer.removeEventListener('mousemove', funcAxisMove, false);};}()),
        (function(){return function(){this.parent.layer.removeEventListener('mouseup', funcAxisUp, false);};}()),
        (function(){return function(){this.brushTopRectSvg.removeEventListener('mousedown', funcAxisHandle, false);};}()),
        (function(){return function(){this.brushBottomRectSvg.removeEventListener('mousedown', funcAxisHandle, false);};}()),
        (function(){return function(){this.brushRectSvg.removeEventListener('mousedown', funcBrushDown, false);};}()),
        (function(){return function(){this.parent.layer.removeEventListener('mousemove', funcBrushMove, false);};}()),
        (function(){return function(){this.parent.layer.removeEventListener('mouseup', funcBrushUp, false);};}()),
        (function(){return function(){this.inputMin.removeEventListener('change', funcDomMin, false);};}()),
        (function(){return function(){this.inputMax.removeEventListener('change', funcDomMax, false);};}()),
        (function(){return function(){this.inputSigma.removeEventListener('mousedown', funcDomSigmaDown, false);};}()),
        (function(){return function(){this.inputSigma.removeEventListener('mousemove', funcDomSigmaMove, false);};}()),
        (function(){return function(){this.inputSigma.removeEventListener('mouseup', funcDomSigmaUp, false);};}())
    );

    this.updateInput.bind(this)();
    this.updateSvg.bind(this)();
    this.setBrushed.bind(this)(this.brushInput);
};

/**
 * input 要素に軸自身が持つ値を割り当てる
 */
Axis.prototype.updateInput = function(){
    this.inputMin.value = this.min;
    this.inputMax.value = this.max;
    this.inputSigma.value = this.sigma;
};

/**
 * 軸上の SVG 要素の外観や大きさを、その時点での this が持つプロパティに応じてアップデートする
 */
Axis.prototype.updateSvg = function(){
    var fill, stroke, display;
    var top, bottom;
    // 軸上の選択可能な領域
    if(this.brushed || this.onBrush){
        stroke = this.parent.AXIS_LINE_SELECT_COLOR;
    }else{
        stroke = 'transparent';
    }
    this.axisRectSvg.setAttribute('stroke', stroke);
    this.axisRectSvg.setAttribute(
        'd',
        'M ' + (this.centerH - this.parent.AXIS_SCALE_WIDTH) + ' ' + this.parent.SVG_TEXT_BASELINE +
        ' v ' + (this.height - this.parent.SVG_TEXT_BASELINE) +
        ' h ' + (this.parent.AXIS_SCALE_WIDTH * 2) +
        ' V ' + this.parent.SVG_TEXT_BASELINE +
        ' h ' + (-this.parent.AXIS_SCALE_WIDTH * 2)
    );
    // 軸上の選択された部分を表す矩形
    if(this.brushed || this.onBrush){
        display = '';
    }else{
        display = 'display: none;';
    }
    top = this.brushStartHeight * (this.height - this.parent.SVG_TEXT_BASELINE) + this.parent.SVG_TEXT_BASELINE;
    bottom = this.brushEndHeight * (this.height - this.parent.SVG_TEXT_BASELINE) + this.parent.SVG_TEXT_BASELINE;
    this.brushRectSvg.setAttribute(
        'd',
        'M ' + (this.centerH - this.parent.AXIS_SCALE_WIDTH) + ' ' + top +
        ' V ' + bottom +
        ' h ' + (this.parent.AXIS_SCALE_WIDTH * 2) +
        ' V ' + top +
        ' h ' + (-this.parent.AXIS_SCALE_WIDTH * 2)
    );
    this.brushRectSvg.setAttribute('style', display);
    // 軸上の選択領域の上下の先端部分（不可視だがBrush領域を拡縮するのに使う）※上端
    if((this.brushed && this.onBrush) || (this.brushed && this.onBrushRect)){
        display = '';
    }else if(this.brushed){
        display = 'cursor: row-resize;';
    }else{
        display = 'cursor: row-resize; display: none;';
    }
    this.brushTopRectSvg.setAttribute(
        'd',
        'M ' + (this.centerH - this.parent.AXIS_SCALE_WIDTH) + ' ' + (top - this.parent.AXIS_BRUSHED_EDGE_HEIGHT) +
        ' V ' + (top + this.parent.AXIS_BRUSHED_EDGE_HEIGHT) +
        ' h ' + (this.parent.AXIS_SCALE_WIDTH * 2) +
        ' V ' + (top - this.parent.AXIS_BRUSHED_EDGE_HEIGHT) +
        ' h ' + (-this.parent.AXIS_SCALE_WIDTH * 2)
    );
    this.brushTopRectSvg.setAttribute('style', display);
    // 軸上の選択領域の上下の先端部分（不可視だがBrush領域を拡縮するのに使う）※下端
    this.brushBottomRectSvg.setAttribute(
        'd',
        'M ' + (this.centerH - this.parent.AXIS_SCALE_WIDTH) + ' ' + (bottom - this.parent.AXIS_BRUSHED_EDGE_HEIGHT) +
        ' V ' + (bottom + this.parent.AXIS_BRUSHED_EDGE_HEIGHT) +
        ' h ' + (this.parent.AXIS_SCALE_WIDTH * 2) +
        ' V ' + (bottom - this.parent.AXIS_BRUSHED_EDGE_HEIGHT) +
        ' h ' + (-this.parent.AXIS_SCALE_WIDTH * 2)
    );
    this.brushBottomRectSvg.setAttribute('style', display);
};

/**
 * 軸に対して Brushing 状態を反映する
 * @param {Object} brush - minmax 情報を格納したオブジェクト（{min: 0, max: 0}）
 */
Axis.prototype.setBrushed = function(brush){
    if(!brush || brush.min === null || brush.max === null){return;}
    var t = this.max - this.min;
    this.brushStartHeight = 1.0 - (brush.max - this.min) / t;
    this.brushEndHeight = 1.0 - (brush.min - this.min) / t;
    this.brushDefaultHeight = this.brushEndHeight;
    this.brushed = true;
    this.onBrush = false;
    this.onBrushRect = false;
    this.updateSvg();
};

/**
 * 軸を削除するため listener を remove して HTML を空にする
 */
Axis.prototype.delete = function(){
    var i, j;
    if(this.listeners.length > 0){
        for(i = 0, j = this.listeners.length; i < j; ++i){
            this.listeners[i].bind(this)();
        }
        this.listeners = [];
    }
    this.svg.innerHTML = '';
    this.parent.layer.removeChild(this.svg);
    this.svg = null;
    this.inputWrapper.innerHTML = '';
    this.parent.footerWrap.removeChild(this.inputWrapper);
    this.inputWrapper = null;
};

/**
 * SVG 要素を生成して軸を描画する
 */
Axis.prototype.drawScale = function(){
    var i, j, k, l, m;
    var text, path, bbox, dummy;
    var smin, smax;
    var range = this.max - this.min;
    var scale = range / 10;
    smin = this.min;
    smax = this.max;
    l = this.svg.clientHeight - this.parent.SVG_TEXT_BASELINE;
    dummy = this.parent.NS('text');
    dummy.style.position = 'relative';
    dummy.style.fontSize = this.parent.SVG_SCALE_SIZE;
    dummy.style.visibility = 'hidden';
    this.svg.appendChild(dummy);
    m = 0;
    for(i = this.min; i <= smax; i += scale){
        text = this.parent.NS('text');
        text.style.position = 'relative';
        text.style.overflow = 'visible';
        text.style.fontSize = this.parent.SVG_SCALE_SIZE;
        text.textContent = '' + this.formatFloat(i, 5);
        dummy.textContent = '' + this.formatFloat(i, 5);
        bbox = dummy.getBBox();
        j = bbox.width - (this.parent.SVG_DEFAULT_WIDTH / 2) + this.parent.AXIS_SCALE_WIDTH + 2;
        k = this.svg.clientHeight - ((i - this.min) / (smax - this.min)) * l;
        text.style.transform = 'translate(' + -j + 'px, ' + (k + 5) + 'px)';
        this.svg.appendChild(text);
        path = this.parent.NS('path');
        path.setAttribute('stroke', this.parent.AXIS_LINE_COLOR);
        path.setAttribute('stroke-width', this.parent.AXIS_LINE_WIDTH);
        path.setAttribute(
            'd',
            'M ' + this.centerH + ' ' + k + ' h ' + -this.parent.AXIS_SCALE_WIDTH
        );
        this.svg.appendChild(path);
    }
};

/**
 * 軸のスタイルを変更して直接横位置を設定する
 * @param {Number} x - 設定する値
 */
Axis.prototype.setPosition = function(x){
    this.svg.style.left = x;
};

/**
 * 自身の minmax プロパティを直接設定する
 * @param {Number} min - 設定する最小値
 * @param {Number} max - 設定する最大値
 */
Axis.prototype.setMinMax = function(min, max){
    this.min = min;
    this.max = max;
};

/**
 * 自身に格納しているクラスタの内容から minmax を求めて自身に設定する
 */
Axis.prototype.getClustersMinMax = function(){
    if(this.clusters.length === 0){return;}
    var i, j, k, l;
    k = l = 0;
    if(this.clusters.length === 1){
        k = this.clusters[0].min;
        l = this.clusters[0].max;
    }else{
        for(i = 0, j = this.clusters.length; i < j; ++i){
            k = Math.min(this.clusters[i].min, k);
            l = Math.max(this.clusters[i].max, l);
        }
    }
    this.min = k;
    this.max = l;
    return this;
};

/**
 * 正規化していない軸の Left（ピクセル単位、0 始点）
 */
Axis.prototype.getHorizontalRange = function(){
    // horizon range
    var i = parseFloat(this.svg.style.left.replace(/px$/));
    return i + (this.parent.SVG_DEFAULT_WIDTH / 2) + (this.index * this.parent.SVG_DEFAULT_WIDTH) - this.parent.PARALLEL_PADDING_H;
};

/**
 * 正規化した軸の横位置（0 ~ 1）
 */
Axis.prototype.getNomalizeHorizontalRange = function(){
    // horizon normalize range
    var i = this.getHorizontalRange();
    return i / this.parent.drawRect.width;
};

/**
 * 軸上の選択範囲を正規化した値として返す
 */
Axis.prototype.getBrushedRange = function(){
    if(!this.brushed){return null;}
    var h = this.height - this.parent.SVG_TEXT_BASELINE;
    var t = this.parent.AXIS_BRUSHED_EDGE_HEIGHT - this.parent.SVG_TEXT_BASELINE;
    var top    = Math.max(0, Math.min(1.0, (this.brushTopRectSvg.getBBox().y    + t) / h));
    var bottom = Math.max(0, Math.min(1.0, (this.brushBottomRectSvg.getBBox().y + t) / h));
    var returnObject = {
        top: top,
        bottom: bottom,
        index: this.index,
        length: bottom - top
    };
    return returnObject;
};

/**
 * クラスタの選択状態をbrushを元に判定して配列で返す
 */
Axis.prototype.getClusterBrushed = function(){
    var i, j, v, a = [];
    var min, max, len;
    if(!this.brushed){return new Array(this.clusters.length);}
    v = this.getBrushedRange();
    for(i = 0, j = this.clusters.length; i < j; ++i){
        len = this.max - this.min;
        min = len * (1.0 - v.bottom) + this.min;
        max = len * (1.0 - v.top)    + this.min;
        a.push((
            (this.clusters[i].min <= min && this.clusters[i].max >= min) ||
            (this.clusters[i].min <= max && this.clusters[i].max >= max) ||
            (this.clusters[i].min >= min && this.clusters[i].max <= max)
        ));
    }
    return a;
};

/**
 * 軸タイトルのドラッグ開始イベント
 */
Axis.prototype.dragStart = function(eve){
    this.left = eve.pageX;
    this.onAxisTitleDrag = true;
    this.titleDragStart = Date.now();
    this.parent.draggingAxis = this.index; // どの軸がドラッグ開始イベントを呼んだのか
};

/**
 * 軸タイトルのドラッグイベント
 */
Axis.prototype.dragMove = function(eve){
    if(!this.onAxisTitleDrag){return;}
    var x = eve.pageX - this.left;
    var df = parseFloat(this.svg.style.left.replace(/px$/, ''));
    var i = df + x;
    var j = this.parent.drawRect.width - ((this.index + 1) * this.parent.SVG_DEFAULT_WIDTH) + (this.parent.SVG_DEFAULT_WIDTH / 2) + this.parent.PARALLEL_PADDING_H;
    var k = this.parent.PARALLEL_PADDING_H - (this.index * this.parent.SVG_DEFAULT_WIDTH) - (this.parent.SVG_DEFAULT_WIDTH / 2);
    if(i > j){i = j;}
    if(i < k){i = k;}
    this.svg.style.left = i + 'px';
    this.left = eve.pageX;
    if(this.parent.glReady){
        this.parent.drawCanvas();
    }
};

/**
 * 軸タイトルのドラッグ終了イベント
 */
Axis.prototype.dragEnd = function(eve){
    this.onAxisTitleDrag = false;
    var axisjson;
    if(Date.now() - this.titleDragStart > 300){
        // 軸の前後関係が変化しているのかどうかを確認する
        var x = eve.pageX - this.left;
        var df = parseFloat(this.svg.style.left.replace(/px$/, ''));
        var i = df + x;
        var j = this.parent.drawRect.width - ((this.index + 1) * this.parent.SVG_DEFAULT_WIDTH) + (this.parent.SVG_DEFAULT_WIDTH / 2) + this.parent.PARALLEL_PADDING_H;
        var k = this.parent.PARALLEL_PADDING_H - (this.index * this.parent.SVG_DEFAULT_WIDTH) - (this.parent.SVG_DEFAULT_WIDTH / 2);
        if(i > j){i = j;} // 右端に到達
        if(i < k){i = k;} // 左端に到達
        var l = i - k;
        var w = (j - k) / (this.parent.axisCount - 1);
        var start = w * Math.max(this.index - 1, 0);
        var end = w * (this.index + 1);

        // dragstart を呼んだ軸自身の場合だけ処理する
        if(this.parent.draggingAxis === this.index){
            var noworder = [];
            var offsetCount = 0;
            for(i = 0, j = this.parent.axisCount; i < j; ++i){
                // noworder の中身は、実際の見た目順で本来の順番が格納されている
                noworder[this.parent.axisArray[i].order] = i;
            }
            // 現在位置が左隣以下
            if(l <= start){
                // 現在の位置が 0 以外の場合だけ処理する
                if(this.order > 0){
                    if(l === 0){
                        offsetCount = -this.order;
                    }else{
                        offsetCount = Math.floor(l / w) - this.order + 1;
                    }
                    offsetCount = -1; // 隣にひとつだけ移動できる
                    for(i = 0, j = this.parent.axisCount; i < j; ++i){
                        // インデックスが若いものだけインクリメントする
                        if(i < this.order && i >= this.order + offsetCount){
                            ++this.parent.axisArray[noworder[i]].order;
                        }
                    }
                }
                this.order += offsetCount;
            // 現在位置が右隣以上
            }else if(end <= l){
                // 現在の位置が配列長より小さい場合だけ処理する
                if(this.order < this.parent.axisCount - 1){
                    offsetCount = Math.floor(l / w) - this.order;
                    offsetCount = 1; // 隣にひとつだけ移動できる
                    for(i = 0, j = this.parent.axisCount; i < j; ++i){
                        // インデックスが高いものだけデクリメントする
                        if(i > this.order && i <= this.order + offsetCount){
                            --this.parent.axisArray[noworder[i]].order;
                        }
                    }
                }
                this.order += offsetCount;
            }

            this.parent.draggingAxis = -1;
            // 変更があった場合は input の値を更新する
            axisjson = this.parent.getAllBrushedRange(this, false, false);

            if(this.parent.selectedCallback){this.parent.selectedCallback('axisjson', axisjson);}
        }

        // 時間差で軸リセットを呼ぶ
        setTimeout(this.parent.resetAxis.bind(this.parent), 300);

    }else{
        this.parent.draggingAxis = -1;
        // すぐにマウスアップしているのでクリックと判定する
        axisjson = this.parent.getAllBrushedRange(this, false, true);
        if(this.parent.selectedCallback){this.parent.selectedCallback('axisjson', axisjson);}
    }
};

/**
 * 軸上でのドラッグ開始（Brush開始）イベント
 */
Axis.prototype.dragAxisStart = function(eve){
    var h = this.height - this.parent.SVG_TEXT_BASELINE;
    this.brushed = true;
    this.onBrush = true;
    this.eventCurrentSvg = this.axisRectSvg;
    this.brushStartHeight = Math.max(0, Math.min(1.0, (eve.offsetY - this.parent.SVG_TEXT_BASELINE) / h));
    this.brushEndHeight = this.brushDefaultHeight = this.brushStartHeight;
};

/**
 * 軸上でのドラッグ（Brush中）イベント
 */
Axis.prototype.dragAxisMove = function(eve){
    if(!this.onBrush){return;}
    if(this.eventCurrentSvg !== this.axisRectSvg){return;}
    var h = this.height - this.parent.SVG_TEXT_BASELINE;
    var t = Math.max(0, Math.min(1.0, (eve.offsetY - this.parent.SVG_TEXT_BASELINE) / h));
    if(t < this.brushDefaultHeight){
        this.brushStartHeight = t;
        this.brushEndHeight = this.brushDefaultHeight;
    }else if(t > this.brushDefaultHeight){
        this.brushEndHeight = t;
        this.brushStartHeight = this.brushDefaultHeight;
    }
    this.updateSvg.bind(this)();
};

/**
 * 軸上でのドラッグ終了（Brush完了）イベント
 */
Axis.prototype.dragAxisEnd = function(eve){
    if(this.eventCurrentSvg !== this.axisRectSvg){return;}
    var h = this.height - this.parent.SVG_TEXT_BASELINE;
    this.onBrush = false;
    var t = Math.max(0, Math.min(1.0, (eve.offsetY - this.parent.SVG_TEXT_BASELINE) / h));
    if(t < this.brushDefaultHeight){
        this.brushStartHeight = t;
        this.brushEndHeight = this.brushDefaultHeight;
    }else if(t > this.brushDefaultHeight){
        this.brushEndHeight = t;
        this.brushStartHeight = this.brushDefaultHeight;
    }
    if(this.brushEndHeight - this.brushStartHeight <= 0.03){
        this.brushed = false;
        this.brushStartHeight = this.brushEndHeight = 0.0;
    }
    this.updateSvg.bind(this)();

    var axisjson = this.parent.getAllBrushedRange(this, true);
    if(this.parent.selectedCallback){this.parent.selectedCallback('axisjson', axisjson);}
};

/**
 * 軸の上下のハンドルをドラッグ開始
 */
Axis.prototype.dragAxisHandleStart = function(eve){
    var h = this.height - this.parent.SVG_TEXT_BASELINE;
    var y = eve.currentTarget.getBBox().y + this.parent.AXIS_BRUSHED_EDGE_HEIGHT;
    this.brushed = true;
    this.onBrush = true;
    this.eventCurrentSvg = this.axisRectSvg;
    var v = this.getBrushedRange();
    if(eve.currentTarget === this.brushTopRectSvg){
        this.brushDefaultHeight = v.bottom;
        this.brushStartHeight = v.top;
        this.brushEndHeight = v.bottom;
    }else{
        this.brushDefaultHeight = v.top;
        this.brushStartHeight = v.top;
        this.brushEndHeight = v.bottom;
    }
};

/**
 * 軸上の選択済みエリアをドラッグ開始
 */
Axis.prototype.dragAxisBrushStart = function(eve){
    this.onBrushRect = true;
    var h = this.height - this.parent.SVG_TEXT_BASELINE;
    var n = (eve.offsetY - this.parent.SVG_TEXT_BASELINE) / h;
    this.brushRectDefaultHeight = n;
    this.eventCurrentSvg = this.brushRectSvg;
};

/**
 * 軸上の選択済みエリアをドラッグ中
 */
Axis.prototype.dragAxisBrushMove = function(eve){
    if(this.eventCurrentSvg !== this.brushRectSvg){return;}
    if(!this.onBrushRect){return;}
    var v = this.getBrushedRange();
    var h = this.height - this.parent.SVG_TEXT_BASELINE;
    var n = (eve.offsetY - this.parent.SVG_TEXT_BASELINE) / h;
    var offset = n - this.brushRectDefaultHeight;
    if(offset + v.top < 0.0){
        offset += -(offset + v.top);
    }
    if(offset + v.bottom > 1.0){
        offset += 1.0 - (offset + v.bottom);
    }
    this.brushStartHeight += offset;
    this.brushEndHeight += offset;
    this.brushRectDefaultHeight += offset;
    this.updateSvg.bind(this)();
};

/**
 * 軸上の選択済みエリアをドラッグ終了
 */
Axis.prototype.dragAxisBrushEnd = function(eve){
    if(this.eventCurrentSvg !== this.brushRectSvg){return;}
    if(!this.onBrushRect){return;}
    this.onBrushRect = false;

    var axisjson = this.parent.getAllBrushedRange(this, true);
    if(this.parent.selectedCallback){this.parent.selectedCallback('axisjson', axisjson);}
};

/**
 * dom の input min の change イベント
 */
Axis.prototype.domInputMin = function(eve){
    this.min = parseFloat(eve.currentTarget.value);
    if(!isNaN(this.min)){
        var axisjson = this.parent.getAllBrushedRange(this);
        if(this.parent.selectedCallback){this.parent.selectedCallback('axisjson', axisjson);}
    }
};

/**
 * dom の input max の change イベント
 */
Axis.prototype.domInputMax = function(eve){
    this.max = parseFloat(eve.currentTarget.value);
    if(!isNaN(this.max)){
        var axisjson = this.parent.getAllBrushedRange(this);
        if(this.parent.selectedCallback){this.parent.selectedCallback('axisjson', axisjson);}
    }
};

/**
 * dom の input sigma の change イベント
 */
Axis.prototype.domInputSigma = function(eve){
    this.sigma = parseFloat(eve.currentTarget.value);
    if(!isNaN(this.sigma)){
        var axisjson = this.parent.getAllBrushedRange(this);
        if(this.parent.selectedCallback){this.parent.selectedCallback('axisjson', axisjson);}
    }
};

/**
 * dom の input sigma のマウスダウンイベント
 */
Axis.prototype.domInputSigmaDown = function(eve){
    var e = eve.currentTarget;
    e.setAttribute('id', 'trued');
};

/**
 * dom の input sigma のマウスムーブ
 */
Axis.prototype.domInputSigmaMove = function(eve){
    var e = eve.currentTarget;
    if(e.id === 'trued'){
        e.value = (eve.offsetX / e.offsetWidth) * (0.1 - 0.001);
    }
};

/**
 * dom の input sigma のマウスアップ
 */
Axis.prototype.domInputSigmaUp = function(eve){
    var e = eve.currentTarget;
    e.setAttribute('id', '');
    this.domInputSigma({currentTarget: e});
};

/**
 * 小数点以下の桁数をフォーマットする
 */
Axis.prototype.formatFloat = function(number, n){
    var p = Math.pow(10, n);
    return Math.round(number * p) / p;
};

/**
 * @constructor
 * @classdesc クラスタの情報を管理するクラス
 * @param     {Axis}    axis     - 親となる Axis クラスのインスタンス
 * @param     {Number}  index    - 自分自身のインデックス
 * @param     {Boolean} selected - 選択常態化どうかのフラグ
 * @param     {Number}  out      - 出力用データ（現状未使用）
 * @param     {Number}  min      - 最小値
 * @param     {Number}  max      - 最大値
 * @param     {Number}  top      - 突端部分（クラスタの菱型の左右の突端部分が全体の高さのうちのどこにあるか 0.0 ~ 1.0）
 * @param     {Array}   color    - クラスタの色
 */
function Cluster(axis, index, selected, out, min, max, top, color){
    var c;
    this.parentAxis = axis;             // 自分自身が所属する軸インスタンス
    this.index = index;                 // 自分自身のインデックス
    this.selected = selected;           // 選択状態かどうかのフラグ
    this.out = out;                     // 出力（現状未使用）
    this.min = min;                     // 自分自身の最小値
    this.max = max;                     // 自分自身の最大値
    this.top = top;                     // 自分自身の突出頂点部分の値
    this.color = color || [0, 0, 0, 1]; // 色
    return this;
}

/**
 * 正規化された、クラスタの縦方向の位置の上辺と下辺を取得する
 */
Cluster.prototype.getNormalizeRange = function(){
    // vertical normalize range
    var i = this.parentAxis.max - this.parentAxis.min;
    var t = (this.top - this.min) / (this.max - this.min);
    return {
        min: (this.min - this.parentAxis.min) / i,
        max: 1.0 - (this.parentAxis.max - this.max) / i,
        top: t,
        percentage: (this.max - this.min) / (this.parentAxis.max - this.parentAxis.min)
    };
};

/**
 * クラスタ自身にインプットされている量/軸
 */
Cluster.prototype.getInputPower = function(){
    var i, j;
    var data = this.parentAxis.putData.left;
    if(!data){return 0;}
    j = 0;
    for(i = 0; i < data.length; ++i){
        j += data[i][this.index];
    }
    return j / this.parentAxis.dataLength;
};

/**
 * クラスタ自身がアウトプットしている量/軸
 */
Cluster.prototype.getOutputPower = function(){
    var i, j;
    var data = this.parentAxis.putData.right;
    if(!data){return 0;}
    j = 0;
    if(!data[this.index]){return;}
    for(i = 0; i < data[this.index].length; ++i){
        j += data[this.index][i];
    }
    return j / this.parentAxis.dataLength;
};

/**
 * クラスタ自身に入ってきているラインの各量の比率
 */
Cluster.prototype.getInputLinePower = function(){
    var i, j, k, a = [], b = [];
    var lData = this.parentAxis.putData.left;
    var rData = this.parentAxis.putData.right;
    if(!lData && !rData){return {left: null, right :null};}
    if(lData){
        k = 0;
        for(i = 0; i < lData.length; ++i){
            k += lData[i][this.index];
            a.push(lData[i][this.index]);
        }
        for(i = 0; i < a.length; ++i){
            a[i] /= k;
        }
    }
    if(rData){
        j = 0;
        for(i = 0; i < rData[this.index].length; ++i){
            j += rData[this.index][i];
            b.push(rData[this.index][i]);
        }
        for(i = 0; i < b.length; ++i){
            b[i] /= j;
        }
    }
    if(a.length === 0){a = null;}
    if(b.length === 0){b = null;}
    return {left: a, right: b};
};

/**
 * クラスタ自身がアウトプットしているラインの各量の比率
 */
Cluster.prototype.getOutputLinePower = function(){
    var i, a = [], b = [];
    var lData = this.parentAxis.putData.left;
    var rData = this.parentAxis.putData.right;
    if(!lData && !rData){return {left: null, right :null};}
    if(lData){
        for(i = 0; i < lData.length; ++i){
            a.push(lData[i][this.index] / this.parentAxis.dataLength);
        }
    }
    if(rData){
        for(i = 0; i < rData[this.index].length; ++i){
            b.push(rData[this.index][i] / this.parentAxis.dataLength);
        }
    }
    if(a.length === 0){a = null;}
    if(b.length === 0){b = null;}
    return {left: a, right: b};
};

/**
 * クラスタの選択状態を変更する
 */
Cluster.prototype.setSelected = function(select){
    this.selected = select;
};

/**
 * クラスタに色を設定する
 */
Cluster.prototype.setColor = function(color){
    this.color = color;
};

/* ****************************************************************************
 * options[optional] === {
 *     padding         : <number> Canvas 内部に設ける描画領域のパディング
 *     svg: {
 *         defaultwidth: <number> クラスタとして描かれる軸周辺の矩形の幅
 *         textbaseline: <number> 軸名描画領域の高さを決めるためのベースライン
 *         textsize    : <string> 軸タイトルのフォントサイズ
 *         scalesize   : <string> 軸目盛のフォントサイズ
 *     },
 *     axis: {
 *         linewidth   : <number> 軸の線の幅
 *         linecolor   : <string> 軸の色
 *         scalewidth  : <number> 軸の目盛線の横方向への伸び幅
 *     },
 *     bezier: {
 *         division    : <number> ベジェ曲線ポリゴンの分割数
 *         linescale   : <number> ベジェ曲線ポリゴンの厚み（高さ）係数
 *     },
 *     plot: {
 *         width       : <number> Scatter plot エリアの幅（現状固定するので）
 *         color       : <string> 矩形に対して適用する色 CSS 準拠
 *     },
 *     callback: {
 *         selected    : <function> brush 時のコールバック
 *     }
 * }
 * ************************************************************************* */
