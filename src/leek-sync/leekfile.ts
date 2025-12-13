import LeekSyncClient from "./leek-sync-client";

class LeekFile{
    public name: string
    public id: number
    public timestamp: number
    public code: string = "";
    public folder: boolean = true;
    public hash: string = "";

    static Folder(name: string, id: number) : LeekFile{
        return new LeekFile(name, id, "", 0, true)
    }

    constructor(name: string, id: number, code: string, timestamp: number, folder: boolean = false) {
        this.name = name;
        this.id = id;
        this.timestamp = timestamp;
        this.hash = this.getHash(code);
        this.code = code;
        this.folder = folder;
    }

    getHash(code: string) : string{
        return "";
    }
}

export default LeekFile;