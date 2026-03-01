# Atomese Programming Guide

Atomese is the executable graph programming language for OpenCog AtomSpace. It represents both data and executable code as atoms in the hypergraph.

## Overview

| Aspect | Description |
|--------|-------------|
| Nature | Homoiconic language (code is data) |
| Syntax | S-expression based (Scheme-like) |
| Execution | Graph rewriting engine |
| Bindings | Scheme, Python, C++ |
| Use Cases | AGI, rule engines, semantic reasoning |

## Core Execution Constructs

### ExecutionOutputLink

Executes a function and returns the output:

```scheme
(use-modules (opencog) (opencog exec))

; Define a simple executable
(define add-numbers
  (ExecutionOutput
    (GroundedSchema "scm: +")
    (List (Number 2) (Number 3))))

; Execute it
(cog-execute! add-numbers)
; Returns: (NumberNode 5)
```

### DefinedSchema

Create reusable named procedures:

```scheme
; Define a schema
(Define
  (DefinedSchema "double")
  (Lambda
    (Variable "$X")
    (Times (Variable "$X") (Number 2))))

; Use the schema
(cog-execute!
  (ExecutionOutput
    (DefinedSchema "double")
    (Number 5)))
; Returns: (NumberNode 10)
```

### Grounded Procedures

Connect Atomese to external code:

```scheme
; Grounded Scheme procedure
(ExecutionOutput
  (GroundedSchema "scm: my-function")
  (List (Concept "arg1") (Concept "arg2")))

; Grounded Python procedure
(ExecutionOutput
  (GroundedSchema "py: my_module.my_function")
  (List (Concept "arg1")))
```

## Control Flow

### SequentialAnd / SequentialOr

Execute atoms in sequence:

```scheme
; Execute in order, return result of last
(cog-execute!
  (SequentialAnd
    (ExecutionOutput (GroundedSchema "scm: step1") (List))
    (ExecutionOutput (GroundedSchema "scm: step2") (List))
    (ExecutionOutput (GroundedSchema "scm: step3") (List))))
```

### Conditional Execution

```scheme
; If-then-else construct
(cog-execute!
  (Cond
    ; Condition
    (GreaterThan (Number 5) (Number 3))
    ; Then
    (Concept "five is greater")
    ; Else
    (Concept "three is greater")))
```

### Loops with MapLink

Apply a function to each element:

```scheme
; Apply "double" to each number
(cog-execute!
  (Map
    (Lambda
      (Variable "$X")
      (Times (Variable "$X") (Number 2)))
    (Set
      (Number 1)
      (Number 2)
      (Number 3))))
; Returns: (SetLink (NumberNode 2) (NumberNode 4) (NumberNode 6))
```

## Arithmetic Operations

```scheme
; Basic arithmetic
(Plus (Number 2) (Number 3))           ; 5
(Minus (Number 10) (Number 4))         ; 6
(Times (Number 3) (Number 4))          ; 12
(Divide (Number 20) (Number 5))        ; 4

; Comparison
(GreaterThan (Number 5) (Number 3))    ; True
(LessThan (Number 2) (Number 8))       ; True
(Equal (Number 5) (Number 5))          ; True
```

## Value Operations

Values are mutable vectors attached to atoms:

```scheme
; Set a value on an atom
(cog-set-value!
  (Concept "Alice")
  (Predicate "age")
  (FloatValue 25))

; Get the value
(cog-value (Concept "Alice") (Predicate "age"))
; Returns: (FloatValue 25)

; Use ValueOf in expressions
(cog-execute!
  (Plus
    (ValueOf (Concept "Alice") (Predicate "age"))
    (Number 10)))
; Returns: (FloatValue 35)
```

## Grounded Procedures Implementation

### Python Grounded Schema

```python
from opencog.atomspace import AtomSpace, types
from opencog.execute import execute_atom
from opencog.utilities import initialize_opencog

atomspace = AtomSpace()
initialize_opencog(atomspace)

# Define a grounded procedure
def my_function(atomspace, atom):
    """Process an atom and return a result."""
    name = atom.name
    return atomspace.add_node(types.ConceptNode, f"Processed: {name}")

# Register it
from opencog.scheme_wrapper import scheme_eval
scheme_eval(atomspace, """
(define (my-python-func atom)
  (py:my_function atom))
""")
```

### C++ Grounded Schema

```cpp
#include <opencog/atomspace/AtomSpace.h>
#include <opencog/atoms/execution/Instantiator.h>

using namespace opencog;

// Define grounded procedure
class MyFunction : public SchemaNode {
public:
    ValuePtr execute(AtomSpace* as, const HandleSeq& args) override {
        // Process arguments
        Handle result = as->add_node(CONCEPT_NODE, "Processed");
        return result;
    }
};

// Register in AtomSpace
atomspace.register_function("cpp:my_function", new MyFunction());
```

## Rules and Inference

### Rule Format

```scheme
(Define
  (DefinedSchema "modus-ponens-rule")
  (Bind
    (VariableList
      (Variable "$A")
      (Variable "$B"))
    (And
      (Implication (Variable "$A") (Variable "$B"))
      (Variable "$A"))
    (Variable "$B")))
```

### Forward Chaining

Apply rules to derive new knowledge:

```scheme
(use-modules (opencog ure))

; Create rule base
(define rule-base (Concept "my-rules"))

; Add rules to base
(ure-add-rule rule-base (DefinedSchema "modus-ponens-rule"))

; Run forward chaining
(cog-fc
  rule-base
  (Inheritance (Concept "Socrates") (Concept "Human"))
  (Number 10))  ; maximum steps
```

### Backward Chaining

Goal-directed reasoning:

```scheme
; Query: Is Socrates mortal?
(cog-bc
  rule-base
  (Inheritance (Concept "Socrates") (Concept "Mortal"))
  (Number 10))
```

## State Management

### StateLink

Maintain mutable state:

```scheme
; Create state
(State (Anchor "current-user") (Concept "Alice"))

; Update state
(cog-execute!
  (Put
    (State (Anchor "current-user") (Variable "$NEW"))
    (Concept "Bob")))

; Query state
(cog-execute!
  (Get (State (Anchor "current-user") (Variable "$X"))))
```

## Attention Allocation

```scheme
; Set attention value (STI, LTI)
(cog-set-av! (Concept "important") (av 100 50 0))

; Get atoms with high attention
(cog-af)  ; Returns attention focus atoms
```

## Debugging Atomese

### Logging

```scheme
(use-modules (opencog logger))

; Set log level
(cog-logger-set-level! "debug")

; Log during execution
(cog-execute!
  (SequentialAnd
    (ExecutionOutput
      (GroundedSchema "scm: cog-logger-debug")
      (List (Concept "Step 1 complete")))
    (ExecutionOutput
      (GroundedSchema "scm: process-data")
      (List))))
```

### Tracing Execution

```scheme
; Enable execution tracing
(cog-set-trace! #t)

; Execute with trace output
(cog-execute! my-complex-program)

; Disable tracing
(cog-set-trace! #f)
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `GroundedSchemaNode not found` | Unregistered procedure | Register function before use |
| `Type mismatch` | Wrong argument types | Check procedure signature |
| `Infinite loop` | Recursive rule without base case | Add termination condition |
| `Out of memory` | Large intermediate results | Use streaming/lazy evaluation |

## Best Practices

1. **Use DefinedSchema** - Name reusable procedures for clarity
2. **Prefer declarative patterns** - Use BindLink over procedural code when possible
3. **Minimize grounded calls** - Keep computation in Atomese for traceability
4. **Document with ListLink** - Store metadata as atoms
5. **Test incrementally** - Use Scheme REPL for interactive development

## Azure Integration

For running Atomese programs on Azure:

```bash
# Start Guile REPL on Azure VM
ssh azureuser@<vm-ip>
guile -L /usr/local/share/opencog/scm

# Load AtomSpace modules
scheme@(guile-user)> (use-modules (opencog))
scheme@(guile-user)> (use-modules (opencog exec))
```

## References

- [Atomese Documentation](https://wiki.opencog.org/w/Atomese)
- [Executable Atoms](https://wiki.opencog.org/w/Executable_atoms)
- [Unified Rule Engine](https://wiki.opencog.org/w/Unified_Rule_Engine)
