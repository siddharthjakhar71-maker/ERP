import { createApp } from './app.js';
import { initializeDatabase } from './db/init.js';

const port = Number(process.env.PORT || 4000);
const app = createApp();

await initializeDatabase();

app.listen(port, () => {
  console.log(`JAKHIRA ERP API listening on port ${port}`);
});
