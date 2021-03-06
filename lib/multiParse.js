var debug = require('debug')('lib:multiParse');
var inspect = require('util').inspect;
var path = require('path');
var fs = require('fs-extra');

var settings = require('../settings');

module.exports = function (req, res, next) {
  debug('Content-Type: ' + req.get('Content-Type'));
  if ( req.is('multipart') ) {
    debug('Its multipart!')
    // Handle file
    req.busboy.on('file', function(fieldname,fileStream,filename,encoding,mimetype) {
      debug('The was a file field');

      if (filename) {
        debug('And it contains a file');

        if (!req.files) req.files = [];
        var fileInfo = {
          "filename": filename,
          "fieldname": fieldname,
          "encoding": encoding,
          "mimetype": mimetype
        };
        req.files.push(fileInfo);
        // Handle the readableStream;
        gitFs(req, fileInfo, fileStream, next);
      } else {
        debug('No file was submitted however');
        fileStream.resume(); // Kill the readableStream for these
      }

      // Debug Info
      debug('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding);

      fileStream.on('end', function() {
        debug('File [' + fieldname + '] Finished');
      });

    });

    // Handle fields
    req.busboy.on('field', function(fieldname,val,fieldnameTruncated,valTruncated) {
      debug('Field [' + fieldname + ']: value: ' + inspect(val));
      req.body[fieldname] = val;
    });

    // Handle the finished event.
    req.busboy.on('finish', function() {
      debug('Busboy: finish - Done parsing form.');
      next();
    })

    // Busboy, Do it!
    req.pipe(req.busboy);

  } else {
    debug('Nope, not multipart')
    next();
  }
}

function gitFs(req, fileInfo, fileStream, cb) {
  var fsDir = path.join(settings.worktree,
                          settings.mediaFolder,
                          req.tokenData.client);
  var srcDir = path.join( settings.mediaFolder,
                          req.tokenData.client);

  debug('Trying to Save ' + fileInfo.filename + ' to Disk');

  var filename = path.basename(fileInfo.filename);
  fileInfo.fsPath = path.join(fsDir, filename);
  fileInfo.workPath = path.join('/',
                                settings.mediaFolder,
                                req.tokenData.client);
  fileInfo.src = path.join('/',srcDir, filename);

  debug('fsPath: ' + fileInfo.fsPath);
  debug('workPath: '+ fileInfo.workPath);
  debug('src:' + fileInfo.src);

  fs.ensureDir(fsDir, function(err) {
    if (err) cb(err);
    var writeStream = fs.createWriteStream(fileInfo.fsPath);
    writeStream.on('error', cb);
    debug('Saving file ' + filename);
    fileStream.pipe(writeStream);
  });
}
