
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
    ImportFunc('void', 'RequestAnimationFrame', [], 'requestAnimationFrame(exports.Draw);'),
    ImportFunc('void', 'RequestKeyDown', [], 'addEventListener("keydown", k=>exports.KeyDown(k.keyCode));'),
    ImportFunc('void', 'RequestKeyUp', [], 'addEventListener("keyup", k=>exports.KeyUp(k.keyCode));'),
    ImportFunc('int', 'Random', ['int min', 'int max'], 'return Math.random()*(max-min)+min;'),
    ImportFunc('void', 'PrintInt', ['int i'], 'console.log(i);'),
    ImportFunc('void', 'PrintFloat', ['float f'], 'console.log(f);'),


    CConst('ROCK_COUNT', '20'),
    CConst('SCREEN_WIDTH', '600'),
    CConst('SCREEN_HEIGHT', '500'),
    CGlobal('int', 'rockX', 'ROCK_COUNT'),
    CGlobal('int', 'rockY', 'ROCK_COUNT'),
    CGlobal('int', 'leftArrow'),
    CGlobal('int', 'rightArrow'),
    CGlobal('float', 'playerX'),
    CConst('playerY', '400'),

    CFunc('export', 'void', 'KeyDown', ['int k'], [
        CIf('k == 39', [
            CAssign('leftArrow', 1),
        ]),
        CIf('k == 37', [
            CAssign('rightArrow', 1),
        ]),
    ]),
    CFunc('export', 'void', 'KeyUp', ['int k'], [
        CIf('k == 39', [
            CAssign('leftArrow', 0),
        ]),
        CIf('k == 37', [
            CAssign('rightArrow', 0),
        ]),
    ]),
    CFunc('export', 'void', 'Draw', [], [
        'FillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0, 0, 0)',
        CFor('i', 'ROCK_COUNT', [
            'FillRect(rockX[i]-15, rockY[i]-15, 30, 30, 0, 150, 255)',
            CAssignArray('rockY', 'i', 'rockY[i] + 1'),
            CIf('rockY[i]>SCREEN_HEIGHT', [
                CAssignArray('rockY', 'i', '0'),
                CAssignArray('rockX', 'i', 'Random(0, SCREEN_WIDTH)'),
            ]),
            CAssign('playerX', 'playerX + ((float)leftArrow) * 0.2 - ((float)rightArrow) * 0.2'),
            CIf('playerX < 0', [
                CAssign('playerX', '0'),
            ]),
            CIf('playerX > SCREEN_WIDTH', [
                CAssign('playerX', 'SCREEN_WIDTH'),
            ]),
            'FillRect((int)playerX-20, playerY-20, 40, 40, 255, 150, 0)',
        ]),
        'RequestAnimationFrame()',
    ]),
    CFunc('entry', 'void', 'Main', [], [
        CAssign('playerX', 'SCREEN_WIDTH / 2'),
        CFor('i', 'ROCK_COUNT', [
            CAssignArray('rockX', 'i', 'Random(0, SCREEN_WIDTH)'),
            CAssignArray('rockY', 'i', 'Random(0, SCREEN_HEIGHT)'),
        ]),
        'CreateCanvas(600,500)',
        'RequestKeyDown()',
        'RequestKeyUp()',
        'Draw()',
    ]),
]);

var wasm = Forth(forth);
Wasm(wasm);
