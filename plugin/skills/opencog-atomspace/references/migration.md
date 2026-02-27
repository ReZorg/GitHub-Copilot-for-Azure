# AtomSpace Migration Guide

Guide for migrating AtomSpace data between different storage backends and Azure environments.

## Migration Scenarios

| Source | Destination | Method | Downtime |
|--------|-------------|--------|----------|
| In-Memory | RocksDB | Direct export | Minimal |
| In-Memory | PostgreSQL | SQL export | Minimal |
| RocksDB | PostgreSQL | Batch transfer | Medium |
| Local RocksDB | Azure VM RocksDB | File copy | Medium |
| Local PostgreSQL | Azure PostgreSQL | pg_dump/restore | Medium |
| On-premises | Azure | Hybrid approach | Varies |

## Export/Import Basics

### C++ Export API

```cpp
#include <opencog/atomspace/AtomSpace.h>
#include <opencog/persist/file/FileStorage.h>

using namespace opencog;

// Export atomspace to file
void export_atomspace(AtomSpace& as, const std::string& filepath) {
    FileStorage fs;
    fs.open(filepath);
    
    // Export all atoms
    HandleSeq atoms;
    as.get_all_atoms(atoms);
    
    for (const Handle& h : atoms) {
        fs.store_atom(h);
    }
    
    fs.close();
}

// Import atomspace from file
void import_atomspace(AtomSpace& as, const std::string& filepath) {
    FileStorage fs;
    fs.open(filepath);
    
    as.set_storage(&fs);
    as.load_atomspace();
    
    fs.close();
}
```

### Scheme Export

```scheme
(use-modules (opencog persist-file))

; Export to file
(cog-open "file:///path/to/atomspace.scm")
(store-atomspace)
(cog-close)

; Import from file
(cog-open "file:///path/to/atomspace.scm")
(load-atomspace)
(cog-close)
```

### Python Export

```python
from opencog.atomspace import AtomSpace, types
import json

def export_atomspace_json(atomspace: AtomSpace, filepath: str):
    """Export AtomSpace to JSON file."""
    atoms = []
    
    # Export nodes
    for atom in atomspace.get_atoms_by_type(types.Node, subtype=True):
        atoms.append({
            "type": atom.type_name,
            "name": atom.name,
            "tv": {"strength": atom.tv.mean, "confidence": atom.tv.confidence}
        })
    
    # Export links
    for atom in atomspace.get_atoms_by_type(types.Link, subtype=True):
        atoms.append({
            "type": atom.type_name,
            "outgoing": [export_atom_ref(o) for o in atom.out],
            "tv": {"strength": atom.tv.mean, "confidence": atom.tv.confidence}
        })
    
    with open(filepath, 'w') as f:
        json.dump({"atoms": atoms}, f, indent=2)

def export_atom_ref(atom):
    """Create serializable atom reference."""
    if atom.is_node():
        return {"type": atom.type_name, "name": atom.name}
    else:
        return {"type": atom.type_name, "outgoing": [export_atom_ref(o) for o in atom.out]}

def import_atomspace_json(atomspace: AtomSpace, filepath: str):
    """Import AtomSpace from JSON file."""
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    # First pass: create nodes
    for atom_data in data["atoms"]:
        if "name" in atom_data:
            atom_type = getattr(types, atom_data["type"])
            atomspace.add_node(atom_type, atom_data["name"])
    
    # Second pass: create links (after all nodes exist)
    for atom_data in data["atoms"]:
        if "outgoing" in atom_data:
            atom_type = getattr(types, atom_data["type"])
            outgoing = [resolve_atom_ref(atomspace, ref) for ref in atom_data["outgoing"]]
            atomspace.add_link(atom_type, outgoing)

def resolve_atom_ref(atomspace: AtomSpace, ref: dict):
    """Resolve atom reference to handle."""
    atom_type = getattr(types, ref["type"])
    if "name" in ref:
        return atomspace.add_node(atom_type, ref["name"])
    else:
        outgoing = [resolve_atom_ref(atomspace, o) for o in ref["outgoing"]]
        return atomspace.add_link(atom_type, outgoing)
```

## RocksDB to PostgreSQL Migration

### Step 1: Setup Azure PostgreSQL

```bash
# Create Azure PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group atomspace-rg \
  --name atomspace-postgres \
  --admin-user atomspace_admin \
  --admin-password <secure-password> \
  --sku-name Standard_D4s_v3 \
  --version 15 \
  --public-access 0.0.0.0

# Create database
az postgres flexible-server db create \
  --resource-group atomspace-rg \
  --server-name atomspace-postgres \
  --database-name atomspace

# Initialize schema
psql -h atomspace-postgres.postgres.database.azure.com \
  -U atomspace_admin \
  -d atomspace \
  -f /usr/local/share/opencog/sql/atomspace.sql
```

### Step 2: Migration Script

```python
from opencog.atomspace import AtomSpace, types
from opencog.persist.sql import SQLAtomStorage
import subprocess
import os

def migrate_rocks_to_postgres(
    rocks_path: str,
    postgres_uri: str,
    batch_size: int = 10000
):
    """Migrate from RocksDB to PostgreSQL."""
    
    # Open source RocksDB
    source_as = AtomSpace()
    rocks_uri = f"rocks://{rocks_path}"
    source_storage = open_storage(rocks_uri)
    source_as.set_storage(source_storage)
    source_as.load_atomspace()
    
    print(f"Loaded {source_as.get_size()} atoms from RocksDB")
    
    # Open destination PostgreSQL
    dest_as = AtomSpace()
    dest_storage = SQLAtomStorage(postgres_uri)
    dest_storage.open()
    dest_as.set_storage(dest_storage)
    
    # Migrate in batches
    all_atoms = list(source_as.get_atoms_by_type(types.Atom))
    total = len(all_atoms)
    
    for i in range(0, total, batch_size):
        batch = all_atoms[i:i+batch_size]
        for atom in batch:
            # Copy atom to destination
            if atom.is_node():
                dest_as.add_node(atom.type, atom.name)
            else:
                # Resolve outgoing atoms in destination
                outgoing = [copy_atom(dest_as, o) for o in atom.out]
                dest_as.add_link(atom.type, outgoing)
        
        dest_as.barrier()  # Flush to database
        print(f"Migrated {min(i+batch_size, total)}/{total} atoms")
    
    dest_storage.close()
    print("Migration complete!")

def copy_atom(dest_as: AtomSpace, atom):
    """Copy atom to destination AtomSpace."""
    if atom.is_node():
        return dest_as.add_node(atom.type, atom.name)
    else:
        outgoing = [copy_atom(dest_as, o) for o in atom.out]
        return dest_as.add_link(atom.type, outgoing)
```

### Step 3: Verify Migration

```python
def verify_migration(source_as: AtomSpace, dest_as: AtomSpace) -> bool:
    """Verify migration completeness."""
    source_count = source_as.get_size()
    dest_count = dest_as.get_size()
    
    if source_count != dest_count:
        print(f"Count mismatch: source={source_count}, dest={dest_count}")
        return False
    
    # Verify atom types
    for atom_type in [types.ConceptNode, types.InheritanceLink, types.EvaluationLink]:
        source_type_count = len(list(source_as.get_atoms_by_type(atom_type)))
        dest_type_count = len(list(dest_as.get_atoms_by_type(atom_type)))
        
        if source_type_count != dest_type_count:
            print(f"Type {atom_type} mismatch: source={source_type_count}, dest={dest_type_count}")
            return False
    
    print("Migration verified successfully!")
    return True
```

## On-Premises to Azure Migration

### Phase 1: Assessment

```bash
# Analyze current AtomSpace size
du -sh /data/atomspace/rocksdb

# Count atoms by type
python3 << 'PYEOF'
from opencog.atomspace import AtomSpace, types
from opencog.persist.rocks import RocksStorage

as = AtomSpace()
storage = RocksStorage("/data/atomspace/rocksdb")
storage.open()
as.set_storage(storage)
as.load_atomspace()

print(f"Total atoms: {as.get_size()}")
print(f"Nodes: {len(list(as.get_atoms_by_type(types.Node, subtype=True)))}")
print(f"Links: {len(list(as.get_atoms_by_type(types.Link, subtype=True)))}")
PYEOF
```

### Phase 2: Prepare Azure Infrastructure

```bash
# Create resource group
az group create --name atomspace-migration --location eastus

# Create target VM
az vm create \
  --resource-group atomspace-migration \
  --name atomspace-target \
  --image Ubuntu2204 \
  --size Standard_D8s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys

# Create storage account for transfer
az storage account create \
  --name atomspacetransfer \
  --resource-group atomspace-migration \
  --sku Standard_LRS
```

### Phase 3: Data Transfer

```bash
# Option A: Direct file transfer via AzCopy
# Install AzCopy on source system
wget https://aka.ms/downloadazcopy-v10-linux
tar -xzf downloadazcopy-v10-linux

# Upload RocksDB files
./azcopy copy "/data/atomspace/rocksdb" \
  "https://atomspacetransfer.blob.core.windows.net/migration" \
  --recursive

# Option B: Export and transfer
# Export on source
python3 export_atomspace_json.py --output /tmp/atomspace.json

# Upload export
az storage blob upload \
  --account-name atomspacetransfer \
  --container-name migration \
  --name atomspace.json \
  --file /tmp/atomspace.json
```

### Phase 4: Import on Azure

```bash
# Download on target VM
az storage blob download \
  --account-name atomspacetransfer \
  --container-name migration \
  --name atomspace.json \
  --file /data/atomspace/atomspace.json

# Import
python3 import_atomspace_json.py --input /data/atomspace/atomspace.json
```

## Minimal Downtime Migration

### Blue-Green Deployment

```
┌────────────────┐         ┌────────────────┐
│  Blue (Active) │         │ Green (Standby)│
│  - AtomSpace   │  Sync   │  - AtomSpace   │
│  - CogServer   │ ──────▶ │  - CogServer   │
│  (On-Premises) │         │  (Azure)       │
└────────────────┘         └────────────────┘
         │                          │
         │     Load Balancer        │
         └──────────┬───────────────┘
                    │
              ┌─────▼─────┐
              │  Clients  │
              └───────────┘
```

### Continuous Sync Script

```python
import time
from threading import Thread

class AtomSpaceSynchronizer:
    """Synchronize atoms between two AtomSpaces."""
    
    def __init__(self, source_as: AtomSpace, dest_as: AtomSpace):
        self.source = source_as
        self.dest = dest_as
        self.last_sync_time = 0
        self.running = False
        
    def start_continuous_sync(self, interval_seconds: int = 60):
        """Start background sync thread."""
        self.running = True
        self.sync_thread = Thread(target=self._sync_loop, args=(interval_seconds,))
        self.sync_thread.start()
        
    def stop_sync(self):
        """Stop background sync."""
        self.running = False
        self.sync_thread.join()
        
    def _sync_loop(self, interval: int):
        while self.running:
            self._sync_changes()
            time.sleep(interval)
            
    def _sync_changes(self):
        """Sync recent changes from source to destination."""
        # Get atoms modified since last sync
        # (requires modification tracking in AtomSpace)
        for atom in self.source.get_atoms_by_type(types.Atom):
            if not self._exists_in_dest(atom):
                self._copy_atom_to_dest(atom)
        
        self.last_sync_time = time.time()
```

### Cutover Procedure

```bash
#!/bin/bash
# cutover.sh - Execute migration cutover

echo "Starting cutover procedure..."

# 1. Stop writes to source
echo "Stopping source CogServer..."
ssh source-server "sudo systemctl stop cogserver"

# 2. Final sync
echo "Running final sync..."
python3 final_sync.py

# 3. Verify sync
echo "Verifying migration..."
python3 verify_migration.py

# 4. Update DNS/Load Balancer
echo "Updating traffic routing..."
az network lb update \
  --resource-group atomspace-migration \
  --name atomspace-lb \
  --frontend-ip-configs "[{\"name\": \"frontend\", \"publicIpAddress\": {\"id\": \"<azure-vm-ip>\"}}]"

# 5. Start Azure CogServer
echo "Starting Azure CogServer..."
ssh azure-vm "sudo systemctl start cogserver"

echo "Cutover complete!"
```

## Rollback Procedures

### Quick Rollback

```bash
#!/bin/bash
# rollback.sh - Rollback to source

# Stop Azure CogServer
ssh azure-vm "sudo systemctl stop cogserver"

# Restore source CogServer
ssh source-server "sudo systemctl start cogserver"

# Update traffic routing back to source
az network lb update \
  --resource-group atomspace-migration \
  --name atomspace-lb \
  --frontend-ip-configs "[{\"name\": \"frontend\", \"publicIpAddress\": {\"id\": \"<source-ip>\"}}]"

echo "Rollback complete - traffic restored to source"
```

## Validation Checklist

- [ ] Source atom count matches destination
- [ ] All atom types present in destination
- [ ] TruthValues preserved
- [ ] Link connectivity verified
- [ ] Pattern matching queries return same results
- [ ] Application functionality tested
- [ ] Performance benchmarks acceptable

## References

- [AtomSpace Persistence](https://wiki.opencog.org/w/AtomSpace_persistence)
- [RocksDB Storage](https://wiki.opencog.org/w/RocksDB)
- [SQL Storage](https://wiki.opencog.org/w/SQL_storage)
- [Azure Database Migration Guide](https://learn.microsoft.com/azure/dms/)
