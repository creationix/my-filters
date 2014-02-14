"use strict";

var sha1 = require('git-sha1');
var pathJoin = require('pathjoin');
var parallel = require('carallel');
var binary = require('bodec');

var mime = "text/cache-manifest";

var cache = {};

module.exports = appcache;

function appcache(servePath, req, callback) {
  // If the file is external load and cache it for speed.
  if (req.target) {
    var cached = cache[req.target.hash];
    if (!cached) {
      return req.target.fetch(function (err, input) {
        if (input === undefined) return callback(err);
        input = binary.toUnicode(input);
        cache[req.target.hash] = input.split("\n").filter(Boolean);
        return appcache(servePath, req, callback);
      });
    }
    req.args = req.args.concat(cached);
  }


  var actions = req.args.map(function (file) {
    return function (callback) {
      servePath(pathJoin(req.path, "..", file), null, callback);
    };
  });

  parallel(actions, function (err, entries) {
    if (err) return callback(err);
    var manifest = "CACHE MANIFEST\n";
    entries.forEach(function(entry, i) {
      if (entry) {
        manifest += req.args[i] + "#" + entry.etag + "\n";
      }
      else {
        manifest += req.args[i] + "\n";
      }
    });
    var etag = sha1(manifest);
    callback(null, {etag: etag, mime: mime, fetch:function (callback) {
      callback(null, manifest);
    }});
  });

}
