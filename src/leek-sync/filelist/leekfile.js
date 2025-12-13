"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class LeekFile {
    name;
    id;
    timestamp;
    code = "";
    folder = true;
    constructor(name, id, timestamp) {
        this.name = name;
        this.id = id;
        this.timestamp = timestamp;
    }
}
class LeekScript extends LeekFile {
    hash;
    code;
    constructor(name, id, code, timestamp) {
        super(name, id, timestamp);
        this.hash = this.getHash(code);
        this.code = code;
    }
    getHash(code) {
        return "";
    }
}
class LeekFolder extends LeekFile {
    constructor(name, id) {
        super(name, id, 0);
        this.folder = true;
    }
}
//# sourceMappingURL=leekfile.js.map