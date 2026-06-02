import {
  WebPlugin
} from "./chunk-A7QSYADI.js";
import {
  __async
} from "./chunk-WDMUDEB6.js";

// node_modules/capacitor-lan-transfer/dist/esm/web.js
var LanTransferWeb = class extends WebPlugin {
  initialize(_options) {
    return __async(this, null, function* () {
      throw new Error("LanTransfer: Web is not supported (native Android/iOS only).");
    });
  }
  startServer() {
    return __async(this, null, function* () {
      throw new Error("LanTransfer: Web is not supported.");
    });
  }
  stopServer() {
    return __async(this, null, function* () {
      throw new Error("LanTransfer: Web is not supported.");
    });
  }
  getServerInfo() {
    return __async(this, null, function* () {
      return { running: false, ip: "0.0.0.0", port: 0 };
    });
  }
  connect() {
    return __async(this, null, function* () {
      throw new Error("LanTransfer: Web is not supported.");
    });
  }
  disconnect() {
    return __async(this, null, function* () {
      throw new Error("LanTransfer: Web is not supported.");
    });
  }
  getConnectionInfo() {
    return __async(this, null, function* () {
      return { connected: false, role: "client" };
    });
  }
  setReceiveMode(_options) {
    return __async(this, null, function* () {
      throw new Error("LanTransfer: Web is not supported.");
    });
  }
  sendString(_options) {
    return __async(this, null, function* () {
      throw new Error("LanTransfer: Web is not supported.");
    });
  }
  sendBase64(_options) {
    return __async(this, null, function* () {
      throw new Error("LanTransfer: Web is not supported.");
    });
  }
  sendFile(_options) {
    return __async(this, null, function* () {
      throw new Error("LanTransfer: Web is not supported.");
    });
  }
};
export {
  LanTransferWeb
};
//# sourceMappingURL=web-A6MHFXIO.js.map
