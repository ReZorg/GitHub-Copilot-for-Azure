# Distributed AtomSpace (DAS) Configuration

Guide for setting up and configuring Distributed AtomSpace using Azure networking infrastructure.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Azure Virtual Network                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ Client Node 1 │  │ Client Node 2 │  │ Client Node N │   │
│  │  (AtomSpace)  │  │  (AtomSpace)  │  │  (AtomSpace)  │   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │
│          │                   │                   │            │
│          └─────────────┬─────┴───────────────────┘            │
│                        │                                      │
│              ┌─────────▼─────────┐                           │
│              │   CogServer Hub   │                           │
│              │  (Central Router) │                           │
│              └─────────┬─────────┘                           │
│                        │                                      │
│          ┌─────────────┼─────────────┐                       │
│          │             │             │                        │
│  ┌───────▼──────┐  ┌──▼───────┐  ┌─▼──────────────┐        │
│  │ PostgreSQL   │  │ RocksDB  │  │ Blob Storage   │        │
│  │ (Azure PaaS) │  │ (VM Disk)│  │ (Azure Storage)│        │
│  └──────────────┘  └──────────┘  └────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. CogServer (Central Hub)

CogServer provides network access to an AtomSpace instance.

#### Installation

```bash
# Install CogServer
git clone https://github.com/opencog/cogserver.git
cd cogserver
mkdir build && cd build
cmake ..
make -j$(nproc)
sudo make install
```

#### Configuration

```bash
# Create cogserver.conf
cat > cogserver.conf << EOF
# Server Configuration
SERVER_PORT = 17001
LOG_LEVEL = INFO
LOG_TO_STDOUT = true

# Bind to private IP in Azure VNet
SERVER_IP = 0.0.0.0

# AtomSpace modules
MODULES = libatomspace.so

# Storage backend (optional)
STORAGE_BACKEND = postgres
STORAGE_URI = postgres://atomspace:password@atomspace-db.postgres.database.azure.com:5432/atomspace

# Performance tuning
MAX_THREADS = 16
ATOMSPACE_CACHE_SIZE = 10000000
EOF

# Start CogServer
cogserver -c cogserver.conf
```

#### Systemd Service

```bash
# Create systemd service
sudo cat > /etc/systemd/system/cogserver.service << EOF
[Unit]
Description=OpenCog CogServer
After=network.target

[Service]
Type=simple
User=atomspace
WorkingDirectory=/opt/atomspace
ExecStart=/usr/local/bin/cogserver -c /opt/atomspace/cogserver.conf
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable cogserver
sudo systemctl start cogserver
```

### 2. Azure Networking Setup

#### Virtual Network Configuration

```bash
# Create VNet
az network vnet create \
  --resource-group atomspace-rg \
  --name atomspace-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name servers \
  --subnet-prefix 10.0.1.0/24

# Create subnet for clients
az network vnet subnet create \
  --resource-group atomspace-rg \
  --vnet-name atomspace-vnet \
  --name clients \
  --address-prefix 10.0.2.0/24

# Create subnet for databases
az network vnet subnet create \
  --resource-group atomspace-rg \
  --vnet-name atomspace-vnet \
  --name databases \
  --address-prefix 10.0.3.0/24
```

#### Network Security Groups

```bash
# Create NSG for CogServer
az network nsg create \
  --resource-group atomspace-rg \
  --name cogserver-nsg

# Allow CogServer port from client subnet
az network nsg rule create \
  --resource-group atomspace-rg \
  --nsg-name cogserver-nsg \
  --name AllowCogServer \
  --priority 100 \
  --source-address-prefixes 10.0.2.0/24 \
  --destination-port-ranges 17001 17002 \
  --protocol Tcp \
  --access Allow

# Allow SSH for management
az network nsg rule create \
  --resource-group atomspace-rg \
  --nsg-name cogserver-nsg \
  --name AllowSSH \
  --priority 200 \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Allow
```

#### Private Link for Database

```bash
# Create private endpoint for PostgreSQL
az network private-endpoint create \
  --resource-group atomspace-rg \
  --name atomspace-db-endpoint \
  --vnet-name atomspace-vnet \
  --subnet databases \
  --private-connection-resource-id $(az postgres flexible-server show \
    --resource-group atomspace-rg \
    --name atomspace-db \
    --query id -o tsv) \
  --group-id postgresqlServer \
  --connection-name atomspace-db-connection
```

### 3. Client Configuration

#### C++ Client

```cpp
#include <opencog/atomspace/AtomSpace.h>
#include <opencog/persist/cog-simple/SimpleStorage.h>

using namespace opencog;

// Connect to remote CogServer
std::string cogserver_url = "cog://10.0.1.4:17001";
StorageNodePtr store = createNode(COG_SIMPLE_STORAGE_NODE, cogserver_url);
store->open();

// Create local AtomSpace with remote backing
AtomSpace atomspace;
atomspace.set_storage(store);

// Operations are transparently synchronized
Handle h = atomspace.add_node(CONCEPT_NODE, "RemoteAtom");
atomspace.store_atom(h);  // Persists to CogServer

// Load from remote
atomspace.fetch_all_atoms();
```

#### Python Client

```python
from opencog.atomspace import AtomSpace, types
from opencog.persist.cog_simple import SimpleStorage

# Connect to CogServer
atomspace = AtomSpace()
storage = SimpleStorage("cog://10.0.1.4:17001")
storage.open()

# Link storage to atomspace
atomspace.set_storage(storage)

# Create and persist atoms
concept = atomspace.add_node(types.ConceptNode, "DistributedConcept")
atomspace.store_atom(concept)

# Fetch from remote
atomspace.fetch_all_atoms()
```

### 4. Load Balancing (Multiple CogServers)

#### Azure Load Balancer Setup

```bash
# Create load balancer
az network lb create \
  --resource-group atomspace-rg \
  --name cogserver-lb \
  --sku Standard \
  --vnet-name atomspace-vnet \
  --subnet servers \
  --frontend-ip-name lb-frontend \
  --backend-pool-name cogserver-pool

# Add health probe
az network lb probe create \
  --resource-group atomspace-rg \
  --lb-name cogserver-lb \
  --name cogserver-health \
  --protocol tcp \
  --port 17001

# Add load balancing rule
az network lb rule create \
  --resource-group atomspace-rg \
  --lb-name cogserver-lb \
  --name CogServerRule \
  --protocol Tcp \
  --frontend-port 17001 \
  --backend-port 17001 \
  --frontend-ip-name lb-frontend \
  --backend-pool-name cogserver-pool \
  --probe-name cogserver-health
```

### 5. Synchronization Strategies

#### Option A: Shared Database Backend

All CogServers connect to same Azure PostgreSQL:

```bash
# Each CogServer has same STORAGE_URI
STORAGE_URI=postgres://atomspace:password@atomspace-db.postgres.database.azure.com:5432/atomspace
```

#### Option B: Event-Driven Sync with Azure Service Bus

```python
from azure.servicebus import ServiceBusClient, ServiceBusMessage

# Publisher (on atom changes)
def publish_atom_change(atom_id, operation):
    servicebus_client = ServiceBusClient.from_connection_string(conn_str)
    with servicebus_client:
        sender = servicebus_client.get_queue_sender(queue_name="atomspace-sync")
        message = ServiceBusMessage(json.dumps({
            "atom_id": atom_id,
            "operation": operation,
            "timestamp": time.time()
        }))
        sender.send_messages(message)

# Subscriber (on other nodes)
def subscribe_atom_changes():
    servicebus_client = ServiceBusClient.from_connection_string(conn_str)
    with servicebus_client:
        receiver = servicebus_client.get_queue_receiver(queue_name="atomspace-sync")
        for msg in receiver:
            atom_change = json.loads(str(msg))
            apply_atom_change(atom_change)
            receiver.complete_message(msg)
```

#### Option C: Eventual Consistency with Azure Storage

```python
from azure.storage.blob import BlobServiceClient

# Periodic snapshot to blob storage
def snapshot_atomspace():
    blob_service = BlobServiceClient.from_connection_string(storage_conn_str)
    container = blob_service.get_container_client("atomspace-snapshots")
    
    # Export atomspace
    atomspace.export_to_json("snapshot.json")
    
    # Upload to blob
    blob_client = container.get_blob_client(f"snapshot-{timestamp}.json")
    with open("snapshot.json", "rb") as data:
        blob_client.upload_blob(data, overwrite=True)

# Load from latest snapshot
def load_latest_snapshot():
    blob_service = BlobServiceClient.from_connection_string(storage_conn_str)
    container = blob_service.get_container_client("atomspace-snapshots")
    
    # Find latest blob
    blobs = container.list_blobs()
    latest = max(blobs, key=lambda b: b.last_modified)
    
    # Download and import
    blob_client = container.get_blob_client(latest.name)
    with open("snapshot.json", "wb") as f:
        f.write(blob_client.download_blob().readall())
    atomspace.import_from_json("snapshot.json")
```

## Monitoring and Diagnostics

### Azure Monitor Integration

```bash
# Install Azure Monitor agent on VMs
az vm extension set \
  --resource-group atomspace-rg \
  --vm-name cogserver-vm \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor

# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group atomspace-rg \
  --workspace-name atomspace-logs
```

### Custom Metrics

```python
from opencog.logger import log
from azure.monitor.opentelemetry import configure_azure_monitor

# Configure OpenTelemetry
configure_azure_monitor(
    connection_string="InstrumentationKey=..."
)

# Log AtomSpace metrics
def log_atomspace_metrics(atomspace):
    metrics = {
        "atom_count": atomspace.get_size(),
        "node_count": len(atomspace.get_atoms_by_type(types.Node)),
        "link_count": len(atomspace.get_atoms_by_type(types.Link))
    }
    
    for key, value in metrics.items():
        log.info(f"{key}: {value}")
```

## Scaling Considerations

### Horizontal Scaling (Add More CogServers)

1. Deploy new VMs in the same VNet
2. Install CogServer with same config
3. Add to load balancer backend pool
4. Point to same database backend

### Vertical Scaling (Bigger VMs)

```bash
# Resize VM for more memory/CPU
az vm deallocate --resource-group atomspace-rg --name cogserver-vm
az vm resize \
  --resource-group atomspace-rg \
  --name cogserver-vm \
  --size Standard_D16s_v3
az vm start --resource-group atomspace-rg --name cogserver-vm
```

## Security Best Practices

1. **Use Azure Key Vault** for connection strings
2. **Enable Private Link** for all database connections
3. **Use NSG rules** to restrict network access
4. **Enable TLS** on CogServer connections
5. **Use Managed Identities** instead of passwords
6. **Enable Azure DDoS Protection** on VNet

## Troubleshooting

### Connection Timeouts

```bash
# Check NSG rules
az network nsg rule list \
  --resource-group atomspace-rg \
  --nsg-name cogserver-nsg \
  --output table

# Test connectivity
telnet 10.0.1.4 17001
```

### Synchronization Lag

```python
# Monitor replication delay
def check_sync_lag():
    local_count = local_atomspace.get_size()
    remote_count = query_remote_atomspace_size()
    lag = abs(local_count - remote_count)
    print(f"Sync lag: {lag} atoms")
```

### High Memory Usage

```bash
# Monitor memory on CogServer VM
az vm run-command invoke \
  --resource-group atomspace-rg \
  --name cogserver-vm \
  --command-id RunShellScript \
  --scripts "free -h; ps aux | grep cogserver"
```
