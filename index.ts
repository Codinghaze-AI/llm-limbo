import { setDataRoot } from "./src/store";
import { startServer } from "./src/server";
import path from "node:path";

const dataDir = process.env.LIMBO_DATA_DIR ?? path.resolve("./data");
setDataRoot(dataDir);

await startServer();
