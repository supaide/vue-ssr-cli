参考 [prerender-spa-plugin](https://github.com/chrisvfritz/prerender-spa-plugin) 提供服务端页面模版生成的工具

生成的模版文件可以给服务器提供页面模版，php代码参考[spd-ssr-php](https://github.com/supaide/spd-ssr-php)

## 安装
```
npm i spd-ssr-cli -g
```

## Usage
```
Usage: spd-ssr <root-path> <dest-path> <routers.json>

       root-path: 项目编译后的代码目录
       dest-path: 页面模版存放目录；当dest-path为绝对路径时，会自动同步项目的static目录
       routers.json 项目生成的url路径列表；使用spd-page-manage时，该文件是src/pages.js.json

Options:

  -i, --index <index>                     项目入口文件名 (default: index.html)
  -s, --static <static>                   静态资源文件目录名 (default: static)
  -r, --root-id <root-id>                 Dom树根节点Id名 (default: app)
  -l, --lang [php|nodejs|$filepath|none]  页面模版动态数据赋值语法，默认支持php (default: php)
                                          可以通过$filepath指定语法定义文件；如果无动态数据需求，选择none参数
  -t, --async-time <async-time>           代码分割导致的异步加载，需要指定setTimeout时间 (default: 100)
  -h, --help                              output usage information
```

## 模版文件发布
- 将ssr_template目录下的模版文件拷贝值服务器或CDN
- php 服务器代码参考 [spd-ssr-php](https://github.com/supaide/spd-ssr-php)
