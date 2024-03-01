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
    const ops = {
        '+':{name:'add', type:'arithmetic'},
        '-':{name:'sub', type:'arithmetic'},
        '*':{name:'mul', type:'arithmetic'},
        '/':{name:'div', type:'arithmetic', signed:true},
        '<':{name:'lt', type:'comparison'},
        '>':{name:'gt', type:'comparison'},
        '==':{name:'eq', type:'comparison'},
        '&&':{name:'and', type:'logical'},
        '||':{name:'or', type:'logical'},
    };

    const VOID = 1;
    const BOOL = 1<<1;
    const FLOAT = 1<<2;
    const INT = 1<<3;

    const binaryTypes = {
        void:VOID,
        bool:BOOL,
        float:FLOAT,
        int:INT,
    }

    const wasmTypes = {
        int:'i32',
        float:'f32',
        void:'void',
    }

    function GetBinaryType(type){
        var binaryType = binaryTypes[type];
        if(!binaryType){
            throw "Unexpected binary type: "+type;
        }
        return binaryType;
    }

    function GetWasmType(type){
        var wasmType = wasmTypes[type];
        if(!wasmType){
            throw "Unexpected wasm type: "+type;
        }
        return wasmType;
    }

    class TypeInferer{
        constructor(types){
            this.types = types;
        }

        Update(types){
            this.types &= types;
        }

        Has(type){
            if(this.types & type){
                this.types &= type;
                return true;
            }
            return false;
        }
    }

    class Parameter{
        constructor(parameter){
            this.parameter = parameter;
        }

        SetType(typeInferer){
            this.typeInferer = typeInferer;
            this.binaryType = GetBinaryType(this.parameter.type);
            typeInferer.Update(this.binaryType);
        }

        Emit(instructions){
            if(this.typeInferer.Has(this.binaryType)){
                instructions.push({opcode:'get_local', value:this.parameter.name});
            }
            else{
                throw 'Parameter needs to be type: '+JSON.stringify(this.typeInferer);
            }
        }
    }

    class Float{
        constructor(token){
            this.token = token;
        }

        SetType(typeInferer){
            this.typeInferer = typeInferer;
            typeInferer.Update(FLOAT);
        }

        Emit(instructions){
            if(this.typeInferer.Has(FLOAT)){
                instructions.push({opcode:'f32_const', value:parseFloat(this.token.value)});
            }
            else{
                throw 'Float needs to be type float: '+JSON.stringify(this.typeInferer);
            }
        }
    }

    class Int{
        constructor(token){
            this.token = token;
        }

        SetType(typeInferer){
            this.typeInferer = typeInferer;
            typeInferer.Update(INT|FLOAT);
        }

        Emit(instructions){
            if(this.typeInferer.Has(INT)){
                instructions.push({opcode:'i32_const', value:parseFloat(this.token.value)});
            }
            else if(this.typeInferer.Has(FLOAT)){
                instructions.push({opcode:'f32_const', value:parseFloat(this.token.value)});
            }
            else{
                throw "Int can be type: float or int: "+JSON.stringify(this.typeInferer);
            }
        }
    }

    class ArithmeticBinaryOp{
        constructor(token, left, right){
            this.token = token;
            this.left = left;
            this.right = right;
        }

        SetType(typeInferer){
            this.typeInferer = typeInferer;
            typeInferer.Update(INT|FLOAT);
            this.left.SetType(typeInferer);
            this.right.SetType(typeInferer);
        }

        Emit(instructions){
            if(this.typeInferer.Has(INT)){
                this.left.Emit(instructions);
                this.right.Emit(instructions);
                var op = ops[this.token.value];
                var end = '';
                if(op.signed){
                    end+='_s';
                }
                instructions.push({opcode:'i32_'+op.name+end});
            }
            else if(this.typeInferer.Has(FLOAT)){
                this.left.Emit(instructions);
                this.right.Emit(instructions);
                var op = ops[this.token.value];
                
                instructions.push({opcode:'f32_'+op.name});
            }
            else{
                throw "Arithmetic binary op: can be float or int: "+JSON.stringify(this.typeInferer);
            }
        }
    }

    class ComparisonBinaryOp{
        constructor(token, left, right){
            this.token = token;
            this.left = left;
            this.right = right;
        }

        SetType(returnTypeInferer){
            this.returnTypeInferer = returnTypeInferer;
            returnTypeInferer.Update(BOOL);
            this.typeInferer = new TypeInferer(FLOAT|INT);
            this.left.SetType(this.typeInferer);
            this.right.SetType(this.typeInferer);
        }

        Emit(instructions){
            if(this.returnTypeInferer.Has(BOOL)){
                if(this.typeInferer.Has(INT)){
                    this.left.Emit(instructions);
                    this.right.Emit(instructions);
                    var op = ops[this.token.value];
                    instructions.push({opcode:'i32_'+op.name});
                }
                else if(this.typeInferer.Has(FLOAT)){
                    this.left.Emit(instructions);
                    this.right.Emit(instructions);
                    var op = ops[this.token.value];
                    instructions.push({opcode:'f32_'+op.name});
                }
                else{
                    throw "Comparison binary op: can be float or int: "+JSON.stringify(this.typeInferer);
                }
            }
            else{
                throw "Comparison binary op: should return bool"+JSON.stringify(this.returnTypeInferer);
            }
        }
    }

    class LogicalBinaryOp{
        constructor(token, left, right){
            this.token = token;
            this.left = left;
            this.right = right;
        }

        SetType(typeInferer){
            this.typeInferer = typeInferer;
            this.typeInferer.Update(BOOL);
            this.left.SetType(this.typeInferer);
            this.right.SetType(this.typeInferer);
        }

        Emit(instructions){
            if(this.typeInferer.Has(BOOL)){
                instructions.push({opcode:'i32_'+op.name});
            }
            else{
                throw 'Logical binary op: expecting bool inputs and output.'+JSON.stringify(this.typeInferer);
            }
        }
    }

    class Call{
        constructor(func, args){
            this.func = func;
            this.args = args;
        }

        SetType(returnTypeConstuctor){
            this.returnTypeInferer = returnTypeConstuctor;
            this.binaryReturnType = GetBinaryType(this.func.returnType);
            returnTypeConstuctor.Update(this.binaryReturnType);
            for(var i=0;i<this.func.parametersObj.length;i++){
                var p = this.func.parametersObj[i];
                var binaryType = GetBinaryType(p.type);
                var typeInferer = new TypeInferer(binaryType);
                this.args[i].SetType(typeInferer);
            }
        }

        Emit(instructions){
            if(this.returnTypeInferer.Has(this.binaryReturnType)){
                for(var a of this.args){
                    a.Emit(instructions);
                }
                instructions.push({opcode:'call', value:this.func.name});
            }
            else{
                throw "Unexpected function return type: "+JSON.stringify(this.returnTypeInferer);
            }
        }
        
        StartSetType(){
            this.SetType(new TypeInferer(VOID));
        }
    }

    class SetLocal{
        constructor(local, value){
            this.local = local;
            this.value = value;
        }

        StartSetType(){
            this.value.SetType(this.local.typeInferer);
        }

        Emit(instructions){
            this.value.Emit(instructions);
            instructions.push({opcode:'set_local', value:this.local.name});
        }
    }

    class GetLocal{
        constructor(local){
            this.local = local;
        }

        SetType(typeInferer){
            this.local.typeInferer.Update(typeInferer.types);
        }

        Emit(instructions){
            instructions.push({opcode:'get_local', value:this.local.name});
        }
    }

    class SetParameter{
        constructor(parameter, value){
            this.parameter = parameter;
            this.value = value;
        }

        StartSetType(){
            this.binaryType = GetBinaryType(this.parameter.type);
            this.typeInferer = new TypeInferer(this.binaryType);
            this.value.SetType(this.typeInferer);
        }

        Emit(instructions){
            if(this.typeInferer.Has(this.binaryType)){
                this.value.Emit(instructions);
                instructions.push({opcode:'set_local', value:this.parameter.name});
            }
            else{
                throw "Can't set parameter "+JSON.stringify(this.parameter);
            }
        }
    }

    class Block{
        constructor(body){
            this.body = body;
        }

        StartSetType(){
            for(var b of this.body){
                b.StartSetType();
            }
        }

        Emit(instructions){
            instructions.push({opcode:'block', value:'void'});
            for(var b of this.body){
                b.Emit(instructions);
            }
            instructions.push({opcode:'end'});
        }
    }

    class Loop{
        constructor(body){
            this.body = body;
        }

        StartSetType(){
            for(var b of this.body){
                b.StartSetType();
            }
        }

        Emit(instructions){
            instructions.push({opcode:'loop', value:'void'});
            for(var b of this.body){
                b.Emit(instructions);
            }
            instructions.push({opcode:'end'});
        }
    }

    class Store{
        constructor(type, value, address){
            this.type = type;
            this.value = value;
            this.address = address;
        }

        StartSetType(){
            this.binaryType = GetBinaryType(this.type);
            this.addressTypeInferer = new TypeInferer(INT);
            this.typeInferer = new TypeInferer(this.binaryType);
            this.address.SetType(this.addressTypeInferer);
            this.value.SetType(this.typeInferer);
        }

        Emit(instructions){
            if(this.addressTypeInferer.Has(INT)){
                if(this.typeInferer.Has(this.binaryType)){
                    this.address.Emit(instructions);
                    this.value.Emit(instructions);
                    instructions.push({opcode:GetWasmType(this.type)+'_store'});
                }
                else{
                    throw "Store expecting value of type: "+this.type;
                }
            }
            else{
                throw 'Store address expecting int';
            }
        }
    }

    class Load{
        constructor(type, address){
            this.type = type;
            this.address = address;
        }

        SetType(typeInferer){
            this.binaryType = GetBinaryType(this.type);
            typeInferer.Update(this.binaryType);
            this.typeInferer = typeInferer;
            this.addressTypeInferer = new TypeInferer(INT);
            this.address.SetType(this.addressTypeInferer);
        }

        Emit(instructions){
            if(this.addressTypeInferer.Has(INT)){
                if(this.typeInferer.Has(this.binaryType)){
                    this.address.Emit(instructions);
                    instructions.push({opcode:GetWasmType(this.type)+'_load'});
                }
                else{
                    throw "Load expecting value of type: "+this.type;
                }
            }
            else{
                throw 'Load address expecting int';
            }
        }
    }

    class If{
        constructor(condition, body){
            this.condition = condition;
            this.body = body;
        }

        StartSetType(){
            this.typeInferer = new TypeInferer(BOOL);
            this.condition.SetType(this.typeInferer);
            for(var b of this.body){
                b.StartSetType();
            }
        }

        Emit(instructions){
            if(this.typeInferer.Has(BOOL)){
                this.condition.Emit(instructions);
                instructions.push({opcode:'if', value:'void'});
                for(var b of this.body){
                    b.Emit(instructions);
                }
                instructions.push({opcode:'end'});
            }
            else{
                throw 'if expecting bool';
            }
        }
    }

    class BrIf{
        constructor(condition, jumpTo){
            this.condition = condition;
            this.jumpTo = jumpTo;
        }

        StartSetType(){
            this.typeInferer = new TypeInferer(BOOL);
            this.condition.SetType(this.typeInferer);
        }

        Emit(instructions){
            if(this.typeInferer.Has(BOOL)){
                this.condition.Emit(instructions);
                instructions.push({opcode:'br_if', value:parseFloat(this.jumpTo)});
            }
            else{
                throw 'if expecting bool';
            }
        }
    }

    class Br{
        constructor(jumpTo){
            this.jumpTo = jumpTo;
        }

        StartSetType(){}

        Emit(instructions){
            instructions.push({opcode:'br', value:parseFloat(this.jumpTo)});
        }
    }

    function ParseFunction(f){
        
        function Treeify(tokens, depth){
            var body = [];
            var stack = [];
            while(i<tokens.length){
                var t = tokens[i];
                i++;
                if(t.type == 'Punctuation'){
                    var op = ops[t.value];
                    if(op == undefined){
                        throw 'undefined op: '+JSON.stringify(t);
                    }
                    if(op.type == 'arithmetic'){
                        var right = stack.pop();
                        var left = stack.pop();
                        stack.push(new ArithmeticBinaryOp(t, left, right));
                    }
                    else if(op.type == 'logical'){
                        var right = stack.pop();
                        var left = stack.pop();
                        stack.push(new LogicalBinaryOp(t, left, right));
                    }
                    else if(op.type == 'comparison'){
                        var right = stack.pop();
                        var left = stack.pop();
                        stack.push(new ComparisonBinaryOp(t, left, right));
                    }
                    else{
                        throw 'Unexpected op type: '+JSON.stringify(t);
                    }
                }
                else if(t.type == 'Float'){
                    stack.push(new Float(t))
                }
                else if(t.type == 'Int'){
                    stack.push(new Int(t));
                }
                else if(t.type == 'Varname'){
                    var t1 = t.value;
                    if(t1 == 'block'){
                        body.push(new Block(Treeify(tokens, depth+1)));
                        continue;
                    }
                    if(t1 == 'loop'){
                        body.push(new Loop(Treeify(tokens, depth+1)));
                        continue;
                    }
                    if(t1 == 'if'){
                        body.push(new If(stack.pop(), Treeify(tokens, depth+1)));
                        continue;
                    }
                    if(t1 == 'br_if'){
                        var t2 = tokens[i].value;
                        i++;
                        body.push(new BrIf(stack.pop(), t2));
                        continue;
                    }
                    if(t1 == 'br'){
                        var t2 = tokens[i].value;
                        i++;
                        body.push(new Br(t2));
                        continue;
                    }
                    if(t1 == 'int_store'){
                        body.push(new Store('int', stack.pop(), stack.pop()))
                        continue;
                    }
                    if(t1 == 'float_store'){
                        body.push(new Store('float', stack.pop(), stack.pop()))
                        continue;
                    }
                    if(t1 == 'int_load'){
                        stack.push(new Load('int', stack.pop()))
                        continue;
                    }
                    if(t1 == 'float_load'){
                        stack.push(new Load('float', stack.pop()))
                        continue;
                    }
                    if(t1 == 'end'){
                        if(stack.length == 0){
                            return body;
                        }
                        throw 'Expecting stack to be length 0 at end of block';
                    }
                    if(t1 == 'set'){
                        var t2 = tokens[i].value;
                        i++;
                        var parameter = parametersObjs.find(p=>p.name == t2);
                        if(parameter){
                            body.push(new SetParameter(parameter, stack.pop()))
                        }
                        else{
                            var local = locals.find(l=>l.name == t2);
                            if(!local){
                                local = {name:t2, typeInferer:new TypeInferer(BOOL|INT|FLOAT)};
                                locals.push(local);
                            }
                            body.push(new SetLocal(local, stack.pop()));
                        }
                        continue;
                    }
                    var local = locals.find(l=>l.name == t1);
                    if(local){
                        stack.push(new GetLocal(local));
                        continue;
                    }
                    var parameter = parametersObjs.find(p=>p.name==t1);
                    if(parameter){
                        stack.push(new Parameter(parameter));
                        continue;
                    }

                    var func = functions.find(f=>f.name == t1);
                    if(func){
                        var args = [];
                        func.parametersObj = func.parameters.map(p=>ParseVariable(p));
                        for(var p=0;p<func.parametersObj.length;p++){
                            args.unshift(stack.pop());
                        }
                        var call = new Call(func, args);
                        if(func.returnType == 'void'){
                            body.push(call);
                        }
                        else{
                            stack.push(call);
                        }
                        continue;
                    }
                    throw "No functions, parameters or locals with name: "+t1;
                }
                else{
                    throw "Forth: Unexpected token: "+JSON.stringify(t);
                }  
            }
            if(depth>0){
                throw 'missing end';
            }
            if(stack.length>0){
                throw 'items on stack at end of function';
            }
            return body;
        }

        var i = 0;
        var tokens = Tokenize(f.code);
        var parametersObjs = f.parameters.map(p=>ParseVariable(p));
        var locals = [];
        var body = Treeify(tokens, 0);

        for(var b of body){
            b.StartSetType();
        }
        var instructions = [];
        for(var b of body){
            b.Emit(instructions);
        }
        
        for(var l of locals){
            if(l.typeInferer.Has(BOOL)){
                l.type = 'i32';
            }
            else if(l.typeInferer.Has(INT)){
                l.type = 'i32';
            }
            else if(l.typeInferer.Has(FLOAT)){
                l.type = 'f32';
            }
            else{
                throw "Can't set local type: "+this.name;
            }
        }
        var parameters = parametersObjs.map(p=>GetWasmType(p.type)+' '+p.name);
        return WasmFunc(f.type, GetWasmType(f.returnType), f.name, parameters, locals.map(l=>l.type+' '+l.name), instructions);
    }

    var wasm = [];
    for(var f of functions){
        if(f.type == 'import'){
            var parameters = f.parameters.map(p=>ParseVariable(p)).map(p=>GetWasmType(p.type)+' '+p.name);
            wasm.push(ImportFunc(GetWasmType(f.returnType), f.name, parameters, f.code));
        }
        else if(f.type == 'export' || f.type == 'func' || f.type == 'entry'){
            wasm.push(ParseFunction(f));
        }
        else{
            throw "Unexpected function type: "+JSON.stringify(f);
        }
    }
    return wasm;
}
