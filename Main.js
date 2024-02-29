
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

    CConst('ROCK_COUNT', '20'),
    CConst('SCREEN_WIDTH', '600'),
    CConst('SCREEN_HEIGHT', '500'),
    CGlobal('rockX', 'ROCK_COUNT'),
    CGlobal('rockY', 'ROCK_COUNT'),
    CFunc('export', 'void', 'Draw', [], [
        'FillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0, 0, 0)',
        CFor('i', 'ROCK_COUNT', [
            'FillRect(rockX[i]-15, rockY[i]-15, 30, 30, 0, 150, 255)',
            CAssignArray('rockY', 'i', 'rockY[i] + 1'),
            CIf('rockY[i]>SCREEN_HEIGHT', [
                CAssignArray('rockY', 'i', '0'),
                CAssignArray('rockX', 'i', 'Random(0, SCREEN_WIDTH)'),
            ])
        ]),
        'RequestAnimationFrame()',
    ]),
    CFunc('entry', 'void', 'Main', [], [
        CFor('i', 'ROCK_COUNT', [
            CAssignArray('rockX', 'i', 'Random(0, SCREEN_WIDTH)'),
            CAssignArray('rockY', 'i', 'Random(0, SCREEN_HEIGHT)'),
        ]),
        'CreateCanvas(600,500)',
        'Draw()',
    ]),
]);
var wasm = Forth(forth);
Wasm(wasm);
