
var wasm = Forth([
    ForthFunc('import', 'void', 'Print', ['int i'], 'console.log(i);'),
    ForthFunc('entry', 'void', 'Main', [], `
        1 set x
        loop
            1 x + set x
            x Print
            x 6 < if
                br 1
            end
        end
        0 set y
        loop
            y Print
            2 y + set y
            y 10 < br_if 0
        end
    `)
]);

Wasm(wasm);
