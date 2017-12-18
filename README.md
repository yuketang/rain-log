# rain-log
使用方法
-------
```javascript
const rainLogs = require('rain-log');
const logger = new rainLogs({
    name: 'test',
    level: 'debug',
    logType: 'std'
});

logger.debug('This is a debug message');

logger.info('Information!');
logger.info({test: 111, json: 'ok'});

logger.error(new Error('Timeout!'));
```
输出
```shell
{"name":"test","hostname":"bogon","pid":4714,"level":20,"msg":"This is a debug message","time":"2017-12-18T08:03:47.545Z","v":0}
{"name":"test","hostname":"bogon","pid":4714,"level":30,"msg":"Information!","time":"2017-12-18T08:03:47.547Z","v":0}
{"name":"test","hostname":"bogon","pid":4714,"level":30,"test":111,"json":"ok","msg":"","time":"2017-12-18T08:03:47.547Z","v":0}
{"name":"test","hostname":"bogon","pid":4714,"level":50,"err":{"message":"Timeout!","name":"Error","stack":"Error: Timeout!\n    at Object.<anonymous> (/Users/coco/www/rain-log/test.js:14:14)\n    at Module._compile (module.js:635:30)\n    at Object.Module._extensions..js (module.js:646:10)\n    at Module.load (module.js:554:32)\n    at tryModuleLoad (module.js:497:12)\n    at Function.Module._load (module.js:489:3)\n    at Function.Module.runMain (module.js:676:10)\n    at startup (bootstrap_node.js:187:16)\n    at bootstrap_node.js:608:3"},"msg":"Timeout!","time":"2017-12-18T08:03:47.549Z","v":0}
```

中间件
----
```javascript
const rainLogs = require('rain-log');
const logger = new rainLogs({
    name: 'test'
});
app.use(logger.access_log());
```
输出示例
```shell
{"name":"test","hostname":"bogon","pid":4714,"level":30,"req_id":"3c1a7758-3e13-4743-8678-3a48dd6ebabb","receive_time":"2017-12-18T08:03:56.302Z","ip":"::1","url":"/api/?test=1","path":"/api","method":"POST","body":{"op":"test"},"cost":6,"response":{"status":40000,"data":{"op":"test"}},"http_status_code":200,"custom_status_code":40000,"referer":"-","msg":"","time":"2017-12-18T08:03:56.309Z","v":0}
```

参数
----
|字段         | 说明           |
| ------------- |:-------------:|
| name      | 必填，每个logger的名字，最好是项目名 |
| level      | 日志级别，取值：debug info warn error fatal，生产环境默认info，其他环境默认debug      |
| logType | 日志输出类型，取值：file std，生产环境默认file，其他环境默认std。file代表文件，std代表标准输出      |
