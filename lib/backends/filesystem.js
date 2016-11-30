var _    = require('lodash');
var Q    = require('q');
var util = require('util');
var fs   = require('fs');
var path = require('path');

var Backend = require('./backend');

/**
 * This provides a filesystem backend. It is assumed the directory structure is: <tag>/*
 * Where all releases are split by tag and the files are stored in the tag folder.
 * Example:
 *   ./v1.0.0/app-1.0.0-full.nupkg
 *   ./v1.0.0/app-1.0.0-delta.nupkg
 *   ./v1.0.0/app 1.0.0.exe
 *   ./v1.0.0/RELEASES
 *   ./v1.1.0-alpha/app-1.1.0-alpha-full.nupkg
 *   ./v1.1.0-alpha/app-1.1.0-alpha-delta.nupkg
 *   ./v1.1.0-alpha/app 1.1.0-alpha.exe
 *   ./v1.1.0-alpha/RELEASES
 * @constructor
 */
function FilesystemBackend () {
    Backend.apply(this, arguments);

    if (!this.opts.backends.filesystem.path) {
        throw new Error('Filesystem backend requires "backends.filesystem.path" or "NUTS_FILE_PATH" option');
    }
    this.baseDir = this.opts.backends.filesystem.path;
    if (!fs.existsSync(this.baseDir)) {
        throw new Error('File path supplied to filesystem backend does not exist! Path: ' + this.baseDir);
    }
    this.releases = this.memoize(this._releases);
}

util.inherits(FilesystemBackend, Backend);

// List all releases for this repository
FilesystemBackend.prototype._releases = function () {
    var d = Q.defer();
    listFiles(this.baseDir)
        .then(function (tagFolderDetails) {
            var tags = _.chain(tagFolderDetails)
                .filter(function (fileDetails) {
                    return fileDetails.fileStats.isDirectory();
                })
                .map(function (fileDetails) {
                    return {
                        tag:          fileDetails.fileName,
                        tagPath:      fileDetails.filePath,
                        published_at: fileDetails.fileStats.birthtime
                    };
                })
                .value();

            return tags;
        })
        .then(function (tags) {
            var tagDefers = _.map(tags, function (tag) {
                return listFiles(tag.tagPath).then(function (fileDetails) {
                    var assets = _.chain(fileDetails)
                        .filter(function (fileDetails) { return fileDetails.fileStats.isFile(); })
                        .map(function (fileDetails) {
                            return {
                                id:             fileDetails.filePath,
                                path:           fileDetails.filePath,
                                name:           fileDetails.fileName,
                                size:           fileDetails.fileStats.size,
                                published_at:   fileDetails.fileStats.birthtime,
                                download_count: 0
                            };
                        })
                        .value();
                    return {
                        tag_name:     tag.tag,
                        published_at: tag.published_at,
                        assets:       assets
                    };
                });
            });
            return Q.all(tagDefers);
        })
        .catch(function (err) { d.reject(err); })
        .done(function (releases) {
            d.resolve(releases);
        });
    return d.promise;
}
;

FilesystemBackend.prototype.serveAsset = function (asset, req, res) {
    return Backend.prototype.serveAsset.apply(this, arguments);
};

// Return stream for an asset
FilesystemBackend.prototype.getAssetStream = function (asset) {
    return Q(fs.createReadStream(asset.raw.path));
};

/**
 * Retrieves list of file objects contained in location 'path'.
 *
 * Executes callback function with list of objects with the following format:
 * object.fileName = name of the file (string) e.g. "New Text Document.txt"
 * object.filePath = full path of the file (string) e.g. "C:\ironfly\New Text Document.txt"
 * object.fileStat = stats of the file (object) e.g.
 * {"dev":112888580,"mode":33206,"nlink":1,"uid":0,"gid":0,"rdev":0,"ino":1970324837103904,"size":0,"atime":"2015-03-19T12:03:25.353Z","mtime":"2015-03-19T12:03:25.353Z","ctime":"2015-03-19T12:03:25.353Z","birthtime":"2015-03-19T12:03:25.353Z"}
 *
 * @param {?string} directoryPath
 * @param {!function} callback
 */
function listFiles (directoryPath) {
    var d = Q.defer();
    if (directoryPath) {
        directoryPath = path.normalize(directoryPath);
        fs.readdir(directoryPath, function (err, files) {
            if (err) { d.reject(err); }
            else {
                var fileArray = _.map(files || [], function (file) {
                    return getFileDetails(directoryPath, file);
                });
                Q.all(fileArray)
                    .catch(function (err) { d.reject(err); })
                    .done(function (fileDetails) {
                        d.resolve(fileDetails);
                    });
            }
        });
    }
    else {
        d.resolve([]);
    }
    return d.promise;
}

function getFileDetails (directoryPath, file) {
    var filePath  = path.resolve(directoryPath, file);
    var deferFile = Q.defer();
    fs.stat(filePath, function (err, stats) {
        if (err) { deferFile.reject(err); }
        else {
            deferFile.resolve({
                fileName:  file,
                filePath:  filePath,
                fileStats: stats
            });
        }
    });
    return deferFile.promise;
}

module.exports = FilesystemBackend;
