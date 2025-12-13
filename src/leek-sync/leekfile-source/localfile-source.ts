import LeekFile from "../filelist/leekfile";
import LeekfileSource from "./leekfile-source";
import Filelist from "../filelist/filelist";
import fs from "node:fs";

class LocalfileSource extends LeekfileSource {

    private path: string

    constructor(path: string, filelist: Filelist) {
        super(filelist);
        this.path = path;
    }

    init(): void{
        // TODO
    }

    deleteFile(file: LeekFile){
        return fs.unlink(this.path + file.name, (err) => {console.log(err)});
    }

    async updateFile(file: LeekFile){
        if (file.name in this.filelist){
            if (file.folder) return;

            return this.updateFileInLocalFilesystem(file);
        }else{
            return this.createFileInLocalFilesystem(file);
        }
    }

    private async updateFileInLocalFilesystem(file: LeekFile) {
        return this.createFileInLocalFilesystem(file);
    }

    private createFileInLocalFilesystem(file: LeekFile) {
        console.log("Creating file : " + this.path + file.name)
        if (file.folder) return this.createFolderInLocalFilesystem(file);

        return fs.writeFile(this.path + file.name, file.code, 'utf-8', (err) => {
            if (err) throw err;
            this.filelist.set(file.name, new LeekFile(file.name, file.id, file.code, 0));
        });
    }

    private createFolderInLocalFilesystem(file: LeekFile) {
        if (!file.folder) return;
        if (!fs.existsSync(this.path + file.name)){
            fs.mkdirSync(this.path + file.name);
        }
    }
}

export default LocalfileSource;