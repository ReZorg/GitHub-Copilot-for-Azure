# AtomSpace Installation Guide

Complete installation instructions for OpenCog AtomSpace on various platforms and Azure environments.

## Platform-Specific Installation

### Ubuntu/Debian (Local or Azure VM)

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install build dependencies
sudo apt-get install -y \
  build-essential \
  cmake \
  git \
  libboost-all-dev \
  libboost-dev \
  libboost-filesystem-dev \
  libboost-program-options-dev \
  libboost-regex-dev \
  libboost-thread-dev \
  libboost-system-dev \
  guile-3.0-dev \
  python3-dev \
  cxxtest \
  binutils-dev \
  libiberty-dev

# Install cogutil (required dependency)
git clone https://github.com/opencog/cogutil.git
cd cogutil
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
sudo make install
sudo ldconfig

# Install AtomSpace
cd ../..
git clone https://github.com/opencog/atomspace.git
cd atomspace
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
sudo make install
sudo ldconfig
```

### macOS

```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install cmake boost guile python cxxtest

# Build cogutil
git clone https://github.com/opencog/cogutil.git
cd cogutil && mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(sysctl -n hw.ncpu)
sudo make install

# Build AtomSpace
cd ../..
git clone https://github.com/opencog/atomspace.git
cd atomspace && mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(sysctl -n hw.ncpu)
sudo make install
```

### Windows (WSL2)

Use Windows Subsystem for Linux 2 (WSL2) and follow Ubuntu instructions.

```powershell
# Install WSL2
wsl --install -d Ubuntu-22.04

# Inside WSL2, follow Ubuntu installation steps above
```

## Azure VM Deployment

### Option 1: Azure Portal

1. Create Ubuntu 22.04 LTS VM
2. Choose size: Standard_D4s_v3 (4 vCPUs, 16 GB RAM minimum)
3. Configure NSG to allow SSH (22) and AtomSpace ports (17001-17002)
4. SSH into VM and run Ubuntu installation commands

### Option 2: Azure CLI

```bash
# Create resource group
az group create --name atomspace-rg --location eastus

# Create VM with custom data for installation
az vm create \
  --resource-group atomspace-rg \
  --name atomspace-dev \
  --image Ubuntu2204 \
  --size Standard_D4s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --custom-data cloud-init.yaml

# cloud-init.yaml contents:
cat > cloud-init.yaml << 'EOF'
#cloud-config
package_update: true
package_upgrade: true
packages:
  - build-essential
  - cmake
  - git
  - libboost-all-dev
  - guile-3.0-dev
  - python3-dev
  - cxxtest
runcmd:
  - git clone https://github.com/opencog/cogutil.git /opt/cogutil
  - cd /opt/cogutil && mkdir build && cd build && cmake .. && make -j$(nproc) && make install
  - git clone https://github.com/opencog/atomspace.git /opt/atomspace
  - cd /opt/atomspace && mkdir build && cd build && cmake .. && make -j$(nproc) && make install
  - ldconfig
EOF
```

### Option 3: ARM Template

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "Microsoft.Compute/virtualMachines",
      "apiVersion": "2023-03-01",
      "name": "atomspace-vm",
      "location": "[resourceGroup().location]",
      "properties": {
        "hardwareProfile": {
          "vmSize": "Standard_D4s_v3"
        },
        "osProfile": {
          "computerName": "atomspace",
          "adminUsername": "azureuser",
          "customData": "[base64(variables('cloudInit'))]"
        }
      }
    }
  ]
}
```

## Docker Container Build

### Dockerfile

```dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libboost-all-dev \
    guile-3.0-dev \
    python3-dev \
    cxxtest \
    && rm -rf /var/lib/apt/lists/*

# Build cogutil
WORKDIR /build
RUN git clone https://github.com/opencog/cogutil.git && \
    cd cogutil && mkdir build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc) && make install && ldconfig

# Build AtomSpace
RUN git clone https://github.com/opencog/atomspace.git && \
    cd atomspace && mkdir build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc) && make install && ldconfig

WORKDIR /workspace
CMD ["/bin/bash"]
```

### Build and Push to Azure Container Registry

```bash
# Build locally
docker build -t atomspace:latest .

# Create Azure Container Registry
az acr create \
  --resource-group atomspace-rg \
  --name atomspaceacr \
  --sku Standard

# Build directly in ACR
az acr build \
  --registry atomspaceacr \
  --image atomspace:v1.0.0 \
  --file Dockerfile .
```

## Python Bindings Installation

```bash
# After AtomSpace C++ is installed
cd /path/to/atomspace
pip3 install -e ./opencog/cython
```

## Verification

```bash
# Test C++ installation
echo '#include <opencog/atomspace/AtomSpace.h>
int main() { opencog::AtomSpace as; return 0; }' > test.cpp
g++ -std=c++17 test.cpp -lopencog -o test
./test && echo "Success!"

# Test Python bindings
python3 -c "from opencog.atomspace import AtomSpace; print('Python bindings OK')"

# Test Guile bindings
guile -c "(use-modules (opencog))"
```

## Troubleshooting

### Boost Version Issues

```bash
# If Boost version is too old
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt-get update
sudo apt-get install libboost-all-dev
```

### Guile Not Found

```bash
# Install Guile 3.0
sudo apt-get install guile-3.0 guile-3.0-dev
```

### Azure Managed Identity for Storage Access

```bash
# Install Azure Identity SDK
pip3 install azure-identity azure-storage-blob

# Configure VM with managed identity
az vm identity assign \
  --resource-group atomspace-rg \
  --name atomspace-vm
```

## Performance Tuning for Azure VMs

```bash
# Enable huge pages for better memory performance
echo 'vm.nr_hugepages = 1024' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configure Azure disk caching
az vm update \
  --resource-group atomspace-rg \
  --name atomspace-vm \
  --set storageProfile.osDisk.caching=ReadWrite
```
