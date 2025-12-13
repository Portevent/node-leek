import fs from "node:fs";
import LeekFile from "./leekfile";

class CachedFilelist {
    private path: string;

    private fileList: {[file: string]: LeekFile}= {};

    constructor(path: string) {
        this.path = path;
        this.fileList = {};
        this.loadCacheFile();
    }

    private loadCacheFile() {
        try{
            this.fileList = JSON.parse(fs.readFileSync(this.path, "utf8"));
        }catch(e){
            this.fileList = {};
        }
    }

    private async saveCacheFile() {
        return fs.writeFile(this.path, JSON.stringify(this.fileList), 'utf-8', (err) => {
            console.error("Can't save local cache to " + this.path + " : ");
            console.error(err);
        });
    }

    getFileNames(): string[] {
        return Object.keys(this.fileList);
    }

    remove(filename: string) {
        delete this.fileList[filename];
    }

    save(){
        this.saveCacheFile()
    }

    set(name: string, leekFile: LeekFile) {
        this.fileList[name] = leekFile;
    }

    get(name: string) : LeekFile | null {
        return this.fileList[name];
    }

    getTimestamp(name: string) : number {
        return this.get(name)?.timestamp ?? 0;
    }

    getFiles() {
        return Object.values(this.fileList);
    }
}

export default CachedFilelist;