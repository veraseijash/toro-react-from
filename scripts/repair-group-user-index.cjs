const fs = require('node:fs');
const path = require('node:path');
const backend = path.resolve(__dirname, '../../../back/toro-server');
const ts = require(path.join(backend, 'node_modules/typescript'));
const mysql = require(path.join(backend, 'node_modules/mysql2/promise'));

// Read only literal connection settings; never print credentials or execute the module.
const source = ts.createSourceFile('app.module.ts', fs.readFileSync(path.join(backend, 'src/app.module.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const settings = {};
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'TypeOrmModule.forRoot') {
    for (const property of node.arguments[0].properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = property.name.getText(source);
      const value = property.initializer;
      if (ts.isStringLiteral(value)) settings[key] = value.text;
      else if (ts.isNumericLiteral(value)) settings[key] = Number(value.text);
    }
  }
  ts.forEachChild(node, visit);
}
visit(source);

async function main() {
  if (settings.database !== 'databasetoro' || !settings.host || !settings.username) {
    throw new Error('Unexpected database configuration; no changes made.');
  }
  const connection = await mysql.createConnection({
    host: settings.host, port: settings.port, user: settings.username,
    password: settings.password, database: settings.database, connectTimeout: 5000,
  });
  try {
    const [indexes] = await connection.query('SHOW INDEX FROM `group_ht`');
    const oldName = 'REL_0d3c336fddad53138b2c8cc4b6';
    const newName = 'IDX_group_ht_userId';
    const oldIndex = indexes.filter((index) => index.Key_name === oldName);
    const newIndex = indexes.filter((index) => index.Key_name === newName);
    if (oldIndex.length && (oldIndex.length !== 1 || oldIndex[0].Column_name !== 'userId' || Number(oldIndex[0].Non_unique) !== 0)) {
      throw new Error('Unexpected old index definition; no changes made.');
    }
    if (newIndex.length && (newIndex.length !== 1 || newIndex[0].Column_name !== 'userId' || Number(newIndex[0].Non_unique) !== 1)) {
      throw new Error('Unexpected replacement index definition; no changes made.');
    }
    console.log(JSON.stringify({ oldUniqueIndex: oldIndex.length > 0, replacementIndex: newIndex.length > 0 }));
    if (process.argv.includes('--apply')) {
      if (!newIndex.length) await connection.query('CREATE INDEX `IDX_group_ht_userId` ON `group_ht` (`userId`)');
      if (oldIndex.length) await connection.query('ALTER TABLE `group_ht` DROP INDEX `REL_0d3c336fddad53138b2c8cc4b6`');
      const [verified] = await connection.query('SHOW INDEX FROM `group_ht`');
      const [foreignKeys] = await connection.execute(
        'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME = ?',
        [settings.database, 'group_ht', 'userId', 'users'],
      );
      if (!verified.some((index) => index.Key_name === newName && Number(index.Non_unique) === 1)
        || verified.some((index) => index.Key_name === oldName) || foreignKeys.length === 0) {
        throw new Error('Schema verification failed.');
      }
      console.log('Verified: non-unique userId index present, old unique index removed, foreign key preserved.');
    }
  } finally {
    await connection.end();
  }
}
main().catch((error) => {
  console.error('Repair failed:', error.code || error.message);
  process.exitCode = 1;
});
