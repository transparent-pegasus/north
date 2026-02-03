// --- Tree Structure ---

export interface TreeIndex {
  trees: { id: string; name: string; updatedAt: string }[];
  activeTreeId: string;
}

export interface Tree {
  id: string;
  name: string;
  goal: Goal;
  createdAt: string;
  updatedAt: string;
}

export interface ElementProposal {
  type: "decomposition" | "refinement";
  data: any;
  createdAt: string;
}

export interface Goal {
  id: string;
  content: string;
  idealStates: IdealState[];
  pendingProposal?: ElementProposal | null;
}

export interface IdealState {
  id: string;
  content: string;
  currentState: CurrentState | null;
  condition: Condition | null;
  researchSpec: ResearchSpec | null;
  researchResults: ResearchResult[];
  pendingProposal?: ElementProposal | null;
}

export interface CurrentState {
  id: string;
  content: string;
}

export interface Condition {
  id: string;
  content: string;
}

// --- Research ---

// --- Research ---

export type SourceType =
  | "openalex"
  | "semantic_scholar"
  | "arxiv"
  | "pubmed"
  | "wikipedia"
  | "reddit"
  | "sciencedaily"
  | "phys_org"
  | "mit_tech_review"
  | "ieee_spectrum"
  | "frontiers"
  | "hackaday";

export const AVAILABLE_SOURCES: SourceType[] = [
  "openalex",
  "semantic_scholar",
  "arxiv",
  "pubmed",
  "wikipedia",
  "reddit",
  "sciencedaily",
  "phys_org",
  "mit_tech_review",
  "ieee_spectrum",
  "frontiers",
  "hackaday",
];

export interface ResearchSpec {
  source: SourceType;
  keywords: string[];
}

export interface ResearchResult {
  id: string;
  source: string;
  keywords: string[];
  results: SearchResultItem[];
  createdAt: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
  authors?: string[];
  publishedDate?: string;
}

export interface RefinementData {
  suggestions: {
    field: "content" | "condition" | "currentState";
    value: string;
    keepReason: string;
    changeReason: string;
  }[];
}
