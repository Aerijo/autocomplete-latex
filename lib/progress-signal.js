class ProgressToken {
  constructor(msg, busySignal, atomIde, onDidFinish) {
    this.msg = msg;
    this.busySignal = busySignal;

    if (this.busySignal) {
      this.busySignal.add(this.msg);
    }

    this.atomIdeToken = undefined;
    if (atomIde) {
      this.atomIdeToken = atomIde.reportBusy(msg);
    }

    this.onDidFinish = onDidFinish;
  }

  update(msg) {
    if (this.busySignal) {
      this.busySignal.remove(this.msg);
      this.msg = msg;
      this.busySignal.add(this.msg);
    }

    if (this.atomIdeToken) {
      this.atomIdeToken.setTitle(msg);
    }
  }

  setBusySignal(busySignal) {
    this.busySignal = busySignal;
    this.busySignal.add(this.msg);
  }

  setAtomIdeToken(atomIde) {
    this.atomIdeToken = atomIde.reportBusy(this.msg);
  }

  dispose() {
    this.finish();
  }

  finish() {
    if (this.busySignal) {
      this.busySignal.remove(this.msg);
    }

    if (this.atomIdeToken) {
      this.atomIdeToken.dispose();
    }

    this.onDidFinish(this);
  }
}

class ProgressSignal {
  constructor() {
    this.busySignal = undefined;
    this.atomIdeBusySignal = undefined;
    this.tokens = new Set();
    this.onTokenDidFinish = this.onTokenDidFinish.bind(this);
  }

  addBusySignal(busySignal) {
    this.busySignal = busySignal;
    for (const token of this.tokens) {
      token.setBusySignal(busySignal);
    }
  }

  addAtomIdeBusySignal(atomIdeBusySignal) {
    // TODO: Investigate issue where it doesn't stop
    // this.atomIdeBusySignal = atomIdeBusySignal;
    // for (const token of this.tokens) {
    //   token.setAtomIdeToken(atomIdeBusySignal);
    // }
  }

  create(msg) {
    const token = new ProgressToken(
      msg,
      this.busySignal,
      this.atomIdeBusySignal,
      this.onTokenDidFinish
    );
    this.tokens.add(token);
    return token;
  }

  onTokenDidFinish(token) {
    this.tokens.delete(token);
  }

  dispose() {
    if (this.busySignal) {
      this.busySignal.dispose();
    }

    this.busySignal = undefined;
    this.atomIdeBusySignal = undefined;
  }
}

module.exports = {
  ProgressSignal,
};
