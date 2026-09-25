import { db } from './src/db.js';
import { tokenize, computeVector, cosineSimilarity } from './src/rag.js';

const chunks = db.getAllChunks();

const queries = [
  "when's the CS301 midterm",
  "what are the library hours",
  "when is the data structures viva",
  "where do I download my admit card",
  "when is the cs301 exam"
];

console.log("Raw Retrieval Scores (No Threshold):");
for (const q of queries) {
  const queryTokens = tokenize(q);
  console.log(`\nQuery: "${q}" (Tokens: ${queryTokens.join(', ')})`);
  
  const results = [];
  const vocabSet = new Set(queryTokens);
  const chunkTokenMaps = chunks.map(c => {
    const tokens = tokenize(`${c.metadata.title || ''} ${c.content}`);
    for (const t of tokens) vocabSet.add(t);
    return tokens;
  });
  const vocab = Array.from(vocabSet);
  const queryVec = computeVector(queryTokens, vocab);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkVec = computeVector(chunkTokenMaps[i], vocab);
    const score = cosineSimilarity(queryVec, chunkVec);
    results.push({ title: chunk.metadata.title, score });
  }

  results.sort((a, b) => b.score - a.score);
  results.slice(0, 3).forEach((r, i) => {
    console.log(`  Top ${i+1}: score=${r.score.toFixed(4)}, title="${r.title}"`);
  });
}
