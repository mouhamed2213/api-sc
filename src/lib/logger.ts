// Journal léger basé sur console. Même interface que winston (info / warn / error) :
// si tu installes winston plus tard, remplace ce fichier sans toucher au reste du code.
type Context = Record<string, unknown>;

const line = (level: string, message: string, context?: Context) => {
  const details = context
    ? " | " +
      Object.entries(context)
        .map(([k, v]) => `${k}=${JSON.stringify(v) ?? String(v)}`)
        .join(" ")
    : "";
  return `${new Date().toISOString()} ${level} ${message}${details}`;
};

export const logger = {
  info: (message: string, context?: Context) =>
    console.log(line("INFO", message, context)),
  warn: (message: string, context?: Context) =>
    console.warn(line("WARN", message, context)),
  error: (message: string, context?: Context) =>
    console.error(line("ERROR", message, context)),
};
