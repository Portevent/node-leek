import LeekFile from "../filelist/leekfile";
import Filelist from "../filelist/filelist";


abstract class LeekfileSource {

    protected filelist: Filelist;

    protected constructor(filelist: Filelist) {
        this.filelist = filelist;
    }

    abstract updateFile(file: LeekFile): void;
    abstract deleteFile(file: LeekFile): void;

    abstract init(): void;

    importFrom(otherSource: LeekfileSource): void {
        // Remove file not present in the otherSource
        this.filelist.getFiles().forEach((file: LeekFile) => {
            if(!otherSource.filelist.contains(file.name)) this.deleteFile(file);
        });

        otherSource.filelist.getFiles().forEach((file: LeekFile) => {
            this.updateFile(file)
        });
    }

    compareWith(otherSource: LeekfileSource): boolean {
        return this.filelist.compare(otherSource.filelist);
    }
}

export default LeekfileSource;