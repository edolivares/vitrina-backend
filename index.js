import app from "./app.js";
import { config } from "./lib/config.js";

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
});
