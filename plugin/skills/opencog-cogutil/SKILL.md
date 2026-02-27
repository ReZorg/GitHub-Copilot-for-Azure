---
name: opencog-cogutil
description: >-
  Helps developers work with the OpenCog cogutil C++ utility library. Use this skill when working with cogutil
  threading utilities, logger functionality, configuration management, random number generators, benchmarking
  tools, or unit testing. USE FOR: install cogutil, build OpenCog, configure OpenCog logger, cogutil thread pool,
  cogutil configuration, OpenCog unit tests. DO NOT USE FOR: Azure services, cloud deployment, web applications.
---

# OpenCog Cogutil C++ Utility Library

## Quick Reference

| Property | Value |
|----------|-------|
| Repository | [github.com/opencog/cogutil](https://github.com/opencog/cogutil) |
| Language | C++ |
| Build System | CMake |
| Dependencies | Boost, GCC/Clang |
| Best For | OpenCog AI framework development |

## When to Use This Skill

- Setting up cogutil development environment
- Building and installing cogutil from source
- Configuring and using the cogutil logging system
- Implementing concurrent operations using cogutil's thread pool
- Reading and managing application configuration
- Writing unit tests using cogutil's testing framework
- Integrating cogutil as a foundation for OpenCog development

## Core Components

| Component | Description | Header |
|-----------|-------------|--------|
| Logger | Flexible logging with multiple severity levels | `<opencog/util/Logger.h>` |
| Config | Configuration file parsing and management | `<opencog/util/Config.h>` |
| ThreadPool | Thread pool and concurrent queue | `<opencog/util/ThreadPool.h>` |
| RandGen | Random number generators for AI/ML | `<opencog/util/RandGen.h>` |
| Benchmark | Performance measurement utilities | `<opencog/util/benchmark.h>` |

## Build and Installation

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt-get install build-essential cmake libboost-all-dev cxxtest

# macOS
brew install cmake boost cxxtest
```

### Build Steps

```bash
git clone https://github.com/opencog/cogutil.git
cd cogutil
mkdir build && cd build
cmake ..
make -j$(nproc)
sudo make install
```

> 💡 **Tip:** Use `cmake -DCMAKE_BUILD_TYPE=Release ..` for optimized builds.

## Logger Usage

### Basic Logging

```cpp
#include <opencog/util/Logger.h>

// Get default logger
Logger& logger = Logger::logger();

// Set log level
logger.set_level(Logger::Level::DEBUG);

// Log messages at different levels
logger.debug("Debug message: %s", variable);
logger.info("Information message");
logger.warn("Warning message");
logger.error("Error message");
```

### Log Levels

| Level | Use Case |
|-------|----------|
| NONE | Disable all logging |
| ERROR | Unrecoverable errors |
| WARN | Recoverable issues |
| INFO | Normal operation events |
| DEBUG | Diagnostic information |
| FINE | Detailed trace information |

## Threading Utilities

### Thread Pool

```cpp
#include <opencog/util/ThreadPool.h>

// Create thread pool with N threads
ThreadPool pool(4);

// Submit work
auto future = pool.enqueue([](int x) { return x * 2; }, 42);

// Get result
int result = future.get();
```

### Concurrent Queue

```cpp
#include <opencog/util/concurrent_queue.h>

concurrent_queue<int> queue;

// Producer
queue.push(42);

// Consumer
int value;
queue.pop(value);
```

## Configuration Management

### Loading Configuration

```cpp
#include <opencog/util/Config.h>

Config& config = Config::config();

// Load from file
config.load("opencog.conf");

// Get values
std::string value = config.get("KEY_NAME");
int port = config.get_int("PORT");
bool enabled = config.get_bool("FEATURE_ENABLED");
```

### Configuration File Format

```ini
# OpenCog configuration file
LOG_LEVEL = DEBUG
LOG_TO_STDOUT = true
SERVER_PORT = 17001
```

## Error Handling

| Error | Message | Remediation |
|-------|---------|-------------|
| CMake not found | `cmake: command not found` | Install CMake: `apt-get install cmake` |
| Boost missing | `Could NOT find Boost` | Install Boost: `apt-get install libboost-all-dev` |
| Build failure | `make: *** [all] Error 2` | Check compiler errors, ensure dependencies installed |
| Header not found | `fatal error: opencog/util/Logger.h` | Run `sudo make install` or set `CMAKE_INSTALL_PREFIX` |

## References

For detailed documentation:

- [Installation Guide](references/installation.md) - Complete build and installation instructions
- [Logger Documentation](references/logger.md) - Detailed logger usage and configuration
- [Threading Guide](references/threading.md) - Thread pool and concurrent programming patterns
