

var jforth = new JForth();
jforth.Func('import', 'void', 'Print', ['int i'], 'console.log(i);')
jforth.Func(undefined, 'int', 'Test', ['int x'], 'x x +');
jforth.Func('entry', 'void', 'Main', [], `
    1 set x
    loop void
        1 x + set x
        x Print
        x 6 < br_if 0
    end
`);
var wasm = jforth.Emit();
wasm.Run();