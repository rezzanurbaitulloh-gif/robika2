export interface BridgeEffect {
  verb: string;
  args: unknown[];
}

export interface RunResult {
  status: "success" | "error" | "timeout";
  logs: string[];
  effects: BridgeEffect[];
  error?: string;
  failedTest?: string;
}

export const SANDBOX_SOURCE = String.raw`
self.onmessage = function (e) {
  var data = e.data || {};
  var logs = [];
  var effects = [];
  var maxLogs = data.maxLogs || 60;

  var BRIDGE_VERSION = 1;
  var verbCounts = {};
  var VERB_QUOTA = 50;

  var bridge = new Proxy({}, {
    get: function (target, prop) {
      if (prop === "version") return BRIDGE_VERSION;
      return function () {
        var name = String(prop);
        verbCounts[name] = (verbCounts[name] || 0) + 1;
        if (verbCounts[name] > VERB_QUOTA) {
          throw new Error("Kuota bridge." + name + " terlampaui (maks " + VERB_QUOTA + " panggilan).");
        }
        var args = Array.prototype.slice.call(arguments);
        if (effects.length < 200) effects.push({ verb: name, args: args });
        return undefined;
      };
    }
  });

  var fakeConsole = {
    log: function () {
      if (logs.length < maxLogs) {
        logs.push(Array.prototype.slice.call(arguments).map(String).join(" "));
      }
    }
  };

  try {
    var factory = new Function(
      "bridge",
      "console",
      '"use strict";\n' + data.code + "\n;return typeof " + data.fnName + " !== 'undefined' ? " + data.fnName + " : null;"
    );
    var fn = factory(bridge, fakeConsole);
    if (typeof fn !== "function") {
      throw new Error("Fungsi " + data.fnName + " tidak ditemukan. Pastikan namanya persis seperti instruksi.");
    }
    var ret = fn(bridge);
    var envelope = { status: "success", logs: logs, effects: effects, bridgeVersion: BRIDGE_VERSION };
    var serialized = JSON.stringify({ effects: effects, logs: logs });
    if (serialized.length > 65536) {
      envelope.logs = logs.slice(0, 20).concat(["…(output dipotong: terlalu besar)"]);
      envelope.effects = effects.slice(0, 100);
    }
    if (data.expect && typeof ret !== "undefined") envelope.returned = ret;
    self.postMessage(envelope);
  } catch (err) {
    var msg = err && err.message ? err.message : String(err);
    var line = err && err.stack ? (err.stack.match(/<anonymous>:(\d+)/) || [])[1] : null;
    if (line) msg += " (sekitar baris " + (line - 1) + " kode kamu)";
    self.postMessage({ status: "error", logs: logs, effects: effects, error: msg });
  }
};
`;
