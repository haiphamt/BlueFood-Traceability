import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, resolve } from 'node:path';

const schedulerDir = resolve(
  process.cwd(),
  'node_modules/.pnpm/@react-pdf+renderer@3.4.5_react@18.3.1/node_modules/scheduler'
);

const files = [
  {
    name: 'index.js',
    content: `'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/scheduler.production.min.js');
} else {
  module.exports = require('./cjs/scheduler.development.js');
}
`,
  },
  {
    name: 'unstable_mock.js',
    content: `'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/scheduler-unstable_mock.production.min.js');
} else {
  module.exports = require('./cjs/scheduler-unstable_mock.development.js');
}
`,
  },
];

async function main() {
  try {
    await access(schedulerDir, fsConstants.F_OK);
  } catch {
    return;
  }

  for (const file of files) {
    const target = resolve(schedulerDir, file.name);
    try {
      await access(target, fsConstants.F_OK);
    } catch {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, 'utf8');
    }
  }
}

await main();
