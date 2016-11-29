var Q = require('q');
var util = require('util');
var fs = require('fs');

var Backend = require('./backend');

function FilesystemBackend() {
    Backend.apply(this, arguments);

    if (!this.opts.backends.filesystem.path) {
        throw new Error('Filesystem backend requires "backends.filesystem.path" or "NUTS_FILE_PATH" option');
    }
    this.baseDir = this.opts.backends.filesystem.path;
    if(!fs.existsSync(this.baseDir)){
        throw new Error('File path supplied to filesystem backend does not exist! Path: ' + this.baseDir);
    }

    this.releases = this.memoize(this._releases);
}

util.inherits(FilesystemBackend, Backend);

// List all releases for this repository
FilesystemBackend.prototype._releases = function() {
    // TODO
    var d = Q.defer();
    return d.promise;
};

FilesystemBackend.prototype.serveAsset = function(asset, req, res) {
    return Backend.prototype.serveAsset.apply(this, arguments);
};

// Return stream for an asset
FilesystemBackend.prototype.getAssetStream = function(asset) {
    // TODO
    return null;
//    return Q(this.client.getObject(params).createReadStream());
};

module.exports = FilesystemBackend;
