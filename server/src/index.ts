import { createApp } from './app.js';

const port = Number(process.env.PORT || 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`JAKHIRA ERP API listening on port ${port}`);
});
