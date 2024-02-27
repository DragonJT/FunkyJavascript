
class JForth{
    constructor(main){
        this.main = main;
        this.functions = [];
    }

    Func(funcType, returnType, name, parameters, code){
        this.functions.push({funcType, returnType, name, parameters, code});
    }

    Emit(){
        function GetValtype(type){
            if(type == 'int'){
                return Valtype.i32;
            }
            else if(type == 'float'){
                return Valtype.f32;
            }
            throw "Unexpected type: "+type;
        }

        function GetReturnValtype(type){
            if(type == 'void'){
                return [];
            }
            else{
                return [GetValtype(type)];
            }
        }

        function EmitFunction(wasm, f){
            var tokens = Tokenize(f.code);
            var instructions = [];
            for(var i=0;i<tokens.length;i++){
                if(tokens[i].value == '+'){
                    instructions.push(new WasmInstruction(Opcode.i32_add));
                }
                else{
                    instructions.push(new WasmInstruction(Opcode.i32_const, parseFloat(tokens[i].value)));
                }
            }
            var _export = f.funcType == 'export' || f.funcType == 'entry';
            wasm.Func(_export, GetReturnValtype(f.returnType), f.name, [], instructions);
        }

        var entry = this.functions.find(f=>f.funcType == 'entry');
        if(!entry){
            throw "expecting entry point";
        }
        var wasm = new Wasm(entry.name);
        for(var f of this.functions){
            if(f.funcType == 'import'){
                wasm.ImportFunc(GetReturnValtype(f.returnType), f.name, [], f.code);
            }
            else{
                EmitFunction(wasm, f);
            }
        }
        return wasm;
    }
}