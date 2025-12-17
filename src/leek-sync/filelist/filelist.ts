import LeekFile from "./leekfile";


class Filelist {
    /*
        Filelist represent some LeekFile mapped by their path
        You can add or remove file
     */

    protected fileList: { [file: string]: LeekFile } = {};
    public pristine: boolean = true;
    public logs: string = ""

    constructor() {
        this.fileList = {};
    }

    addLog(log: string) {
        this.pristine = false;
        this.logs += log + "\n"
    }

    get(name: string): LeekFile {
        return this.fileList[name];
    }

    set(name: string, leekFile: LeekFile) {
        this.addLog("+ " + name);
        this.fileList[name] = leekFile;
    }

    contains(name: string): boolean {
        return name in this.fileList;
    }

    getCount(): number {
        return Object.keys(this.fileList).length;
    }

    getTimestamp(name: string): number {
        if (!this.contains(name)) return 0;
        return this.get(name).timestamp;
    }

    getFileNames(): string[] {
        return Object.keys(this.fileList);
    }

    getFiles() {
        return Object.values(this.fileList);
    }

    remove(filename: string) {
        this.addLog("- " + filename);
        delete this.fileList[filename];
    }

    removeAllNotIn(elements: string[]) {
        this.getFileNames().forEach(filename => {
            if (elements.includes(filename)) return;
            this.remove(filename);
        })
    }

    compare(filelist: Filelist): boolean {
        // Check file count match
        if (filelist.getCount() != this.getCount()) return false;

        // Check other files all exists in this filelist
        for (let file of filelist.getFiles()) {
            if (this.contains(file.name)) continue;
            return false
        }

        // Check files doesn't differ in hash
        for (let file of this.getFiles()) {
            if (!filelist.fileIsSimilar(file)) return false;
        }

        return true;
    }

    async save() {
        // DO NOTHING
    }

    fileIsSimilar(file: LeekFile): boolean {
        return this.contains(file.name) && this.get(file.name).isSimilar(file);
    }
}

export default Filelist;