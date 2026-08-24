import { createApp } from './app.js';

const PORT = process.env.PORT || 3000;
const LAYER = process.env.SANDBOX_LAYER || 1;

const app = createApp(LAYER);

app.listen(PORT, () => {
  console.log('===============================================================');
  console.log(`  THE QA CHECKOUT SANDBOX - RUNNING ON http://localhost:${PORT}`);
  console.log(`  Active Layer: ${LAYER}`);
  console.log('===============================================================');
  console.log('  Health check: http://localhost:' + PORT + '/api/health');
  console.log('  Sandbox info: http://localhost:' + PORT + '/api/sandbox/info');
  console.log('===============================================================');
});
