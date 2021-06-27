/**
 * webpack编译依赖babel全家桶
 * babel全家桶
 * @babel/parser
 * @babel/traverse
 * @babel/core
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const babel = require('@babel/core');


/**
 * 分析单个模块npm
 */

function getModuleInfo(file) {
  // 读取
  const body = fs.readFileSync(file, 'utf-8');

  // 转换语法AST
  const ast = parser.parse(body, {
    sourceType: 'module'
  })
  // console.log('ast', ast)

  // 收集依赖
  const deps = {}
  traverse(ast, {
    // visitor
    ImportDeclaration({ node }) {
      const dirname = path.dirname(file)
      const abspath = './' + path.join(dirname, node.source.value)
      console.log('abspath', abspath);
      deps[node.source.value] = abspath
    }
  })
  // es6转es5
  const { code } = babel.transformFromAst(ast, null, {
    presets: ["@babel/preset-env"]
  })
  // console.log('code', code)
  const moduleInfo = {
    file,
    deps,
    code,
  }
  return moduleInfo
}
// const info = getModuleInfo('./src/index.js')
// console.log('info', info);

/**
 * 模块递归解析
 */
function pasreModules(file) {
  const entry = getModuleInfo(file)
  const temp = [entry]
  const depsGraph = {}
  getDeps(temp, entry)

  temp.forEach(info => {
    depsGraph[info.file] = {
      deps: info.deps,
      code: info.code
    }
  })
  return depsGraph
}

function getDeps(temp, { deps }) {
  Object.keys(deps).forEach(key => {
    const child = getModuleInfo(deps[key])
    temp.push(child)
    getDeps(temp, child)
  })
}

// const content = pasreModules('./src/index.js')
// console.log('content', content);

function bundle(file) {
  const depsGraph = JSON.stringify(pasreModules(file))

  return `(function(graph) {
    function require(file) {
      function absRequire(relPath) {
        return require(graph[file].deps[relPath])
      }
      var exports = {};
      (function(require, exports, code) {
        eval(code)
      })(absRequire, exports, graph[file].code)
      return exports
    }
    require('${file}')
  })(${depsGraph})`
}

const content = bundle('./src/index.js')
console.log('content', content);

!fs.existsSync('./dist') && fs.mkdirSync('./dist')
fs.writeFileSync('./dist/bundle.js', content)