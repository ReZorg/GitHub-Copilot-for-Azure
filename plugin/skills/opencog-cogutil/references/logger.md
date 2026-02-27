# OpenCog Cogutil Logger

## Overview

The cogutil Logger provides thread-safe logging with configurable output targets and severity levels.

## Basic Usage

```cpp
#include <opencog/util/Logger.h>

using namespace opencog;

int main() {
    // Get default logger instance
    Logger& log = Logger::logger();
    
    // Configure logging
    log.set_level(Logger::DEBUG);
    log.set_print_to_stdout_flag(true);
    
    // Log messages
    log.info("Application started");
    log.debug("Processing item %d", item_id);
    log.error("Failed to connect: %s", error_msg.c_str());
    
    return 0;
}
```

## Log Levels

| Level | Value | Use Case |
|-------|-------|----------|
| `NONE` | 0 | Disable all logging |
| `ERROR` | 1 | Unrecoverable errors requiring attention |
| `WARN` | 2 | Recoverable issues, degraded operation |
| `INFO` | 3 | Normal operation milestones |
| `DEBUG` | 4 | Diagnostic information for debugging |
| `FINE` | 5 | Detailed trace-level information |

## Configuration

### Programmatic Configuration

```cpp
Logger& log = Logger::logger();

// Set minimum log level
log.set_level(Logger::DEBUG);

// Output configuration
log.set_print_to_stdout_flag(true);
log.set_filename("/var/log/opencog/app.log");

// Formatting options
log.set_timestamp_flag(true);
log.set_level_flag(true);
log.set_backtrace_flag(false);
```

### Configuration File

```ini
# opencog.conf
LOG_LEVEL = DEBUG
LOG_TO_STDOUT = true
LOG_FILE = /var/log/opencog/app.log
LOG_TIMESTAMP = true
```

```cpp
// Load configuration
Config& cfg = Config::config();
cfg.load("opencog.conf");

Logger& log = Logger::logger();
log.set_level(cfg.get("LOG_LEVEL"));
```

## Thread Safety

The logger is thread-safe. Multiple threads can log concurrently:

```cpp
void worker_thread(int id) {
    Logger& log = Logger::logger();
    log.info("Worker %d started", id);
    // ... do work ...
    log.info("Worker %d finished", id);
}
```

## Custom Loggers

Create separate loggers for different components:

```cpp
// Create component-specific logger
Logger component_log("component.log");
component_log.set_level(Logger::FINE);

// Use throughout component
component_log.debug("Component-specific message");
```

## Best Practices

1. **Use appropriate levels**: Reserve ERROR for actual errors
2. **Include context**: Log relevant IDs, states, and values
3. **Avoid logging sensitive data**: No passwords or tokens
4. **Use FINE sparingly**: High-frequency logging impacts performance
5. **Rotate logs**: Configure log rotation in production
