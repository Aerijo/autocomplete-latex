const cp = require("child_process");

class IdGenerator {
  constructor() {
    this.id = 0;
  }

  generateId() {
    return this.id++;
  }
}

module.exports = {
  getOrCompute(map, key, computer) {
    let result = map.get(key);
    if (result === undefined) {
      result = computer();
      map.set(key, result);
    }
    return result;
  },

  getScopeChain(object) {
    if (typeof object === "string") {
      return object;
    }

    let scopesArray = object;
    if (object && object.getScopesArray) {
      scopesArray = object.getScopesArray();
    }

    return scopesArray
      .map((scope) => (scope[0] === "." ? scope : `.${scope}`))
      .join(" ");
  },

  IdGenerator,

  spawnChild(script) {
    const child = cp.spawn(script, { shell: true, windowsHide: true });
    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    return child;
  },
};
