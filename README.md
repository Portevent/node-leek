# 🥬 NodeLeek 
Simple NodeJs client for Leekwars.
Uses OpenAPI to autogenerate API client (specifications are handwritten as no official uptodate spec exists).

```typescript
var nodeLeek = new NodeLeekClient();
nodeLeek.login("YOUR_ACCOUNT", "YOUR_PASSWORD").then(() =>

    nodeLeek.gardenGetGet().then(garden => console.log("I have " + garden.fights + " fights"))
    nodeLeek.fetchFile(451535, 0).then(file => console.log("My AI code is : \n" + file.code))
);
```

> ❗ Uses outdated package https://www.npmjs.com/package/request because I couldn't make other OpenAPI codegen variants work with cookie authentification. This issue must be resolved to ensure a cleaner code
