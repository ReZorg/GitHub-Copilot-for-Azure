# OpenCog Cogutil Installation Guide

## System Requirements

| Platform | Compiler | CMake | Boost |
|----------|----------|-------|-------|
| Ubuntu 20.04+ | GCC 9+ | 3.16+ | 1.71+ |
| Ubuntu 22.04+ | GCC 11+ | 3.22+ | 1.74+ |
| macOS 12+ | Clang 13+ | 3.22+ | 1.76+ |

## Ubuntu/Debian Installation

### Install Dependencies

```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    cmake \
    libboost-all-dev \
    cxxtest \
    binutils-dev \
    libiberty-dev
```

### Clone and Build

```bash
git clone https://github.com/opencog/cogutil.git
cd cogutil
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
sudo make install
sudo ldconfig
```

### Verify Installation

```bash
# Check library installed
ldconfig -p | grep opencog

# Check headers
ls /usr/local/include/opencog/util/
```

## macOS Installation

### Install Dependencies

```bash
brew install cmake boost cxxtest
```

### Clone and Build

```bash
git clone https://github.com/opencog/cogutil.git
cd cogutil
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(sysctl -n hw.ncpu)
sudo make install
```

## CMake Options

| Option | Default | Description |
|--------|---------|-------------|
| `CMAKE_BUILD_TYPE` | Release | Build type (Debug, Release, RelWithDebInfo) |
| `CMAKE_INSTALL_PREFIX` | /usr/local | Installation directory |
| `CXXTEST_BIN_DIR` | auto | Path to cxxtest binaries |

## Using in Your Project

### CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.16)
project(my_project)

find_package(cogutil REQUIRED)

add_executable(my_app main.cpp)
target_link_libraries(my_app ${COGUTIL_LIBRARIES})
target_include_directories(my_app PRIVATE ${COGUTIL_INCLUDE_DIR})
```

### pkg-config

```bash
pkg-config --cflags --libs cogutil
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Could NOT find Boost` | Install: `apt-get install libboost-all-dev` |
| `cxxtest not found` | Install: `apt-get install cxxtest` |
| Library not found at runtime | Run: `sudo ldconfig` |
| Permission denied | Use `sudo` for install steps |
