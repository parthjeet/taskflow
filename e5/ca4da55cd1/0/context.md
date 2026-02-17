# Session Context

## User Prompts

### Prompt 1

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS - while staying in character as the current agent persona you may have loaded:

<steps CRITICAL="TRUE">
1. Always LOAD the FULL @{project-root}/_bmad/core/tasks/workflow.xml
2. READ its entire contents - this is the CORE OS for EXECUTING the specific workflow-config @{project-root}/_bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml
3. Pass the yaml path @{project-root}/_bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml as 'wo...

### Prompt 2

yes

### Prompt 3

Yeah, one thing. The front-end development is done by Lovable AI. Lovable AI is a website and is completely out of context of what we are doing here. We have a @taskflow-ui/ folder which is added as a git subtree. Expectation is that if there is a UI task(static only, using mocks), the user story(or some other place) should have a detailed prompt. That prompt will be copied to Lovable UI website to change the code. The code is changed by lovable and is then commited to github. I then pull that i...

### Prompt 4

All worked well, I'm satisfied.

### Prompt 5

2 things:
1. We maintain the @docs/task_flow_master_doc.md file. This file will always be added to the lovable prompt. This file should not every talk about our BMAD related processes or epics or US or anything. It should be a generic doc for the application. 
2. The prompt should have everything that let's say you will tell a new joinee UI developer to complete the task.

### Prompt 6

If mainting the master doc is too much, lovable will always have the context of the actual UI code. If the prompt is solid, it should handle the changes

### Prompt 7

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Analysis:
Let me chronologically analyze the entire conversation:

1. **Initial trigger**: User invoked `/bmad-bmm-retrospective` which triggered a workflow execution for a retrospective review.

2. **Workflow loading phase**: I loaded:
   - `_bmad/core/tasks/workflow.xml` - the workflow execution engine
   - `_bmad/bmm/workflows/4-implementatio...

### Prompt 8

IT IS CRITICAL THAT YOU FOLLOW THIS COMMAND: LOAD the FULL @{project-root}/_bmad/bmb/workflows/agent/workflow-create-agent.md, READ its entire contents and follow its directions exactly!

### Prompt 9

n

### Prompt 10

c

### Prompt 11

I need a prompt engineer expert to help write prompts that will be passed to Lovable to complete my UI tasks

### Prompt 12

1. I should just pass US name and it should take all the revelevent info from there. 
2. Single prompt and it should just refer the master doc. The doc will be attabled in the Lovable website.
3. Yes, the agent automatically inject the architectural constraints and also the agent automatically inject the architectural constext needed to complete the prompt. 
4. only for TaskFlow's Lovable workflow

### Prompt 13

Yes, also for review

### Prompt 14

P

### Prompt 15

auto please

### Prompt 16

both

### Prompt 17

c

### Prompt 18

Call it Viper. and hasSidecar: false is correct

### Prompt 19

c

### Prompt 20

looks good

### Prompt 21

c

### Prompt 22

yes, looks good

### Prompt 23

c

### Prompt 24

c

### Prompt 25

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Analysis:
Let me chronologically analyze the entire conversation:

1. **Session Start / Context Recovery**: The conversation began with a context recovery from a previous session. The previous session had completed an Epic 1 retrospective for the TaskFlow project using the BMAD workflow system.

2. **Retrospective Completion (Steps 6-12)**: I re...

### Prompt 26

c

### Prompt 27

v run validation on Epic 1 and US 1.4

### Prompt 28

C

### Prompt 29

F

### Prompt 30

All.

### Prompt 31

S

### Prompt 32

How can I invoke this?

