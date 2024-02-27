const JForthOpcode = {
    I32Const:0,
    I32Add:1,
    SetLocal:3,
    GetLocal:4,
    Call:5,
};

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

        function ParseFunction(wasm, functions, f){
            function EmitFunction(){
                var wasmInstructions = [];
                for(var i of jforthInstructions){
                    if(i.opcode == JForthOpcode.I32Const){
                        wasmInstructions.push(new WasmInstruction(Opcode.i32_const, parseFloat(i.value)));
                    }
                    else if(i.opcode == JForthOpcode.I32Add){
                        wasmInstructions.push(new WasmInstruction(Opcode.i32_add));
                    }
                    else if(i.opcode == JForthOpcode.SetLocal){
                        wasmInstructions.push(new WasmInstruction(Opcode.set_local, i.value));
                    }
                    else if(i.opcode == JForthOpcode.GetLocal){
                        wasmInstructions.push(new WasmInstruction(Opcode.get_local, i.value));
                    }
                    else if(i.opcode == JForthOpcode.Call){
                        wasmInstructions.push(new WasmInstruction(Opcode.call, i.value));
                    }
                    else{
                        throw "Unexpected opcode "+i.opcode;
                    }
                }
                var _export = f.funcType == 'export' || f.funcType == 'entry';
                wasm.Func(_export, GetReturnValtype(f.returnType), f.name, parameters, locals, wasmInstructions);
            }

            function CalcParameter(p){
                var tokens = Tokenize(p);
                return new WasmVariable(GetValtype(tokens[0].value), tokens[1].value);
            }

            var tokens = Tokenize(f.code);
            var jforthInstructions = [];
            var parameters = f.parameters.map(p=>CalcParameter(p));
            var locals = [];
            for(var i=0;i<tokens.length;i++){
                if(tokens[i].value == '+'){
                    jforthInstructions.push({opcode:JForthOpcode.I32Add});
                }
                else if(tokens[i].value == 'set'){
                    var localName = tokens[i+1].value;
                    if(!locals.find(l=>l.name == localName)){
                        locals.push(new WasmVariable(Valtype.i32, localName));
                    }
                    jforthInstructions.push({opcode:JForthOpcode.SetLocal, value:localName});
                    i++;
                }
                else if(tokens[i].type == 'Number'){
                    jforthInstructions.push({opcode:JForthOpcode.I32Const, value:tokens[i].value});
                }
                else if(tokens[i].type == 'Varname'){
                    var varname = tokens[i].value;
                    if(locals.find(l=>l.name == varname) || parameters.find(p=>p.name == varname)){
                        jforthInstructions.push({opcode:JForthOpcode.GetLocal, value:varname});
                    }
                    else if(functions.find(f=>f.name == varname)){
                        jforthInstructions.push({opcode:JForthOpcode.Call, value:varname});
                    }
                    else{
                        throw "no locals, parameters or functions with name: "+varname;
                    }
                }
            }
            EmitFunction();
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
                ParseFunction(wasm, this.functions, f);
            }
        }
        return wasm;
    }
}