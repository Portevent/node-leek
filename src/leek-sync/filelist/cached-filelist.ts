import Filelist from "./filelist";
import fs from "node:fs";

class CachedFilelist extends Filelist {
    protected path: string;

    constructor(path: string) {
        super();
        this.path = path;
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

    async save() {
        await this.saveCacheFile();
    }
}

export default CachedFilelist;