var pathJoin = require('pathjoin');
var modes = require('js-git/lib/modes');
var sha1 = require('git-sha1');

module.exports = smartCopy;

function smartCopy(servePath, req, callback) {

  var rules = req.rules.map(function (pair) {
    return {
      pattern: new RegExp(pair[0]),
      include: pair[1]
    };
  });

  if (req.paths.local && !shouldCopy(req.paths.local)) return callback();

  var path = req.input[0] === "." ?
    pathJoin(req.paths.rule, "..", req.input, req.paths.local) :
    pathJoin(req.paths.root, req.input, req.paths.local);

  servePath(path, function (err, result) {
    if (!result || !result.hash) return callback(err);
    callback(null, {
      mode: result.mode,
      hash: sha1(result.hash + "-" + req.ruleHash + "-" + req.codeHash),
      root: result.root,
      fetch : modes.isFile(result.mode) ? result.fetch : fetchTree
    });

    function fetchTree(callback) {
      result.fetch(function (err, tree) {
        if (!tree) return callback(err);
        var newTree = {};
        Object.keys(tree).forEach(function (name) {
          var isTree = result.mode === modes.tree;
          var fullPath = pathJoin(path, name);
          if (shouldCopy(fullPath, isTree)) {
            newTree[name] = tree[name];
          }
        });
        callback(null, newTree);
      });
    }
  });

  function shouldCopy(path, start) {
    var should = start;
    for (var i = 0, l = rules.length; i < l; i++) {
      var rule = rules[i];
      if (!rule.pattern.test(path)) continue;
      should = rule.include;
    }
    return should;
  }
}
