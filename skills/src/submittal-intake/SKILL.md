---
name: submittal-intake
description: Log and name construction submittals consistently from a product data sheet, shop drawing transmittal, or sub's email. Use when a subcontractor sends a submittal, when building a submittal register, or when someone asks how to name or route a submittal.
---

# Submittal Intake

Turn an incoming submittal into a consistent register entry and a review cover note.

## Naming
`[Spec Section] - [Seq] - [Type] - [Description] - Rev [n]`
Example: `08 71 00 - 003 - PD - Door Hardware Sets - Rev 0`

Types: `PD` product data · `SD` shop drawings · `SA` samples · `MS` mockup · `CL` closeout / O&M · `WA` warranty · `CERT` certificates · `CAL` calculations

## Register entry
| Field | Rule |
|---|---|
| Spec section | Six digits, spaced `00 00 00` |
| Sequence | Next number within that section, 3 digits |
| Responsible sub | Company name as it appears on the subcontract |
| Received | Date received from the sub |
| Required on site | From the schedule; leave `[CONFIRM]` if unknown |
| Lead time | From the sub or product data; never assume |
| Ball in court | GC review → Architect → Engineer → Returned |

## Pre-review checklist (GC)
- Matches the spec section it is filed under
- Every required item in the spec's submittal article is included
- Sub's stamp and GC review stamp space present
- Deviations from the spec called out by the sub
- Not a resubmittal of a rejected item without changes

## Rules
- Never mark anything approved. You prepare; a person reviews.
- Flag missing items as a list, not a paragraph.
- If lead time plus review time misses the required-on-site date, say so at the top.
