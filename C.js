
function CCall(name, args){
    return {type:'call', name, args};
}

function CFunc(type, returnType, name, parameters, body){
    return {type, returnType, name, parameters, body};
}

function CVar(name, value){
    return {type:'var', name, value};
}

function C(root){
    function EmitFunction(f){
        var forthCode = '';;

        for(var statement of f.body){
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
            else{
                throw "Unexpected statement: "+statement;
            }
        }

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