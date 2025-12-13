import LeekFile from "../filelist/leekfile";
import LeekfileSource from "./leekfile-source";
import Filelist from "../filelist/filelist";
import fs, {Dirent} from "node:fs";
import Watcher from 'watcher';


class LocalfileSource extends LeekfileSource {

    private path: string
    private observer: LeekfileSource[];

    constructor(path: string, filelist: Filelist) {
        super(filelist);
        this.path = path;
        this.observer = []
    }

    async init(): Promise<void> {

        // Get an updated list of leekwars files
        const localFiles : Filelist = await this.exploreFiles();

        this.filelist.removeAllNotIn(localFiles.getFileNames());

        localFiles.getFiles().forEach(file => {
            if (file.folder) {
                this.createFolderInLocalFilesystem(file);
                this.filelist.set(file.name , file);
            } else {
                if(this.filelist.fileIsSimilar(file)) return;
                console.log("Load file from init because files differ : " + file.name);
                console.log("timestamp : " + this.filelist.get(file.name).timestamp + " / " + file.timestamp)
                this.filelist.set(file.name, this.loadFile(file.name));
            }
        });
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
        this.observer = [leekfilesource]
        const watcher = new Watcher(this.path, {
            recursive: true,
        });

        const root = require("path").resolve(this.path);


        watcher.on('error', error => {
            console.log(error instanceof Error); // => true, "Error" instances are always provided on "error"
        });

        watcher.on('all', (event, targetPath, targetPathNext) =>
            this.onChange(event, targetPath.substring(root.length), targetPathNext?.targetPath.substring(root.length))
        );
    }

    public loadFile(filename: string, lazy: boolean = false): LeekFile {
        if (!lazy) console.log("Loading " + filename);
        return new LeekFile(filename, 0, lazy ? "Lazy loaded file, shouldn't be upload to leekwars as such" : fs.readFileSync(this.path + filename, "utf8"), fs.statSync(this.path + filename).mtime.getTime(), false);
    }

    private async exploreFiles() : Promise<Filelist> {
        const files = fs.readdirSync(this.path, {recursive: true, withFileTypes: true})
        const filelist: Filelist = new Filelist();
        filelist.set("/", LeekFile.Folder("/", 0))

        files.forEach(file => {
            const trueFileName = this.cleanupPath(file);
            filelist.set(trueFileName, file.isDirectory() ?
                new LeekFile(trueFileName, 0, "", 0, true)
                : this.loadFile(trueFileName, true));
        })
        return filelist;
    }

    private cleanupPath(file: Dirent<string>) {
        var parentPath = file.parentPath.startsWith("./") ? file.parentPath.substring(2) + "/" : file.parentPath;
        var parentName = parentPath.substring(this.path.length - 1);
        return "/" + (parentName != "" ? parentName + "/" : "") + file.name + (file.isDirectory() ? "/" : "");
    }

    private onChange(event: any, path: string, toPath: any) {
        switch (event) {
            case "add":
            case "change":

                if (!this.filelist.fileIsSimilar(this.loadFile(path, true))) {
                    console.log("Updating " + path);
                    const file = this.loadFile(path)
                    this.filelist.set(file.name, file);
                    this.observer.forEach(observer => observer.updateFile(file).then(() =>
                        console.log("Updated " + file.name)
                    ))
                }
                break;
            default:
                console.log("[" + event + "] @ " + path + " " + (toPath != undefined ? "\n    => " + toPath : "")); // => could be any target event: 'add', 'addDir', 'change', 'rename', 'renameDir', 'unlink' or 'unlinkDir'
                break;
        }
    }
}

export default LocalfileSource;