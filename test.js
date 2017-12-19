const rainLogs = require('./index');

const logger = new rainLogs({
	name: 'test',
	level: 'debug',
	//logType: 'std'
});

logger.debug('This is a debug message');

logger.info('Information!');
logger.info({test: 111, json: 'ok'});

logger.error(new Error('Timeout!'), 'hehe');

//---------------------------------------------------------

const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(logger.access_log());

app.post('*', function (req, res, next) {
	res.body = {status: 40000, data: req.body};
	res.json({status: 40000, data: req.body});
});

app.listen(8888);
