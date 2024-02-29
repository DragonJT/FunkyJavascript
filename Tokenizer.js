
function Tokenize(code){
    function IsDigit(c){
        return c>='0' && c<='9';
    }

    function IsWhitespace(c){
        return c==' ' || c=='\t' || c=='\n' || c=='\r';
    }

    function IsCharacter(c){
        return (c>='a' && c<='z') || (c>='A' && c<='Z') || c=='_';
    }

    function Token(type, start, end){
        return {type, value:code.substring(start,end), start, end};
    }

    function Number(){
        var start = index;
        index++;
        for(var i=0;i<1000;i++){
            if(!(IsDigit(code[index]) || code[index]=='.')){
                return Token('Number', start, index);
            }
            index++;
        }
        console.log('number');
    }

    function Varname(){
        var start = index;
        index++;
        for(var i=0;i<1000;i++){
            if(!(IsCharacter(code[index]) || IsDigit(code[index]))){
                return Token('Varname', start, index);
            }
            index++;
        }
        console.log('varname');
    }

    function Between(type, open, close){
        index++;
        var start = index;
        var depth = 0;
        for(var i=0;i<1000;i++){
            if(code[index] == open){
                depth++;
            }
            else if(code[index] == close){
                depth--;
                if(depth<0){
                    var token = Token(type, start, index);
                    index++;
                    return token;
                }
            }
            else if(code[index] == '\0'){
                throw "Error unexpected end of file";
            }
            index++;
        }
        console.log('between');
    }

    var tokens = [];
    code = code+'\0';
    var index = 0;
    while(true){
        if(code[index] == '\0'){
            return tokens;
        }
        if(IsCharacter(code[index])){
            tokens.push(Varname());
        }
        else if(IsDigit(code[index])){
            tokens.push(Number());
        }
        else if(IsWhitespace(code[index])){
            index++;
        }
        else if(code[index] == '['){
            tokens.push(Between('Square', '[', ']'));
        }
        else{
            tokens.push(Token('Punctuation', index, index+1));
            index++;
        }
    }
}