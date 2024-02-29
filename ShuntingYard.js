
function ShuntingYard(expression){
    var tokens = Tokenize(expression);
    const symbols = {
        '+':{type:'Operator', associativity:'Left', precedence:4},
        '-':{type:'Operator', associativity:'Left', precedence:4},
        '*':{type:'Operator', associativity:'Left', precedence:6},
        '/':{type:'Operator', associativity:'Left', precedence:6},
        '<':{type:'Operator', associativity:'Left', precedence:3},
        '>':{type:'Operator', associativity:'Left', precedence:3},
    };

    var output = '';
    var stack = [];
    var expectingOperand = true;
    for(var i=0;i<tokens.length;i++){
        var value = tokens[i].value;
        var symbol = symbols[value];
        if(symbol){
            if(symbol.type == 'Operator'){
                if(expectingOperand){
                    throw "Expecting operand got operator."+value;
                }
                expectingOperand = true;
                while(true){
                    if(stack.length<=0){
                        break;
                    }
                    var top = stack[stack.length-1];
                    var a = symbol.associativity == 'Left' && symbol.precedence <= top.precedence;
                    var b = symbol.associativity == 'Right' && symbol.precedence < top.precedence;
                    if(top.type != 'Operator' || !(a || b)){
                        break;
                    }
                    output += stack.pop().value+' ';
                }
                symbol.value = value;
                stack.push(symbol);
            }
            else{
                throw 'Unexpected symbol type: '+symbol.type;
            }
        }
        else{
            if(!expectingOperand){
                throw "Expecting operator. Got operand. "+value;
            }
            expectingOperand = false;
            output+=value+' ';
        }
    }
    while(stack.length>0){
        output+=stack.pop().value+' ';
    }
    return output;
}