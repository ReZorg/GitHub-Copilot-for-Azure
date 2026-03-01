# AtomSpace Pattern Engine Guide

Advanced pattern matching and query capabilities for OpenCog AtomSpace.

## Overview

The AtomSpace pattern engine enables graph queries using patterns that match against the hypergraph structure. Patterns are themselves atoms that describe the shape of subgraphs to find.

## Core Concepts

| Concept | Description | Use Case |
|---------|-------------|----------|
| BindLink | Main pattern-matching construct | Declarative queries |
| GetLink | Return matching atoms | Simple lookups |
| SatisfactionLink | Boolean query result | Existence checks |
| Variable | Placeholder in patterns | Pattern wildcards |
| TypedVariable | Typed placeholder | Constrained matching |
| GlobNode | Multi-element wildcard | Flexible matching |

## Basic Pattern Matching

### C++ API

```cpp
#include <opencog/atomspace/AtomSpace.h>
#include <opencog/query/BindLinkAPI.h>

using namespace opencog;

AtomSpace atomspace;

// Create knowledge base
Handle person = atomspace.add_node(CONCEPT_NODE, "Person");
Handle alice = atomspace.add_node(CONCEPT_NODE, "Alice");
Handle bob = atomspace.add_node(CONCEPT_NODE, "Bob");
atomspace.add_link(INHERITANCE_LINK, alice, person);
atomspace.add_link(INHERITANCE_LINK, bob, person);

// Create pattern: Find all X where (Inheritance X Person)
Handle pattern = atomspace.add_link(BIND_LINK,
    atomspace.add_link(VARIABLE_LIST,
        atomspace.add_node(VARIABLE_NODE, "$X")),
    // Pattern to match
    atomspace.add_link(INHERITANCE_LINK,
        atomspace.add_node(VARIABLE_NODE, "$X"),
        atomspace.add_node(CONCEPT_NODE, "Person")),
    // Output template
    atomspace.add_node(VARIABLE_NODE, "$X"));

// Execute pattern matching
Handle results = bindlink(&atomspace, pattern);

// Results contain: Alice, Bob
```

### Scheme (Atomese)

```scheme
(use-modules (opencog))
(use-modules (opencog exec))

; Create knowledge base
(Inheritance (Concept "Alice") (Concept "Person"))
(Inheritance (Concept "Bob") (Concept "Person"))
(Inheritance (Concept "Car") (Concept "Vehicle"))

; Pattern: Find all persons
(define find-persons
  (Bind
    (Variable "$X")
    (Inheritance (Variable "$X") (Concept "Person"))
    (Variable "$X")))

; Execute query
(cog-execute! find-persons)
; Returns: (SetLink (ConceptNode "Alice") (ConceptNode "Bob"))
```

### Python API

```python
from opencog.atomspace import AtomSpace, types
from opencog.type_constructors import *
from opencog.bindlink import execute_atom

atomspace = AtomSpace()

# Create knowledge base
person = atomspace.add_node(types.ConceptNode, "Person")
alice = atomspace.add_node(types.ConceptNode, "Alice")
bob = atomspace.add_node(types.ConceptNode, "Bob")
atomspace.add_link(types.InheritanceLink, [alice, person])
atomspace.add_link(types.InheritanceLink, [bob, person])

# Pattern query
pattern = atomspace.add_link(types.BindLink, [
    atomspace.add_node(types.VariableNode, "$X"),
    atomspace.add_link(types.InheritanceLink, [
        atomspace.add_node(types.VariableNode, "$X"),
        atomspace.add_node(types.ConceptNode, "Person")
    ]),
    atomspace.add_node(types.VariableNode, "$X")
])

results = execute_atom(atomspace, pattern)
```

## Advanced Patterns

### Typed Variables

Constrain variables to specific atom types:

```scheme
; Only match ConceptNodes
(Bind
  (TypedVariable
    (Variable "$X")
    (Type "ConceptNode"))
  (Inheritance (Variable "$X") (Concept "Person"))
  (Variable "$X"))
```

### Multiple Variables

Match complex patterns with multiple placeholders:

```scheme
; Find all X and Y where X inherits from Person and Y inherits from X
(Bind
  (VariableList
    (Variable "$X")
    (Variable "$Y"))
  (And
    (Inheritance (Variable "$X") (Concept "Person"))
    (Inheritance (Variable "$Y") (Variable "$X")))
  (List (Variable "$X") (Variable "$Y")))
```

### Negation (Absent Links)

Find patterns that do NOT exist:

```scheme
; Find persons who are NOT employees
(Bind
  (Variable "$X")
  (And
    (Inheritance (Variable "$X") (Concept "Person"))
    (Absent
      (Inheritance (Variable "$X") (Concept "Employee"))))
  (Variable "$X"))
```

### Optional Patterns

Match atoms that may or may not be present:

```scheme
; Find persons with optional age (may not exist)
(Bind
  (VariableList
    (Variable "$X")
    (Variable "$AGE"))
  (And
    (Inheritance (Variable "$X") (Concept "Person"))
    (Present
      (Evaluation
        (Predicate "has-age")
        (List (Variable "$X") (Variable "$AGE")))))
  (List (Variable "$X") (Variable "$AGE")))
```

## Pattern Types

### GetLink - Simple Retrieval

Returns matching atoms without transformation:

```scheme
(cog-execute!
  (Get
    (Inheritance (Variable "$X") (Concept "Person"))))
; Returns atoms matching the pattern
```

### SatisfactionLink - Boolean Query

Returns true/false for pattern existence:

```scheme
(cog-evaluate!
  (Satisfaction
    (Inheritance (Concept "Alice") (Concept "Person"))))
; Returns (stv 1 1) if pattern exists, (stv 0 1) otherwise
```

### QueryLink - Aggregation

Aggregates results with custom output:

```scheme
(Query
  (Variable "$X")
  (Inheritance (Variable "$X") (Concept "Person"))
  (Evaluation
    (Predicate "found")
    (List (Variable "$X"))))
```

## Performance Optimization

### Index Usage

AtomSpace automatically indexes atoms by type and incoming sets. Optimize queries by:

1. **Use specific types** - Narrow patterns with TypedVariable
2. **Order clauses** - Put most selective clauses first
3. **Avoid deep recursion** - Flatten patterns when possible

### Caching Pattern Results

```cpp
// Cache expensive query results
Handle cached_results = atomspace.add_link(SET_LINK);
// Store in atomspace for reuse
atomspace.add_link(EVALUATION_LINK,
    atomspace.add_node(PREDICATE_NODE, "cached-query-1"),
    cached_results);
```

### Parallel Pattern Matching

```cpp
#include <opencog/query/PatternMatchEngine.h>

// Enable parallel execution for large atomspaces
PatternMatchEngine pme(&atomspace);
pme.set_parallel(true);
pme.set_num_threads(8);
```

## Common Patterns

### Find All Links of Type

```scheme
(Get
  (TypedVariable (Variable "$L") (Type "InheritanceLink"))
  (Variable "$L"))
```

### Find Atoms Connected to Node

```scheme
(Get
  (VariableList
    (Variable "$LINK")
    (Variable "$OTHER"))
  (And
    (Present (Variable "$LINK"))
    (Member (Concept "Alice") (Variable "$LINK"))
    (Member (Variable "$OTHER") (Variable "$LINK"))
    (Not (Equal (Variable "$OTHER") (Concept "Alice")))))
```

### Recursive Pattern (Transitive Closure)

```scheme
; Find all ancestors of Alice (recursive inheritance)
(define (find-ancestors node)
  (Bind
    (Variable "$ANCESTOR")
    (Inheritance node (Variable "$ANCESTOR"))
    (Variable "$ANCESTOR")))
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `PatternMatchException` | Invalid pattern structure | Check BindLink format |
| `TypeException` | Variable type mismatch | Use TypedVariable correctly |
| `Empty results` | No matching atoms | Verify data exists, check pattern logic |
| `Timeout` | Pattern too complex | Simplify or add constraints |

## Azure Integration Notes

For large-scale pattern matching on Azure:

- Use Azure VMs with high memory (Standard_E series) for large atomspaces
- Enable SSD storage for RocksDB-backed atomspaces
- Use Azure Load Balancer to distribute queries across CogServer nodes
- Monitor query performance with Azure Application Insights

## References

- [OpenCog Pattern Matching](https://wiki.opencog.org/w/Pattern_matching)
- [BindLink Documentation](https://wiki.opencog.org/w/BindLink)
- [Atomese Query Reference](https://wiki.opencog.org/w/AtomSpace_query)
