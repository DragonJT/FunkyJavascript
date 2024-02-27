
function Tokenize(code){
    var tokens = [];
    var punctuation1 = ['+','-','*','/'];
    var punctuation2 = ['=='];
    var whitespace = [' ', '\t', '\r', '\n'];

    var separated = true;
    for(var i=0;i<code.length;i++){
        var c = code[i];
        if(i<code.length-1){
            c2 = code[i]+code[i+1];
            if(punctuation2.includes(c2)){
                tokens.push({value:c2, start:i, end:i+2});
                i++;
                separated = true;
                continue;
            }
        }
        if(whitespace.includes(c)){
            separated = true;
        }
        else if(punctuation1.includes(c)){
            separated = true;
            tokens.push({value:c, start:i, end:i+1});
        }
        else{
            if(!separated){
                var lastToken = tokens[tokens.length-1];
                lastToken.value+=c;
                lastToken.end++;
            }
            else{
                tokens.push({value:c, start:i, end:i+1});
                separated = false;
            }
        }
    }
    return tokens;
}