let rulesChangedHandler: (() => void | Promise<void>) | null = null;

export function setRulesChangedHandler(handler: (() => void | Promise<void>) | null) {
  rulesChangedHandler = handler;
}

export function notifyRulesChanged() {
  if (rulesChangedHandler) {
    void rulesChangedHandler();
  }
}
