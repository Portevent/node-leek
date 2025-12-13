import LeekFile from "../filelist/leekfile";
import LeekfileSource from "./leekfile-source";
import Filelist from "../filelist/filelist";
import fs from "node:fs";
import Watcher from 'watcher';


class LocalfileSource extends LeekfileSource {

    private path: string

    constructor(path: string, filelist: Filelist) {
        super(filelist);
        this.path = path;
    }

    init(): void {
        // TODO
    }

    async deleteFile(file: LeekFile) {
        return fs.unlink(this.path + file.name, (err) => {
            console.log(err)
        });
    }

    async updateFile(file: LeekFile) {
        if (file.name in this.filelist) {
            if (file.folder) return;

            return this.updateFileInLocalFilesystem(file);
        } else {
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
        if (!fs.existsSync(this.path + file.name)) {
            fs.mkdirSync(this.path + file.name);
        }
    }

    public startWatching(leekfilesource: LeekfileSource) {

        const watcher = new Watcher(this.path);

        const root = require("path").resolve(this.path);
        console.log("ROOT : " + root);

        watcher.on('error', error => {
            console.log(error instanceof Error); // => true, "Error" instances are always provided on "error"
        });

        watcher.on('all', (event, targetPath, targetPathNext) => {
            switch (event) {
                case "add":
                case "change":
                    const file = this.loadFile(targetPath.substring(root.length))
                    if (!this.filelist.fileIsSimilar(file)) {
                        console.log("Updating " + file.name);
                        this.filelist.set(file.name, file);
                        leekfilesource.updateFile(file).then(() =>
                            console.log("Updated " + file.name)
                        )
                    }
                    break;
                default:
                    console.log("[" + event + "] @ " + targetPath + " " + (targetPathNext != "" ? "\n    => " + targetPathNext : "")); // => could be any target event: 'add', 'addDir', 'change', 'rename', 'renameDir', 'unlink' or 'unlinkDir'
                    break;
            }
        });
    }

    public loadFile(filename: string): LeekFile {
        return new LeekFile(filename, 0, fs.readFileSync(this.path + filename, "utf8"), 0, false);
    }
}

export default LocalfileSource;