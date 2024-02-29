
var forth = C([
    ImportFunc('void', 'Print', ['int i'], 'console.log(i);'),
    CGlobal('g', 5),
    CFunc('func', 'void', 'Test', [], [
        CFor('i', '6', [
            CCall('Print', ['g[i]']),
        ]),
    ]),
    CFunc('entry', 'void', 'Main', [], [
        CFor('i', '6', [
            CAssignArray('g', '5 - i', 'i'),
        ]),
        CCall('Test', []),
    ]),
]);
var wasm = Forth(forth);
Wasm(wasm);
