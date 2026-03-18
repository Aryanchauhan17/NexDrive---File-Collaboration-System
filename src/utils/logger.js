import winston from "winston";

//define log format
const logFormat = winston.format.combine(
    //add timestamps to evry log
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

    //formatting the log message
    winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`
    })
)

//create the logger
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,

    //transports -> where to send the logs
    transports: [
    // 1. Show logs in terminal (console)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // adds colors in terminal
        logFormat
      )
    }),

    // 2. Save ALL logs to logs/combined.log file
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),

    // 3. Save only ERROR logs to logs/error.log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    })
]
})

export default logger