

var jforth = new JForth();
jforth.Func('import', 'void', 'Print', ['int i'], 'console.log(i);')
jforth.Func('entry', 'void', 'Main', [], `
    1 set x
    loop
        1 x + set x
        x Print
        x 6 < if
            br 1
        end
    end
    1 set y
    loop
        2 y + set y
        y Print
        y 10 < br_if 0
    end
`);
var wasm = jforth.Emit();
wasm.Run();