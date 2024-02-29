function CGlobal(name, size=1){
    return {type:'global', name, size};
}

function CCall(name, args){
    return {type:'call', name, args};
}

function CFunc(type, returnType, name, parameters, body){
    return {type, returnType, name, parameters, body};
}

function CVar(name, value){
    return {type:'var', name, value};
}

function CIf(condition, body){
    return {type:'if', condition, body};
}

function CLoop(body){
    return {type:'loop', body};
}

function CBreak(depth){
    return {type:'break', depth};
}

function CAssign(name, value){
    return {type:'assign', name, value};
}

function CFor(varname, end, body){
    return {type:'for', varname, end, body};
}

function C(root){
    
    function EmitFunction(f){

        function GetLocal(name){
            return locals.find(l=>l.name == name);
        }

        function GetVariable(name){
            var local = locals.find(l=>l.name == name);
            if(local){
                return {local};
            }
            var global = globals.find(g=>g.name == name);
            if(global){
                return {global};
            }
            throw "C: Cant find variable with name: "+name;
        }

        function EmitExpression(expression){
            var shuntingYardOutput = ShuntingYard(expression);
            var output = '';
            for(var t of shuntingYardOutput){
                if(t.type == 'Varname'){
                    var variable = GetVariable(t.value);
                    if(variable.global){
                        output+= variable.global.memoryLocation+' load ';
                    }
                    else{
                        output += t.value+' ';
                    }
                }
                else{
                    output+= t.value+' ';
                }
            }
            return output;
        }

        function EmitBody(body){
            var forthCode = '';
            for(var statement of body){
                if(statement.type == 'call'){
                    for(var arg of statement.args){
                        forthCode+=EmitExpression(arg);
                    }
                    forthCode+=statement.name+' ';
                }
                else if(statement.type == 'var'){
                    if(GetLocal(statement.name)){
                        throw "Local already exists in function.";
                    }
                    forthCode+=EmitExpression(statement.value);
                    forthCode+='set '+statement.name+' ';
                    locals.push({name:statement.name});
                }
                else if(statement.type == 'assign'){
                    var variable = GetVariable(statement.name);
                    if(variable.global){
                        forthCode+=variable.global.memoryLocation+' ';
                        forthCode+=EmitExpression(statement.value);
                        forthCode+='store ';
                    }
                    else if(variable.local){
                        forthCode+=EmitExpression(statement.value);
                        forthCode+='set '+statement.name+' ';
                    }
                    else{
                        throw "No global or local";
                    }
                }
                else if(statement.type == 'if'){
                    forthCode+=EmitExpression(statement.condition);
                    forthCode+='if ';
                    forthCode+=EmitBody(statement.body);
                    forthCode+='end ';
                }
                else if(statement.type == 'loop'){
                    forthCode+='block loop ';
                    forthCode+=EmitBody(statement.body);
                    forthCode+='br 0 end end ';
                }  
                else if(statement.type == 'for'){
                    if(GetLocal(statement.varname)){
                        throw "C: Forloop: Local already exists in function.";
                    }
                    locals.push({name:statement.varname});
                    forthCode+='0 set '+statement.varname+' block loop ';
                    forthCode+=EmitBody(statement.body);
                    forthCode+='1 '+statement.varname+' + set '+statement.varname+' ';
                    forthCode+=statement.varname+' '+EmitExpression(statement.end)+'< br_if 0 ';
                    forthCode+='end end ';
                } 
                else if(statement.type == 'break'){
                    forthCode+='br '+statement.depth+' ';
                }
                else{
                    throw "Unexpected statement: "+statement;
                }
            }
            return forthCode;
        }
        var locals = f.parameters.map(p=>ParseVariable(p));
        var forthCode = EmitBody(f.body);
        return ForthFunc(f.type, f.returnType, f.name, f.parameters, forthCode);
    }

    var globals = [];
    var forth = [];
    var memoryLocation = 0;
    for(var i of root){
        if(i.type == 'import'){
            forth.push(i);
        }
        else if(i.type == 'global'){
            i.memoryLocation = memoryLocation;
            globals.push(i);
            memoryLocation+=i.size*4;
        }
        else{
            forth.push(EmitFunction(i));
        }
    }
    return forth;
}