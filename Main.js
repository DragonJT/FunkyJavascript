
var forth = C([
    ImportFunc('void', 'Print', ['int i'], 'console.log(i);'),
    CFunc('entry', 'void', 'Main', [], [
        CVar('x', '5 * 2'),
        CVar('y', '2 + 3'),
        CCall('Print', ['x - y']),
        CCall('Print', ['x * y']),
    ]),
]);
var wasm = Forth(forth);
Wasm(wasm);
