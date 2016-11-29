var _ = require('lodash');

var BACKENDS = {
    filesystem: require('./github'),
    github: require('./github'),
    s3: require('./s3')
};

module.exports = function(backend) {
    if (_.isString(backend)) return BACKENDS[backend];
    return backend;
};
