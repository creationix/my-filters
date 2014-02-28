"use strict";

var sha1 = require('git-sha1');
var pathJoin = require('pathjoin');
var parallel = require('carallel');

var mime = "text/cache-manifest";

module.exports = appcache;

function appcache(servePath, req, callback) {

  var actions = req.cache.map(function (file) {
    return function (callback) {
      servePath(pathJoin(req.paths.rule, "..", file), callback);
    };
  });

  parallel(actions, function (err, entries) {
    if (err) return callback(err);
    var manifest = "CACHE MANIFEST\n";
    entries.forEach(function(entry, i) {
      if (entry.hash) {
        manifest += req.cache[i] + "#" + entry.hash + "\n";
      }
      else {
        manifest += req.cache[i] + "\n";
      }
    });
    if (req.network) {
      manifest += "\nNETWORK:\n" + req.network.join("\n") + "\n";
    }
    if (req.fallback) {
      manifest += "\nFALLBACK:\n";
      manifest += Object.keys(req.fallback).map(function (key) {
        return key + " " + req.fallback[key];
      }).join("\n") + "\n";
    }
    // TODO: output data from "fallback" and "network" in the rule
    var hash = sha1(manifest);
    callback(null, {hash: hash, mime: mime, fetch:function (callback) {
      callback(null, manifest);
    }});
  });

}
