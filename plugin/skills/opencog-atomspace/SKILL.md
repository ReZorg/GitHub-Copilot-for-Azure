---
name: opencog-atomspace
description: >-
  Helps developers work with OpenCog AtomSpace hypergraph database for AGI. Use when building/deploying AtomSpace on Azure (VMs, AKS, storage), implementing pattern matching, graph rewriting, Atomese programming, or configuring distributed AtomSpace (DAS). USE FOR: install atomspace, build atomspace, atomspace azure, pattern matching, query engine, DAS setup, atomspace c++ api. DO NOT USE FOR: cogutil (use opencog-cogutil).
---

# OpenCog AtomSpace Hypergraph Database

## Quick Reference

| Property | Value |
|----------|-------|
| Repository | [github.com/opencog/atomspace](https://github.com/opencog/atomspace) |
| Language | C++ (Python/Scheme bindings) |
| Build System | CMake |
| Azure Integration | VMs, Storage, Networking, Containers |
| Distributed | atomspace-cog, DAS |
| Best For | AGI/ML knowledge representation, semantic graphs |

## When to Use This Skill

- Setting up AtomSpace development environment (local or Azure)
- Deploying AtomSpace on Azure infrastructure (VMs, AKS, storage)
- Building and installing AtomSpace C++ libraries from source
- Working with Atoms, Links, Nodes, and Values API
- Implementing pattern matching and graph queries
- Graph rewriting and rule-based inference
- Atomese programming (executable graphs)
- Configuring storage backends (RocksDB, PostgreSQL, Azure Storage)
- Setting up Distributed AtomSpace (DAS) with Azure networking
- Integrating AtomSpace with Azure Cognitive Services
- Migrating AtomSpace data between storage backends

## Core AtomSpace Concepts

| Concept | Description | Azure Analog |
|---------|-------------|--------------|
| Atom | Base graph element | Resource entity |
| Node | Terminal vertex | Leaf node/value |
| Link | Hyperedge connecting atoms | Relationship/reference |
| Value | Mutable vector data | Blob/metadata |
| AtomSpace | Graph database instance | Database/storage account |
| Pattern | Query/search graph | Query template |

## Azure Deployment Patterns

### VM-Based Deployment

```bash
# Ubuntu VM setup on Azure
az vm create \
  --resource-group atomspace-rg \
  --name atomspace-vm \
  --image Ubuntu2204 \
  --size Standard_D4s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys

# SSH and install dependencies
ssh azureuser@<vm-ip>
sudo apt-get update
sudo apt-get install -y build-essential cmake libboost-all-dev \
  guile-3.0-dev python3-dev cxxtest libpq-dev
```

### Container Deployment (AKS)

```bash
# Build AtomSpace container
docker build -t atomspace:latest .

# Push to Azure Container Registry
az acr create --resource-group atomspace-rg --name atomspaceacr --sku Basic
az acr build --registry atomspaceacr --image atomspace:v1 .

# Deploy to AKS
az aks create --resource-group atomspace-rg --name atomspace-cluster
az aks get-credentials --resource-group atomspace-rg --name atomspace-cluster
kubectl apply -f atomspace-deployment.yaml
```

### Storage Backend Integration

```bash
# Azure Blob Storage for persistence
export AZURE_STORAGE_CONNECTION_STRING="<connection-string>"

# Configure AtomSpace to use Azure storage backend
# See references/azure-storage-backend.md for implementation
```

## Build and Installation

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt-get install build-essential cmake libboost-all-dev \
  guile-3.0-dev python3-dev cxxtest

# macOS
brew install cmake boost guile python cxxtest
```

### Build Steps

```bash
git clone https://github.com/opencog/cogutil.git
cd cogutil && mkdir build && cd build
cmake .. && make -j$(nproc) && sudo make install

cd ../..
git clone https://github.com/opencog/atomspace.git
cd atomspace && mkdir build && cd build
cmake ..
make -j$(nproc)
sudo make install
sudo ldconfig
```

> 💡 **Tip:** Use `cmake -DCMAKE_BUILD_TYPE=Release ..` for production builds.

## C++ API Usage

### Creating Atoms

```cpp
#include <opencog/atomspace/AtomSpace.h>
#include <opencog/atoms/base/Node.h>
#include <opencog/atoms/base/Link.h>

using namespace opencog;

// Create AtomSpace
AtomSpace atomspace;

// Create nodes
Handle person = atomspace.add_node(CONCEPT_NODE, "Person");
Handle alice = atomspace.add_node(CONCEPT_NODE, "Alice");

// Create link (relationship)
Handle alice_is_person = atomspace.add_link(INHERITANCE_LINK, alice, person);

// With TruthValue (confidence, strength)
TruthValuePtr tv = SimpleTruthValue::createTV(0.9, 0.8);
alice_is_person->setTruthValue(tv);
```

### Pattern Matching

```cpp
#include <opencog/query/BindLinkAPI.h>

// Create pattern: Find all X where (Inheritance X Person)
Handle pattern = atomspace.add_link(BIND_LINK,
    atomspace.add_link(VARIABLE_LIST,
        atomspace.add_node(VARIABLE_NODE, "$X")),
    atomspace.add_link(INHERITANCE_LINK,
        atomspace.add_node(VARIABLE_NODE, "$X"),
        atomspace.add_node(CONCEPT_NODE, "Person")),
    atomspace.add_node(VARIABLE_NODE, "$X"));

// Execute pattern matching
Handle results = bindlink(&atomspace, pattern);
```

### Atomese (Scheme)

```scheme
; Load AtomSpace
(use-modules (opencog))
(use-modules (opencog exec))

; Create atoms
(Concept "Alice")
(Concept "Person")
(Inheritance (Concept "Alice") (Concept "Person"))

; Pattern matching query
(Bind
  (VariableList (Variable "$X"))
  (Inheritance (Variable "$X") (Concept "Person"))
  (Variable "$X"))
```

## Distributed AtomSpace (DAS) with Azure

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Client Node    │────▶│  CogServer      │────▶│  Storage Layer  │
│  (Azure VM)     │     │  (Azure VM)     │     │  (Azure Storage)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │              ┌────────┴────────┐             │
         └──────────────│  Azure VNet     │─────────────┘
                        │  Private Link   │
                        └─────────────────┘
```

### CogServer Setup

```bash
# Install cogserver
git clone https://github.com/opencog/cogserver.git
cd cogserver && mkdir build && cd build
cmake .. && make -j$(nproc) && sudo make install

# Configure with Azure networking
cat > cogserver.conf << EOF
SERVER_PORT = 17001
LOG_LEVEL = INFO
MODULES = libatomspace.so
# Bind to Azure private IP
SERVER_IP = 10.0.1.4
EOF

# Start server
cogserver -c cogserver.conf
```

### Client Connection

```cpp
#include <opencog/network/NetworkClient.h>

NetworkClient client;
client.connect("10.0.1.4", 17001);

// Now operations are distributed
Handle h = client.addNode(CONCEPT_NODE, "RemoteNode");
```

## Storage Backends

| Backend | Use Case | Azure Integration |
|---------|----------|-------------------|
| In-RAM | Development, testing | Direct VM memory |
| RocksDB | Single-node persistence | Azure Managed Disks |
| PostgreSQL | Multi-node, ACID | Azure PostgreSQL Flexible Server |
| atomspace-cog | Distributed networking | Azure VNet, Private Link |
| atomspace-rocks | File-based distributed | Azure Blob Storage, Data Lake |

### PostgreSQL Backend

```bash
# Azure PostgreSQL setup
az postgres flexible-server create \
  --resource-group atomspace-rg \
  --name atomspace-db \
  --admin-user atomspace \
  --admin-password <secure-password> \
  --sku-name Standard_D2s_v3

# Install PostgreSQL backend
git clone https://github.com/opencog/atomspace-storage.git
cd atomspace-storage && mkdir build && cd build
cmake .. && make -j$(nproc) && sudo make install
```

```cpp
#include <opencog/persist/sql/SQLAtomStorage.h>

// Connect to Azure PostgreSQL
std::string db_uri = "postgres://atomspace:<password>@atomspace-db.postgres.database.azure.com:5432/atomspace";
SQLAtomStorage* storage = new SQLAtomStorage(db_uri);
storage->open();

// Persist atomspace
atomspace.set_storage(storage);
atomspace.store_atomspace();  // Write all atoms to DB
atomspace.load_atomspace();   // Read from DB
```

## Python API

```python
from opencog.atomspace import AtomSpace, types, TruthValue
from opencog.utilities import initialize_opencog
from opencog.bindlink import execute_atom

# Create atomspace
atomspace = AtomSpace()

# Add atoms
person = atomspace.add_node(types.ConceptNode, "Person")
alice = atomspace.add_node(types.ConceptNode, "Alice")
inheritance = atomspace.add_link(types.InheritanceLink, [alice, person])

# Set truth value
inheritance.tv = TruthValue(0.9, 0.8)

# Pattern matching
pattern = atomspace.add_link(types.BindLink, [...])
results = execute_atom(atomspace, pattern)
```

## Error Handling

| Error | Message | Remediation |
|-------|---------|-------------|
| CMake not found | `cmake: command not found` | Install: `apt-get install cmake` or `brew install cmake` |
| Boost missing | `Could NOT find Boost` | Install: `apt-get install libboost-all-dev` |
| cogutil not found | `Could NOT find CogUtil` | Build and install cogutil first |
| Guile missing | `Could NOT find Guile` | Install: `apt-get install guile-3.0-dev` |
| Storage connection failed | `Unable to connect to database` | Check Azure PostgreSQL firewall rules and connection string |
| Network timeout | `CogServer connection timeout` | Verify Azure VNet/NSG rules allow port 17001 |
| Azure auth failed | `Azure authentication error` | Run `az login` or check managed identity configuration |

## Azure-Specific Considerations

### Security

- Use Azure Key Vault for connection strings and credentials
- Configure NSG rules to restrict AtomSpace ports (17001, 17002)
- Enable Azure Private Link for database connections
- Use managed identities for Azure service authentication

### Scaling

- Use Azure VM Scale Sets for distributed AtomSpace clusters
- Azure Load Balancer for CogServer request distribution
- Azure Redis Cache for frequently accessed pattern results
- Azure Monitor for AtomSpace performance metrics

### Cost Optimization

- Use Azure Spot VMs for batch AtomSpace processing
- Archive cold AtomSpace data to Azure Archive Storage
- Use Azure Reserved Instances for production deployments
- Enable auto-shutdown for development AtomSpace VMs

## References

For detailed documentation:

- [Installation Guide](references/installation.md) - Complete build instructions for all platforms
- [Pattern Engine Guide](references/pattern-engine.md) - Advanced pattern matching and queries
- [Atomese Programming](references/atomese.md) - Executable graph programming
- [Azure Storage Backend](references/azure-storage-backend.md) - Azure Blob/Data Lake integration
- [DAS Configuration](references/das-configuration.md) - Distributed AtomSpace setup with Azure
- [Migration Guide](references/migration.md) - Migrating between storage backends
