import {createHash} from "node:crypto";

class LeekFile{
    public name: string
    public id: number
    public timestamp: number
    public code: string = "";
    public folder: boolean = true;
    public hash: string = "";

    static Folder(name: string, id: number = 0) : LeekFile{
        return new LeekFile(name, id, "", 0, true)
    }

    constructor(name: string, id: number, code: string, timestamp: number, folder: boolean = false, hash: string | null = null) {
        this.name = name;
        this.id = id;
        this.timestamp = timestamp;
        this.hash = hash ?? this.getHash(code);
        this.code = code;
        this.folder = folder;
    }

    getHash(code: string) : string{
        return createHash('md5').update(code).digest('hex');
    }

    getFilename(): string{
        if (this.folder){
            const withoutLeadingSlash = this.name.substring(0, this.name.length - 1)
            return withoutLeadingSlash.substring(withoutLeadingSlash.lastIndexOf("/") + 1)
        }
        return this.name.substring(this.name.lastIndexOf("/") + 1);
    }

    getParentFolder(): string{
        if (this.folder){
            const withoutLeadingSlash = this.name.substring(0, this.name.length - 1)
            return withoutLeadingSlash.substring(0, withoutLeadingSlash.lastIndexOf("/") + 1)
        }
        return this.name.substring(0, this.name.lastIndexOf("/") + 1);
    }

    public isSimilar(file: LeekFile) : boolean {
        return file.timestamp === this.timestamp || file.hash === this.hash;
    }
}

export default LeekFile;