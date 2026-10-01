import { rm } from "node:fs/promises";

await rm(new URL("../.data/store.json", import.meta.url), { force: true });
console.log("Demo store reset. Catalogue seed is unchanged.");
