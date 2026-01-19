---
description: Iterative planning with Prometheus, Oracle, and Momus until consensus
---

[RALPH-PLAN MODE - ITERATIVE CONSENSUS PLANNING]

$ARGUMENTS

## The Planning Triad

Ralph-Plan orchestrates three specialized agents in an iterative loop until all are satisfied:

| Agent | Role | Output |
|-------|------|--------|
| **Prometheus** | Strategic Planner | Creates/refines the work plan |
| **Oracle** | Strategic Advisor | Answers questions, validates architecture |
| **Momus** | Ruthless Reviewer | Critiques and identifies gaps |

## The Iteration Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                      RALPH-PLAN LOOP                            │
│                                                                 │
│    ┌──────────────┐                                             │
│    │  PROMETHEUS  │◄────────────────────────────────┐           │
│    │   (Plans)    │                                 │           │
│    └──────┬───────┘                                 │           │
│           │                                         │           │
│           ▼                                         │           │
│    ┌──────────────┐     Questions?    ┌─────────┐   │           │
│    │   Has open   │─────────────────► │ ORACLE  │   │           │
│    │  questions?  │                   │(Advises)│   │           │
│    └──────┬───────┘                   └────┬────┘   │           │
│           │                                │        │           │
│           │ No questions                   │        │           │
│           ▼                                ▼        │           │
│    ┌──────────────┐                  ┌──────────┐   │           │
│    │    MOMUS     │◄─────────────────│ Answers  │   │           │
│    │  (Reviews)   │                  └──────────┘   │           │
│    └──────┬───────┘                                 │           │
│           │                                         │           │
│           ▼                                         │           │
│    ┌──────────────┐     REJECT      ┌──────────────┐│           │
│    │   Verdict?   │─────────────────►│  Feedback   ││           │
│    └──────┬───────┘                  │  to Prom.   │┘           │
│           │                          └─────────────┘            │
│           │ OKAY                                                │
│           ▼                                                     │
│    ┌──────────────────────────────────────────────────────────┐ │
│    │                  PLAN APPROVED                           │ │
│    │           Ready for /ralph-loop execution                │ │
│    └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Execution Protocol

### Step 1: Initialize
```
1. Create .sisyphus/plans/ if not exists
2. Read any existing context from user input
3. Set iteration_count = 0, max_iterations = 5
```

### Step 2: Prometheus Creates Initial Plan

Spawn Prometheus to create the initial plan:

```
Task(subagent_type="oh-my-claude-sisyphus:prometheus", prompt="
CONTEXT: [User's task description]

Create a comprehensive work plan following your standard process:
1. Ask clarifying questions if needed
2. Research the codebase
3. Consult with Metis for gaps
4. Generate plan to .sisyphus/plans/[feature-name].md

Signal when plan is ready by stating: 'PLAN_READY: .sisyphus/plans/[filename].md'
")
```

### Step 3: Oracle Consultation (If Questions Exist)

If Prometheus or Momus raise questions that need strategic input:

```
Task(subagent_type="oh-my-claude-sisyphus:oracle", prompt="
CONTEXT: Planning iteration for [feature]

QUESTIONS FROM PLANNING TRIAD:
[List questions from Prometheus or Momus]

PLAN SO FAR:
[Current plan content or summary]

Provide strategic guidance on these questions. Consider:
- Architecture implications
- Trade-offs
- Best practices for this codebase
- Risk assessment

Format your answers clearly so Prometheus can incorporate them.
")
```

### Step 4: Momus Review

After Prometheus completes a plan draft:

```
Task(subagent_type="oh-my-claude-sisyphus:momus", prompt="
.sisyphus/plans/[filename].md
")
```

### Step 5: Handle Momus Verdict

```
IF verdict == "OKAY":
    → Plan approved! Output completion signal.

IF verdict == "REJECT":
    → Extract Momus feedback
    → Increment iteration_count
    → IF iteration_count >= max_iterations:
        → Force approval with warnings
    → ELSE:
        → Feed Momus feedback back to Prometheus
        → Return to Step 2
```

### Step 6: Completion

When Momus approves (OKAY), output:

```
<ralph-plan-complete>
PLAN APPROVED BY ALL AGENTS

Plan Location: .sisyphus/plans/[filename].md
Iterations: [count]

Ready for execution with:
  /ralph-loop [task description]

Or manual execution with:
  /sisyphus .sisyphus/plans/[filename].md
</ralph-plan-complete>
```

## Iteration Rules

| Rule | Description |
|------|-------------|
| **Max 5 iterations** | Safety limit to prevent infinite loops |
| **Prometheus owns the plan** | Only Prometheus writes to the plan file |
| **Oracle provides wisdom** | Oracle never modifies, only advises |
| **Momus has final say** | Plan is not done until Momus says OKAY |
| **Feedback is specific** | Each rejection must include actionable items |

## Quality Gates

Before each Momus review, verify:

- [ ] Plan file exists at expected path
- [ ] All file references in plan are valid
- [ ] Acceptance criteria are testable
- [ ] No vague language ("improve", "optimize" without metrics)

## Agent Communication Protocol

### Prometheus → Oracle Questions
```
ORACLE_QUESTION:
- Topic: [Architecture/Performance/Security/Pattern]
- Context: [What we're planning]
- Specific Question: [What we need answered]
```

### Oracle → Prometheus Answers
```
ORACLE_ANSWER:
- Topic: [Matching topic]
- Recommendation: [Specific guidance]
- Trade-offs: [What to consider]
- References: [file:line citations]
```

### Momus → Prometheus Feedback
```
MOMUS_FEEDBACK:
- Verdict: REJECT
- Critical Issues:
  1. [Issue with specific fix required]
  2. [Issue with specific fix required]
- Minor Issues:
  1. [Nice to fix]
```

## Begin Now

1. **Parse the task from $ARGUMENTS**
2. **Spawn Prometheus** with the task context
3. **Iterate** through the planning loop
4. **Complete** when Momus approves

The loop will refine the plan until it meets the rigorous standards of all three agents.
