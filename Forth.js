/*var wasm = Forth([
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

Wasm(wasm);*/


function ForthFunc(type, returnType, name, parameters, code){
    return {type, returnType, name, parameters, code};
}

function Forth(functions){

    function ParseFunction(f){
        var tokens = Tokenize(f.code);
        var parameters = f.parameters.filter(p=>ParseVariable(p));
        var instructions = [];
        var locals = [];
        for(var i=0;i<tokens.length;i++){
            if(tokens[i].value == '+'){
                instructions.push({opcode:'i32_add'});
            }
            else if(tokens[i].value == 'set'){
                var name = tokens[i+1].value;
                if(!locals.find(l=>l.name == name)){
                    locals.push({type:'int', name});
                }
                instructions.push({opcode:'set_local', value:name});
                i++;
            }
            else if(tokens[i].value == 'loop'){
                instructions.push({opcode:'loop', value:'void'});
            }
            else if(tokens[i].value == 'end'){
                instructions.push({opcode:'end'});
            }
            else if(tokens[i].value == 'br_if'){
                instructions.push({opcode:'br_if', value:parseFloat(tokens[i+1].value)});
                i++;
            }
            else if(tokens[i].value == 'br'){
                instructions.push({opcode:'br', value:parseFloat(tokens[i+1].value)});
                i++;
            }
            else if(tokens[i].value == 'if'){
                instructions.push({opcode:'if', value:'void'});
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
        return WasmFunc(f.type, f.returnType, f.name, f.parameters, locals.map(l=>l.type+' '+l.name), instructions)
    }

    var wasm = [];
    for(var f of functions){
        if(f.type == 'import'){
            wasm.push(f);
        }
        else{
            wasm.push(ParseFunction(f));
        }
    }
    return wasm;
}
