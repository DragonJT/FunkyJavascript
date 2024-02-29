
var forth = C([
    ImportFunc('void', 'Print', ['int i'], 'console.log(i);'),
    CFunc('func', 'void', 'Test', ['int i'], [
        CCall('Print', ['i * i']),
    ]),
    CFunc('entry', 'void', 'Main', [], [
        CVar('x', '0'),
        CVar('y', '2 + 3'),
        CLoop([
            CCall('Test', ['x']),
            CIf('x > 5', [
                CBreak(2),
            ]),
            CAssign('x', 'x + 1')
        ]),
        CCall('Print', ['x * y']),
    ]),
]);
var wasm = Forth(forth);
Wasm(wasm);
