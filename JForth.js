
class JForth{
    constructor(main){
        this.main = main;
        this.functions = [];
    }

    Func(funcType, returnType, name, parameters, code){
        this.functions.push({funcType, returnType, name, parameters, code});
    }

    Emit(){
        function CalcParameter(p){
            var tokens = Tokenize(p);
            return new WasmVariable(tokens[0].value, tokens[1].value);
        }

        function ParseFunction(wasm, functions, f){
            var tokens = Tokenize(f.code);
            var instructions = [];
            var parameters = f.parameters.map(p=>CalcParameter(p));
            var locals = [];
            for(var i=0;i<tokens.length;i++){
                if(tokens[i].value == '+'){
                    instructions.push({opcode:'i32_add'});
                }
                else if(tokens[i].value == 'set'){
                    var localName = tokens[i+1].value;
                    if(!locals.find(l=>l.name == localName)){
                        locals.push(new WasmVariable('int', localName));
                    }
                    instructions.push({opcode:'set_local', value:localName});
                    i++;
                }
                else if(tokens[i].value == 'loop'){
                    instructions.push({opcode:'loop', value:tokens[i+1].value});
                    i++;
                }
                else if(tokens[i].value == 'end'){
                    instructions.push({opcode:'end'});
                }
                else if(tokens[i].value == 'br_if'){
                    instructions.push({opcode:'br_if', value:parseFloat(tokens[i+1].value)});
                    i++;
                }
                else if(tokens[i].value == '<'){
                    instructions.push({opcode:'i32_lt'});
                }
                else if(tokens[i].type == 'Number'){
                    instructions.push({opcode:'i32_const', value:parseFloat(tokens[i].value)});
                }
                else if(tokens[i].type == 'Varname'){
                    var varname = tokens[i].value;
                    if(locals.find(l=>l.name == varname) || parameters.find(p=>p.name == varname)){
                        instructions.push({opcode:'get_local', value:varname});
                    }
                    else if(functions.find(f=>f.name == varname)){
                        instructions.push({opcode:'call', value:varname});
                    }
                    else{
                        throw "no locals, parameters or functions with name: "+varname;
                    }
                }
            }
            var _export = f.funcType == 'export' || f.funcType == 'entry';
            wasm.Func(_export, f.returnType, f.name, parameters, locals, instructions);
        }

        var entry = this.functions.find(f=>f.funcType == 'entry');
        if(!entry){
            throw "expecting entry point";
        }
        var wasm = new Wasm(entry.name);

        for(var f of this.functions){
            if(f.funcType == 'import'){
                wasm.ImportFunc(f.returnType, f.name, f.parameters.map(p=>CalcParameter(p)), f.code);
            }
            else{
                ParseFunction(wasm, this.functions, f);
            }
        }
        return wasm;
    }
}