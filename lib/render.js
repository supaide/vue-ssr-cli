var system = require('system')
var page = require('webpage').create()
var fs = require('fs')

var url = system.args[1]
var options = JSON.parse(system.args[2])
if (!options.routers) {
  console.error('routers is empty\n')
  phantom.exit(1)
}

if (!fs.exists(options.routers) || !fs.isFile(options.routers)) {
  console.error('router file ['+options.routers+'] is not exist\n')
  phantom.exit(1)
}

page.settings.loadImages = false
page.settings.localToRemoteUrlAccessEnabled = true
page.settings.resourceTimeout = 15000

page.onError = function (message, trace) {
  if (options.ignoreJSErrors) return
  var pathname = url.replace(/http:\/\/localhost:\d+/, '')
  console.error('WARNING: JavaScript error while prerendering: ' + pathname + '\n' + message)
  phantom.exit(1)
}

var routers = []
try {
  routers = JSON.parse(fs.read(options.routers))
} catch (e) {
  console.error('router file ['+options.routers+'] parse error: \n'+e)
  phantom.exit(1)
}

var mkdirp = function (absDir, path) {
  var paths = path.split()
  if (paths.length < 1) {
    return
  }
  var absPath = absDir + '/' + paths[0]
  if (!fs.exists(absPath) || !fs.isDirectory(absPath)) {
    if (!fs.makeDirectory(absPath)) {
      console.error('mkdir ['+absPath+'] failed.')
      phantom.exit(1)
      return
    }
  }
  if (paths.length > 1) {
    mkdirp(absPath, paths.slice(1).join('/'))
  }
}

var getLangPlaceholder = function () {
  switch (options.lang) {
    case 'php':
      return '<?php echo empty($this->__SSR_INITIAL_STATE__) ? "null" : $this->__SSR_INITIAL_STATE__;?>'
    case 'nodejs':
      return 'typeof global.__SSR_INITIAL_STATE__ !== "undefined" ? global.__SSR_INITIAL_STATE__ : null'
    case 'none':
      return null
    default:
      if (fs.exists(options.lang) && fs.isFile(options.lang)) {
        return fs.read(options.lang).replace(/^\s|\s$/g, '')
      } else {
        return null
      }
  }
}

var getAttribute = function(script) {
  script = script.replace(/<\/script>/, '')
  script = script.replace(/<script/, '')
  script = script.replace(/<|>/, '')
  script = script.replace(/^\s*|\s*$/g, '')
  var attrs0 = script.split(' ')
  var attrs = {}
  attrs0.forEach(function (attr) {
    var kv = attr.split('=')
    attrs[kv[0]] = kv.slice(1).join('').replace(/^"|"$/g, '').replace(/^'|'$/g, '')
  })
  return attrs
}

var scriptEqual = function (script0, script1) {
  var attrs0 = getAttribute(script0)
  var attrs1 = getAttribute(script1)
  return attrs0.src && attrs1.src && attrs0.src === attrs1.src
}

var replaceTemplate = function (html) {
  var scripts = getScriptFromPage(html, true)
  var scriptSrcs = []

  scripts.forEach(function (script) {
    var attrs = getAttribute(script)
    scriptSrcs.push(attrs.src || '')
  })
  var newScripts = []
  scriptSrcs.forEach(function (src, i) {
    if (defaultScriptSrcs.indexOf(src) < 0) {
      newScripts.push(scripts[i])
      html = html.replace(scripts[i], '')
    }
  })
  var reg = new RegExp('id="'+options.rootId+'"')
  html = html.replace(reg, 'id="'+options.rootId+'" data-server-rendered="true"')
  var placeholder = getLangPlaceholder()
  if (placeholder) {
    html = html.replace(/<\/head>/, '<script type="text/javascript">window.__INITIAL_STATE__='+placeholder+';</script></head>')
  }
  return html
}

var saveHtml = function (router, html) {
  mkdirp(options.dest, router)
  try {
    var file = options.dest+'/'+router+'/index.html'
    fs.write(file, replaceTemplate(html), 'w')
  } catch (e) {
    console.error(e)
    phantom.exit(1)
    return false
  }
  return true
}

var log = function (msg) {
  try {
    fs.write(options.logFile, msg+"\n", 'a')
  } catch (e) {
    console.error(e)
    phantom.exit(1)
  }
}

var htmls = []
var ind = 0
var len = routers.length

var getScriptFromPage = function (file, isHtml) {
  var html = ''
  if (isHtml) {
    html = file
  } else {
    html = fs.read(file)
  }
  var headPos0 = html.indexOf('<head')
  var headPos1 = html.indexOf('</head>')
  if (headPos0 < 0 || headPos1 < 0 || headPos0 >= headPos1) {
    return []
  }
  var headHtml = html.substring(headPos0, headPos1)
  var scripts = headHtml.match(/<script [^<|>]*>[^<|>]*<\/script>/g)
  return scripts || []
}

var defaultScripts = getScriptFromPage(options.index)
var defaultScriptSrcs = []
defaultScripts.forEach(function (script) {
  var attrs = getAttribute(script)
  defaultScriptSrcs.push(attrs.src || '')
})

var process = function () {
  if (ind >= len) {
    phantom.exit()
    return
  }
  var router = routers[ind]
  if (router.indexOf('?') >= 0) {
    router += '&__SSR=1'
  } else {
    router += '?__SSR=1'
  }
  if (router.indexOf('/') !== 0) {
    router = '/' + router
  }
  var ts0 = +new Date
  log('Start: ['+routers[ind]+']')
  page.open(url + router, function (status) {
    if (status !== 'success') {
      throw new Error('FAIL to load: ' + url)
    }
    var asyncTime = options.asyncTime || 10
    setTimeout(function () {
      var html = page.evaluate(function () {
        var doctype = new window.XMLSerializer().serializeToString(document.doctype)
        var outerHTML = document.documentElement.outerHTML
        return doctype + outerHTML
      })
      var ts1 = +new Date
      if(saveHtml(routers[ind], html)) {
        log('End: ['+routers[ind]+'], cost '+(ts1-ts0)/1000+" seconds.\n")
        ind++
        process()
      } else {
        log('End failed: ['+routers[ind]+'], cost '+(ts1-ts0)/1000+" seconds.\n")
        phantom.exit(1) 
      }
    }, asyncTime)
  })
}

process()
