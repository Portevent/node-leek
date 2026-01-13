import Filelist from "./filelist.js";
import fs from "node:fs";
import debounce from 'debounce';
import LeekFile from "./leekfile.js";

class CachedFilelist extends Filelist {
    protected path: string;

    constructor(path: string) {
        super();
        this.path = path;
        this.loadCacheFile();
    }

    private loadCacheFile() {
        try{
            const fakeFileList : {[file: string]: LeekFile} = JSON.parse(fs.readFileSync(this.path, "utf8"))
            this.fileList = {};
            for (const file of Object.values(fakeFileList)) {
                this.fileList[file.name] = new LeekFile(file.name, file.id, file.code, file.timestamp, file.folder, file.hash);
            }
        }catch(e){
            this.fileList = {};
        }
    }

    private async saveCacheFile() {
        return fs.writeFile(this.path, JSON.stringify(this.fileList), 'utf-8', (err) => {
            if(err != null) {
                console.error("Can't save local cache to " + this.path + " : ");
                console.error(err);
            }
        });
    }

    override set(name: string, leekFile: LeekFile) {
        super.set(name, leekFile)

        debounce(this.save, 1000);
    }

    override remove(name: string) {
        super.remove(name)

        debounce(this.save, 1000);
    }

    override async save() {
        await this.saveCacheFile();
    }
}

export default CachedFilelist;