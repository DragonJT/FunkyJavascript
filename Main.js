

var jforth = new JForth();
jforth.Func(undefined, 'int', 'Test', ['int x'], 'x x +');
jforth.Func('entry', 'int', 'Main', [], '2 2 + set x 2 x + Test');
var wasm = jforth.Emit();
wasm.Run();