
var forth = C([
    ImportFunc('void', 'CreateCanvas', ['int width', 'int height'], `
        var canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        canvas.width = width;
        canvas.height = height;
        global.ctx = canvas.getContext('2d');
    `),
    ImportFunc('void', 'FillRect', ['int x', 'int y', 'int w', 'int h', 'int r', 'int g', 'int b'], `
        global.ctx.fillStyle = 'rgb('+r+','+g+','+b+')';
        global.ctx.fillRect(x,y,w,h);
    `),
    ImportFunc('void', 'RequestAnimationFrame', [], 'window.requestAnimationFrame(exports.Draw);'),
    ImportFunc('int', 'Random', ['int min', 'int max'], 'return Math.random()*(max-min)+min;'),
    ImportFunc('void', 'Print', ['int i'], 'console.log(i);'),

    CGlobal('rockX', 10),
    CGlobal('rockY', 10),
    CFunc('export', 'void', 'Draw', [], [
        CExpr('FillRect(0, 0, 600, 500, 0, 0, 0)'),
        CFor('i', '10', [
            CExpr('FillRect(rockX[i]-15, rockY[i]-15, 30, 30, 0, 150, 255)'),
            CAssignArray('rockY', 'i', 'rockY[i] + 1'),
            CIf('rockY[i]>500', [
                CAssignArray('rockY', 'i', '0'),
            ])
        ]),
        CExpr('RequestAnimationFrame()'),
    ]),
    CFunc('entry', 'void', 'Main', [], [
        CFor('i', '10', [
            CAssignArray('rockX', 'i', 'Random(0, 600)'),
            CAssignArray('rockY', 'i', 'Random(0, 500)'),
        ]),
        CExpr('CreateCanvas(600,500)'),
        CExpr('Draw()'),
    ]),
]);
var wasm = Forth(forth);
Wasm(wasm);
