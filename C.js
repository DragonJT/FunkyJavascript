
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

function C(root){
    
    function EmitFunction(f){
        function EmitBody(body){
            var forthCode = '';
            for(var statement of body){
                if(statement.type == 'call'){
                    for(var arg of statement.args){
                        forthCode+=ShuntingYard(arg);
                    }
                    forthCode+=statement.name+' ';
                }
                else if(statement.type == 'var'){
                    forthCode+=ShuntingYard(statement.value);
                    forthCode+='set '+statement.name+' ';
                }
                else if(statement.type == 'assign'){
                    forthCode+=ShuntingYard(statement.value);
                    forthCode+='set '+statement.name+' ';
                }
                else if(statement.type == 'if'){
                    forthCode+=ShuntingYard(statement.condition);
                    forthCode+='if ';
                    forthCode+=EmitBody(statement.body);
                    forthCode+='end ';
                }
                else if(statement.type == 'loop'){
                    forthCode+='block loop ';
                    forthCode+=EmitBody(statement.body);
                    forthCode+='br 0 end end ';
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

        var forthCode = EmitBody(f.body);
        return ForthFunc(f.type, f.returnType, f.name, f.parameters, forthCode);
    }

    var forth = [];
    for(var i of root){
        if(i.type == 'import'){
            forth.push(i);
        }
        else{
            forth.push(EmitFunction(i));
        }
    }
    return forth;
}