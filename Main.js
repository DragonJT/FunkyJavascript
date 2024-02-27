

var jforth = new JForth();
jforth.Func('entry', 'int', 'Main', [], '2 2 +');
var wasm = jforth.Emit();
wasm.Run();