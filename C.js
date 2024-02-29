function CGlobal(name, count=1){
    return {type:'global', name, count};
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

function CAssignArray(name, element, value){
    return {type:'assign_array', name, element, value};
}

function CFor(varname, end, body){
    return {type:'for', varname, end, body};
}

function CConst(name, value){
    return {type:'const', name, value};
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
            var _const = consts.find(c=>c.name == name);
            if(_const){
                return {const:_const}
            }
            throw "C: Cant find variable with name: "+name;
        }

        function EmitExpression(expression){

            function EmitArgs(args){
                var tokens = Tokenize(args);
                var start = 0;
                var argExpressions = [];
                for(var i=0;i<tokens.length;i++){
                    if(tokens[i].type == 'Punctuation' && tokens[i].value == ','){
                        argExpressions.push(tokens.slice(start, i));
                        start=i+1;
                    }
                }
                var endArg = tokens.slice(start);
                if(endArg.length>0){
                    argExpressions.push(endArg);
                }
                var output = '';
                for(var a of argExpressions){
                    output+=EmitExpressionWithTokens(a);
                }
                return output;
            }

            function EmitExpressionWithTokens(tokens){
                function TrySplit(operators){
                    for(var i=tokens.length-1;i>=0;i--){
                        var t = tokens[i];
                        if(t.type == 'Punctuation' && operators.includes(t.value)){
                            var left = EmitExpressionWithTokens(tokens.slice(0, i));
                            var right = EmitExpressionWithTokens(tokens.slice(i+1));
                            return left+right+t.value+' ';
                        }
                    }
                    return undefined;
                }
                if(tokens.length == 1){
                    var t = tokens[0];
                    if(t.type == 'Varname'){
                        var variable = GetVariable(t.value);
                        if(variable.global){
                            return variable.global.memoryLocation+' load ';
                        }
                        else if(variable.local){
                            return t.value+' ';
                        }
                        else if(variable.const){
                            return variable.const.value+' ';
                        }
                        else{
                            throw "Expecting global, local, or const: "+JSON.stringify(variable);
                        }
                    }
                    else if(t.type == 'Number'){
                        return t.value+' ';
                    }
                    else{
                        throw "Unexpected remaining token: "+JSON.stringify(t);
                    }
                }
                else if(tokens.length == 2){
                    var t1 = tokens[0];
                    var t2 = tokens[1];
                    if(t1.type == 'Varname' && t2.type == 'Parenthesis'){
                        return EmitArgs(t2.value) + t1.value+' ';
                    }
                    if(t1.type == 'Varname' && t2.type == 'Square'){
                        var variable = GetVariable(t1.value);
                        if(variable.global){
                            return variable.global.memoryLocation+' 4 '+EmitExpression(t2.value)+'* + load ';
                        }
                        else{
                            throw "Expecting [] on globals only";
                        }
                    }
                }
                var operatorGroups = [['=='], ['<', '>'], ['+', '-'], ['*', '/']];
                for(var operators of operatorGroups){
                    var output = TrySplit(operators);
                    if(output){
                        return output;
                    }
                }
                throw "Unexpected expression:"+JSON.stringify(tokens);
            }
            return EmitExpressionWithTokens(Tokenize(expression));
        }

        function EmitBody(body){
            var forthCode = '';
            for(var statement of body){
                if(typeof statement == 'string'){
                    forthCode+=EmitExpression(statement);
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
                        throw "No global or local: "+JSON.stringify(variable);
                    }
                }
                else if(statement.type == 'assign_array'){
                    var variable = GetVariable(statement.name);
                    if(variable.global){
                        forthCode+=variable.global.memoryLocation+' 4 '+EmitExpression(statement.element)+'* + ';
                        forthCode+=EmitExpression(statement.value);
                        forthCode+='store ';
                    }
                    else{
                        throw "Assign array. Expecting global: "+JSON.stringify(variable);;
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
                    throw "Unexpected statement: "+JSON.stringify(statement);
                }
            }
            return forthCode;
        }
        var locals = f.parameters.map(p=>ParseVariable(p));
        var forthCode = EmitBody(f.body);
        return ForthFunc(f.type, f.returnType, f.name, f.parameters, forthCode);
    }

    var forth = [];
    var memoryLocation = 0;

    var consts = [];
    var globals = [];

    for(var i of root){
        if(i.type == 'const'){
            consts.push(i);
        }
    }

    function CalcGlobalCount(count){
        var tokens = Tokenize(count);
        if(tokens.length == 1){
            if(tokens[0].type == 'Varname'){
                var c = consts.find(c=>c.name == tokens[0].value);
                if(c==undefined){
                    throw 'Unable to find const: '+tokens[0].value;
                }
                return parseFloat(c.value);
            }
            else if(tokens[0].type == 'Number'){
                return parseFloat(tokens[0].value);
            }
        }
        throw 'Cannot calculate global count: '+JSON.stringify(tokens);
    }

    for(var i of root){
        if(i.type == 'global'){
            i.memoryLocation = memoryLocation;
            globals.push(i);
            memoryLocation+=CalcGlobalCount(i.count)*4;
        }
    }

    for(var i of root){
        if(i.type == 'import'){
            forth.push(i);
        }
        else if(i.type == 'entry' || i.type == 'func' || i.type == 'export'){
            forth.push(EmitFunction(i));
        }
        else if(i.type == 'global' || i.type == 'const'){}
        else{
            throw 'Unexpected type: '+JSON.stringify(i);
        }
    }
    return forth;
}