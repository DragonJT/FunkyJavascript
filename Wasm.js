/*Wasm([
    ImportFunc('void', 'Print', ['int i'], 'console.log(i);'),
    WasmFunc('entry', 'void', 'Main', [], ['int x'], [
        Instruction('i32_const', 3), 
        Instruction('set_local', 'x'), 
        Instruction('get_local', 'x'), 
        Instruction('get_local', 'x'), 
        Instruction('i32_mul'), 
        Instruction('call', 'Print')]),
]);*/

function ParseVariable(variable){
    var tokens = Tokenize(variable);
    return {type:tokens[0].value, name:tokens[1].value};
}

function Instruction(opcode, value){
    return {opcode, value};
}

function WasmFunc(type, returnType, name, parameters, locals, instructions){
    return {type, returnType, name, parameters, locals, instructions};
}

function ImportFunc(returnType, name, parameters, code){
    return {type:'import', returnType, name, parameters, code};
}

function Wasm(allFunctions){
    // https://pengowray.github.io/wasm-ops/
    const Opcode = {
        block: 0x02,
        loop: 0x03,
        br: 0x0c,
        br_if: 0x0d,
        if: 0x04,
        else: 0x05,
        end: 0x0b,
        call: 0x10,
        get_local: 0x20,
        set_local: 0x21,
        i32_store_8: 0x3a,
        i32_store: 0x36,
        i32_const: 0x41,
        f32_const: 0x43,
        i32_eqz: 0x45,
        i32_eq: 0x46,
        f32_eq: 0x5b,
        f32_lt: 0x5d,
        f32_gt: 0x5e,
        i32_and: 0x71,
        f32_add: 0x92,
        f32_sub: 0x93,
        f32_mul: 0x94,
        f32_div: 0x95,
        f32_neg: 0x8c,
        i32_trunc_f32_s: 0xa8,
        i32_load: 0x28,
        f32_load: 0x2a,
        f32_store: 0x38,
        i32_mul: 0x6c,
        i32_div: 0x6d,
        i32_add: 0x6a,
        i32_sub: 0x6b,
        i32_lt: 0x48,
        i32_gt: 0x4a,
        f32_convert_i32_s: 0xb2,
        return: 0x0f,
    };

    // https://webassembly.github.io/spec/core/binary/types.html#binary-blocktype
    // https://github.com/WebAssembly/design/blob/main/BinaryEncoding.md#value_type
    const Blocktype = {
        void: 0x40,
        i32: 0x7f,
    }

    // https://webassembly.github.io/spec/core/binary/types.html
    const Valtype = {
        i32: 0x7f,
        f32: 0x7d
    };

    for(var f of allFunctions){
        f.parametersObjs = f.parameters.map(p=>ParseVariable(p));
    }

    var importFunctions = [];
    var functions = [];
    var main;

    for(var f of allFunctions){
        if(f.type == 'import'){
            importFunctions.push(f);
        }
        else if(f.type == 'entry'){
            f.export = true;
            main = f.name;
            functions.push(f);
        }
        else if(f.type == 'export'){
            f.export = true;
            functions.push(f);
        }
        else{
            functions.push(f);
        }
    }

    for(var f of functions){
        f.localsObjs = f.locals.map(l=>ParseVariable(l));
    }

    var id = 0;
    for(var f of importFunctions){
        f.id=id;
        id++;
    }
    for(var f of functions){
        f.id=id;
        id++;
    }

    const ieee754 = (n) => {
        var data = new Float32Array([n]);
        var buffer = new ArrayBuffer(data.byteLength);
        var floatView = new Float32Array(buffer).set(data);
        return new Uint8Array(buffer);
    };
    
    const encodeString = (str) => [
        str.length,
        ...str.split("").map(s => s.charCodeAt(0))
    ];
    
    const signedLEB128 = (n) => {
        const buffer = [];
        let more = true;
        const isNegative = n < 0;
        const bitCount = Math.ceil(Math.log2(Math.abs(n))) + 1;
        while (more) {
            let byte = n & 0x7f;
            n >>= 7;
            if (isNegative) {
                n = n | -(1 << (bitCount - 8));
            }
            if ((n === 0 && (byte & 0x40) === 0) || (n === -1 && (byte & 0x40) !== 0x40)) {
                more = false;
            } else {
                byte |= 0x80;
            }
            buffer.push(byte);
        }
        return buffer;
    };
    
    const unsignedLEB128 = (n) => {
        const buffer = [];
        do {
            let byte = n & 0x7f;
            n >>>= 7;
            if (n !== 0) {
                byte |= 0x80;
            }
            buffer.push(byte);
        } while (n !== 0);
        return buffer;
    };
    
    const flatten = (arr) => [].concat.apply([], arr);
    
    // https://webassembly.github.io/spec/core/binary/modules.html#sections
    const Section = {
        custom: 0,
        type: 1,
        import: 2,
        func: 3,
        table: 4,
        memory: 5,
        global: 6,
        export: 7,
        start: 8,
        element: 9,
        code: 10,
        data: 11
    };
    
    // http://webassembly.github.io/spec/core/binary/modules.html#export-section
    const ExportType = {
        func: 0x00,
        table: 0x01,
        mem: 0x02,
        global: 0x03
    }
    
    // http://webassembly.github.io/spec/core/binary/types.html#function-types
    const functionType = 0x60;
    
    const emptyArray = 0x0;
    
    // https://webassembly.github.io/spec/core/binary/modules.html#binary-module
    const magicModuleHeader = [0x00, 0x61, 0x73, 0x6d];
    const moduleVersion = [0x01, 0x00, 0x00, 0x00];
    
    // https://webassembly.github.io/spec/core/binary/conventions.html#binary-vec
    // Vectors are encoded with their length followed by their element sequence
    const encodeVector = (data) => [
        ...unsignedLEB128(data.length),
        ...flatten(data)
    ];
    
    // https://webassembly.github.io/spec/core/binary/modules.html#code-section
    const encodeLocal = (count, valtype) => [
        ...unsignedLEB128(count),
        valtype
    ];
    
    // https://webassembly.github.io/spec/core/binary/modules.html#sections
    // sections are encoded by their type followed by their vector contents
    const createSection = (sectionType, data) => [
        sectionType,
        ...encodeVector(data)
    ];
    
    const memoryImport = [
        ...encodeString("env"),
        ...encodeString("memory"),
        ExportType.mem,
        /* limits https://webassembly.github.io/spec/core/binary/types.html#limits -
        indicates a min memory size of one page */
        0x00,
        unsignedLEB128(10),
    ];
    
    function EmitTypeSection(){
        function GetValtype(type){
            if(type == 'int'){
                return Valtype.i32;
            }
            else if(type == 'float'){
                return Valtype.f32;
            }
            throw "Unexpected type: "+type;
        }

        function GetReturnValtype(type){
            if(type == 'void'){
                return [];
            }
            else{
                return [GetValtype(type)];
            }
        }

        function EmitTypes(functions){
            return functions.map(f=>[
                functionType,
                ...encodeVector(f.parametersObjs.map(p=>GetValtype(p.type))),
                ...encodeVector(GetReturnValtype(f.returnType)),
            ]);
        }
        return createSection(Section.type, encodeVector([...EmitTypes(importFunctions), ...EmitTypes(functions)]));
    }
    
    function EmitImportSection(){
        function EmitImportFunctions(){
            return importFunctions.map((f,i)=>[
                ...encodeString("env"),
                ...encodeString(f.name),
                ExportType.func,
                ...unsignedLEB128(i)
            ]);
        }
    
        return createSection(Section.import, encodeVector([...EmitImportFunctions(), memoryImport]));
    }
    
    function EmitFuncSection(){
        return createSection(Section.func, encodeVector(functions.map(f=>unsignedLEB128(f.id))));
    }
    
    function EmitExportSection(){
    return createSection(
            Section.export,
            encodeVector(functions
                .filter(f=>f.export)
                .map(f=>[...encodeString(f.name), ExportType.func, ...unsignedLEB128(f.id)])),
        );
    }
    
    function EmitCodeSection(){
        function GetBlocktype(type){
            if(type == 'void'){
                return Blocktype.void;
            }
            else if(type == 'int'){
                return Blocktype.i32;
            }
            throw "Unexpected type: "+type;
        }

        function EmitFunctionWasm(f){
            var localID = 0;
            var i32LocalCount = 0;
            for(var p of f.parametersObjs){
                p.id = localID;
                localID++;
            }
            for(var l of f.localsObjs){
                if(l.type == 'int'){
                    l.id = localID;
                    localID++;
                    i32LocalCount++;
                }
            }

            function FindFunction(name){
                for(var f of importFunctions){
                    if(f.name == name){
                        return f;
                    }
                }
                for(var f of functions){
                    if(f.name == name){
                        return f;
                    }
                }
                throw "Cant find function with name: "+name;
            }

            function FindLocal(name){
                for(var p of f.parameters){
                    if(p.name == name){
                        return p;
                    }
                }
                for(var l of f.localsObjs){
                    if(l.name == name){
                        return l;
                    }
                }
                throw "Cant find local with name: "+name;
            }

            var wasmCode = [];
            for(var i of f.instructions){
                if(i.opcode == 'i32_const'){
                    wasmCode.push(Opcode.i32_const, ...signedLEB128(i.value));
                }
                else if(i.opcode == 'call'){
                    wasmCode.push(Opcode.call, ...unsignedLEB128(FindFunction(i.value).id));
                }
                else if(i.opcode == 'get_local'){
                    wasmCode.push(Opcode.get_local, ...unsignedLEB128(FindLocal(i.value).id));
                }
                else if(i.opcode == 'set_local'){
                    wasmCode.push(Opcode.set_local, ...unsignedLEB128(FindLocal(i.value).id));
                }
                else if(i.opcode == 'loop'){
                    wasmCode.push(Opcode.loop, GetBlocktype(i.value));
                }
                else if(i.opcode == 'br_if'){
                    wasmCode.push(Opcode.br_if, ...unsignedLEB128(i.value));
                }
                else if(i.opcode == 'if'){
                    wasmCode.push(Opcode.if, GetBlocktype(i.value));
                }
                else if(i.opcode == 'br'){
                    wasmCode.push(Opcode.br, ...unsignedLEB128(i.value));
                }
                else{
                    var opcodeValue = Opcode[i.opcode];
                    if(opcodeValue == undefined){
                        throw 'Cant find '+i.opcode;
                    }
                    wasmCode.push(opcodeValue);
                }
            }
            wasmCode.push(Opcode.end);
            return encodeVector([1, ...encodeLocal(i32LocalCount, Valtype.i32), ...wasmCode]);
        }

        return createSection(Section.code, encodeVector(functions.map(f=>EmitFunctionWasm(f))));
    }

    function ImportObject(){
        var code = "var importObject = {env:{}};\n";
        code+="var global = {};\n";
        for(var f of importFunctions){
            code+="importObject.env."+f.name+"= (";
            for(var i=0;i<f.parametersObjs.length;i++){
                code+=f.parametersObjs[i].name;
                if(i<f.parametersObjs.length-1)
                    code+=',';
            }
            code+=")=>{"
            code+=f.code;
            code+="};\n";
        }
        code+="return importObject;\n";
        return new Function('exports', code)(exports);
    }
    
    const wasmBytes = Uint8Array.from([
        ...magicModuleHeader,
        ...moduleVersion,
        ...EmitTypeSection(),
        ...EmitImportSection(),
        ...EmitFuncSection(),
        ...EmitExportSection(),
        ...EmitCodeSection(),
    ]);
    
    var exports = {};
    var importObject = ImportObject();
    importObject.env.memory = new WebAssembly.Memory({ initial: 10, maximum: 10 });
    WebAssembly.instantiate(wasmBytes, importObject).then(
        (obj) => {
            for(var f of functions.filter(f=>f.export)){
                exports[f.name] = obj.instance.exports[f.name];
            }
            exports[main]();
        }
    );
}