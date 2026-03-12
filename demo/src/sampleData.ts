import type { GraphDataset } from '../../src'

export type NoteData = {
  description: string
}

export const sampleGraph: GraphDataset<NoteData> = {
  nodes: [
    { id: 'index', label: 'index', isPrimary: true, kind: 'moc', data: { description: 'Root map of content for the demo graph.' } },
    { id: 'methodology', label: 'methodology', isPrimary: true, kind: 'topic', data: { description: 'Umbrella note for how the graph is organized.' } },
    { id: 'research', label: 'research', isPrimary: true, kind: 'topic', data: { description: 'Collects experiments, papers, and references.' } },
    { id: 'guidance', label: 'guidance', isPrimary: true, kind: 'topic', data: { description: 'Pattern notes and practical advice.' } },
    { id: 'capture-notes', label: 'capture-notes', data: { description: 'Short note on collecting raw observations.' } },
    { id: 'topic-modeling', label: 'topic-modeling', data: { description: 'How topics link multiple note clusters.' } },
    { id: 'literature-review', label: 'literature-review', data: { description: 'Paper synthesis workflow and examples.' } },
    { id: 'experiment-design', label: 'experiment-design', data: { description: 'Choosing variables and constraints.' } },
    { id: 'prompt-patterns', label: 'prompt-patterns', data: { description: 'Reusable prompting heuristics.' } },
    { id: 'evaluation-rubrics', label: 'evaluation-rubrics', data: { description: 'Criteria for scoring outputs.' } },
    { id: 'annotation-loop', label: 'annotation-loop', data: { description: 'Human review loop linked to weak references.' } },
    { id: 'publishing', label: 'publishing', data: { description: 'Release and distribution checklist.' } },
  ],
  edges: [
    { source: 'index', target: 'methodology', kind: 'strong' },
    { source: 'index', target: 'research', kind: 'strong' },
    { source: 'index', target: 'guidance', kind: 'strong' },
    { source: 'methodology', target: 'capture-notes', kind: 'strong' },
    { source: 'methodology', target: 'topic-modeling', kind: 'strong' },
    { source: 'research', target: 'literature-review', kind: 'strong' },
    { source: 'research', target: 'experiment-design', kind: 'strong' },
    { source: 'guidance', target: 'prompt-patterns', kind: 'strong' },
    { source: 'guidance', target: 'evaluation-rubrics', kind: 'strong' },
    { source: 'prompt-patterns', target: 'annotation-loop', kind: 'weak' },
    { source: 'experiment-design', target: 'annotation-loop', kind: 'weak' },
    { source: 'literature-review', target: 'publishing', kind: 'weak' },
    { source: 'evaluation-rubrics', target: 'publishing', kind: 'weak' },
    { source: 'capture-notes', target: 'prompt-patterns', kind: 'weak' },
    { source: 'topic-modeling', target: 'research', kind: 'weak' },
  ],
}
