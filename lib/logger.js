const bunyan = require('bunyan');
const uuid = require('uuid/v4');
const onFinished = require('on-finished');

class Logger {
    constructor(name, logType) {
        this.name = name;
        this.logType = logType;
        this.debugLogger = null;
        this.infoLogger = null;
        this.errorLogger = null;

        this.defaultMidOpts = {
            header:'X-Request-Id',
            ctxProp:'req_id',
            requestProp:'req_id',
            queryProp:'req_id',
            logField:'req_id',

            ignorePath: []
        };
    }

    getDebugLogger() {
        if (this.debugLogger) {
            return this.debugLogger;
        }
        if (this.logType === 0) {
            var stream = [{
                path: `logs/${this.name}-debug.log`,
                level: 'debug'
            }];
        } else {
            var stream = [{
                level: 'debug',
                stream: process.stdout
            }];
        }
        this.debugLogger = bunyan.createLogger({
            name: this.name,
            streams: stream
        });
        return this.debugLogger;
    }

    getInfoLogger() {
        if (this.infoLogger) {
            return this.infoLogger;
        }
        if (this.logType === 0) {
            var stream = [{
                path: `logs/${this.name}-access.log`,
                level: 'info'
            }];
        } else {
            var stream = [{
                level: 'info',
                stream: process.stdout
            }];
        }
        this.infoLogger = bunyan.createLogger({
            name: this.name,
            streams: stream
        });
        return this.infoLogger;
    }

    getErrorLogger() {
        if (this.errorLogger) {
            return this.errorLogger;
        }
        if (this.logType === 0) {
            var stream = [{
                level: 'error',
                path: `logs/${this.name}-error.log`
            }];
        } else {
            var stream = [{
                level: 'error',
                stream: process.stderr
            }];
        }
        this.errorLogger = bunyan.createLogger({
            name: this.name,
            streams: stream,
            serializers: {
                err: (err) => {
                    if (!err || !err.stack) {
                        return err;
                    }
                    return {
                        message: err.message,
                        name: err.name,
                        stack: this.getFullErrorStack(err),
                        code: err.code,
                        status: err.status,
                        data: err.data
                    };
                }
            }
        });
        return this.errorLogger;
    }

    getFullErrorStack(ex) {
        let ret = ex.stack || ex.toString();
        if (ex.cause && typeof (ex.cause) === 'function') {
            let cex = ex.cause();
            if (cex) {
                ret += '\nCaused by: ' + this.getFullErrorStack(cex);
            }
        }
        return (ret);
    }
    middleware(req, res, next, options) {
        req.startTime = Date.now();
        req.req_id = req.query.req_id || uuid();
        res.on('finish', accessLog);
        let fields = {};
        let logger = this.getInfoLogger();
        let {ignore} = options;

        function accessLog() {
            let responseTime = Date.now() - req.startTime,
                ip = (req.headers['x-forwarded-for'] || req.ip || req._remoteAddress ||
                    (req.socket &&
                        (req.socket.remoteAddress ||
                            (req.socket.socket && req.socket.socket.remoteAddress)
                        )
                    )),
                res_body, req_body;

            if (!ip) {
                console.log('ip不存在', {
                    originalUrl: req.originalUrl,
                    headers: req.headers,
                    method: req.method
                });
            } else {
                ip = ip.split(',')[0]
            }

            try {
                let body = JSON.stringify(res.body);
                res_body = body.length > 500 ? body.slice(0, 500) : body;
            } catch (e) {
                res_body = '[unreadable data]';
            }
            try {
                let resp = JSON.stringify(req.body);
                req_body = resp.length > 500 ? resp.slice(0, 500) : resp;
            } catch (e) {
                req_body = '[unreadable data]';
            }
            let statusCode = res.body ? (res.body.hasOwnProperty('status') ? res.body.status : (res.body.hasOwnProperty('errorcode') ? res.body.errorcode : 0)) : 0;

            let data = {
                uid: req.uid ? req.uid.toString() : undefined,
                req_id: req.req_id,
                receive_time: new Date(req.startTime),
                ip: ip,
                url: req.originalUrl,
                path: req.originalUrl.replace(/\?.*/, '').replace(/\/+$/g, ""),
                method: req.method,
                body: req_body,
                cost: responseTime,
                response: res_body,
                http_status_code: res.statusCode,
                custom_status_code: statusCode,
                referer: req.header('referer') || req.header('referrer') || '-'
            }
            if (Object.keys(fields).length > 0) {
                Object.assign(data, fields);
            }

            if(ignore && ignore.length) {
                let reg = new RegExp(ignore.join('|'));
                if(!reg.test(req.path)) logger.info(data);
            }else{
                logger.info(data);
            }
        }

        let errorLogger = this.getErrorLogger(),
            debugLogger = this.getDebugLogger();
        req.log = {
            error: function () {
                let log = errorLogger.child({req_id: req.req_id}, true);
                log.error.apply(log, arguments);
            },
            info: function () {
                let log = logger.child({req_id: req.req_id}, true);
                log.info.apply(log, arguments);
            },
            debug: function () {
                let log = debugLogger.child({req_id: req.req_id}, true);
                log.debug.apply(log, arguments);
            },
            addFields: function (extra) {
                if (Object.prototype.toString.call(extra === '[object Object]')) {
                    Object.assign(fields, extra);
                }
            }
        };
        next();
    }
    middlewareEgg(opts) {

        opts = Object.assign(this.defaultMidOpts, opts);

        let loggerInstance = this.getInfoLogger();

        let {header, queryProp, ctxProp, requestProp, logField} = opts;

        return async (ctx, next) => {
            ctx.request._startTime = process.hrtime();
            ctx.log = loggerInstance;

            const reqId = ctx.request.get(header) || ctx.request.query[queryProp] || uuid.v4();
            ctx[ctxProp] = reqId;
            ctx.request[requestProp] = reqId;

            let req = ctx.request,req_body;

            try {
                req_body = JSON.stringify(req.body).slice(0, 500);
            } catch (e) {
                req_body = '[unreadable data]' + req.body;
            }

            let reqFields = {
                ip: ctx.ip,
                url: ctx.url,     // TODO：打印完整url
                path: ctx.url.replace(/\?.*/, '').replace(/\/+$/g, ""),
                method: ctx.method,
                body: req_body,
                uid: ctx.session ? ctx.session.user_id : undefined,
                referer: req.get('referer') || req.get('referrer') || '-',
                ua: ctx.get('user-agent'),
            };

            ctx.log = ctx.log.child({[logField]: reqId});

            // 如果需要打印请求入口日志
            ctx.log.child(reqFields).info('request entery');


            if (Array.isArray(opts.ignorePath) && opts.ignorePath.includes(ctx.path)) {
                return await next();
            }


            let err;

            const onResponseFinished = () => {
                let res_body;
                try {
                    res_body = JSON.stringify(ctx.body).slice(0, 500);
                } catch (e) {
                    res_body = '[unreadable data]' + ctx.body;
                }
                let resFields = {
                    cost: calcResponseTime(ctx.request._startTime),
                    response: res_body,
                    http_status_code: ctx.status,
                    custom_status_code: ctx.body ? ctx.body.errcode : undefined,
                };

                const level = levelFn.call(ctx, {fn: opts.levelFn, status: ctx.status, custom_status: resFields.custom_status_code,err});

                ctx.log.child(resFields)[level](err,'response end');

                // Remove log object to mitigate accidental leaks
                ctx.log = null;
            };

            return await next().catch((e) => {
                err = e;
            }).then(() => { // Emulate a finally

                // Handle response logging and cleanup when request is finished
                // This ensures that the default error handler is done
                onFinished(ctx.response.res, onResponseFinished.bind(ctx));
            });
        }

    }
}

/**
 * 计算响应时间
 * @param {Array} startedAt 请求时间
 * @return {string} 响应时间字符串
 */
function calcResponseTime(startedAt) {
    const diff = process.hrtime(startedAt);
    // 秒和纳秒换算为毫秒,并保留3位小数
    return (diff[ 0 ] * 1e3 + diff[ 1 ] * 1e-6).toFixed(3);
}

const levelFn = function ({fn,status, custom_status, err}) {
    if(fn) return fn(status);

    if (err || status >= 500 || custom_status) {
        return 'error';
    }
    return 'info';
};


module.exports = Logger;
