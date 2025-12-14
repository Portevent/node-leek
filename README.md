# 🥬 NodeLeek (WIP)
Simple NodeJs client for LeekWars.
Uses OpenAPI to autogenerate API client (specifications are handwritten as no official uptodate spec exists).

```typescript
var nodeLeek = new NodeLeekClient();
nodeLeek.login("YOUR_ACCOUNT", "YOUR_PASSWORD").then(() =>
    nodeLeek.gardenGetGet().then(garden => console.log("I have " + garden.fights + " fights"))
    nodeLeek.fetchFile(nodeLeek.farmer.files['myreworkediaagainagain2bis/new/mynewia'].id, 0).then(file => console.log("My AI code is : \n" + file.code))
);
```

> ❗ Uses outdated package https://www.npmjs.com/package/request because I couldn't make other OpenAPI codegen variants work with cookie authentification. This issue must be resolved to ensure a cleaner code

Done :
- /farmer/login : partially, some part of the response (such as chat message) aren't done yet
- /garden/get 
- /ai-folder/new-name
- /ai/save
- /ai/new-name
- /ai/sync

Planning to do :
- ai rename and delete
- ai folder rename and delete
- ai bin clear
- start random garden fight
- assign IA to leek

Considering :
- stats assignment, equipment & chip assignment
- dashboard

## 🔄 LeekSync (WIP)
Clone your LeekWars file on your local computer and sync them with a file watcher. Open your favorite local IDE, edit some files and they get upload to LeekWars seamlessly.  
Store your LeekWars timestamp and local timestamp in cache file, so that the next time you launch Leeksync, it won't reimport every files.  
If you happen to change your file locally while LeekSync is not running, or you edited file through LeekWars editor, LeekSync will ask you which source to use and update the other to be on the same page  

```typescript
import LeekSyncClient from "./leek-sync/leek-sync-client";

new LeekSyncClient("YOUR_ACCOUNT", "YOUR_PASSWORD", "./out")
```

On launch :
- LeekWars : complete fetching
- Local files : complete fetching
- Issue resolver : can be done both way but won't ask yet and choose LeekWars (-> local files will be overridden)

Actions :
- LeekWars : can create new file, folder, update file content and delete file and folder. 
    - Planning to do rename
- Local files : can create new file, folder, update file content and delete file and folder.
  - Planning to do rename

On edition :
- LeekWars : not watching edit and don't plan to yet. Edit made on LeekWars while LeekSync is up won't be recorded
- Local files : will watch for new file, file change, and file or folder deletion.
  - Planning to add rename support
