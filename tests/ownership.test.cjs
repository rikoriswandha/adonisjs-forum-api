const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

for (const name of ['Forums', 'Posts']) {
  for (const action of ['update', 'destroy']) {
    for (const owner of [true, false]) {
      test(name + '.' + action + (owner ? ' permits owner' : ' rejects another owner'), async () => {
        let writes = 0
        const filters = {}
        const row = {
          userId: 7,
          save: async () => { writes++ },
          delete: async () => { writes++ },
          preload: async () => {},
        }
        const query = {
          where(key, value) { filters[key] = value; return this },
          async firstOrFail() {
            if (filters.user_id !== row.userId || filters.id !== 10) {
              throw new Error('not found')
            }
            return row
          },
        }
        const model = { query: () => query, find: async () => row }
        const cache = { remember: async (_key, _ttl, callback) => callback(), delete: async () => {}, update: async () => {} }
        const logger = { info() {}, error() {} }
        const source = readFileSync(resolve('app/Controllers/Http/' + name + 'Controller.ts'), 'utf8')
        const { outputText } = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
        })
        const exports = {}
        vm.runInNewContext(outputText, {
          exports,
          require(id) {
            if (id.startsWith('App/Models/')) return model
            if (id.includes('Logger')) return logger
            if (id.includes('Cache')) return cache
            throw new Error('Unexpected import: ' + id)
          },
        })
        const controller = new exports.default()
        const context = {
          auth: { authenticate: async () => ({ id: owner ? 7 : 8 }) },
          request: { input: () => 'updated' },
          params: { id: 10 },
          response: { noContent: () => 204 },
        }
        if (owner) {
          await controller[action](context)
          assert.equal(writes, 1)
        } else {
          await assert.rejects(() => controller[action](context), /not found/)
          assert.equal(writes, 0)
        }
        assert.equal(filters.user_id, owner ? 7 : 8)
        assert.equal(filters.id, 10)
      })
    }
  }
}
