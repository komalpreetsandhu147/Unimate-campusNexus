import { DocumentChunk, Citation } from './types.js';

// Predefined stop words for academic/campus indexing
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could', 'did',
  'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenize and normalize text into clean keywords + bigrams
 */
export function tokenize(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s-_#]/g, ' ');
  const rawWords = cleaned.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  
  // Include bigrams for strong phrase matching (e.g. "data structures", "exam notice")
  const tokens: string[] = [...rawWords];
  for (let i = 0; i < rawWords.length - 1; i++) {
    tokens.push(`${rawWords[i]}_${rawWords[i + 1]}`);
  }
  return tokens;
}

/**
 * Compute Term Frequency vector for text against a vocabulary
 */
export function computeVector(tokens: string[], vocabulary: string[]): number[] {
  const counts: Record<string, number> = {};
  for (const t of tokens) {
    counts[t] = (counts[t] || 0) + 1;
  }
  const vec = vocabulary.map(word => counts[word] || 0);
  
  // Normalize vector (L2 norm)
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vec;
  return vec.map(val => val / norm);
}

/**
 * Cosine similarity between two normalized vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

/**
 * Similarity threshold: queries scoring below this are strictly discarded (no hallucinations/guessing)
 */
export const RETRIEVAL_SIMILARITY_THRESHOLD = 0.20;

/**
 * Chunk a raw document into coherent semantic blocks
 */
export function chunkDocument(
  documentId: string,
  title: string,
  rawText: string,
  metadata: Record<string, any>
): DocumentChunk[] {
  // Split on double newlines or bullet points
  const rawSections = rawText
    .split(/\n\s*\n|(?=^\d+\.\s+)|(?=^•\s+)/m)
    .map(s => s.trim())
    .filter(s => s.length > 25);

  const chunks: DocumentChunk[] = [];
  let chunkIdx = 0;

  for (const section of rawSections) {
    chunks.push({
      id: `${documentId}-chunk-${chunkIdx}`,
      document_id: documentId,
      chunk_index: chunkIdx++,
      content: section,
      metadata: {
        ...metadata,
        title
      },
      created_at: new Date().toISOString()
    });
  }

  return chunks;
}

/**
 * Search chunks using vector similarity and apply threshold cutoff
 */
export function searchChunks(
  query: string,
  chunks: DocumentChunk[],
  filter?: { course_code?: string; department?: string }
): { chunk: DocumentChunk; similarity: number; citation: Citation }[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || chunks.length === 0) {
    return [];
  }

  // Build global vocabulary across query and candidate chunks
  const vocabSet = new Set<string>(queryTokens);
  const chunkTokenMaps = chunks.map(c => {
    const tokens = tokenize(`${c.metadata.title || ''} ${c.content}`);
    for (const t of tokens) vocabSet.add(t);
    return tokens;
  });
  const vocab = Array.from(vocabSet);

  const queryVec = computeVector(queryTokens, vocab);

  const results: { chunk: DocumentChunk; similarity: number; citation: Citation }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Optional metadata filtering
    if (filter?.course_code && chunk.metadata.course_code &&
        chunk.metadata.course_code.toLowerCase() !== filter.course_code.toLowerCase()) {
      continue;
    }
    if (filter?.department && chunk.metadata.department &&
        chunk.metadata.department.toLowerCase() !== filter.department.toLowerCase()) {
      continue;
    }

    const chunkVec = computeVector(chunkTokenMaps[i], vocab);
    const score = cosineSimilarity(queryVec, chunkVec);

    if (score >= RETRIEVAL_SIMILARITY_THRESHOLD) {
      results.push({
        chunk,
        similarity: score,
        citation: {
          document_id: chunk.document_id,
          title: chunk.metadata.title || 'Official Campus Document',
          course_code: chunk.metadata.course_code,
          document_type: chunk.metadata.document_type || 'Notice',
          snippet: chunk.content.slice(0, 160) + (chunk.content.length > 160 ? '...' : ''),
          similarity: Number(score.toFixed(3))
        }
      });
    }
  }

  // Sort descending by similarity
  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}
