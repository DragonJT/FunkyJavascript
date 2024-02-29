
var forth = C([
    ImportFunc('void', 'Print', ['int i'], 'console.log(i);'),
    CGlobal('g'),
    CFunc('func', 'void', 'Test', ['int i'], [
        CCall('Print', ['g * i']),
    ]),
    CFunc('entry', 'void', 'Main', [], [
        CAssign('g', '5'),
        CVar('x', '4'),
        CVar('y', '2 + 3'),
        CFor('i', '6', [
            CCall('Test', ['i']),
        ]),
        CCall('Print', ['x * y']),
    ]),
]);
console.log(forth);
var wasm = Forth(forth);
Wasm(wasm);
