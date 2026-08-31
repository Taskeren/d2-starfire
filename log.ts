import * as log from "@std/log";

export type EnumerableLoggerName = "main" | "bungieApi" | "authentication";

// setup loggers
log.setup({
  handlers: {
    console: new log.ConsoleHandler("DEBUG", {
      formatter: log.formatters.jsonFormatter,
    }),
  },
  loggers: {
    main: {
      level: "DEBUG",
      handlers: ["console"],
    },
    bungieApi: {
      level: "DEBUG",
      handlers: ["console"],
    },
    authentication: {
      level: "DEBUG",
      handlers: ["console"],
    },
  } satisfies { [K in EnumerableLoggerName]: log.LoggerConfig },
});

export default function logger(n: EnumerableLoggerName): log.Logger {
  return log.getLogger(n);
}
