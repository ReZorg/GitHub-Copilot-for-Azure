# OpenCog Cogutil Threading Utilities

## Overview

Cogutil provides threading utilities for concurrent programming in OpenCog applications, including a thread pool and concurrent data structures.

## Thread Pool

### Basic Usage

```cpp
#include <opencog/util/ThreadPool.h>

using namespace opencog;

// Create pool with 4 worker threads
ThreadPool pool(4);

// Submit task returning a value
std::future<int> future = pool.enqueue([](int x) {
    return x * 2;
}, 42);

// Get result (blocks until complete)
int result = future.get();  // result = 84
```

### Submitting Multiple Tasks

```cpp
#include <opencog/util/ThreadPool.h>
#include <vector>
#include <future>

ThreadPool pool(std::thread::hardware_concurrency());

std::vector<std::future<int>> futures;

// Submit batch of tasks
for (int i = 0; i < 100; ++i) {
    futures.push_back(pool.enqueue([i]() {
        return compute(i);
    }));
}

// Collect results
std::vector<int> results;
for (auto& f : futures) {
    results.push_back(f.get());
}
```

### Pool Sizing

| Workload Type | Recommended Size |
|---------------|------------------|
| CPU-bound | `std::thread::hardware_concurrency()` |
| I/O-bound | 2x to 4x hardware concurrency |
| Mixed | Profile to determine optimal |

```cpp
// Get hardware thread count
unsigned int threads = std::thread::hardware_concurrency();
ThreadPool pool(threads);
```

## Concurrent Queue

### Basic Operations

```cpp
#include <opencog/util/concurrent_queue.h>

concurrent_queue<std::string> queue;

// Producer thread
queue.push("message 1");
queue.push("message 2");

// Consumer thread
std::string msg;
while (queue.pop(msg)) {
    process(msg);
}
```

### Non-blocking Operations

```cpp
concurrent_queue<int> queue;

// Try to pop without blocking
int value;
if (queue.try_pop(value)) {
    // Got value
} else {
    // Queue was empty
}
```

### Signaling Completion

```cpp
concurrent_queue<Task> task_queue;

// Producer signals no more items
task_queue.cancel();

// Consumer detects cancellation
Task task;
while (task_queue.pop(task)) {
    // Process task
}
// Loop exits when cancelled and empty
```

## Synchronization Primitives

### Mutex Wrapper

```cpp
#include <opencog/util/concurrent_queue.h>

// Use standard C++ mutexes with cogutil patterns
std::mutex mtx;
std::lock_guard<std::mutex> lock(mtx);
// ... critical section ...
```

## Common Patterns

### Producer-Consumer

```cpp
concurrent_queue<Work> queue;

void producer() {
    for (auto& item : generate_work()) {
        queue.push(item);
    }
    queue.cancel();  // Signal completion
}

void consumer() {
    Work item;
    while (queue.pop(item)) {
        process(item);
    }
}
```

### Parallel Map

```cpp
template<typename T, typename F>
std::vector<T> parallel_map(const std::vector<T>& input, F func) {
    ThreadPool pool(std::thread::hardware_concurrency());
    std::vector<std::future<T>> futures;
    
    for (const auto& item : input) {
        futures.push_back(pool.enqueue(func, item));
    }
    
    std::vector<T> results;
    for (auto& f : futures) {
        results.push_back(f.get());
    }
    return results;
}
```

## Best Practices

1. **Pool lifetime**: Create pool once, reuse for application lifetime
2. **Avoid blocking in tasks**: Don't hold locks while in pool task
3. **Handle exceptions**: Exceptions propagate through `future.get()`
4. **Size appropriately**: Over-subscription degrades performance
5. **Prefer futures**: Use `std::future` for result retrieval over shared state
