# Azure Storage Backend for AtomSpace

Integration guide for using Azure Blob Storage and Azure Data Lake Storage Gen2 with OpenCog AtomSpace.

## Overview

| Storage Type | Use Case | Performance | Cost |
|--------------|----------|-------------|------|
| Azure Blob Storage | Cold/archive data, backups | Medium | Low |
| Azure Data Lake Gen2 | Analytics, hierarchical data | High | Medium |
| Azure Managed Disks | RocksDB backend, hot data | Very High | High |
| Azure PostgreSQL | Multi-node, ACID compliance | High | Medium-High |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AtomSpace Application                   │
├─────────────────────────────────────────────────────────────┤
│              AtomSpace Storage Abstraction Layer            │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   In-Memory  │   RocksDB    │  PostgreSQL  │ Azure Adapter │
│   (Default)  │  (Local SSD) │  (Azure PaaS)│  (Custom)     │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                        Azure Services                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Blob Storage│  │ Data Lake   │  │ PostgreSQL Flexible │ │
│  │ (Hot/Cool/  │  │ Gen2        │  │ Server              │ │
│  │  Archive)   │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Azure Blob Storage Integration

### Setup Storage Account

```bash
# Create storage account
az storage account create \
  --name atomspacestorage \
  --resource-group atomspace-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create container for AtomSpace data
az storage container create \
  --name atomspace-data \
  --account-name atomspacestorage

# Get connection string
az storage account show-connection-string \
  --name atomspacestorage \
  --resource-group atomspace-rg \
  --output tsv
```

### Python Integration

```python
from azure.storage.blob import BlobServiceClient
from opencog.atomspace import AtomSpace, types
import json

class AzureBlobAtomSpaceStorage:
    """Azure Blob Storage adapter for AtomSpace persistence."""
    
    def __init__(self, connection_string: str, container_name: str):
        self.blob_service = BlobServiceClient.from_connection_string(connection_string)
        self.container = self.blob_service.get_container_client(container_name)
        
    def export_atomspace(self, atomspace: AtomSpace, blob_name: str):
        """Export AtomSpace to Azure Blob Storage."""
        # Serialize atoms to JSON
        atoms_data = []
        for atom in atomspace.get_atoms_by_type(types.Atom):
            atoms_data.append({
                "type": atom.type_name,
                "name": atom.name if hasattr(atom, "name") else None,
                "outgoing": [str(o) for o in atom.out] if hasattr(atom, "out") else []
            })
        
        # Upload to blob
        blob_client = self.container.get_blob_client(blob_name)
        blob_client.upload_blob(
            json.dumps(atoms_data, indent=2),
            overwrite=True
        )
        print(f"Exported {len(atoms_data)} atoms to {blob_name}")
        
    def import_atomspace(self, atomspace: AtomSpace, blob_name: str):
        """Import AtomSpace from Azure Blob Storage."""
        blob_client = self.container.get_blob_client(blob_name)
        data = blob_client.download_blob().readall()
        atoms_data = json.loads(data)
        
        # Reconstruct atoms
        for atom_data in atoms_data:
            atom_type = getattr(types, atom_data["type"])
            if atom_data["name"]:
                atomspace.add_node(atom_type, atom_data["name"])
        
        print(f"Imported {len(atoms_data)} atoms from {blob_name}")

# Usage
storage = AzureBlobAtomSpaceStorage(
    connection_string="<your-connection-string>",
    container_name="atomspace-data"
)

atomspace = AtomSpace()
# Add atoms...
storage.export_atomspace(atomspace, "snapshot-2024-01-01.json")
```

### Managed Identity Authentication

```python
from azure.identity import ManagedIdentityCredential
from azure.storage.blob import BlobServiceClient

# Use managed identity (recommended for production)
credential = ManagedIdentityCredential()
blob_service = BlobServiceClient(
    account_url="https://atomspacestorage.blob.core.windows.net",
    credential=credential
)
```

## Azure Data Lake Gen2 Integration

### Setup Data Lake

```bash
# Create storage account with hierarchical namespace
az storage account create \
  --name atomspacedatalake \
  --resource-group atomspace-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --enable-hierarchical-namespace true

# Create filesystem (container)
az storage fs create \
  --name atomspace-fs \
  --account-name atomspacedatalake
```

### Python Data Lake Integration

```python
from azure.storage.filedatalake import DataLakeServiceClient
from azure.identity import DefaultAzureCredential
import json

class AzureDataLakeAtomSpaceStorage:
    """Azure Data Lake Gen2 adapter for AtomSpace persistence."""
    
    def __init__(self, account_name: str, filesystem_name: str):
        credential = DefaultAzureCredential()
        self.service_client = DataLakeServiceClient(
            account_url=f"https://{account_name}.dfs.core.windows.net",
            credential=credential
        )
        self.filesystem = self.service_client.get_file_system_client(filesystem_name)
        
    def save_atoms_by_type(self, atomspace: AtomSpace, base_path: str = "atoms"):
        """Save atoms organized by type (hierarchical structure)."""
        from collections import defaultdict
        
        atoms_by_type = defaultdict(list)
        for atom in atomspace.get_atoms_by_type(types.Atom):
            atoms_by_type[atom.type_name].append({
                "id": str(atom.handle),
                "name": atom.name if hasattr(atom, "name") else None,
            })
        
        for type_name, atoms in atoms_by_type.items():
            directory_client = self.filesystem.get_directory_client(f"{base_path}/{type_name}")
            directory_client.create_directory()
            
            file_client = directory_client.get_file_client("atoms.json")
            file_client.upload_data(json.dumps(atoms), overwrite=True)
            
        print(f"Saved atoms to {len(atoms_by_type)} type directories")
        
    def load_atoms_by_type(self, atomspace: AtomSpace, base_path: str = "atoms"):
        """Load atoms from hierarchical structure."""
        paths = self.filesystem.get_paths(path=base_path)
        
        for path in paths:
            if path.name.endswith("atoms.json"):
                file_client = self.filesystem.get_file_client(path.name)
                data = file_client.download_file().readall()
                atoms_data = json.loads(data)
                
                type_name = path.name.split("/")[-2]
                atom_type = getattr(types, type_name)
                
                for atom_data in atoms_data:
                    if atom_data["name"]:
                        atomspace.add_node(atom_type, atom_data["name"])
```

## RocksDB with Azure Managed Disks

### Create High-Performance Disk

```bash
# Create Premium SSD for RocksDB
az disk create \
  --resource-group atomspace-rg \
  --name atomspace-data-disk \
  --size-gb 256 \
  --sku Premium_LRS \
  --location eastus

# Attach to VM
az vm disk attach \
  --resource-group atomspace-rg \
  --vm-name atomspace-vm \
  --name atomspace-data-disk \
  --lun 0
```

### Configure RocksDB Backend

```bash
# On the VM: Format and mount disk
sudo mkfs.ext4 /dev/sdc
sudo mkdir -p /data/atomspace
sudo mount /dev/sdc /data/atomspace

# Add to fstab for persistence
echo '/dev/sdc /data/atomspace ext4 defaults 0 0' | sudo tee -a /etc/fstab
```

```cpp
#include <opencog/persist/rocks/RocksStorage.h>

// Use RocksDB on Azure Premium SSD
std::string db_path = "/data/atomspace/rocksdb";
RocksStorage* storage = new RocksStorage(db_path);
storage->open();

atomspace.set_storage(storage);
atomspace.store_atomspace();
```

## Backup and Recovery

### Automated Backup to Blob Storage

```bash
#!/bin/bash
# backup-atomspace.sh

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="atomspace-backup-${TIMESTAMP}.tar.gz"

# Compress RocksDB data
tar -czf /tmp/${BACKUP_NAME} /data/atomspace/rocksdb

# Upload to Azure Blob
az storage blob upload \
  --account-name atomspacestorage \
  --container-name atomspace-backups \
  --name ${BACKUP_NAME} \
  --file /tmp/${BACKUP_NAME}

# Cleanup
rm /tmp/${BACKUP_NAME}

echo "Backup completed: ${BACKUP_NAME}"
```

### Restore from Backup

```bash
#!/bin/bash
# restore-atomspace.sh

BACKUP_NAME=$1

# Download from Azure Blob
az storage blob download \
  --account-name atomspacestorage \
  --container-name atomspace-backups \
  --name ${BACKUP_NAME} \
  --file /tmp/${BACKUP_NAME}

# Stop AtomSpace service
sudo systemctl stop atomspace

# Extract backup
sudo tar -xzf /tmp/${BACKUP_NAME} -C /

# Restart service
sudo systemctl start atomspace

echo "Restore completed from: ${BACKUP_NAME}"
```

## Performance Tuning

### Storage Tier Selection

| Tier | Latency | Use Case |
|------|---------|----------|
| Premium SSD | <1ms | Active AtomSpace, pattern matching |
| Standard SSD | ~2ms | Development, testing |
| Standard HDD | ~10ms | Cold storage, archives |
| Blob (Hot) | ~100ms | Snapshots, backups |
| Blob (Cool) | ~100ms | Infrequent access |
| Blob (Archive) | Hours | Long-term retention |

### Caching Strategy

```python
from azure.storage.blob import BlobServiceClient
from functools import lru_cache
import hashlib

class CachedAtomSpaceStorage:
    """AtomSpace storage with local caching."""
    
    def __init__(self, blob_service: BlobServiceClient, cache_dir: str = "/tmp/atomspace-cache"):
        self.blob_service = blob_service
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        
    @lru_cache(maxsize=100)
    def get_cached_blob(self, blob_name: str) -> bytes:
        """Get blob with local file cache."""
        cache_path = os.path.join(self.cache_dir, hashlib.md5(blob_name.encode()).hexdigest())
        
        if os.path.exists(cache_path):
            with open(cache_path, "rb") as f:
                return f.read()
        
        blob_client = self.blob_service.get_blob_client("atomspace-data", blob_name)
        data = blob_client.download_blob().readall()
        
        with open(cache_path, "wb") as f:
            f.write(data)
        
        return data
```

## Security Considerations

### Network Security

```bash
# Create private endpoint for storage
az network private-endpoint create \
  --resource-group atomspace-rg \
  --name atomspace-storage-endpoint \
  --vnet-name atomspace-vnet \
  --subnet data-subnet \
  --private-connection-resource-id $(az storage account show \
    --name atomspacestorage \
    --query id -o tsv) \
  --group-id blob \
  --connection-name atomspace-blob-connection
```

### Encryption

```bash
# Enable customer-managed keys
az storage account update \
  --name atomspacestorage \
  --resource-group atomspace-rg \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault <keyvault-url> \
  --encryption-key-name <key-name>
```

## Monitoring

```bash
# Enable storage analytics
az storage logging update \
  --account-name atomspacestorage \
  --log rwd \
  --retention 30 \
  --services b

# Enable metrics
az storage metrics update \
  --account-name atomspacestorage \
  --hour true \
  --minute true \
  --retention 30 \
  --services b
```

## References

- [Azure Blob Storage Documentation](https://learn.microsoft.com/azure/storage/blobs/)
- [Azure Data Lake Gen2 Documentation](https://learn.microsoft.com/azure/storage/blobs/data-lake-storage-introduction)
- [AtomSpace Storage Architecture](https://wiki.opencog.org/w/AtomSpace_storage)
