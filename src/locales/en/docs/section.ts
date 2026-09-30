/** One documentation section. `steps` and `tips` are numbered keys (`s1`, `s2`, ...; `t1`, `t2`, ...). */
export interface DocSection {
  title: string;
  summary: string;
  steps: Record<string, string>;
  tips: Record<string, string>;
}

/** Frequently asked questions: numbered keys (`q1`, `q2`, ...), each with a question and an answer. */
export interface DocFaq {
  title: string;
  items: Record<string, { q: string; a: string }>;
}
